"""
Isolated Demo Seed Data
STRICTLY FOR DEMO / TESTING MODE (DEMO_MODE=true).
Never imported into production pipelines or written to live production databases.
"""

from typing import Any

DEMO_PROJECTS: list[dict[str, Any]] = [
    {
        "id": "demo-proj-001",
        "name": "Python Marks Calculator",
        "language": "python",
        "source_type": "demo",
        "status": "ready",
        "description": "Student marks percentage calculator with unvalidated input bounds.",
        "created_at": "2026-11-19T05:00:00Z",
        "files": [
            {
                "file_path": "calculator.py",
                "content": (
                    "# Student Marks Percentage Calculator\n"
                    "def get_input(raw_marks):\n"
                    "    return float(raw_marks)\n\n"
                    "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n"
                    "    # Origin line: bad input accepted on line 5\n"
                    "    # Crash line: line 12 evaluates without boundary assertion\n"
                    "    percentage = (marks / total) * 100.0\n"
                    "    return percentage\n"
                ),
            }
        ],
    },
    {
        "id": "demo-proj-002",
        "name": "JavaScript User Directory",
        "language": "javascript",
        "source_type": "demo",
        "status": "ready",
        "description": "User profile lookup with undefined property crash on empty records.",
        "created_at": "2026-11-19T05:10:00Z",
        "files": [
            {
                "file_path": "userDirectory.js",
                "content": (
                    "function getUserInitials(user) {\n"
                    "  // Crash: user.name is undefined on anonymous profiles\n"
                    "  const parts = user.name.split(' ');\n"
                    "  return parts[0][0] + parts[1][0];\n"
                    "}\n"
                    "module.exports = { getUserInitials };\n"
                ),
            }
        ],
    },
    {
        "id": "demo-proj-003",
        "name": "C Memory Buffer Utility",
        "language": "c",
        "source_type": "demo",
        "status": "ready",
        "description": "Safe string copy utility with missing null-terminator byte.",
        "created_at": "2026-11-19T05:20:00Z",
        "files": [
            {
                "file_path": "buffer.c",
                "content": (
                    "#include <stdio.h>\n"
                    "#include <string.h>\n\n"
                    "void copy_buffer(char *dest, const char *src, size_t n) {\n"
                    "    strncpy(dest, src, n);\n"
                    "    // Defect: dest[n - 1] is not explicitly null terminated\n"
                    "}\n"
                ),
            }
        ],
    },
    {
        "id": "demo-proj-004",
        "name": "Student Assessment Dataset",
        "language": "dataset",
        "source_type": "demo",
        "status": "ready",
        "description": "Messy CSV with negative scores, missing values, and corrupted date formats.",
        "created_at": "2026-11-19T05:30:00Z",
        "files": [
            {
                "file_path": "grades.csv",
                "content": (
                    "student_id,name,score,submission_date\n"
                    "101,Alice Johnson,88.5,2026-10-01\n"
                    "102,Bob Smith,-15.0,2026/10/02\n"
                    "103,Charlie Brown,,02-10-2026\n"
                    "104,Diana Prince,105.0,2026-10-04\n"
                    "105,Evan Wright,92.0,2026-10-05\n"
                ),
            }
        ],
    },
]

DEMO_BUGS: list[dict[str, Any]] = [
    {
        "id": "demo-bug-001",
        "project_id": "demo-proj-001",
        "title": "Missing bounds validation on student marks",
        "description": "calculate_percentage() allows negative marks and scores > total, resulting in invalid percentages (-5% or 105%).",
        "file_path": "calculator.py",
        "line_start": 5,
        "line_end": 12,
        "origin_line": 5,
        "crash_line": 12,
        "trigger_input": {"marks": -5.0, "total": 100.0},
        "failure_type": "missing_bounds_check",
        "category": "logic",
        "state": "confirmed",
        "severity": "high",
        "severity_score": 8.0,
        "confidence_score": 100.0,
        "priority_rank": 1,
        "verification_level": "V4",
        "root_cause": {
            "summary": "calculate_percentage assumes input marks are non-negative and <= total without validation.",
            "trigger_input": {"marks": -5.0, "total": 100.0},
            "trace": [
                {"step": 1, "line": 2, "description": "get_input receives raw string '-5'"},
                {
                    "step": 2,
                    "line": 5,
                    "description": "calculate_percentage called with marks=-5.0",
                },
                {
                    "step": 3,
                    "line": 12,
                    "description": "Formula computes (-5.0 / 100.0) * 100.0 = -5.0",
                },
            ],
            "beginner": "The calculator trusted any number entered, even negative scores like -5 or impossibly high scores like 105%. We added a check at the entrance to ensure only real scores between 0 and 100% are computed.",
            "developer": "calculate_percentage lacked invariant precondition validation. When marks < 0 or marks > total, percentage was computed linearly yielding out-of-range float values. The patch inserts an explicit bounds assertion raising ValueError.",
            "manager": "Resolved arithmetic logic defect that could corrupt student grading reports and GPA calculations with negative or overflow percentages. Fixed with low risk and validated by automated tests.",
        },
        "blast_radius": {
            "functions": ["calculate_percentage", "generate_report_card"],
            "tests": ["test_calculator.py::test_negative_marks"],
            "files": ["calculator.py"],
        },
    }
]

DEMO_PATCHES: list[dict[str, Any]] = [
    {
        "id": "demo-patch-001",
        "bug_id": "demo-bug-001",
        "candidate_no": 1,
        "diff": (
            "--- a/calculator.py\n"
            "+++ b/calculator.py\n"
            "@@ -5,3 +5,6 @@\n"
            " def calculate_percentage(marks: float, total: float = 100.0) -> float:\n"
            "+    if not (0.0 <= marks <= total):\n"
            "+        raise ValueError('Marks must be between 0.0 and total')\n"
            "     percentage = (marks / total) * 100.0\n"
            "     return percentage\n"
        ),
        "original_code": "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n    percentage = (marks / total) * 100.0\n    return percentage",
        "patched_code": "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n    if not (0.0 <= marks <= total):\n        raise ValueError('Marks must be between 0.0 and total')\n    percentage = (marks / total) * 100.0\n    return percentage",
        "reason": "Add explicit ValueError precondition bounds check before percentage calculation.",
        "risk_level": "low",
        "rank": 1,
        "selected": True,
        "git_branch": "patch/bug-001-candidate-1",
        "status": "proposed",
        "verification_level": "V4",
        "hunks": [
            {
                "hunk_no": 1,
                "file_path": "calculator.py",
                "line_start": 5,
                "line_end": 7,
                "original_code": "def calculate_percentage(marks: float, total: float = 100.0) -> float:",
                "new_code": "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n    if not (0.0 <= marks <= total):\n        raise ValueError('Marks must be between 0.0 and total')",
                "why_wrong": "The original function allowed any numerical value for marks, including negative numbers or values exceeding the maximum.",
                "why_fix_works": "Adding an immediate validation guard ensures invalid numbers raise ValueError before corrupting calculations.",
                "if_not_fixed": "Negative marks will produce negative percentages; marks > total will produce percentages above 100% in student report cards.",
                "side_effects": [
                    "Callers must handle ValueError when supplying out-of-range student scores."
                ],
                "alternatives": [
                    "Candidate 2 clamps out-of-bound values instead of raising, but silent clamping conceals data entry errors."
                ],
            }
        ],
        "proof_bundle": {
            "repro_test_passes": True,
            "full_suite_passes": True,
            "suite_count": 14,
            "static_scan_clean": True,
            "verification_ladder": "V4 Proven",
        },
    }
]
