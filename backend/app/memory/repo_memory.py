"""
Repository Memory & Learning System
Records reviewer decisions (accept / reject / needs_review) and feedback rationales
to inform future patch generation and critique evaluations for the repository.
"""

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal


@dataclass
class PatchDecisionRecord:
    patch_id: str
    project_id: str
    bug_id: str
    decision: Literal["accept", "reject", "needs_review"]
    strategy: str
    rationale: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


class RepoMemoryService:
    def __init__(self) -> None:
        self._history: list[PatchDecisionRecord] = [
            PatchDecisionRecord(
                patch_id="demo-patch-001",
                project_id="demo-proj-001",
                bug_id="demo-bug-001",
                decision="accept",
                strategy="minimal_diff",
                rationale="Clean defensive bounds check with 0 side effects and 14 passing regression tests.",
            )
        ]

    def record_decision(
        self,
        patch_id: str,
        project_id: str,
        bug_id: str,
        decision: Literal["accept", "reject", "needs_review"],
        strategy: str,
        rationale: str = "",
    ) -> dict[str, Any]:
        """Stores a reviewer decision in repository memory."""
        record = PatchDecisionRecord(
            patch_id=patch_id,
            project_id=project_id,
            bug_id=bug_id,
            decision=decision,
            strategy=strategy,
            rationale=rationale,
        )
        self._history.append(record)
        return asdict(record)

    def get_project_memory(self, project_id: str) -> dict[str, Any]:
        """Summarizes learning insights for a specific project."""
        records = [r for r in self._history if r.project_id == project_id]
        total = len(records)
        if total == 0:
            return {
                "project_id": project_id,
                "total_decisions": 0,
                "acceptance_rate": 0.0,
                "preferred_strategies": [],
                "rejected_strategies": [],
                "recent_feedback": [],
            }

        accepted = [r for r in records if r.decision == "accept"]
        rejected = [r for r in records if r.decision == "reject"]

        # Strategy frequencies
        strat_counts: dict[str, int] = {}
        for r in accepted:
            strat_counts[r.strategy] = strat_counts.get(r.strategy, 0) + 1

        preferred = sorted(strat_counts.keys(), key=lambda s: strat_counts[s], reverse=True)
        rejected_strats = list({r.strategy for r in rejected})

        return {
            "project_id": project_id,
            "total_decisions": total,
            "accepted_count": len(accepted),
            "rejected_count": len(rejected),
            "acceptance_rate": round((len(accepted) / total) * 100, 1),
            "preferred_strategies": preferred,
            "rejected_strategies": rejected_strats,
            "recent_feedback": [r.rationale for r in records if r.rationale][-5:],
        }

    def get_critic_hints(self, project_id: str) -> list[str]:
        """Returns heuristic tips for the Critic agent based on past reviewer feedback."""
        records = [r for r in self._history if r.project_id == project_id]
        hints: list[str] = []
        for r in records:
            if r.decision == "reject" and r.rationale:
                hints.append(f"Previously rejected {r.strategy}: {r.rationale}")
            elif r.decision == "accept" and r.strategy:
                hints.append(f"Team prefers {r.strategy} style solutions.")
        return hints[:5]

    def list_history(self, project_id: str | None = None) -> list[dict[str, Any]]:
        if project_id:
            return [asdict(r) for r in self._history if r.project_id == project_id]
        return [asdict(r) for r in self._history]


repo_memory = RepoMemoryService()
