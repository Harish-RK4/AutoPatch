"""
Unified Diff Utilities
Computes precise standard unidiffs between original code and patched code.
"""

import difflib


def generate_unified_diff(
    original_code: str,
    patched_code: str,
    file_path: str = "source_file",
) -> str:
    """Generate a clean unified diff string."""
    orig_lines = original_code.splitlines(keepends=True)
    patch_lines = patched_code.splitlines(keepends=True)

    diff = difflib.unified_diff(
        orig_lines,
        patch_lines,
        fromfile=f"a/{file_path}",
        tofile=f"b/{file_path}",
        n=3,
    )
    return "".join(diff)
