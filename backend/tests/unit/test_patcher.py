"""
Unit Tests for Patcher Engine and End-to-End Pipeline
Verifies:
1. Unified diff generation
2. Full 5-step autonomous pipeline execution (UPLOAD -> SCAN -> EXPLAIN -> FIX -> TEST)
3. Dual sandbox execution (pre-patch vs post-patch)
4. Dynamic sandbox duration measurement
5. Explicit transparency labeling on generated patches
"""

import pytest

from app.patcher.diff import generate_unified_diff
from app.patcher.pipeline import run_autonomous_pipeline


def test_unified_diff_generation():
    """Generates standard unidiff showing exact line changes."""
    orig = "def add(a, b):\n    return a - b\n"
    patched = "def add(a, b):\n    return a + b\n"
    diff = generate_unified_diff(orig, patched, file_path="math.py")
    assert "--- a/math.py" in diff
    assert "+++ b/math.py" in diff
    assert "-    return a - b" in diff
    assert "+    return a + b" in diff


@pytest.mark.asyncio
async def test_autonomous_pipeline_runs_and_measures_duration():
    """Pipeline scans flaw, synthesizes patch, executes in sandbox, and captures duration."""
    files = [
        {
            "path": "calculator.py",
            "language": "python",
            "content": """
import subprocess

def run_command(cmd):
    # Security flaw: shell=True
    subprocess.Popen(cmd, shell=True)
""",
        }
    ]
    res = await run_autonomous_pipeline("proj-test-101", "Flawed Project", files)
    assert res["status"] == "completed"
    assert res["issues_count"] >= 1
    assert res["patches_count"] >= 1

    patch = res["patches"][0]
    assert patch["file_path"] == "calculator.py"
    assert "shell=False" in patch["patched_code"]
    assert "--- a/calculator.py" in patch["unified_diff"]

    # Assert real measured sandbox duration (>0ms)
    assert patch["sandbox_duration_ms"] > 0
    assert res["total_sandbox_duration_ms"] > 0

    # Assert honest runner labeling
    assert "Not Network-Isolated" in patch["runner_label"]
    assert patch["runner_type"] == "local_dev"
