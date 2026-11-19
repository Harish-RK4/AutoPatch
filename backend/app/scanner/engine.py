"""
Scanner Engine Coordinator
Coordinates multi-file scanning, aggregates static findings, dynamic sandbox verification,
and pairs findings with the LLM router for root-cause explanations.
"""

import re
import uuid
from typing import Any

from app.llm.base import LLMMessage, LLMRequest
from app.llm.router import llm_router
from app.scanner.models import ScanIssue
from app.scanner.rules import scan_javascript_code, scan_python_code


def parse_traceback_or_error(trace_text: str, file_path: str, lines: list[str]) -> ScanIssue | None:
    """Parses exception tracebacks or error messages and creates an exact ScanIssue."""
    if not trace_text:
        return None

    # Line number extraction: e.g. line 4
    line_match = re.search(r"line (\d+)", trace_text, re.IGNORECASE)
    line_no = int(line_match.group(1)) if line_match else 1
    if line_no < 1 or line_no > max(1, len(lines)):
        line_no = 1
    snippet = lines[line_no - 1].strip() if line_no <= len(lines) else ""

    # Exception type extraction: e.g. ZeroDivisionError: division by zero
    exc_match = re.search(r"([A-Za-z_]+(?:Error|Exception))(?::\s*(.*))?", trace_text)
    if exc_match:
        exc_type = exc_match.group(1)
        exc_msg = (exc_match.group(2) or "").strip()
        rule_map = {
            "ZeroDivisionError": ("BUG-ZERO-DIV", "high", "arithmetic"),
            "NameError": ("BUG-NAME-ERR", "high", "runtime"),
            "UnboundLocalError": ("BUG-NAME-ERR", "high", "runtime"),
            "TypeError": ("BUG-TYPE-ERR", "high", "types"),
            "IndexError": ("BUG-INDEX-ERR", "high", "bounds"),
            "KeyError": ("BUG-KEY-ERR", "high", "lookup"),
            "AttributeError": ("BUG-ATTR-ERR", "high", "runtime"),
            "ValueError": ("BUG-VALUE-ERR", "high", "validation"),
            "SyntaxError": ("SYNTAX-ERR", "critical", "syntax"),
            "IndentationError": ("SYNTAX-ERR", "critical", "syntax"),
            "TabError": ("SYNTAX-ERR", "critical", "syntax"),
        }
        rule_id, sev, cat = rule_map.get(exc_type, ("RUNTIME-CRASH", "high", "runtime"))
        full_msg = f"{exc_type}: {exc_msg}" if exc_msg else exc_type
        return ScanIssue(
            id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
            file_path=file_path,
            line_number=line_no,
            column=1,
            rule_id=rule_id,
            severity=sev,
            category=cat,
            message=full_msg,
            snippet=snippet,
            cwe_id="CWE-754",
            suggested_fix=f"Resolve {exc_type} on line {line_no}.",
        )
    return None


async def scan_project_files(files: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Run static analysis and dynamic sandbox reproduction across all project files.
    Augments findings with autonomous explanations.
    """
    all_issues: list[ScanIssue] = []

    for f in files:
        path = f.get("path") or f.get("file_path") or f.get("filename") or "unknown"
        lang = (f.get("language") or "").lower()
        content = f.get("content") or ""

        # Auto-detect language from extension or content if not explicitly set
        if not lang or lang in ("unknown", "text", "plaintext"):
            lower_path = path.lower()
            lower_content = content.lower()
            if (
                lower_path.endswith((".py", ".pyw"))
                or "python" in lower_path
                or any(kw in lower_content for kw in ("print(", "def ", "import ", "class ", "elif "))
            ):
                lang = "python"
                f["language"] = "python"
            elif (
                lower_path.endswith((".js", ".jsx", ".ts", ".tsx"))
                or any(kw in lower_content for kw in ("console.log", "function ", "const ", "let ", "require("))
            ):
                lang = "javascript"
                f["language"] = "javascript"

        if not content or f.get("is_binary"):
            continue

        lines = content.splitlines()

        # Step 1: Static AST Analysis
        if lang in ("python", "py"):
            issues = scan_python_code(path, content)
            all_issues.extend(issues)
        elif lang in ("javascript", "js", "typescript", "ts"):
            issues = scan_javascript_code(path, content)
            all_issues.extend(issues)

        # Step 2: Dynamic Sandbox Execution Check
        # If static checks found 0 issues, execute code in sandbox to verify runtime viability
        if not all_issues and lang in ("python", "py", "javascript", "js"):
            try:
                from app.sandbox.resolver import get_sandbox_runner

                runner = get_sandbox_runner()
                exec_res = runner.execute_code(lang, content, timeout_sec=5.0)
                if exec_res.exit_code != 0 and (exec_res.stderr or exec_res.timed_out):
                    err_output = exec_res.stderr or "Execution timed out"
                    parsed = parse_traceback_or_error(err_output, path, lines)
                    if parsed:
                        all_issues.append(parsed)
                    else:
                        all_issues.append(
                            ScanIssue(
                                id=f"ISSUE-{uuid.uuid4().hex[:6].upper()}",
                                file_path=path,
                                line_number=1,
                                column=1,
                                rule_id="RUNTIME-CRASH",
                                severity="high",
                                category="runtime",
                                message=f"Runtime crash (exit code {exec_res.exit_code}): {err_output[:140].strip()}",
                                snippet=lines[0] if lines else "",
                                cwe_id="CWE-754",
                                suggested_fix="Guard runtime execution against unhandled exceptions.",
                            )
                        )
            except Exception:
                pass

    # Convert issues to serialized representation
    serialized_issues = [issue.to_dict() for issue in all_issues]

    # Generate autonomous root-cause summary using LLM router
    explanation_summary = ""
    if serialized_issues:
        prompt_text = f"Analyze {len(serialized_issues)} detected flaws: " + ", ".join(
            [
                f"{i['rule_id']} in {i['file_path']}:{i['line_number']}"
                for i in serialized_issues[:5]
            ]
        )
        try:
            llm_response = await llm_router.complete(
                LLMRequest(
                    agent_role="scanner",
                    messages=[LLMMessage(role="user", content=prompt_text)],
                )
            )
            explanation_summary = llm_response.content
        except (RuntimeError, ValueError, KeyError):
            explanation_summary = (
                "Autonomous scanner identified defect signatures across active project files."
            )

    return {
        "total_issues": len(serialized_issues),
        "issues": serialized_issues,
        "critical_count": sum(1 for i in all_issues if i.severity == "critical"),
        "high_count": sum(1 for i in all_issues if i.severity == "high"),
        "medium_count": sum(1 for i in all_issues if i.severity == "medium"),
        "summary": explanation_summary,
    }
