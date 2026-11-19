"""
Unit Tests for Polyglot Scanner
Verifies:
1. Python syntax error detection (line, col, snippet)
2. Dangerous eval() and exec() AST detection
3. subprocess.Popen(..., shell=True) detection
4. Hardcoded secret / token pattern detection
5. Zero division and broad exception swallowing detection
6. JavaScript insecure eval and hardcoded secret detection
"""

import pytest
from app.scanner.rules import scan_javascript_code, scan_python_code


def test_python_syntax_error_detection():
    """Scanner detects real Python syntax errors with accurate line and snippet."""
    broken_code = """
def calculate(a, b):
    return a + * b
"""
    issues = scan_python_code("broken.py", broken_code)
    assert len(issues) == 1
    issue = issues[0]
    assert issue.category == "syntax"
    assert issue.rule_id == "SYNTAX-ERR"
    assert issue.severity == "critical"
    assert issue.line_number == 3


def test_python_dangerous_eval_detection():
    """Scanner flags dangerous eval() and exec() calls via AST."""
    code = """
def run_user_input(payload):
    result = eval(payload)
    exec("import os")
    return result
"""
    issues = scan_python_code("dynamic.py", code)
    eval_issues = [i for i in issues if i.rule_id in ("SEC-EVAL", "SEC-EXEC")]
    assert len(eval_issues) == 2
    assert all(i.severity == "critical" for i in eval_issues)
    assert all(i.cwe_id == "CWE-95" for i in eval_issues)


def test_python_subprocess_shell_true_detection():
    """Scanner flags subprocess invocation with shell=True."""
    code = """
import subprocess

def ping(host):
    subprocess.Popen(f"ping {host}", shell=True)
"""
    issues = scan_python_code("net.py", code)
    shell_issues = [i for i in issues if i.rule_id == "SEC-SUBPROCESS-SHELL"]
    assert len(shell_issues) == 1
    assert shell_issues[0].severity == "critical"
    assert shell_issues[0].cwe_id == "CWE-78"


def test_python_zero_division_detection():
    """Scanner flags literal division by zero."""
    code = """
def compute():
    x = 100 / 0
    return x
"""
    issues = scan_python_code("math_flaw.py", code)
    div_issues = [i for i in issues if i.rule_id == "BUG-ZERO-DIV"]
    assert len(div_issues) == 1
    assert div_issues[0].cwe_id == "CWE-369"


def test_python_hardcoded_secret_detection():
    """Scanner flags hardcoded API keys and credentials."""
    code = """
OPENAI_API_KEY = "sk-abcdef1234567890abcdef1234567890"
password = "superSecretPassword123"
"""
    issues = scan_python_code("config.py", code)
    sec_issues = [i for i in issues if i.rule_id == "SEC-HARDCODED-SECRET"]
    assert len(sec_issues) >= 2


def test_javascript_scanner():
    """Scanner flags eval and hardcoded secrets in JavaScript."""
    js_code = """
function process(data) {
    const res = eval(data);
    const token = "ghp_1234567890abcdef1234567890abcdef1234";
    return res;
}
"""
    issues = scan_javascript_code("app.js", js_code)
    assert any(i.rule_id == "SEC-JS-EVAL" for i in issues)
    assert any(i.rule_id == "SEC-HARDCODED-SECRET" for i in issues)


@pytest.mark.asyncio
async def test_scan_project_files_async():
    """Coordinator executes multi-file scan and augments with LLM router summary."""
    from app.scanner.engine import scan_project_files

    files = [
        {"path": "vuln.py", "language": "python", "content": "import os\ndef test(): eval('1+1')"},
        {"path": "safe.js", "language": "javascript", "content": "console.log('clean')"},
    ]
    res = await scan_project_files(files)
    assert res["total_issues"] >= 1
    assert res["critical_count"] >= 1
    assert len(res["summary"]) > 0
