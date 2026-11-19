"""
Indexing Data Models
Defines symbols, call graph edges, and structured AST index schemas.
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class CodeSymbol:
    """A declared programming language symbol (function, class, method)."""

    name: str
    kind: Literal["function", "method", "class", "import"]
    line_start: int
    line_end: int
    parameters: list[str] = field(default_factory=list)
    decorators: list[str] = field(default_factory=list)
    docstring: str | None = None


@dataclass
class CallGraphEdge:
    """A directed edge in the call graph representing caller invoking callee."""

    caller: str
    callee: str
    line: int


@dataclass
class FileIndex:
    """Complete AST and call graph representation for an ingested file."""

    file_path: str
    language: str
    symbols: list[CodeSymbol] = field(default_factory=list)
    call_graph: list[CallGraphEdge] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    loc: int = 0
    complexity: int = 1

    def to_dict(self) -> dict:
        return {
            "file_path": self.file_path,
            "language": self.language,
            "symbols": [
                {
                    "name": s.name,
                    "kind": s.kind,
                    "line_start": s.line_start,
                    "line_end": s.line_end,
                    "parameters": s.parameters,
                    "decorators": s.decorators,
                }
                for s in self.symbols
            ],
            "call_graph": [
                {"caller": e.caller, "callee": e.callee, "line": e.line} for e in self.call_graph
            ],
            "imports": self.imports,
            "loc": self.loc,
            "complexity": self.complexity,
        }
