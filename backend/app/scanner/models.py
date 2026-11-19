"""
Scanner Models
Defines detected defects, security vulnerabilities, and code quality findings.
"""

from dataclasses import dataclass
from typing import Literal


@dataclass
class ScanIssue:
    """A detected bug, security vulnerability, or syntax error."""
    id: str
    file_path: str
    line_number: int
    rule_id: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    category: Literal["syntax", "security", "correctness", "performance", "style"]
    message: str
    snippet: str
    column: int | None = None
    cwe_id: str | None = None
    suggested_fix: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "file_path": self.file_path,
            "line_number": self.line_number,
            "column": self.column,
            "rule_id": self.rule_id,
            "severity": self.severity,
            "category": self.category,
            "message": self.message,
            "snippet": self.snippet,
            "cwe_id": self.cwe_id,
            "suggested_fix": self.suggested_fix,
        }
