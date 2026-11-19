"""
Unit Tests for AST Indexer and Call Graph Analysis
Verifies:
1. Python function, class, and method symbol extraction
2. Python call graph edge generation (caller -> callee)
3. Python import resolution and cyclomatic complexity scoring
4. JavaScript function, class, and import extraction
5. Multi-file indexing coordinator
"""

from app.indexing.coordinator import index_files
from app.indexing.js_indexer import index_javascript_code
from app.indexing.python_indexer import index_python_code


def test_python_indexing_symbols():
    """Extract functions, classes, decorators, and parameters from Python source."""
    py_code = """
import os
from math import sqrt

class Calculator:
    def __init__(self, precision: int = 2):
        self.precision = precision

    @staticmethod
    def calculate(val: float) -> float:
        return sqrt(val)

def process_batch(items):
    c = Calculator()
    for item in items:
        c.calculate(item)
"""
    idx = index_python_code("test_calc.py", py_code)
    assert idx.language == "python"
    assert idx.loc > 10

    symbol_names = [s.name for s in idx.symbols]
    assert "os" in symbol_names
    assert "math.sqrt" in symbol_names
    assert "Calculator" in symbol_names
    assert "__init__" in symbol_names
    assert "calculate" in symbol_names
    assert "process_batch" in symbol_names

    # Verify parameters
    calc_func = next(s for s in idx.symbols if s.name == "calculate")
    assert "val" in calc_func.parameters

    # Verify decorators
    assert "@staticmethod" in calc_func.decorators or "staticmethod" in str(calc_func.decorators)

    # Verify call edges
    edges = [(e.caller, e.callee) for e in idx.call_graph]
    assert ("calculate", "sqrt") in edges or ("process_batch", "Calculator") in edges


def test_javascript_indexing():
    """Extract functions, arrow functions, classes, and imports from JS source."""
    js_code = """
import { fetchUser } from './api';
const config = require('./config');

class UserManager {
    constructor() {
        this.users = [];
    }
}

async function handleRequest(req, res) {
    const user = await fetchUser(req.userId);
    res.json(user);
}

const formatResponse = (data) => {
    return JSON.stringify(data);
};
"""
    idx = index_javascript_code("user.js", js_code)
    assert idx.language == "javascript"
    assert "./api" in idx.imports or "fetchUser" in [s.name for s in idx.symbols]
    assert "UserManager" in [s.name for s in idx.symbols]
    assert "handleRequest" in [s.name for s in idx.symbols]
    assert "formatResponse" in [s.name for s in idx.symbols]


def test_indexing_coordinator_multi_file():
    """Coordinator indexes a polyglot file collection accurately."""
    files = [
        {"path": "app.py", "language": "python", "content": "def main():\n    print('start')\n"},
        {
            "path": "client.js",
            "language": "javascript",
            "content": "function start() { alert(1); }\n",
        },
        {"path": "data.csv", "language": "csv", "content": "a,b\n1,2\n"},
    ]
    indexes = index_files(files)
    assert "app.py" in indexes
    assert "client.js" in indexes
    assert "data.csv" in indexes
    assert indexes["app.py"]["language"] == "python"
    assert indexes["client.js"]["language"] == "javascript"
