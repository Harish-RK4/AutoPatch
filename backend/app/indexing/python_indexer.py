"""
Python AST & Call-Graph Indexer
Parses Python source code into abstract syntax trees, extracts symbols, imports,
call hierarchies, and cyclomatic complexity.
"""

import ast

from app.indexing.models import CallGraphEdge, CodeSymbol, FileIndex


class PythonASTVisitor(ast.NodeVisitor):
    """Traverses Python AST to construct symbol tables and call graph edges."""

    def __init__(self):
        self.symbols: list[CodeSymbol] = []
        self.call_edges: list[CallGraphEdge] = []
        self.imports: list[str] = []
        self.current_function: str | None = None
        self.complexity_score: int = 1

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.imports.append(alias.name)
            self.symbols.append(
                CodeSymbol(
                    name=alias.name,
                    kind="import",
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                )
            )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        mod = node.module or ""
        for alias in node.names:
            full_name = f"{mod}.{alias.name}" if mod else alias.name
            self.imports.append(full_name)
            self.symbols.append(
                CodeSymbol(
                    name=full_name,
                    kind="import",
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                )
            )
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef):
        decorators = [ast.unparse(d) if hasattr(ast, "unparse") else str(d) for d in node.decorator_list]
        self.symbols.append(
            CodeSymbol(
                name=node.name,
                kind="class",
                line_start=node.lineno,
                line_end=getattr(node, "end_lineno", node.lineno),
                decorators=decorators,
                docstring=ast.get_docstring(node),
            )
        )
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._record_function(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._record_function(node, is_async=True)

    def _record_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef, is_async: bool):
        params = [arg.arg for arg in node.args.args]
        decorators = [ast.unparse(d) if hasattr(ast, "unparse") else str(d) for d in node.decorator_list]
        kind = "method" if self.current_function else "function"

        symbol = CodeSymbol(
            name=node.name,
            kind=kind,
            line_start=node.lineno,
            line_end=getattr(node, "end_lineno", node.lineno),
            parameters=params,
            decorators=decorators,
            docstring=ast.get_docstring(node),
        )
        self.symbols.append(symbol)

        prev_func = self.current_function
        self.current_function = node.name
        self.generic_visit(node)
        self.current_function = prev_func

    def visit_Call(self, node: ast.Call):
        callee_name = self._resolve_callee_name(node.func)
        if callee_name and self.current_function:
            self.call_edges.append(
                CallGraphEdge(
                    caller=self.current_function,
                    callee=callee_name,
                    line=node.lineno,
                )
            )
        self.generic_visit(node)

    # Cyclomatic complexity branch points
    def visit_If(self, node: ast.If):
        self.complexity_score += 1
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        self.complexity_score += 1
        self.generic_visit(node)

    def visit_While(self, node: ast.While):
        self.complexity_score += 1
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler):
        self.complexity_score += 1
        self.generic_visit(node)

    def _resolve_callee_name(self, node: ast.AST) -> str | None:
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            val_name = self._resolve_callee_name(node.value)
            return f"{val_name}.{node.attr}" if val_name else node.attr
        return None


def index_python_code(file_path: str, source_code: str) -> FileIndex:
    """Parse and index Python source code."""
    loc = len(source_code.splitlines())
    try:
        tree = ast.parse(source_code, filename=file_path)
    except SyntaxError:
        return FileIndex(
            file_path=file_path,
            language="python",
            symbols=[],
            call_graph=[],
            imports=[],
            loc=loc,
            complexity=1,
        )

    visitor = PythonASTVisitor()
    visitor.visit(tree)

    return FileIndex(
        file_path=file_path,
        language="python",
        symbols=visitor.symbols,
        call_graph=visitor.call_edges,
        imports=visitor.imports,
        loc=loc,
        complexity=visitor.complexity_score,
    )
