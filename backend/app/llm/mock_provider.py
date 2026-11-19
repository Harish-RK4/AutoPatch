"""
Deterministic Mock LLM Provider
Returns structured, realistic responses for all agents with zero network requests and zero keys.
"""

import json
from typing import Any

from app.llm.base import BaseLLMProvider, LLMRequest, LLMResponse

MOCK_RESPONSES: dict[str, str] = {
    "scanner": json.dumps(
        {
            "bugs": [
                {
                    "title": "Missing bounds validation on student marks",
                    "file_path": "calculator.py",
                    "line_start": 5,
                    "line_end": 14,
                    "origin_line": 5,
                    "crash_line": 12,
                    "trigger_input": {"marks": -5, "total": 100},
                    "failure_type": "logic_error",
                    "category": "logic",
                    "severity": "high",
                    "severity_score": 8.5,
                    "confidence_score": 40.0,
                    "verification_level": "V0",
                    "description": "calculate_percentage() accepts negative values and values exceeding total, producing invalid percentages.",
                }
            ]
        }
    ),
    "reproducer": json.dumps(
        {
            "framework": "pytest",
            "test_name": "test_negative_and_overflow_marks",
            "test_code": (
                "import pytest\n"
                "from calculator import calculate_percentage\n\n"
                "def test_negative_marks():\n"
                "    with pytest.raises(ValueError, match='Marks must be between 0 and total'):\n"
                "        calculate_percentage(-5, 100)\n\n"
                "def test_overflow_marks():\n"
                "    with pytest.raises(ValueError, match='Marks must be between 0 and total'):\n"
                "        calculate_percentage(105, 100)\n"
            ),
            "fails_before": True,
            "reproduction_status": "reproduced",
        }
    ),
    "root_cause": json.dumps(
        {
            "summary": "calculate_percentage does not validate that 0 <= marks <= total prior to arithmetic computation.",
            "origin_line": 5,
            "crash_line": 12,
            "trigger_input": {"marks": -5, "total": 100},
            "failure_type": "missing_input_validation",
            "data_flow_slice": [
                {"line": 5, "variable": "marks", "event": "parameter received as -5"},
                {"line": 10, "variable": "total", "event": "parameter received as 100"},
                {
                    "line": 12,
                    "variable": "percentage",
                    "event": "computed (-5 / 100) * 100 = -5.0 (invalid)",
                },
            ],
        }
    ),
    "patcher": json.dumps(
        {
            "candidates": [
                {
                    "candidate_no": 1,
                    "git_branch": "patch/candidate-1-input-guard",
                    "rank": 1,
                    "reason": "Add explicit ValueError bounds check before percentage calculation.",
                    "risk_level": "low",
                    "original_code": "def calculate_percentage(marks: float, total: float) -> float:\n    return (marks / total) * 100",
                    "patched_code": "def calculate_percentage(marks: float, total: float) -> float:\n    if not (0 <= marks <= total):\n        raise ValueError('Marks must be between 0 and total')\n    return (marks / total) * 100",
                    "diff": "@@ -1,2 +1,4 @@\n def calculate_percentage(marks: float, total: float) -> float:\n+    if not (0 <= marks <= total):\n+        raise ValueError('Marks must be between 0 and total')\n     return (marks / total) * 100",
                    "verification_level": "V4",
                },
                {
                    "candidate_no": 2,
                    "git_branch": "patch/candidate-2-clamp",
                    "rank": 2,
                    "reason": "Silently clamp marks between 0 and total.",
                    "risk_level": "medium",
                    "original_code": "def calculate_percentage(marks: float, total: float) -> float:\n    return (marks / total) * 100",
                    "patched_code": "def calculate_percentage(marks: float, total: float) -> float:\n    clamped = max(0.0, min(marks, total))\n    return (clamped / total) * 100",
                    "diff": "@@ -1,2 +1,3 @@\n def calculate_percentage(marks: float, total: float) -> float:\n+    clamped = max(0.0, min(marks, total))\n-    return (marks / total) * 100\n+    return (clamped / total) * 100",
                    "verification_level": "V3",
                },
            ]
        }
    ),
    "critic": json.dumps(
        {
            "verdict": "approved",
            "selected_candidate_no": 1,
            "touches_unrelated_code": False,
            "suppresses_error_silently": False,
            "blast_radius_assessment": "Touches only calculate_percentage signature body; zero side effects on downstream consumers expecting ValueError.",
            "risk_level": "low",
        }
    ),
    "explainer": json.dumps(
        {
            "beginner": "The calculator trusted any number entered, even negative scores like -5 or impossibly high scores like 105%. We added a check at the entrance to ensure only real scores between 0 and 100% are computed.",
            "developer": "calculate_percentage lacked invariant precondition validation. When marks < 0 or marks > total, percentage was computed linearly yielding out-of-range float values. The patch inserts an explicit bounds assertion raising ValueError.",
            "manager": "Resolved arithmetic logic defect that could corrupt student grading reports and GPA calculations with negative or overflow percentages. Fixed with low risk and validated by automated tests.",
        }
    ),
    "dataset_fixer": json.dumps(
        {
            "cleaning_script": (
                "import pandas as pd\n\n"
                "def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:\n"
                "    cleaned = df.copy()\n"
                "    # Clean negative and null score rows\n"
                "    cleaned['score'] = pd.to_numeric(cleaned['score'], errors='coerce')\n"
                "    cleaned = cleaned[cleaned['score'].between(0, 100)]\n"
                "    # Normalize date formatting\n"
                "    cleaned['submission_date'] = pd.to_datetime(cleaned['submission_date']).dt.strftime('%Y-%m-%d')\n"
                "    return cleaned\n"
            ),
            "invariants_checked": [
                "row_lineage_preserved",
                "idempotent_transformation",
                "zero_type_corruption",
            ],
            "summary": "Sanitized invalid score outliers and unified submission date formats.",
        }
    ),
}


class MockLLMProvider(BaseLLMProvider):
    """Offline mock provider that returns structured JSON payloads for test and demo runs."""

    def __init__(self, model_name: str = "mock-agent-engine"):
        self.model_name = model_name

    async def complete(self, request: LLMRequest) -> LLMResponse:
        content = MOCK_RESPONSES.get(request.agent_role)
        if not content:
            content = json.dumps(
                {"status": "ok", "role": request.agent_role, "message": "Mock generic response"}
            )

        return LLMResponse(
            provider="mock", model=self.model_name, content=content, cached=False, tokens_used=120
        )

    async def test_connection(self) -> dict[str, Any]:
        return {
            "status": "connected",
            "provider": "mock",
            "model": self.model_name,
            "message": "Mock provider ready. Zero keys required.",
        }
