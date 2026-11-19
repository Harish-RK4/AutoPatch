"""
Confidence Scoring Engine
Computes composite confidence and priority scores for patch candidates
based on verification evidence, critic assessment, and blast radius.
"""

from dataclasses import dataclass
from typing import Any

# Verification Ladder caps (maximum confidence allowed at each level)
VERIFICATION_CAPS: dict[str, float] = {
    "V0": 30.0,
    "V1": 45.0,
    "V2": 65.0,
    "V3": 85.0,
    "V4": 100.0,
}

# Severity weights for priority ranking
SEVERITY_WEIGHTS: dict[str, float] = {
    "critical": 10.0,
    "high": 8.0,
    "medium": 5.0,
    "low": 3.0,
    "info": 1.0,
}


@dataclass
class ConfidenceResult:
    """Composite confidence and priority scoring for a patch candidate."""

    candidate_id: str
    raw_confidence: float
    capped_confidence: float
    verification_level: str
    cap_applied: float
    priority_score: float
    priority_rank: int = 0
    severity: str = "medium"
    factors: dict[str, float] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "raw_confidence": round(self.raw_confidence, 1),
            "capped_confidence": round(self.capped_confidence, 1),
            "verification_level": self.verification_level,
            "cap_applied": self.cap_applied,
            "priority_score": round(self.priority_score, 1),
            "priority_rank": self.priority_rank,
            "severity": self.severity,
            "factors": self.factors,
        }


def compute_confidence(
    candidate_id: str,
    verification_level: str,
    critic_composite: float,
    pre_patch_failed: bool,
    post_patch_passed: bool,
    blast_score: int = 50,
    severity: str = "medium",
) -> ConfidenceResult:
    """
    Compute composite confidence score with verification ladder capping.

    Factors:
    - Critic composite score (40%)
    - Dual sandbox evidence (30%): pre-patch repro + post-patch pass
    - Blast radius inverse (15%): lower blast = higher confidence
    - Severity alignment (15%): higher severity = higher priority
    """
    # Factor 1: Critic composite (0-100)
    critic_factor = max(0.0, min(100.0, critic_composite))

    # Factor 2: Dual sandbox evidence (0-100)
    sandbox_factor = 0.0
    if pre_patch_failed and post_patch_passed:
        sandbox_factor = 100.0  # Full dual verification
    elif post_patch_passed:
        sandbox_factor = 60.0  # Passes but no repro
    elif pre_patch_failed:
        sandbox_factor = 30.0  # Repro but patch doesn't pass

    # Factor 3: Blast radius inverse (0-100)
    blast_factor = max(0.0, 100.0 - blast_score)

    # Factor 4: Severity alignment (0-100)
    sev_weight = SEVERITY_WEIGHTS.get(severity, 5.0)
    severity_factor = sev_weight * 10.0  # Scale to 0-100

    # Weighted composite
    raw_confidence = (
        critic_factor * 0.40 + sandbox_factor * 0.30 + blast_factor * 0.15 + severity_factor * 0.15
    )

    # Apply verification ladder cap
    cap = VERIFICATION_CAPS.get(verification_level, 30.0)
    capped_confidence = min(raw_confidence, cap)

    # Priority score: combines confidence with severity for ranking
    priority_score = capped_confidence * 0.6 + severity_factor * 0.4

    factors = {
        "critic_composite": round(critic_factor, 1),
        "sandbox_evidence": round(sandbox_factor, 1),
        "blast_radius_inverse": round(blast_factor, 1),
        "severity_alignment": round(severity_factor, 1),
    }

    return ConfidenceResult(
        candidate_id=candidate_id,
        raw_confidence=raw_confidence,
        capped_confidence=capped_confidence,
        verification_level=verification_level,
        cap_applied=cap,
        priority_score=priority_score,
        severity=severity,
        factors=factors,
    )


def rank_by_priority(results: list[ConfidenceResult]) -> list[ConfidenceResult]:
    """Rank candidates by priority score descending."""
    sorted_results = sorted(results, key=lambda r: r.priority_score, reverse=True)
    for i, r in enumerate(sorted_results, start=1):
        r.priority_rank = i
    return sorted_results
