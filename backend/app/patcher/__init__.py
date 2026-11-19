"""
Patcher Module — Phase P2
Autonomous patch synthesis with multi-candidate generation, critic evaluation,
reproducer agent, blast radius analysis, and confidence scoring.

Components:
- pipeline.py: Autonomous 5-step core loop with multi-candidate generation
- models.py: PatchCandidate with V0-V4 verification ladder
- diff.py: Unified diff generation
- test_generator.py: Automated test harness synthesis (Python/JS)
- reproducer.py: Defect reproduction agent
- critic.py: Patch quality critic with multi-axis scoring
- confidence.py: Composite confidence & priority scoring with V-ladder capping
"""

from app.patcher.confidence import compute_confidence, rank_by_priority
from app.patcher.critic import evaluate_candidate, rank_candidates
from app.patcher.diff import generate_unified_diff
from app.patcher.models import PatchCandidate, VerificationLevel
from app.patcher.pipeline import ACTIVE_PATCHES, PROJECT_PIPELINE_RUNS, run_autonomous_pipeline
from app.patcher.reproducer import ReproducerAgent
from app.patcher.test_generator import generate_test_harness

__all__ = [
    "ACTIVE_PATCHES",
    "PROJECT_PIPELINE_RUNS",
    "PatchCandidate",
    "ReproducerAgent",
    "VerificationLevel",
    "compute_confidence",
    "evaluate_candidate",
    "generate_test_harness",
    "generate_unified_diff",
    "rank_by_priority",
    "rank_candidates",
    "run_autonomous_pipeline",
]
