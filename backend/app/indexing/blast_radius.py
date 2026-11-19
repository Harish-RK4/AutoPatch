"""
Blast Radius Analysis Engine
Computes dependency impact, affected callers, cyclomatic delta, and quantitative risk scoring.
Supports both FileIndex dataclass instances and serialized dictionary representations.
"""

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass
class BlastRadiusReport:
    """Quantitative risk and dependency impact report for a code modification."""

    target_file: str
    target_symbol: str | None
    lines_touched: int
    files_impacted: list[str] = field(default_factory=list)
    direct_callers: list[str] = field(default_factory=list)
    transitive_callers: list[str] = field(default_factory=list)
    cyclomatic_delta: int = 0
    blast_score: int = 0  # 0 to 100
    risk_level: Literal["Low", "Medium", "High", "Critical"] = "Low"
    summary: str = ""

    def to_dict(self) -> dict:
        return {
            "target_file": self.target_file,
            "target_symbol": self.target_symbol,
            "lines_touched": self.lines_touched,
            "files_impacted": self.files_impacted,
            "direct_callers": self.direct_callers,
            "transitive_callers": self.transitive_callers,
            "cyclomatic_delta": self.cyclomatic_delta,
            "blast_score": self.blast_score,
            "risk_level": self.risk_level,
            "summary": self.summary,
        }


def _get_path(idx: Any) -> str:
    return idx.file_path if hasattr(idx, "file_path") else idx.get("file_path", "")


def _get_symbols(idx: Any) -> list[Any]:
    return idx.symbols if hasattr(idx, "symbols") else idx.get("symbols", [])


def _get_call_graph(idx: Any) -> list[Any]:
    return idx.call_graph if hasattr(idx, "call_graph") else idx.get("call_graph", [])


def _get_imports(idx: Any) -> list[str]:
    return idx.imports if hasattr(idx, "imports") else idx.get("imports", [])


def _edge_caller(edge: Any) -> str:
    return edge.caller if hasattr(edge, "caller") else edge.get("caller", "")


def _edge_callee(edge: Any) -> str:
    return edge.callee if hasattr(edge, "callee") else edge.get("callee", "")


def compute_blast_radius(
    project_indices: list[Any],
    target_file: str,
    line_start: int,
    line_end: int,
    original_code: str,
    patched_code: str,
) -> BlastRadiusReport:
    """
    Computes blast radius across the project's AST call graph and file indices.
    """
    target_index = next((idx for idx in project_indices if _get_path(idx) == target_file), None)

    # 1. Identify which symbol in target_file contains the patch lines
    target_symbol_name: str | None = None
    if target_index:
        for symbol in _get_symbols(target_index):
            s_start = (
                symbol.line_start if hasattr(symbol, "line_start") else symbol.get("line_start", 0)
            )
            s_end = symbol.line_end if hasattr(symbol, "line_end") else symbol.get("line_end", 0)
            s_name = symbol.name if hasattr(symbol, "name") else symbol.get("name", "")
            if s_start <= line_start <= s_end:
                target_symbol_name = s_name
                break

    # 2. Count lines touched
    lines_touched = max(1, abs(line_end - line_start) + 1)

    # 3. Discover direct callers from all file call graphs
    direct_callers: set[str] = set()
    files_impacted: set[str] = {target_file}

    for idx in project_indices:
        idx_path = _get_path(idx)
        for edge in _get_call_graph(idx):
            callee = _edge_callee(edge)
            caller = _edge_caller(edge)
            if target_symbol_name and callee == target_symbol_name:
                direct_callers.add(f"{idx_path}:{caller}")
                files_impacted.add(idx_path)
            elif not target_symbol_name and target_file in _get_imports(idx):
                files_impacted.add(idx_path)

    # 4. Discover transitive callers (1 depth level)
    transitive_callers: set[str] = set()
    for direct in direct_callers:
        direct_symbol = direct.split(":")[-1]
        for idx in project_indices:
            idx_path = _get_path(idx)
            for edge in _get_call_graph(idx):
                callee = _edge_callee(edge)
                caller = _edge_caller(edge)
                if callee == direct_symbol and f"{idx_path}:{caller}" not in direct_callers:
                    transitive_callers.add(f"{idx_path}:{caller}")
                    files_impacted.add(idx_path)

    # 5. Compute cyclomatic complexity delta
    import ast

    orig_complexity = 1
    patched_complexity = 1

    try:
        orig_tree = ast.parse(original_code)
        orig_complexity = sum(
            1
            for n in ast.walk(orig_tree)
            if isinstance(n, (ast.If, ast.While, ast.For, ast.ExceptHandler, ast.With, ast.Assert))
        )
    except SyntaxError:
        pass

    try:
        patched_tree = ast.parse(patched_code)
        patched_complexity = sum(
            1
            for n in ast.walk(patched_tree)
            if isinstance(n, (ast.If, ast.While, ast.For, ast.ExceptHandler, ast.With, ast.Assert))
        )
    except SyntaxError:
        pass

    cyclomatic_delta = patched_complexity - orig_complexity

    # 6. Quantitative Blast Score Calculation (0 - 100)
    score = (
        min(30, lines_touched * 2)
        + min(30, max(0, len(files_impacted) - 1) * 15)
        + min(24, len(direct_callers) * 8)
        + min(16, len(transitive_callers) * 4)
    )
    score = max(5, min(100, score))

    # Determine qualitative risk level
    if score < 25:
        risk_level: Literal["Low", "Medium", "High", "Critical"] = "Low"
    elif score < 50:
        risk_level = "Medium"
    elif score < 75:
        risk_level = "High"
    else:
        risk_level = "Critical"

    caller_desc = (
        f"{len(direct_callers)} caller(s)" if direct_callers else "isolated / module-level"
    )
    summary = (
        f"Touches {len(files_impacted)} file(s), {lines_touched} line(s), "
        f"{caller_desc} impacted. Risk Level: {risk_level} (Score: {score}/100)."
    )

    return BlastRadiusReport(
        target_file=target_file,
        target_symbol=target_symbol_name,
        lines_touched=lines_touched,
        files_impacted=sorted(files_impacted),
        direct_callers=sorted(direct_callers),
        transitive_callers=sorted(transitive_callers),
        cyclomatic_delta=cyclomatic_delta,
        blast_score=score,
        risk_level=risk_level,
        summary=summary,
    )
