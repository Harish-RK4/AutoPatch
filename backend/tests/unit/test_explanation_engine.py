"""
Unit Tests for Fix Explanation Engine and Explanation Validator (Phase P5)
Tests crash localisation, execution trace timeline, backward slice,
three-level explanations, hunk cards, and self-checking validator agent.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.patcher.explanation import synthesize_explanation_bundle
from app.patcher.explanation_validator import validate_explanation_bundle

SAMPLE_CALCULATOR_CODE = """# Student Marks Percentage Calculator
def get_input(raw_marks):
    return float(raw_marks)

def calculate_percentage(marks: float, total: float = 100.0) -> float:
    # Origin line: bad input accepted on line 5
    # Crash line: line 12 evaluates without boundary assertion
    if marks < 0:
        pass
    # Line 10
    percentage = (marks / total) * 100.0
    return percentage
"""


def test_synthesize_explanation_bundle():
    bundle = synthesize_explanation_bundle(
        bug_id="test-bug-1",
        file_path="calculator.py",
        source_content=SAMPLE_CALCULATOR_CODE,
        line_start=5,
        line_end=12,
        category="logic",
    )

    # 1. Localisation
    assert bundle.origin_line == 2 or bundle.origin_line == 5
    assert bundle.crash_line == 12
    assert bundle.failure_type == "logic_boundary_defect"
    assert "input_value" in bundle.trigger_input

    # 2. Stack Trace & Frames
    assert len(bundle.stack_frames) >= 2
    assert bundle.stack_frames[0].is_origin is True
    assert bundle.stack_frames[-1].is_crash is True
    assert "Traceback" in bundle.stack_trace

    # 3. Execution Timeline
    assert len(bundle.execution_trace) >= 3
    events = [s.event for s in bundle.execution_trace]
    assert "call" in events
    assert "exception" in events

    # 4. Backward Data-Flow Slice
    assert len(bundle.backward_slice) >= 2
    roles = [s.role for s in bundle.backward_slice]
    assert "origin" in roles
    assert "crash" in roles

    # 5. Three-Level Explanations
    assert len(bundle.levels.beginner) > 20
    assert len(bundle.levels.developer) > 20
    assert len(bundle.levels.manager) > 20

    # 6. Per-Hunk Cards
    assert len(bundle.hunk_cards) >= 1
    card = bundle.hunk_cards[0]
    assert len(card.why_wrong) > 10
    assert len(card.why_fix_works) > 10
    assert len(card.alternatives) >= 1


def test_explanation_validator_passes():
    bundle = synthesize_explanation_bundle(
        bug_id="test-bug-valid",
        file_path="calculator.py",
        source_content=SAMPLE_CALCULATOR_CODE,
        line_start=2,
        line_end=12,
        category="logic",
    )

    validated_bundle, report = validate_explanation_bundle(
        bundle=bundle,
        file_content=SAMPLE_CALCULATOR_CODE,
        actual_diff="--- calculator.py\n+++ calculator.py\n@@ -10,3 +10,5 @@\n+if not (0 <= marks <= total):\n",
    )

    assert report.is_valid is True
    assert report.citations_valid is True
    assert validated_bundle.is_hypothesis is False
    assert report.confidence_penalty == 0.0


def test_explanation_validator_catches_invalid_lines():
    bundle = synthesize_explanation_bundle(
        bug_id="test-bug-invalid-lines",
        file_path="calculator.py",
        source_content=SAMPLE_CALCULATOR_CODE,
        line_start=2,
        line_end=12,
        category="logic",
    )
    # Tamper with crash line to point outside file bounds
    bundle.crash_line = 9999

    validated_bundle, report = validate_explanation_bundle(
        bundle=bundle,
        file_content=SAMPLE_CALCULATOR_CODE,
    )

    assert report.is_valid is False
    assert report.citations_valid is False
    assert validated_bundle.is_hypothesis is True
    assert report.confidence_penalty == 20.0
    assert any("9999" in err for err in report.errors)


@pytest.mark.asyncio
async def test_ask_autopatch_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/bugs/demo-bug-001/ask",
            json={"question": "Why not use silent clamping instead of raising ValueError?"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data
        assert len(data["answer"]) > 20
        assert len(data["cited_files"]) >= 1
        assert "calculator.py" in data["cited_files"][0]


@pytest.mark.asyncio
async def test_export_bug_markdown_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/bugs/demo-bug-001/export-markdown")
        assert resp.status_code == 200
        text = resp.text
        assert "# AutoPatch Autonomous Bug Report" in text
        assert "1. Bug Details" in text
        assert "2. Root Cause Analysis" in text
        assert "3. Stack Trace & Execution Timeline" in text
        assert "4. Suggested Patch (Minimal Diff)" in text
        assert "5. Test Results & Proof Bundle" in text
        assert "6. Change History & Audit Status" in text
        assert "Origin Line:" in text
        assert "Crash Line:" in text
