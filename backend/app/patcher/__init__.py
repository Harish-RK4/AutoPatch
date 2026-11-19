"""
Patcher Package
Autonomous patch synthesis, diff generation, and dual-sandbox verification pipeline.
"""

from app.patcher.diff import generate_unified_diff
from app.patcher.models import PatchCandidate, VerificationLevel
from app.patcher.pipeline import (
    ACTIVE_PATCHES,
    PROJECT_PIPELINE_RUNS,
    run_autonomous_pipeline,
)

__all__ = [
    "ACTIVE_PATCHES",
    "PROJECT_PIPELINE_RUNS",
    "PatchCandidate",
    "VerificationLevel",
    "generate_unified_diff",
    "run_autonomous_pipeline",
]
