"""
Reproducer Agent
Attempts to reproduce a detected defect by synthesizing minimal trigger inputs
and running them in the sandbox to confirm the bug is real (not a false positive).
"""

from typing import Any

from app.sandbox.base import ExecutionResult, SandboxRunner


def _build_python_repro_script(issue: dict[str, Any], original_code: str) -> str:
    """Build a minimal Python script that triggers the detected defect."""
    rule_id = issue.get("rule_id", "")
    snippet = issue.get("snippet", "")

    if rule_id == "SEC-EVAL":
        return (
            "import sys\n"
            "# Reproducer: attempt eval() with dangerous input\n"
            "try:\n"
            f"    {snippet}\n"
            "    print('BUG_REPRODUCED: eval executed dangerous input')\n"
            "    sys.exit(1)\n"
            "except Exception as e:\n"
            "    print(f'SAFE: {e}')\n"
            "    sys.exit(0)\n"
        )

    if rule_id == "BUG-ZERO-DIV":
        return (
            "import sys\n"
            "# Reproducer: trigger division by zero\n"
            "try:\n"
            f"    result = {snippet}\n"
            "    print('BUG_NOT_REPRODUCED: no exception')\n"
            "    sys.exit(0)\n"
            "except ZeroDivisionError:\n"
            "    print('BUG_REPRODUCED: ZeroDivisionError triggered')\n"
            "    sys.exit(1)\n"
        )

    if rule_id == "SEC-SUBPROCESS-SHELL":
        return (
            "import sys\n"
            "# Reproducer: check for shell=True in source\n"
            f"source = '''{original_code}'''\n"
            "if 'shell=True' in source:\n"
            "    print('BUG_REPRODUCED: shell=True found')\n"
            "    sys.exit(1)\n"
            "else:\n"
            "    print('SAFE: no shell=True')\n"
            "    sys.exit(0)\n"
        )

    if rule_id == "SEC-HARDCODED-SECRET":
        return (
            "import sys, re\n"
            "# Reproducer: scan for hardcoded secrets\n"
            f"source = '''{original_code}'''\n"
            "patterns = [\n"
            '    r"(?:api_key|secret|token)\\s*=\\s*[\'\\"]\\w{16,}[\'\\"]",\n'
            '    r"(?:password|passwd)\\s*=\\s*[\'\\"][^\'\\"]{6,}[\'\\"]",\n'
            "]\n"
            "for p in patterns:\n"
            "    if re.search(p, source, re.I):\n"
            "        print('BUG_REPRODUCED: hardcoded secret found')\n"
            "        sys.exit(1)\n"
            "print('SAFE: no secrets')\n"
            "sys.exit(0)\n"
        )

    # Generic reproducer: execute and check for crashes
    return (
        "import sys\n"
        "# Generic reproducer: execute source and check for runtime errors\n"
        "try:\n"
        f"    exec(compile('''{original_code}''', 'source.py', 'exec'))\n"
        "    print('BUG_NOT_REPRODUCED: executed without crash')\n"
        "    sys.exit(0)\n"
        "except SyntaxError as e:\n"
        "    print(f'BUG_REPRODUCED: SyntaxError: {e}')\n"
        "    sys.exit(1)\n"
        "except Exception as e:\n"
        "    print(f'BUG_REPRODUCED: {type(e).__name__}: {e}')\n"
        "    sys.exit(1)\n"
    )


def _build_js_repro_script(issue: dict[str, Any], original_code: str) -> str:
    """Build a minimal JavaScript script that triggers the detected defect."""
    rule_id = issue.get("rule_id", "")

    if rule_id == "SEC-JS-EVAL":
        return (
            "const fs = require('fs');\n"
            "const source = fs.readFileSync(process.argv[2] || 'source.js', 'utf8');\n"
            "if (source.match(/\\beval\\s*\\(/)) {\n"
            "  console.log('BUG_REPRODUCED: eval() found');\n"
            "  process.exit(1);\n"
            "} else {\n"
            "  console.log('SAFE: no eval()');\n"
            "  process.exit(0);\n"
            "}\n"
        )

    # Generic JS reproducer
    return (
        "try {\n"
        f"  eval(`{original_code.replace('`', '\\`')}`);\n"
        "  console.log('BUG_NOT_REPRODUCED: executed without error');\n"
        "  process.exit(0);\n"
        "} catch(e) {\n"
        "  console.log('BUG_REPRODUCED: ' + e.constructor.name + ': ' + e.message);\n"
        "  process.exit(1);\n"
        "}\n"
    )


class ReproducerAgent:
    """Attempts to reproduce a detected defect in the sandbox."""

    def __init__(self, runner: SandboxRunner):
        self.runner = runner

    def reproduce(
        self,
        issue: dict[str, Any],
        language: str,
        original_code: str,
    ) -> dict[str, Any]:
        """
        Run a reproduction attempt.
        Returns a dict with:
        - reproduced: bool — True if the bug was confirmed
        - exit_code: int
        - stdout: str
        - stderr: str
        - duration_ms: float
        """
        if language in ("python",):
            repro_script = _build_python_repro_script(issue, original_code)
        elif language in ("javascript", "typescript"):
            repro_script = _build_js_repro_script(issue, original_code)
        else:
            return {
                "reproduced": False,
                "exit_code": -1,
                "stdout": f"Unsupported language for reproduction: {language}",
                "stderr": "",
                "duration_ms": 0.0,
                "language": language,
            }

        result: ExecutionResult = self.runner.execute_code(language, repro_script)

        reproduced = result.exit_code != 0 or "BUG_REPRODUCED" in result.stdout

        return {
            "reproduced": reproduced,
            "exit_code": result.exit_code,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "duration_ms": result.duration_ms,
            "language": language,
            "runner_type": self.runner.runner_type,
            "runner_label": self.runner.runner_label,
        }
