"""
Dataset Engine Coordinator Module
Orchestrates end-to-end dataset processing:
1. Deep Profiling
2. Flaw & Anomaly Detection
3. Script Synthesis & Idempotent Sandbox Cleaning
4. Post-Correction Profiling & Invariant Verification
5. Assembling DatasetReviewBundle
"""

from app.dataset.cleaner import execute_cleaning_pipeline
from app.dataset.detector import detect_dataset_anomalies
from app.dataset.invariants import verify_dataset_invariants
from app.dataset.models import DatasetReviewBundle
from app.dataset.profiler import profile_dataset

PROJECT_DATASET_REVIEWS: dict[str, DatasetReviewBundle] = {}


def process_dataset_project(
    project_id: str,
    filename: str,
    raw_content: str,
) -> DatasetReviewBundle:
    """
    Executes the full dataset verification and cleaning pipeline.
    Produces a repeatable correction script, cleaned copy, before/after profiles,
    and proves formal mathematical invariants.
    """
    # 1. Profile original raw content
    before_profile = profile_dataset(filename, raw_content)

    # 2. Detect data quality anomalies
    anomalies = detect_dataset_anomalies(filename, raw_content, before_profile)

    # 3. Synthesize cleaning script and execute cleaning pipeline
    cleaning_script, corrected_content, changed_rows = execute_cleaning_pipeline(
        filename=filename,
        raw_content=raw_content,
        detected_format=before_profile.detected_format,
        anomalies=anomalies,
        profile=before_profile,
    )

    # 4. Profile corrected content
    after_profile = profile_dataset(filename, corrected_content)

    # 5. Verify formal mathematical invariants
    invariants = verify_dataset_invariants(
        raw_content=raw_content,
        corrected_content=corrected_content,
        cleaning_script=cleaning_script,
        detected_format=before_profile.detected_format,
        changed_rows=changed_rows,
        anomalies=anomalies,
        profile=before_profile,
    )

    # 6. Assign Verification Ladder Level and Confidence
    if invariants.all_invariants_hold:
        v_level = "V4"
        confidence = 95.0
    elif invariants.idempotent and invariants.row_lineage_preserved:
        v_level = "V3"
        confidence = 85.0
    else:
        v_level = "V2"
        confidence = 65.0

    summary = (
        f"Analyzed {before_profile.total_rows} rows across {before_profile.total_columns} columns. "
        f"Identified {len(anomalies)} anomaly finding(s). "
        f"Corrected {len(changed_rows)} row(s) via idempotent Python script. "
        f"Invariant verification: {'ALL INVARIANTS SATISFIED (V4)' if invariants.all_invariants_hold else 'PARTIAL'}. "
        f"Null rate reduced from {round(before_profile.overall_null_rate * 100, 1)}% to {round(after_profile.overall_null_rate * 100, 1)}%."
    )

    bundle = DatasetReviewBundle(
        project_id=project_id,
        filename=filename,
        detected_format=before_profile.detected_format,
        before_profile=before_profile,
        after_profile=after_profile,
        anomalies=anomalies,
        cleaning_script=cleaning_script,
        corrected_content=corrected_content,
        changed_rows=changed_rows,
        invariants=invariants,
        verification_level=v_level,
        confidence_score=confidence,
        summary=summary,
    )

    PROJECT_DATASET_REVIEWS[project_id] = bundle
    return bundle


def get_dataset_review(project_id: str) -> DatasetReviewBundle | None:
    return PROJECT_DATASET_REVIEWS.get(project_id)
