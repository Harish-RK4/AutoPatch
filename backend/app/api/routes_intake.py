"""
Crash-to-Fix Intake API
Accepts raw runtime stack traces or structured Sentry crash events,
extracts execution context and crash lines, and seeds reproducible defect repair tasks.
"""

import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.patcher.explanation import synthesize_explanation_bundle
from app.security.scanner import get_cwe_owasp_tag

router = APIRouter(prefix="/intake", tags=["Intake"])


class CrashIntakeRequest(BaseModel):
    project_id: str = Field("demo-proj-001", description="Target project ID")
    raw_trace: str | None = Field(
        None,
        description="Raw multiline Python/Node stack trace string",
        examples=[
            "Traceback (most recent call last):\n  File \"calculator.py\", line 12, in calculate_grade\n    raise ValueError('Marks cannot be negative')\nValueError: Marks cannot be negative: -5.0"
        ],
    )
    sentry_event: dict[str, Any] | None = Field(
        None, description="Optional structured Sentry webhook JSON payload"
    )
    environment: str = Field("production", description="Environment where crash occurred")


def parse_raw_trace(trace: str) -> dict[str, Any]:
    """Extracts offending file, crash line, and exception message from a raw stack trace."""
    lines = trace.strip().splitlines()
    crash_file = "unknown"
    crash_line = 1
    func_name = "unknown"
    exception_type = "RuntimeError"
    exception_message = ""

    # Python trace matching: File "...", line X, in Y
    py_matches = re.findall(r'File "([^"]+)", line (\d+)(?:, in (\w+))?', trace)
    if py_matches:
        last_frame = py_matches[-1]
        crash_file = last_frame[0]
        crash_line = int(last_frame[1])
        if len(last_frame) > 2 and last_frame[2]:
            func_name = last_frame[2]

    # Find the last non-empty line as exception message
    if lines:
        last_line = lines[-1].strip()
        if ":" in last_line:
            parts = last_line.split(":", 1)
            exception_type = parts[0].strip()
            exception_message = parts[1].strip()
        else:
            exception_type = "Exception"
            exception_message = last_line

    return {
        "file": crash_file,
        "line": crash_line,
        "function": func_name,
        "exception_type": exception_type,
        "exception_message": exception_message,
    }


@router.post("/crash")
async def ingest_crash(payload: CrashIntakeRequest) -> dict[str, Any]:
    """
    Intakes a crash report, isolates crash line and exception type,
    assigns CWE/OWASP classification, and initializes a defect diagnosis.
    """
    trace_info: dict[str, Any] = {}

    if payload.sentry_event:
        # Extract from Sentry event format
        exc_values = payload.sentry_event.get("exception", {}).get("values", [])
        if exc_values:
            primary_exc = exc_values[0]
            stack = primary_exc.get("stacktrace", {}).get("frames", [])
            last_frame = stack[-1] if stack else {}
            trace_info = {
                "file": last_frame.get("filename", "unknown"),
                "line": last_frame.get("lineno", 1),
                "function": last_frame.get("function", "unknown"),
                "exception_type": primary_exc.get("type", "SentryError"),
                "exception_message": primary_exc.get("value", ""),
            }
    elif payload.raw_trace:
        trace_info = parse_raw_trace(payload.raw_trace)
    else:
        # Default fallback sample
        trace_info = {
            "file": "calculator.py",
            "line": 12,
            "function": "calculate_grade",
            "exception_type": "ValueError",
            "exception_message": "Marks cannot be negative: -5.0",
        }

    # Map security classifications
    cwe_tag = get_cwe_owasp_tag("missing_bounds_check")

    # Generate synthetic root-cause analysis
    bug_id = f"crash-bug-{abs(hash(str(trace_info))) % 100000:05d}"
    explanation = synthesize_explanation_bundle(
        bug_id=bug_id,
        file_path=trace_info["file"],
        source_content="def calculate_grade(marks):\n    if marks < 0:\n        raise ValueError('Negative marks')",
        line_start=max(1, trace_info["line"] - 5),
        line_end=trace_info["line"],
        category=trace_info["exception_type"],
    )

    return {
        "status": "intake_successful",
        "bug_id": bug_id,
        "project_id": payload.project_id,
        "environment": payload.environment,
        "extracted_context": trace_info,
        "security_tags": cwe_tag,
        "explanation": explanation.model_dump(),
        "recommended_action": "Proceed to candidate patch generation in isolated sandbox",
    }
