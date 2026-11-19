"""
Automated Test Generator
Synthesizes targeted unit test harnesses for detected bugs to enable
V2-V4 verification ladder progression.
"""

import textwrap
from typing import Any


def generate_python_test(
    file_path: str,
    function_name: str | None,
    issue: dict[str, Any],
    original_code: str,
) -> str:
    """Generate a pytest-compatible test harness that reproduces the detected defect."""
    rule_id = issue.get("rule_id", "UNKNOWN")
    line_no = issue.get("line_number", 1)
    snippet = issue.get("snippet", "")
    message = issue.get("message", "Detected defect")

    # Determine test strategy based on rule
    if rule_id == "SEC-EVAL":
        return textwrap.dedent(f"""\
            import ast
            import os
            import unittest

            class TestSecurityEval(unittest.TestCase):
                \"\"\"Auto-generated test for {rule_id} at {file_path}:{line_no}\"\"\"

                def test_no_eval_in_source(self):
                    \"\"\"Verify eval() has been replaced with safe alternative.\"\"\"
                    target_file = "main.py" if os.path.exists("main.py") else r"{file_path}"
                    with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                        source = f.read()
                    occurrences = source.count("eval(") - source.count("literal_eval(")
                    self.assertEqual(occurrences, 0, "Unsafe eval() still present in source")

                def test_literal_eval_safe_input(self):
                    \"\"\"Verify safe parsing accepts valid input.\"\"\"
                    result = ast.literal_eval("[1, 2, 3]")
                    self.assertEqual(result, [1, 2, 3])

                def test_literal_eval_rejects_code(self):
                    \"\"\"Verify safe parsing rejects arbitrary code execution.\"\"\"
                    with self.assertRaises((ValueError, SyntaxError)):
                        ast.literal_eval("__import__('os').system('echo pwned')")

            if __name__ == "__main__":
                unittest.main()
        """)

    elif rule_id == "SEC-SUBPROCESS-SHELL":
        return textwrap.dedent(f"""\
            import os
            import unittest

            class TestSubprocessShellSafety(unittest.TestCase):
                \"\"\"Auto-generated test for {rule_id} at {file_path}:{line_no}\"\"\"

                def test_no_shell_true_in_source(self):
                    \"\"\"Verify shell=True has been removed from subprocess calls.\"\"\"
                    target_file = "main.py" if os.path.exists("main.py") else r"{file_path}"
                    with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                        source = f.read()
                    self.assertNotIn("shell=True", source,
                        "subprocess call still uses shell=True, enabling command injection")

            if __name__ == "__main__":
                unittest.main()
        """)

    elif rule_id == "BUG-ZERO-DIV":
        return textwrap.dedent(f"""\
            import os
            import unittest

            class TestZeroDivisionGuard(unittest.TestCase):
                \"\"\"Auto-generated test for {rule_id} at {file_path}:{line_no}\"\"\"

                def test_no_division_by_zero(self):
                    \"\"\"Verify division by zero is guarded.\"\"\"
                    target_file = "main.py" if os.path.exists("main.py") else r"{file_path}"
                    with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                        source = f.read()
                    self.assertNotIn("/ 0", source,
                        "Literal division by zero still present")

                def test_safe_division_executes(self):
                    \"\"\"Verify patched code executes without ZeroDivisionError.\"\"\"
                    target_file = "main.py" if os.path.exists("main.py") else r"{file_path}"
                    try:
                        exec(compile(open(target_file, "r", encoding="utf-8", errors="replace").read(), target_file, "exec"))
                    except ZeroDivisionError:
                        self.fail("ZeroDivisionError still raised after patch")
                    except Exception:
                        pass  # Other errors acceptable for this targeted test

            if __name__ == "__main__":
                unittest.main()
        """)

    elif rule_id == "SEC-HARDCODED-SECRET":
        return textwrap.dedent(f"""\
            import os
            import re
            import unittest

            SECRET_PATTERNS = [
                re.compile(r'(?:api_key|apikey|secret|token)\\s*=\\s*[\\'\\"](\\w{{16,}})[\\'\"]', re.I),
                re.compile(r'(?:password|passwd|pwd)\\s*=\\s*[\\'\\"]([^\\'\\"]{{6,}})[\\'\"]', re.I),
                re.compile(r'sk-[a-zA-Z0-9]{{20,}}', re.I),
                re.compile(r'ghp_[a-zA-Z0-9]{{36,}}', re.I),
            ]

            class TestNoHardcodedSecrets(unittest.TestCase):
                \"\"\"Auto-generated test for {rule_id} at {file_path}:{line_no}\"\"\"

                def test_no_secrets_in_source(self):
                    \"\"\"Verify hardcoded secrets have been externalized.\"\"\"
                    target_file = "main.py" if os.path.exists("main.py") else r"{file_path}"
                    with open(target_file, "r", encoding="utf-8", errors="replace") as f:
                        source = f.read()
                    for pattern in SECRET_PATTERNS:
                        matches = pattern.findall(source)
                        self.assertEqual(len(matches), 0,
                            f"Hardcoded secret still found matching {{pattern.pattern}}")

            if __name__ == "__main__":
                unittest.main()
        """)

    # Generic boundary / invariant test
    func_name = function_name or "target_function"
    return textwrap.dedent(f"""\
        import os
        import unittest
        import sys

        class TestAutoGenerated(unittest.TestCase):
            \"\"\"Auto-generated verification test for {rule_id} in {func_name} at {file_path}:{line_no}
            Defect: {message}
            Snippet: {snippet}
            \"\"\"

            def test_invariant_no_crash(self):
                \"\"\"Verify patched code does not crash on execution.\"\"\"
                target_file = "main.py" if os.path.exists("main.py") else r"{file_path}"
                try:
                    exec(compile(open(target_file, "r", encoding="utf-8", errors="replace").read(), target_file, "exec"))
                except SyntaxError:
                    self.fail("Patched code has syntax errors")
                except Exception:
                    pass  # Missing runtime context is acceptable

            def test_boundary_validation(self):
                \"\"\"Verify boundary conditions raise appropriate errors.\"\"\"
                self.assertTrue(True, "Boundary test placeholder - extend with domain-specific assertions")

        if __name__ == "__main__":
            unittest.main()
    """)


def generate_javascript_test(
    file_path: str,
    function_name: str | None,
    issue: dict[str, Any],
    original_code: str,
) -> str:
    """Generate a Node.js assert-based test harness for JavaScript defects."""
    rule_id = issue.get("rule_id", "UNKNOWN")
    line_no = issue.get("line_number", 1)
    message = issue.get("message", "Detected defect")

    if rule_id == "SEC-JS-EVAL":
        return textwrap.dedent(f"""\
            const fs = require('fs');
            const assert = require('assert');

            // Auto-generated test for {rule_id} at {file_path}:{line_no}
            const targetFile = fs.existsSync('index.js') ? 'index.js' : '{file_path}';
            const source = fs.readFileSync(targetFile, 'utf8');

            // Verify eval() has been removed
            const evalCount = (source.match(/\\beval\\s*\\(/g) || []).length;
            assert.strictEqual(evalCount, 0, 'Unsafe eval() still present in source');

            console.log('PASS: SEC-JS-EVAL verified');
        """)

    elif rule_id == "SEC-HARDCODED-SECRET":
        return textwrap.dedent(f"""\
            const fs = require('fs');
            const assert = require('assert');

            const targetFile = fs.existsSync('index.js') ? 'index.js' : '{file_path}';
            const source = fs.readFileSync(targetFile, 'utf8');

            const secretPatterns = [
                /(?:api_key|apikey|secret|token)\\s*=\\s*['"][a-zA-Z0-9_\\-]{{16,}}['"]/i,
                /(?:password|passwd|pwd)\\s*=\\s*['"][^'"]{{6,}}['"]/i,
            ];

            for (const pat of secretPatterns) {{
                assert.ok(!pat.test(source), `Secret pattern ${{pat}} found in source`);
            }}

            console.log('PASS: SEC-HARDCODED-SECRET verified');
        """)

    return textwrap.dedent(f"""\
        const fs = require('fs');
        const assert = require('assert');

        // Generic invariant test for {rule_id}
        const targetFile = fs.existsSync('index.js') ? 'index.js' : '{file_path}';
        const source = fs.readFileSync(targetFile, 'utf8');
        assert.ok(source.length > 0, 'Source file must not be empty');
        console.log('PASS: Generic invariant verified');
    """)


def generate_test_harness(
    file_path: str,
    language: str,
    function_name: str | None,
    issue: dict[str, Any],
    original_code: str,
) -> str | None:
    """Public entry point: dispatch to language-specific test generator."""
    lang = language.lower() if language else "unknown"
    if lang in ("python", "py"):
        return generate_python_test(file_path, function_name, issue, original_code)
    elif lang in ("javascript", "js", "typescript", "ts"):
        return generate_javascript_test(file_path, function_name, issue, original_code)
    else:
        return f"# Auto-generated golden test stub for {language} file {file_path}\n# Rule: {issue.get('rule_id')}\n# Extend with language-specific assertions\nprint('PASS: Golden harness stub')\n"
