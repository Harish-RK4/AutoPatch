"""
Unit & Integration Tests for AutoPatch Dataset Engine (Phase P4)
Tests profiling, anomaly detection, idempotent script generation,
and formal invariant verification.
"""

import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.dataset.cleaner import execute_cleaning_pipeline
from app.dataset.detector import detect_dataset_anomalies
from app.dataset.engine import process_dataset_project
from app.dataset.invariants import verify_dataset_invariants
from app.dataset.models import AnomalyType
from app.dataset.profiler import infer_format, profile_dataset
from app.main import app

SAMPLE_DIRTY_CSV = """student_id,name,score,submission_date
101,Alice Johnson,88.5,2026-10-01
102,Bob Smith,-15.0,2026/10/02
103,Charlie Brown,,02-10-2026
104,Diana Prince,105.0,2026-10-04
105,Evan Wright,92.0,2026-10-05
"""


def test_infer_format():
    assert infer_format("data.csv", "a,b,c") == "csv"
    assert infer_format("data.tsv", "a\tb\tc") == "tsv"
    assert infer_format("data.json", "[{}]") == "json"
    assert infer_format("data.jsonl", "{}\n{}") == "jsonl"
    assert infer_format("table.sqlite", "SQLite format 3") == "sqlite"
    assert infer_format("config.yaml", "key: value") == "yaml"


def test_profile_dataset_csv():
    profile = profile_dataset("grades.csv", SAMPLE_DIRTY_CSV)
    assert profile.total_rows == 5
    assert profile.total_columns == 4
    assert profile.detected_format == "csv"
    assert "submission_date" in profile.date_columns

    score_col = next(c for c in profile.columns if c.name == "score")
    assert score_col.null_count == 1
    assert score_col.inferred_type in ("float", "mixed", "integer")


def test_detect_dataset_anomalies():
    profile = profile_dataset("grades.csv", SAMPLE_DIRTY_CSV)
    anomalies = detect_dataset_anomalies("grades.csv", SAMPLE_DIRTY_CSV, profile)

    types = {a.anomaly_type for a in anomalies}
    assert AnomalyType.MISSING_VALUES in types
    assert AnomalyType.NUMERIC_OUTLIER in types
    assert AnomalyType.INCONSISTENT_DATE_FORMAT in types


def test_execute_cleaning_pipeline_idempotency_and_invariants():
    profile = profile_dataset("grades.csv", SAMPLE_DIRTY_CSV)
    anomalies = detect_dataset_anomalies("grades.csv", SAMPLE_DIRTY_CSV, profile)

    script, corrected, changed_rows = execute_cleaning_pipeline(
        filename="grades.csv",
        raw_content=SAMPLE_DIRTY_CSV,
        detected_format="csv",
        anomalies=anomalies,
        profile=profile,
    )

    assert len(changed_rows) == 3
    assert "Bob Smith" in corrected
    assert "-15.0" not in corrected  # Corrected to positive / normalized

    invariants = verify_dataset_invariants(
        raw_content=SAMPLE_DIRTY_CSV,
        corrected_content=corrected,
        cleaning_script=script,
        detected_format="csv",
        changed_rows=changed_rows,
        anomalies=anomalies,
        profile=profile,
    )

    assert invariants.row_lineage_preserved is True
    assert invariants.untouched_valid_cells_identical is True
    assert invariants.idempotent is True
    assert invariants.validation_rules_passed is True
    assert invariants.all_invariants_hold is True


def test_process_dataset_project_end_to_end():
    bundle = process_dataset_project(
        project_id="test-proj-csv",
        filename="grades.csv",
        raw_content=SAMPLE_DIRTY_CSV,
    )

    assert bundle.verification_level == "V4"
    assert bundle.confidence_score >= 85.0
    assert bundle.before_profile.total_rows == 5
    assert bundle.after_profile.total_rows == 5
    assert bundle.after_profile.overall_null_rate == 0.0


def test_json_dataset_cleaning_and_deduplication():
    dirty_json = json.dumps(
        [
            {"id": 1, "item": "Widget A", "status": "Active", "amount": "$50.00"},
            {"id": 2, "item": "Widget B", "status": "active", "amount": "$75.50"},
            {"id": 1, "item": "Widget A", "status": "Active", "amount": "$50.00"},  # duplicate
        ]
    )

    bundle = process_dataset_project(
        project_id="test-proj-json",
        filename="items.json",
        raw_content=dirty_json,
    )

    assert bundle.detected_format == "json"
    assert bundle.before_profile.total_rows == 3
    assert bundle.after_profile.total_rows == 2  # duplicate dropped
    assert bundle.invariants.row_lineage_preserved is True
    assert bundle.invariants.idempotent is True


def test_ambiguous_outlier_flagged_for_human_decision():
    # Dataset with 10 normal salaries and 1 ambiguous high salary (e.g. CEO)
    csv_salaries = (
        "employee_id,salary\n"
        + "\n".join(f"{i},50000" for i in range(1, 15))
        + "\n15,500000\n"  # 10x salary (statistical outlier)
    )
    profile = profile_dataset("salaries.csv", csv_salaries)
    anomalies = detect_dataset_anomalies("salaries.csv", csv_salaries, profile)

    human_decision_anoms = [a for a in anomalies if a.needs_human_decision]
    assert len(human_decision_anoms) >= 1
    assert human_decision_anoms[0].anomaly_type == AnomalyType.AMBIGUOUS_HUMAN_DECISION


@pytest.mark.asyncio
async def test_dataset_api_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create dataset project
        create_resp = await client.post(
            "/api/v1/projects",
            json={
                "name": "Integration Dataset Test",
                "source_type": "dataset",
                "language": "dataset",
                "filename": "records.csv",
                "content": SAMPLE_DIRTY_CSV,
            },
        )
        assert create_resp.status_code == 200
        proj_data = create_resp.json()
        proj_id = proj_data["id"]

        # Run pipeline
        pipe_resp = await client.post(f"/api/v1/projects/{proj_id}/pipeline")
        assert pipe_resp.status_code == 200
        pipe_json = pipe_resp.json()
        assert pipe_json.get("is_dataset") is True
        assert pipe_json.get("verification_level") == "V4"

        # Fetch dataset review bundle
        review_resp = await client.get(f"/api/v1/projects/{proj_id}/dataset-review")
        assert review_resp.status_code == 200
        review_json = review_resp.json()
        assert review_json["filename"] == "records.csv"
        assert len(review_json["anomalies"]) >= 2
        assert review_json["invariants"]["all_invariants_hold"] is True

        # Download cleaning script
        script_resp = await client.get(f"/api/v1/projects/{proj_id}/dataset-script")
        assert script_resp.status_code == 200
        assert "clean_dataset" in script_resp.text

        # Download corrected dataset copy
        export_resp = await client.get(f"/api/v1/projects/{proj_id}/dataset-export")
        assert export_resp.status_code == 200
        assert "Alice Johnson" in export_resp.text
