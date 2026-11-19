"""
Real Flaw Detection and Non-Hallucinatory Repair Verification
Tests syntax errors, runtime zero divisions, name errors, and type errors
ensuring real, executable fixes with zero hallucinatory 'marks <= total' guards.
"""

import pytest
from app.scanner.engine import scan_project_files
from app.patcher.pipeline import run_autonomous_pipeline
from app.sandbox.resolver import get_sandbox_runner


@pytest.mark.asyncio
async def test_syntax_error_repair_and_sandbox_execution():
    runner = get_sandbox_runner()
    # 1. Unterminated string
    files = [{"path": "script.py", "language": "python", "content": 'print("Hello'}]
    res = await run_autonomous_pipeline("proj-syntax-1", "Syntax Proj", files)
    assert res["issues_count"] >= 1
    assert res["patches_count"] >= 1
    top_patch = res["patches"][0]
    assert "marks" not in top_patch["patched_code"]
    # Check that patched code is valid and executes with exit_code 0
    exec_res = runner.execute_code("python", top_patch["patched_code"])
    assert exec_res.exit_code == 0


@pytest.mark.asyncio
async def test_zero_division_detection_and_repair():
    runner = get_sandbox_runner()
    code = "x = 10\ny = 0\nprint(x / y)"
    files = [{"path": "zero.py", "language": "python", "content": code}]
    # Dynamic scanner must catch ZeroDivisionError
    scan_res = await scan_project_files(files)
    assert scan_res["total_issues"] >= 1
    assert any("zero" in i["message"].lower() or i["rule_id"] == "BUG-ZERO-DIV" for i in scan_res["issues"])

    # Pipeline must synthesize a fix that actually runs and does not hallucinate
    pipe_res = await run_autonomous_pipeline("proj-zero-1", "Zero Proj", files)
    assert pipe_res["patches_count"] >= 1
    top_patch = pipe_res["patches"][0]
    print("\nPATCHED CODE:\n", top_patch["patched_code"])
    assert "marks" not in top_patch["patched_code"]
    exec_res = runner.execute_code("python", top_patch["patched_code"])
    print("\nSTDERR:\n", exec_res.stderr)
    assert exec_res.exit_code == 0


@pytest.mark.asyncio
async def test_name_error_detection_and_repair():
    runner = get_sandbox_runner()
    code = "def calc():\n    return missing_val + 1\ncalc()"
    files = [{"path": "name_err.py", "language": "python", "content": code}]
    scan_res = await scan_project_files(files)
    assert scan_res["total_issues"] >= 1
    assert any("name" in i["message"].lower() or i["rule_id"] == "BUG-NAME-ERR" for i in scan_res["issues"])

    pipe_res = await run_autonomous_pipeline("proj-name-1", "Name Proj", files)
    assert pipe_res["patches_count"] >= 1
    top_patch = pipe_res["patches"][0]
    print("\nPATCHED CODE:\n", top_patch["patched_code"])
    assert "marks" not in top_patch["patched_code"]
    exec_res = runner.execute_code("python", top_patch["patched_code"])
    print("\nSTDERR:\n", exec_res.stderr)
    assert exec_res.exit_code == 0


@pytest.mark.asyncio
async def test_type_error_detection_and_repair():
    runner = get_sandbox_runner()
    code = 'def greet(val):\n    return "Score: " + val\ngreet(100)'
    files = [{"path": "type_err.py", "language": "python", "content": code}]
    scan_res = await scan_project_files(files)
    assert scan_res["total_issues"] >= 1

    pipe_res = await run_autonomous_pipeline("proj-type-1", "Type Proj", files)
    assert pipe_res["patches_count"] >= 1
    top_patch = pipe_res["patches"][0]
    print("\nPATCHED CODE:\n", top_patch["patched_code"])
    assert "marks" not in top_patch["patched_code"]
    exec_res = runner.execute_code("python", top_patch["patched_code"])
    print("\nSTDERR:\n", exec_res.stderr)
    assert exec_res.exit_code == 0
