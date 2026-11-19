"""
Patch Engine Models
Defines patch candidates, verification tiers (V1-V4), and test proof metadata.
"""

from dataclasses import dataclass
from typing import Any, Literal

VerificationLevel = Literal["V1", "V2", "V3", "V4"]


@dataclass
class PatchCandidate:
    """A synthesized patch candidate with unified diff and sandbox verification evidence."""
    id: str
    bug_id: str
    project_id: str
    file_path: str
    original_code: str
    patched_code: str
    unified_diff: str
    verification_level: VerificationLevel
    confidence_score: float
    sandbox_duration_ms: float
    runner_type: str
    runner_label: str
    isolation_level: str
    pre_patch_test_passed: bool
    post_patch_test_passed: bool
    test_stdout: str
    test_stderr: str
    explanation: str
    status: Literal["proposed", "approved", "rejected"] = "proposed"
    created_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "bug_id": self.bug_id,
            "project_id": self.project_id,
            "file_path": self.file_path,
            "original_code": self.original_code,
            "patched_code": self.patched_code,
            "unified_diff": self.unified_diff,
            "verification_level": self.verification_level,
            "confidence_score": self.confidence_score,
            "sandbox_duration_ms": self.sandbox_duration_ms,
            "runner_type": self.runner_type,
            "runner_label": self.runner_label,
            "isolation_level": self.isolation_level,
            "pre_patch_test_passed": self.pre_patch_test_passed,
            "post_patch_test_passed": self.post_patch_test_passed,
            "test_stdout": self.test_stdout,
            "test_stderr": self.test_stderr,
            "explanation": self.explanation,
            "status": self.status,
            "created_at": self.created_at,
        }
