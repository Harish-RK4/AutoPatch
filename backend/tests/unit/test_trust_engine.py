"""Unit tests for Phase P2 Trust Engine components."""

from app.indexing.blast_radius import BlastRadiusReport, compute_blast_radius
from app.indexing.models import CallGraphEdge, CodeSymbol, FileIndex
from app.patcher.confidence import VERIFICATION_CAPS, compute_confidence, rank_by_priority
from app.patcher.critic import CriticVerdict, evaluate_candidate, rank_candidates
from app.patcher.reproducer import ReproducerAgent
from app.patcher.test_generator import generate_test_harness

# ── Test Generator ──────────────────────────────────────────────────────

class TestTestGenerator:
    def test_python_eval_test(self):
        harness = generate_test_harness(
            file_path="app.py",
            language="python",
            function_name="process",
            issue={"rule_id": "SEC-EVAL", "line_number": 5, "snippet": "eval(x)", "message": "eval"},
            original_code="eval(x)",
        )
        assert "unittest" in harness
        assert "literal_eval" in harness

    def test_python_zero_div_test(self):
        harness = generate_test_harness(
            file_path="math.py",
            language="python",
            function_name=None,
            issue={"rule_id": "BUG-ZERO-DIV", "line_number": 3, "snippet": "100 / 0", "message": "div"},
            original_code="x = 100 / 0",
        )
        assert "unittest" in harness
        assert "ZeroDivisionError" in harness

    def test_javascript_eval_test(self):
        harness = generate_test_harness(
            file_path="app.js",
            language="javascript",
            function_name=None,
            issue={"rule_id": "SEC-JS-EVAL", "line_number": 1, "snippet": "eval(x)", "message": "eval"},
            original_code="eval(x)",
        )
        assert "assert" in harness
        assert "eval" in harness

    def test_generic_language_test(self):
        harness = generate_test_harness(
            file_path="main.go",
            language="go",
            function_name=None,
            issue={"rule_id": "UNKNOWN", "line_number": 1, "snippet": "", "message": "test"},
            original_code="package main",
        )
        assert "golden" in harness.lower() or "stub" in harness.lower()

    def test_python_secret_test(self):
        harness = generate_test_harness(
            file_path="config.py",
            language="python",
            function_name=None,
            issue={"rule_id": "SEC-HARDCODED-SECRET", "line_number": 1, "snippet": "api_key = 'abc123'", "message": "secret"},
            original_code="api_key = 'abc123'",
        )
        assert "SECRET_PATTERNS" in harness or "secret" in harness.lower()


# ── Critic Agent ────────────────────────────────────────────────────────

class TestCriticAgent:
    def test_high_quality_patch_accepted(self):
        verdict = evaluate_candidate(
            candidate_id="patch-001",
            original_code="x = eval(input())",
            patched_code="import ast\nx = ast.literal_eval(input())",
            issue={"rule_id": "SEC-EVAL", "line_number": 1, "snippet": "eval(input())", "message": "eval"},
            pre_patch_failed=True,
            post_patch_passed=True,
        )
        assert verdict.correctness_score > 60
        assert verdict.safety_score >= 75
        assert verdict.composite_score > 50
        assert verdict.recommendation in ("accept", "needs_review")

    def test_patch_with_new_eval_flagged(self):
        verdict = evaluate_candidate(
            candidate_id="patch-002",
            original_code="x = 1 + 2",
            patched_code="x = eval('1 + 2')",
            issue={"rule_id": "BUG-ZERO-DIV", "line_number": 1, "snippet": "1 + 2", "message": "test"},
            pre_patch_failed=False,
            post_patch_passed=True,
        )
        assert any("Introduces eval()" in f for f in verdict.flags)
        assert verdict.safety_score < 100

    def test_no_change_patch_rejected(self):
        code = "x = 1"
        verdict = evaluate_candidate(
            candidate_id="patch-003",
            original_code=code,
            patched_code=code,
            issue={"rule_id": "UNKNOWN", "line_number": 1, "snippet": "x = 1", "message": "test"},
            pre_patch_failed=False,
            post_patch_passed=False,
        )
        assert verdict.minimality_score == 0.0
        assert any("No changes detected" in f for f in verdict.flags)

    def test_ranking(self):
        v1 = CriticVerdict(candidate_id="a", composite_score=90.0)
        v2 = CriticVerdict(candidate_id="b", composite_score=70.0)
        v3 = CriticVerdict(candidate_id="c", composite_score=85.0)
        ranked = rank_candidates([v1, v2, v3])
        assert ranked[0].candidate_id == "a"
        assert ranked[0].rank == 1
        assert ranked[1].candidate_id == "c"
        assert ranked[2].candidate_id == "b"


# ── Confidence Scoring ──────────────────────────────────────────────────

class TestConfidenceScoring:
    def test_v4_cap(self):
        result = compute_confidence(
            candidate_id="patch-001",
            verification_level="V4",
            critic_composite=95.0,
            pre_patch_failed=True,
            post_patch_passed=True,
            blast_score=10,
            severity="critical",
        )
        assert result.capped_confidence <= 100.0
        assert result.cap_applied == 100.0
        assert result.priority_score > 0

    def test_v1_cap_limits_confidence(self):
        result = compute_confidence(
            candidate_id="patch-002",
            verification_level="V1",
            critic_composite=95.0,
            pre_patch_failed=False,
            post_patch_passed=False,
            blast_score=50,
            severity="high",
        )
        assert result.capped_confidence <= 45.0
        assert result.cap_applied == 45.0

    def test_v0_cap(self):
        result = compute_confidence(
            candidate_id="patch-003",
            verification_level="V0",
            critic_composite=90.0,
            pre_patch_failed=False,
            post_patch_passed=False,
            blast_score=80,
            severity="low",
        )
        assert result.capped_confidence <= 30.0

    def test_priority_ranking(self):
        r1 = compute_confidence("a", "V4", 90.0, True, True, 10, "critical")
        r2 = compute_confidence("b", "V2", 60.0, False, True, 50, "low")
        ranked = rank_by_priority([r1, r2])
        assert ranked[0].candidate_id == "a"
        assert ranked[0].priority_rank == 1

    def test_all_verification_caps_exist(self):
        for level in ("V0", "V1", "V2", "V3", "V4"):
            assert level in VERIFICATION_CAPS


# ── Blast Radius ────────────────────────────────────────────────────────

class TestBlastRadius:
    def _make_index(self) -> list[FileIndex]:
        return [
            FileIndex(
                file_path="calculator.py",
                language="python",
                symbols=[
                    CodeSymbol(name="calculate_percentage", kind="function", line_start=5, line_end=12),
                    CodeSymbol(name="generate_report", kind="function", line_start=15, line_end=25),
                ],
                call_graph=[
                    CallGraphEdge(caller="generate_report", callee="calculate_percentage", line=18),
                ],
                imports=[],
                loc=30,
                complexity=5,
            ),
            FileIndex(
                file_path="main.py",
                language="python",
                symbols=[
                    CodeSymbol(name="main", kind="function", line_start=1, line_end=10),
                ],
                call_graph=[
                    CallGraphEdge(caller="main", callee="generate_report", line=5),
                ],
                imports=["calculator.py"],
                loc=15,
                complexity=2,
            ),
        ]

    def test_blast_radius_basic(self):
        indices = self._make_index()
        report = compute_blast_radius(
            project_indices=indices,
            target_file="calculator.py",
            line_start=5,
            line_end=12,
            original_code="def f(): pass",
            patched_code="def f():\n    if x: pass",
        )
        assert isinstance(report, BlastRadiusReport)
        assert report.target_file == "calculator.py"
        assert report.target_symbol == "calculate_percentage"
        assert len(report.direct_callers) >= 1
        assert report.blast_score > 0
        assert report.risk_level in ("Low", "Medium", "High", "Critical")

    def test_blast_radius_no_callers(self):
        indices = [
            FileIndex(file_path="isolated.py", language="python", symbols=[], call_graph=[], loc=5),
        ]
        report = compute_blast_radius(
            indices, "isolated.py", 1, 3, "x = 1", "x = 2"
        )
        assert len(report.direct_callers) == 0
        assert report.blast_score >= 5

    def test_blast_radius_to_dict(self):
        report = BlastRadiusReport(
            target_file="test.py",
            target_symbol="func",
            lines_touched=3,
            blast_score=25,
            risk_level="Low",
            summary="OK",
        )
        d = report.to_dict()
        assert d["target_file"] == "test.py"
        assert d["blast_score"] == 25


# ── Reproducer Agent ────────────────────────────────────────────────────

class TestReproducerAgent:
    def test_reproducer_python_eval(self):
        from app.sandbox.local_runner import LocalSubprocessSandboxRunner
        runner = LocalSubprocessSandboxRunner()
        reproducer = ReproducerAgent(runner)
        result = reproducer.reproduce(
            issue={"rule_id": "SEC-EVAL", "line_number": 1, "snippet": "eval('1+1')", "message": "eval"},
            language="python",
            original_code="result = eval('1+1')",
        )
        assert "duration_ms" in result
        assert "reproduced" in result
        assert isinstance(result["reproduced"], bool)

    def test_reproducer_unsupported_language(self):
        from app.sandbox.local_runner import LocalSubprocessSandboxRunner
        runner = LocalSubprocessSandboxRunner()
        reproducer = ReproducerAgent(runner)
        result = reproducer.reproduce(
            issue={"rule_id": "UNKNOWN", "line_number": 1, "snippet": "", "message": "test"},
            language="rust",
            original_code="fn main() {}",
        )
        assert result["reproduced"] is False
        assert "Unsupported" in result["stdout"]
