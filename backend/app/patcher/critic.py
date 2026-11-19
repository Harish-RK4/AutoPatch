"""
Critic Agent
Reviews patch candidates and assigns quality scores based on:
- Correctness (does the fix address the root cause?)
- Minimality (smallest diff possible?)
- Safety (no new vulnerabilities introduced?)
- Side effects (blast radius acceptable?)
"""

import ast
import re
from dataclasses import dataclass, field
from typing import Any

from app.indexing.blast_radius import BlastRadiusReport


@dataclass
class CriticVerdict:
    """Structured assessment of a patch candidate by the critic agent."""

    candidate_id: str
    correctness_score: float = 0.0  # 0-100
    minimality_score: float = 0.0  # 0-100
    safety_score: float = 0.0  # 0-100
    side_effect_score: float = 0.0  # 0-100 (100 = no side effects)
    composite_score: float = 0.0  # Weighted aggregate
    rank: int = 0
    flags: list[str] = field(default_factory=list)
    recommendation: str = "needs_review"  # "accept", "reject", "needs_review"
    rationale: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "correctness_score": round(self.correctness_score, 1),
            "minimality_score": round(self.minimality_score, 1),
            "safety_score": round(self.safety_score, 1),
            "side_effect_score": round(self.side_effect_score, 1),
            "composite_score": round(self.composite_score, 1),
            "rank": self.rank,
            "flags": self.flags,
            "recommendation": self.recommendation,
            "rationale": self.rationale,
        }


# Dangerous patterns that should not appear in patched code
DANGER_PATTERNS = [
    (re.compile(r"\beval\s*\("), "Introduces eval()"),
    (re.compile(r"\bexec\s*\("), "Introduces exec()"),
    (re.compile(r"shell\s*=\s*True"), "Introduces shell=True"),
    (re.compile(r"__import__\s*\("), "Introduces dynamic import"),
    (re.compile(r"os\.system\s*\("), "Introduces os.system()"),
]


def _score_correctness(
    original_code: str,
    patched_code: str,
    issue: dict[str, Any],
    pre_patch_failed: bool,
    post_patch_passed: bool,
) -> tuple[float, list[str]]:
    """Score whether the patch correctly addresses the detected issue."""
    flags: list[str] = []
    score = 50.0  # Base score

    rule_id = issue.get("rule_id", "")

    # Dual sandbox verification bonus
    if pre_patch_failed and post_patch_passed:
        score += 40.0  # Strong evidence: repro fails, patch passes
    elif post_patch_passed:
        score += 20.0  # Weaker: patch passes but no repro failure
    else:
        score -= 20.0
        flags.append("Post-patch test did not pass")

    # Rule-specific correctness checks
    if (
        rule_id == "SEC-EVAL"
        and "literal_eval" in patched_code
        or rule_id == "SEC-SUBPROCESS-SHELL"
        and "shell=False" in patched_code
        or rule_id == "BUG-ZERO-DIV"
        and "/ 0" not in patched_code
    ):
        score += 10.0

    # Syntax validation of patched code
    try:
        ast.parse(patched_code)
    except SyntaxError:
        score -= 30.0
        flags.append("Patched code has syntax errors")

    return max(0.0, min(100.0, score)), flags


def _score_minimality(original_code: str, patched_code: str) -> tuple[float, list[str]]:
    """Score the patch on minimality: fewer changed lines = better."""
    flags: list[str] = []
    orig_lines = original_code.splitlines()
    patch_lines = patched_code.splitlines()

    added = max(0, len(patch_lines) - len(orig_lines))
    changed = sum(1 for a, b in zip(orig_lines, patch_lines) if a != b)
    total_diff = added + changed

    if total_diff == 0:
        flags.append("No changes detected in patch")
        return 0.0, flags

    if total_diff <= 3:
        score = 95.0  # Minimal, surgical fix
    elif total_diff <= 8:
        score = 75.0
    elif total_diff <= 15:
        score = 50.0
    else:
        score = max(10.0, 100.0 - total_diff * 3)
        flags.append(f"Large diff: {total_diff} lines changed/added")

    return score, flags


def _score_safety(patched_code: str, original_code: str) -> tuple[float, list[str]]:
    """Score whether the patch introduces any new dangerous patterns."""
    flags: list[str] = []
    score = 100.0

    for pattern, desc in DANGER_PATTERNS:
        # Only flag if pattern is NEW (not in original)
        new_matches = len(pattern.findall(patched_code)) - len(pattern.findall(original_code))
        if new_matches > 0:
            score -= 25.0
            flags.append(f"NEW: {desc}")

    return max(0.0, score), flags


def _score_side_effects(blast_report: BlastRadiusReport | None) -> tuple[float, list[str]]:
    """Score based on blast radius impact."""
    flags: list[str] = []

    if blast_report is None:
        return 70.0, ["Blast radius not computed"]

    # Lower blast score = higher side-effect score (inverse relationship)
    score = max(0.0, 100.0 - blast_report.blast_score)

    if blast_report.risk_level == "Critical":
        flags.append("Critical blast radius")
    elif blast_report.risk_level == "High":
        flags.append("High blast radius")

    if blast_report.cyclomatic_delta > 3:
        score -= 10.0
        flags.append(f"Cyclomatic complexity increased by {blast_report.cyclomatic_delta}")

    return max(0.0, score), flags


def evaluate_candidate(
    candidate_id: str,
    original_code: str,
    patched_code: str,
    issue: dict[str, Any],
    pre_patch_failed: bool,
    post_patch_passed: bool,
    blast_report: BlastRadiusReport | None = None,
) -> CriticVerdict:
    """Run the full critic evaluation pipeline on a single patch candidate."""
    all_flags: list[str] = []

    correctness, c_flags = _score_correctness(
        original_code, patched_code, issue, pre_patch_failed, post_patch_passed
    )
    all_flags.extend(c_flags)

    minimality, m_flags = _score_minimality(original_code, patched_code)
    all_flags.extend(m_flags)

    safety, s_flags = _score_safety(patched_code, original_code)
    all_flags.extend(s_flags)

    side_effect, se_flags = _score_side_effects(blast_report)
    all_flags.extend(se_flags)

    # Weighted composite: Correctness 40%, Safety 25%, Minimality 20%, Side-effects 15%
    composite = correctness * 0.40 + safety * 0.25 + minimality * 0.20 + side_effect * 0.15

    # Determine recommendation
    if composite >= 80.0 and not any("syntax error" in f.lower() for f in all_flags):
        recommendation = "accept"
    elif composite < 40.0 or any("syntax error" in f.lower() for f in all_flags):
        recommendation = "reject"
    else:
        recommendation = "needs_review"

    blast_summary = blast_report.summary if blast_report else "Not computed"
    rationale = (
        f"Correctness: {correctness:.0f}/100, Safety: {safety:.0f}/100, "
        f"Minimality: {minimality:.0f}/100, Side-effects: {side_effect:.0f}/100. "
        f"Blast Radius: {blast_summary}"
    )

    return CriticVerdict(
        candidate_id=candidate_id,
        correctness_score=correctness,
        minimality_score=minimality,
        safety_score=safety,
        side_effect_score=side_effect,
        composite_score=composite,
        flags=all_flags,
        recommendation=recommendation,
        rationale=rationale,
    )


def rank_candidates(verdicts: list[CriticVerdict]) -> list[CriticVerdict]:
    """Rank candidates by composite score descending."""
    sorted_verdicts = sorted(verdicts, key=lambda v: v.composite_score, reverse=True)
    for i, v in enumerate(sorted_verdicts, start=1):
        v.rank = i
    return sorted_verdicts
