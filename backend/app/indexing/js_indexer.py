"""
JavaScript & TypeScript AST Indexer
Extracts function declarations, arrow functions, classes, imports, and call relationships
from JavaScript and TypeScript source files.
"""

import re

from app.indexing.models import CallGraphEdge, CodeSymbol, FileIndex

# Patterns for JavaScript / TypeScript constructs
FUNC_PATTERN = re.compile(
    r"(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)",
    re.MULTILINE,
)
ARROW_FUNC_PATTERN = re.compile(
    r"(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>",
    re.MULTILINE,
)
CLASS_PATTERN = re.compile(
    r"class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+[a-zA-Z0-9_$]+)?",
    re.MULTILINE,
)
IMPORT_PATTERN = re.compile(
    r"import\s+(?:\{[^}]+\}|[a-zA-Z0-9_$,\s*]+)\s+from\s+['\"]([^'\"]+)['\"]|"
    r"(?:const|let|var)\s+.*?=\s*require\(['\"]([^'\"]+)['\"]\)",
    re.MULTILINE,
)
CALL_PATTERN = re.compile(
    r"([a-zA-Z0-9_$]+)\s*\(",
    re.MULTILINE,
)


def index_javascript_code(file_path: str, source_code: str) -> FileIndex:
    """Extract symbols and call references from JavaScript/TypeScript source."""
    lines = source_code.splitlines()
    loc = len(lines)
    symbols: list[CodeSymbol] = []
    imports: list[str] = []
    call_edges: list[CallGraphEdge] = []

    # 1. Extract Imports
    for match in IMPORT_PATTERN.finditer(source_code):
        mod = match.group(1) or match.group(2)
        if mod:
            imports.append(mod)
            line_no = source_code[: match.start()].count("\n") + 1
            symbols.append(
                CodeSymbol(
                    name=mod,
                    kind="import",
                    line_start=line_no,
                    line_end=line_no,
                )
            )

    # 2. Extract Classes
    for match in CLASS_PATTERN.finditer(source_code):
        class_name = match.group(1)
        line_no = source_code[: match.start()].count("\n") + 1
        symbols.append(
            CodeSymbol(
                name=class_name,
                kind="class",
                line_start=line_no,
                line_end=line_no + 10,
            )
        )

    # 3. Extract Functions
    for match in FUNC_PATTERN.finditer(source_code):
        fn_name = match.group(1)
        params = [p.strip() for p in match.group(2).split(",") if p.strip()]
        line_no = source_code[: match.start()].count("\n") + 1
        symbols.append(
            CodeSymbol(
                name=fn_name,
                kind="function",
                line_start=line_no,
                line_end=line_no + 5,
                parameters=params,
            )
        )

    for match in ARROW_FUNC_PATTERN.finditer(source_code):
        fn_name = match.group(1)
        params = [p.strip() for p in match.group(2).split(",") if p.strip()]
        line_no = source_code[: match.start()].count("\n") + 1
        symbols.append(
            CodeSymbol(
                name=fn_name,
                kind="function",
                line_start=line_no,
                line_end=line_no + 5,
                parameters=params,
            )
        )

    # 4. Extract Calls (linking callers to callees)
    active_fn = symbols[0].name if symbols else "main"
    for match in CALL_PATTERN.finditer(source_code):
        callee = match.group(1)
        if callee not in ("function", "if", "for", "while", "switch", "catch", "import", "require"):
            line_no = source_code[: match.start()].count("\n") + 1
            call_edges.append(
                CallGraphEdge(
                    caller=active_fn,
                    callee=callee,
                    line=line_no,
                )
            )

    complexity = 1 + len(re.findall(r"\b(if|for|while|case|catch)\b", source_code))

    return FileIndex(
        file_path=file_path,
        language="javascript",
        symbols=symbols,
        call_graph=call_edges[:50],  # cap call edges for performance
        imports=imports,
        loc=loc,
        complexity=complexity,
    )
