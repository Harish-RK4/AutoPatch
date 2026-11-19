"""
Scanner Engine Coordinator
Coordinates multi-file scanning, aggregates static findings, and pairs findings
with the LLM router for root-cause explanations.
"""

from typing import Any

from app.llm.base import LLMMessage, LLMRequest
from app.llm.router import llm_router
from app.scanner.models import ScanIssue
from app.scanner.rules import scan_javascript_code, scan_python_code


async def scan_project_files(files: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Run static analysis across all project files and augment findings with
    autonomous explanations.
    """
    all_issues: list[ScanIssue] = []

    for f in files:
        path = f.get("path") or f.get("filename") or "unknown"
        lang = (f.get("language") or "").lower()
        content = f.get("content") or ""

        if not content or f.get("is_binary"):
            continue

        if lang in ("python", "py"):
            issues = scan_python_code(path, content)
            all_issues.extend(issues)
        elif lang in ("javascript", "js", "typescript", "ts"):
            issues = scan_javascript_code(path, content)
            all_issues.extend(issues)

    # Convert issues to serialized representation
    serialized_issues = [issue.to_dict() for issue in all_issues]

    # Generate autonomous root-cause summary using LLM router (Mock in P1, real in P3)
    explanation_summary = ""
    if serialized_issues:
        prompt_text = (
            f"Analyze {len(serialized_issues)} detected flaws: "
            + ", ".join([f"{i['rule_id']} in {i['file_path']}:{i['line_number']}" for i in serialized_issues[:5]])
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
            explanation_summary = "Autonomous scanner identified defect signatures across active project files."

    return {
        "total_issues": len(serialized_issues),
        "issues": serialized_issues,
        "critical_count": sum(1 for i in all_issues if i.severity == "critical"),
        "high_count": sum(1 for i in all_issues if i.severity == "high"),
        "medium_count": sum(1 for i in all_issues if i.severity == "medium"),
        "summary": explanation_summary,
    }
