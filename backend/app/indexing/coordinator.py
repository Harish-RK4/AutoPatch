"""
AST Indexing Coordinator
Orchestrates indexing across multiple project files and builds project-level call graphs.
"""

from typing import Any
from app.indexing.js_indexer import index_javascript_code
from app.indexing.models import FileIndex
from app.indexing.python_indexer import index_python_code


def index_files(files: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """
    Index a list of project files, dispatching to language-specific indexers.
    Returns a dictionary mapping file path to serialized index data.
    """
    indexes: dict[str, dict[str, Any]] = {}

    for f in files:
        path = f.get("path") or f.get("filename") or "unknown"
        lang = (f.get("language") or "").lower()
        content = f.get("content") or ""

        if lang in ("python", "py"):
            idx = index_python_code(path, content)
            indexes[path] = idx.to_dict()
        elif lang in ("javascript", "js", "typescript", "ts"):
            idx = index_javascript_code(path, content)
            indexes[path] = idx.to_dict()
        else:
            # Fallback basic index for unsupported or data files
            loc = len(content.splitlines()) if isinstance(content, str) else 0
            idx = FileIndex(file_path=path, language=lang, loc=loc)
            indexes[path] = idx.to_dict()

    return indexes
