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
        "description": "Fixed-size circular buffer utility with off-by-one boundary flaw.",
        "created_at": "2026-11-19T05:20:00Z",
        "files": [
            {
                "file_path": "buffer.c",
                "content": (
                    "#include <stdio.h>\n"
                    "#include <string.h>\n"
                    "void copy_buffer(const char *src, char *dst, size_t max_len) {\n"
                    "    // Off-by-one null terminator overflow\n"
                    "    strncpy(dst, src, max_len);\n"
                    "    dst[max_len] = '\\0';\n"
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
            "beginner": "The calculator trusted any number entered, even negative scores like -5 or impossibly high scores like 105%. We added a check at the entrance to ensure only real scores between 0 and 100% are computed.",
            "developer": "calculate_percentage lacked invariant precondition validation. When marks < 0 or marks > total, percentage was computed linearly yielding out-of-range float values. The patch inserts an explicit bounds assertion raising ValueError.",
            "manager": "Resolved arithmetic logic defect that could corrupt student grading reports and GPA calculations with negative or overflow percentages. Fixed with low risk and validated by automated tests.",
        },
        "blast_radius": {
            "functions": ["calculate_percentage", "generate_report_card"],
            "tests": ["test_calculator.py::test_negative_marks"],
            "files": ["calculator.py"],
        },
    },
    {
        "id": "demo-bug-002",
        "project_id": "demo-proj-002",
        "title": "Cannot read property 'split' of undefined",
        "description": "getUserInitials() crashes with TypeError when user object lacks name field.",
        "file_path": "userDirectory.js",
        "line_start": 2,
        "line_end": 4,
        "origin_line": 2,
        "crash_line": 3,
        "trigger_input": {"user": {"id": 42}},
        "failure_type": "null_dereference",
        "category": "type_error",
        "state": "confirmed",
        "severity": "high",
        "severity_score": 7.5,
        "confidence_score": 95.0,
        "priority_rank": 2,
        "verification_level": "V4",
        "root_cause": {
            "summary": "Unchecked optional property access on user profile object.",
            "trigger_input": {"user": {}},
            "beginner": "The code expected every user profile to have a full name, crashing when an anonymous user signed in.",
            "developer": "Missing optional chaining or nullish coalescing guard before calling String.prototype.split.",
            "manager": "Prevented application crashes for users with incomplete profiles.",
        },
        "blast_radius": {
            "functions": ["getUserInitials", "renderAvatar"],
            "tests": ["test_user.js::test_anonymous_user"],
            "files": ["userDirectory.js"],
        },
    },
    {
        "id": "demo-bug-003",
        "project_id": "demo-proj-003",
        "title": "Off-by-one null byte buffer overflow",
        "description": "copy_buffer writes null terminator at dst[max_len], corrupting adjacent memory when buffer size equals max_len.",
        "file_path": "buffer.c",
        "line_start": 3,
        "line_end": 7,
        "origin_line": 4,
        "crash_line": 6,
        "trigger_input": {"buffer_size": 64, "string_len": 64},
        "failure_type": "buffer_overflow",
        "category": "memory",
        "state": "confirmed",
        "severity": "critical",
        "severity_score": 9.0,
        "confidence_score": 85.0,
        "priority_rank": 3,
        "verification_level": "V3",
        "root_cause": {
            "summary": "Array index out of bounds on fixed memory buffer write.",
            "trigger_input": {"max_len": 64},
            "beginner": "Writing a 64-character text into a 64-character slot left no room for the stop signal.",
            "developer": "Destination array bounds violated by writing to index max_len instead of max_len - 1.",
            "manager": "Resolved critical memory safety vulnerability preventing potential heap exploitation.",
        },
        "blast_radius": {
            "functions": ["copy_buffer"],
            "tests": ["test_buffer.c::test_boundary_write"],
            "files": ["buffer.c"],
        },
    },
    {
        "id": "demo-bug-004",
        "project_id": "demo-proj-004",
        "title": "Negative score anomaly and malformed date format",
        "description": "grades.csv row 2 contains score -15.0 and row 3 contains unparseable date 02-10-2026.",
        "file_path": "grades.csv",
        "line_start": 2,
        "line_end": 4,
        "origin_line": 2,
        "crash_line": 3,
        "trigger_input": {"row": 2, "raw_score": -15.0},
        "failure_type": "data_corruption",
        "category": "dataset",
        "state": "confirmed",
        "severity": "medium",
        "severity_score": 6.5,
        "confidence_score": 80.0,
        "priority_rank": 4,
        "verification_level": "V3",
        "root_cause": {
            "summary": "Corrupt negative score and date format variance in tabular ingest.",
            "trigger_input": {"score": -15.0},
            "beginner": "Some student score rows had negative numbers and mixed-up date formats that confused the report generator.",
            "developer": "Inconsistent date format strings (YYYY/MM/DD vs DD-MM-YYYY) and unvalidated negative float values.",
            "manager": "Corrected student dataset anomalies ensuring clean analytics aggregation.",
        },
        "blast_radius": {
            "functions": ["parse_grades_csv", "compute_class_median"],
            "tests": ["test_ingestion.py::test_dataset_cleaning"],
            "files": ["grades.csv"],
        },
    },
    {
        "id": "demo-bug-005",
        "project_id": "demo-proj-001",
        "title": "Floating-point precision rounding variance in GPA aggregation",
        "description": "Binary float accumulation produces 89.99999999999999 instead of 90.0 in cumulative GPA calculation.",
        "file_path": "calculator.py",
        "line_start": 18,
        "line_end": 22,
        "origin_line": 18,
        "crash_line": 21,
        "trigger_input": {"scores": [89.1, 0.9]},
        "failure_type": "precision_loss",
        "category": "arithmetic",
        "state": "confirmed",
        "severity": "low",
        "severity_score": 5.0,
        "confidence_score": 65.0,
        "priority_rank": 5,
        "verification_level": "V2",
        "root_cause": {
            "summary": "Standard IEEE 754 binary floating point representation imprecision.",
            "trigger_input": {"val": 89.1 + 0.9},
            "beginner": "Computer decimals sometimes add up to 89.999999 instead of 90, which caused grade thresholds to misclassify.",
            "developer": "Binary float arithmetic produces inexact decimal representations. Solved via math.isclose or Decimal rounding.",
            "manager": "Eliminated border-case student grade rounding discrepancies.",
        },
        "blast_radius": {
            "functions": ["aggregate_gpa"],
            "tests": ["test_calculator.py::test_float_accumulation"],
            "files": ["calculator.py"],
        },
    },
    {
        "id": "demo-bug-006",
        "project_id": "demo-proj-002",
        "title": "Prototype pollution via unvalidated object key in profile updater",
        "description": "Deep merge on user settings allows __proto__ assignment polluting global Object prototype.",
        "file_path": "userDirectory.js",
        "line_start": 12,
        "line_end": 18,
        "origin_line": 13,
        "crash_line": 16,
        "trigger_input": {"payload": {"__proto__": {"isAdmin": True}}},
        "failure_type": "security_flaw",
        "category": "security",
        "state": "confirmed",
        "severity": "critical",
        "severity_score": 8.5,
        "confidence_score": 85.0,
        "priority_rank": 6,
        "verification_level": "V3",
        "root_cause": {
            "summary": "Recursive object property merge without prototype key blacklist.",
            "trigger_input": {"key": "__proto__"},
            "beginner": "A security hole let users sneak in special commands that gave them admin privileges.",
            "developer": "Deep merge utility did not omit __proto__, constructor, and prototype properties.",
            "manager": "Patched critical privilege escalation vulnerability.",
        },
        "blast_radius": {
            "functions": ["mergeProfileSettings"],
            "tests": ["test_security.js::test_prototype_pollution"],
            "files": ["userDirectory.js"],
        },
    },
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
        "original_code": (
            "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n"
            "    percentage = (marks / total) * 100.0\n"
            "    return percentage"
        ),
        "patched_code": (
            "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n"
            "    if not (0.0 <= marks <= total):\n"
            "        raise ValueError('Marks must be between 0.0 and total')\n"
            "    percentage = (marks / total) * 100.0\n"
            "    return percentage"
        ),
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
                "new_code": (
                    "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n"
                    "    if not (0.0 <= marks <= total):\n"
                    "        raise ValueError('Marks must be between 0.0 and total')"
                ),
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
