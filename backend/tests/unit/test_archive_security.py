"""
Security & Polyglot Ingestion Tests
Verifies:
1. Zip-slip path traversal attack rejection (../../etc/passwd)
2. Zip-bomb decompression ratio & total uncompressed size guards
3. Corrupted/malformed zip handling
4. Polyglot language detection (Python, JS, TS, C, Go, Rust, CSV, JSON, Binary)
5. Shebang detection for unadorned scripts
"""

import io
import tempfile
import zipfile
from pathlib import Path
import pytest

from app.ingestion.archive import ArchiveSecurityViolation, SafeArchiveIngester
from app.ingestion.detector import detect_file_language, is_binary_content


def test_zip_slip_traversal_rejection():
    """Security Guard: Zip entries containing '..' path traversal MUST be rejected immediately."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0:root:/root:/bin/bash")

    with tempfile.TemporaryDirectory() as tmp_dir:
        with pytest.raises(ArchiveSecurityViolation, match="Zip-slip path traversal"):
            SafeArchiveIngester.validate_and_extract(zip_buffer.getvalue(), Path(tmp_dir))


def test_zip_slip_absolute_path_rejection():
    """Security Guard: Zip entries starting with leading slashes MUST be rejected."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("/rooted_file.txt", "injected malicious payload")

    with tempfile.TemporaryDirectory() as tmp_dir:
        with pytest.raises(ArchiveSecurityViolation, match="Zip-slip path traversal"):
            SafeArchiveIngester.validate_and_extract(zip_buffer.getvalue(), Path(tmp_dir))


def test_zip_bomb_ratio_rejection():
    """Security Guard: Zip entries exceeding maximum decompression ratio MUST be blocked."""
    zip_buffer = io.BytesIO()
    # 5MB of repeated zeros compresses down to a few hundred bytes (>1000:1 ratio)
    repeated_zeros = b"0" * (5 * 1024 * 1024)
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("bomb.txt", repeated_zeros)

    with tempfile.TemporaryDirectory() as tmp_dir:
        with pytest.raises(ArchiveSecurityViolation, match="Zip-bomb decompression ratio"):
            SafeArchiveIngester.validate_and_extract(zip_buffer.getvalue(), Path(tmp_dir))


def test_malformed_zip_handling():
    """Corrupted or non-zip payloads must raise clear ArchiveSecurityViolation."""
    corrupted_bytes = b"NOT_A_VALID_ZIP_HEADER_JUST_RANDOM_BYTES"
    with tempfile.TemporaryDirectory() as tmp_dir:
        with pytest.raises(ArchiveSecurityViolation, match="Malformed or corrupted zip"):
            SafeArchiveIngester.validate_and_extract(corrupted_bytes, Path(tmp_dir))


def test_valid_polyglot_zip_extraction():
    """Valid multi-file zip extracts files with accurate language and category detection."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("src/main.py", "def hello():\n    return 'world'\n")
        zf.writestr("index.js", "console.log('hello');\n")
        zf.writestr("data/records.csv", "id,name,score\n1,Alice,95\n")
        zf.writestr("package.json", '{"name": "test-pkg", "version": "1.0.0"}\n')

    with tempfile.TemporaryDirectory() as tmp_dir:
        files = SafeArchiveIngester.validate_and_extract(zip_buffer.getvalue(), Path(tmp_dir))
        assert len(files) == 4

        files_by_name = {f["filename"]: f for f in files}

        assert "main.py" in files_by_name
        assert files_by_name["main.py"]["language"] == "python"
        assert files_by_name["main.py"]["is_executable"] is True

        assert "index.js" in files_by_name
        assert files_by_name["index.js"]["language"] == "javascript"
        assert files_by_name["index.js"]["is_executable"] is True

        assert "records.csv" in files_by_name
        assert files_by_name["records.csv"]["category"] == "dataset"

        assert "package.json" in files_by_name
        assert files_by_name["package.json"]["category"] == "config"


def test_polyglot_language_detection():
    """Detect various programming languages, data formats, and shebangs."""
    assert detect_file_language("calculate.py").language == "python"
    assert detect_file_language("handler.ts").language == "typescript"
    assert detect_file_language("kernel.c").language == "c"
    assert detect_file_language("server.go").language == "go"
    assert detect_file_language("lib.rs").language == "rust"
    assert detect_file_language("query.sql").language == "sql"
    assert detect_file_language("dataset.csv").category == "dataset"
    assert detect_file_language("dataset.parquet").category == "dataset"

    # Shebang detection
    script_content = b"#!/usr/bin/env python3\nprint('shebang python')"
    assert detect_file_language("run_script", script_content).language == "python"

    node_content = b"#!/usr/bin/env node\nconsole.log('shebang node');"
    assert detect_file_language("cli", node_content).language == "javascript"


def test_binary_file_detection():
    """Binary files containing null bytes must be detected honestly as binary."""
    binary_data = b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 32
    assert is_binary_content(binary_data) is True
    res = detect_file_language("libnative.so", binary_data)
    assert res.is_binary is True
    assert res.language == "binary"
