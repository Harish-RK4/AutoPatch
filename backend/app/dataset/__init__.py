"""
AutoPatch Dataset Engine Package
Universal dataset profiling, flaw detection, idempotent cleaning,
and formal invariant verification.
"""

from app.dataset.engine import (
    PROJECT_DATASET_REVIEWS,
    get_dataset_review,
    process_dataset_project,
)
from app.dataset.models import (
    AnomalyFinding,
    AnomalyType,
    ChangedRow,
    DatasetProfile,
    DatasetReviewBundle,
    InvariantVerificationResult,
)
from app.dataset.profiler import profile_dataset

__all__ = [
    "PROJECT_DATASET_REVIEWS",
    "AnomalyFinding",
    "AnomalyType",
    "ChangedRow",
    "DatasetProfile",
    "DatasetReviewBundle",
    "InvariantVerificationResult",
    "get_dataset_review",
    "process_dataset_project",
    "profile_dataset",
]
