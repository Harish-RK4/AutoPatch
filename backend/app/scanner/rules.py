"""
Static Scanner Rules
Real AST syntax validation, security checks (eval, shell=True, hardcoded secrets),
and logic flaw detectors (zero division, broad exception swallowing).
"""

import ast
import re
import uuid

from app.scanner.models import ScanIssue

# Secret detection regex patterns
SECRET_PATTERNS = [
    (
        re.compile(
            r"""(?:api_key|apikey|secret|token)\s*=\s*['"]([a-zA-Z0-9_\-]{16,})['"]""",
            re.IGNORECASE,
        ),
        "CWE-798",
        "Hardcoded API Key or Secret Token",
    ),
    (
        re.compile(r"""(?:password|passwd|pwd)\s*=\s*['"]([^'"]{6,})['"]""", re.IGNORECASE),
        "CWE-259",
        "Hardcoded Password in Source",
    ),
    (
        re.compile(r"""(?:sk-[a-zA-Z0-9]{20,})""", re.IGNORECASE),
        "CWE-798",
        "Hardcoded OpenAI / Model Secret Key",
    ),
    (
        re.compile(r"""(?:ghp_[a-zA-Z0-9]{36,})""", re.IGNORECASE),
        "CWE-798",
        "Hardcoded GitHub Personal Access Token",
    ),
]


class PythonASTSecurityVisitor(ast.NodeVisitor):
    """Inspects Python AST for dangerous patterns and security flaws."""

    def __init__(self, file_path: str, lines: list[str]):
        self.file_path = file_path
        self.lines = lines
        self.issues: list[ScanIssue] = []

    def visit_For(self, node: ast.For):
        self._check_loop_premature_return(node)
        self.generic_visit(node)

    def visit_While(self, node: ast.While):
        self._check_loop_premature_return(node)
        self.generic_visit(node)

    def _check_loop_premature_return(self, node: ast.For | ast.While):
        for stmt in node.body:
            if isinstance(stmt, ast.If) and stmt.orelse:
                has_if_ret = any(isinstance(s, ast.Return) for s in stmt.body)
                has_else_ret = any(isinstance(s, ast.Return) for s in stmt.orelse)
                if has_if_ret and has_else_ret:
                    line = stmt.lineno
                    snippet = self.lines[line - 1].strip() if line <= len(self.lines) else ""
                    self.issues.append(
                        ScanIssue(
                            id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
                            file_path=self.file_path,
                            line_number=line,
                            column=stmt.col_offset,
                            rule_id="BUG-PREMATURE-RETURN",
                            severity="high",
                            category="logic",
                            message="Premature return in loop: 'else: return' causes loop to exit on the very first non-matching element.",
                            snippet=snippet,
                            cwe_id="CWE-670",
                            suggested_fix="Remove 'else: return None' from inside loop and place 'return None' after loop.",
                        )
                    )

    def visit_Call(self, node: ast.Call):
        # 1. Check for eval() or exec() calls
        if isinstance(node.func, ast.Name) and node.func.id in ("eval", "exec"):
            line = node.lineno
            snippet = self.lines[line - 1].strip() if line <= len(self.lines) else ""
            self.issues.append(
                ScanIssue(
                    id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
                    file_path=self.file_path,
                    line_number=line,
                    column=node.col_offset,
                    rule_id=f"SEC-{node.func.id.upper()}",
                    severity="critical",
                    category="security",
                    message=f"Use of dangerous built-in '{node.func.id}()' allows arbitrary code execution.",
                    snippet=snippet,
                    cwe_id="CWE-95",
                    suggested_fix="Replace with safe parsing (e.g. ast.literal_eval, json.loads).",
                )
            )

        # 2. Check for subprocess.Popen / run / call with shell=True
        if isinstance(node.func, ast.Attribute) and node.func.attr in (
            "Popen",
            "run",
            "call",
            "check_call",
            "check_output",
        ):
            for keyword in node.keywords:
                if (
                    keyword.arg == "shell"
                    and isinstance(keyword.value, ast.Constant)
                    and keyword.value.value is True
                ):
                    line = node.lineno
                    snippet = self.lines[line - 1].strip() if line <= len(self.lines) else ""
                    self.issues.append(
                        ScanIssue(
                            id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
                            file_path=self.file_path,
                            line_number=line,
                            column=node.col_offset,
                            rule_id="SEC-SUBPROCESS-SHELL",
                            severity="critical",
                            category="security",
                            message="Invocation of subprocess with shell=True enables command injection.",
                            snippet=snippet,
                            cwe_id="CWE-78",
                            suggested_fix="Pass command arguments as a list and set shell=False.",
                        )
                    )

        self.generic_visit(node)

    def visit_BinOp(self, node: ast.BinOp):
        # 3. Check for literal division by zero
        if (
            isinstance(node.op, ast.Div)
            and isinstance(node.right, ast.Constant)
            and node.right.value == 0
        ):
            line = node.lineno
            snippet = self.lines[line - 1].strip() if line <= len(self.lines) else ""
            self.issues.append(
                ScanIssue(
                    id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
                    file_path=self.file_path,
                    line_number=line,
                    column=node.col_offset,
                    rule_id="BUG-ZERO-DIV",
                    severity="high",
                    category="correctness",
                    message="Literal division by zero guarantees a ZeroDivisionError at runtime.",
                    snippet=snippet,
                    cwe_id="CWE-369",
                    suggested_fix="Guard denominator against zero before division.",
                )
            )
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler):
        # 4. Check for bare except with pass (silent error swallowing)
        if node.type is None and len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            line = node.lineno
            snippet = self.lines[line - 1].strip() if line <= len(self.lines) else ""
            self.issues.append(
                ScanIssue(
                    id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
                    file_path=self.file_path,
                    line_number=line,
                    column=node.col_offset,
                    rule_id="BUG-SILENT-EXCEPT",
                    severity="medium",
                    category="correctness",
                    message="Bare 'except: pass' silently swallows all exceptions, masking defects.",
                    snippet=snippet,
                    cwe_id="CWE-390",
                    suggested_fix="Catch specific exception types and log or re-raise errors.",
                )
            )
        self.generic_visit(node)


def scan_python_code(file_path: str, code: str) -> list[ScanIssue]:
    """Execute real Python syntax checks, AST security rules, and regex pattern audits."""
    issues: list[ScanIssue] = []
    lines = code.splitlines()

    # 1. Real Syntax Verification
    try:
        tree = ast.parse(code, filename=file_path)
    except SyntaxError as err:
        line_no = err.lineno or 1
        snippet = lines[line_no - 1].strip() if line_no <= len(lines) else (err.text or "").strip()
        issues.append(
            ScanIssue(
                id=f"SYN-{uuid.uuid4().hex[:6].upper()}",
                file_path=file_path,
                line_number=line_no,
                column=err.offset,
                rule_id="SYNTAX-ERR",
                severity="critical",
                category="syntax",
                message=f"Syntax Error: {err.msg}",
                snippet=snippet,
                cwe_id="CWE-1164",
                suggested_fix="Correct the syntax defect at the indicated line and column.",
            )
        )
        return issues  # Cannot run AST checks on unparseable syntax

    # 2. AST Visitor Checks
    visitor = PythonASTSecurityVisitor(file_path, lines)
    visitor.visit(tree)
    issues.extend(visitor.issues)

    # 3. Secret Pattern Audits
    for line_idx, line_text in enumerate(lines, start=1):
        for pattern, cwe, msg in SECRET_PATTERNS:
            match = pattern.search(line_text)
            if match:
                issues.append(
                    ScanIssue(
                        id=f"SEC-{uuid.uuid4().hex[:6].upper()}",
                        file_path=file_path,
                        line_number=line_idx,
                        column=match.start(),
                        rule_id="SEC-HARDCODED-SECRET",
                        severity="high",
                        category="security",
                        message=f"{msg} detected.",
                        snippet=line_text.strip(),
                        cwe_id=cwe,
                        suggested_fix="Externalize secrets to environment variables or secret managers.",
                    )
                )

    return issues


def scan_javascript_code(file_path: str, code: str) -> list[ScanIssue]:
    """Execute static checks on JavaScript / TypeScript code."""
    issues: list[ScanIssue] = []
    lines = code.splitlines()

    # 1. Insecure eval / new Function checks
    eval_pattern = re.compile(r"\b(eval|new\s+Function)\s*\(")
    for line_idx, line_text in enumerate(lines, start=1):
        match = eval_pattern.search(line_text)
        if match:
            issues.append(
                ScanIssue(
                    id=f"SEC-{uuid.uuid4().hex[:6].upper()}",
                    file_path=file_path,
                    line_number=line_idx,
                    column=match.start(),
                    rule_id="SEC-JS-EVAL",
                    severity="critical",
                    category="security",
                    message="Use of 'eval()' or 'new Function()' in JavaScript allows code injection.",
                    snippet=line_text.strip(),
                    cwe_id="CWE-95",
                    suggested_fix="Use JSON.parse() or structured logic instead of dynamic code execution.",
                )
            )

        # 2. Hardcoded secrets
        for pattern, cwe, msg in SECRET_PATTERNS:
            sec_match = pattern.search(line_text)
            if sec_match:
                issues.append(
                    ScanIssue(
                        id=f"SEC-{uuid.uuid4().hex[:6].upper()}",
                        file_path=file_path,
                        line_number=line_idx,
                        column=sec_match.start(),
                        rule_id="SEC-HARDCODED-SECRET",
                        severity="high",
                        category="security",
                        message=f"{msg} detected in JavaScript source.",
                        snippet=line_text.strip(),
                        cwe_id=cwe,
                        suggested_fix="Use process.env or environment configuration for secrets.",
                    )
                )

    return issues
