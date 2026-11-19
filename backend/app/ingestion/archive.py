"""
Archive Ingestion Security Guard and Polyglot Unpacker
Enforces zip-slip prevention, zip-bomb decompression limits, file count caps,
and safe content decoding.
"""

import io
import zipfile
from pathlib import Path
from typing import Any

from app.ingestion.detector import detect_file_language, is_binary_content


class ArchiveSecurityViolation(RuntimeError):
    """Raised when an uploaded archive violates security boundaries (zip-slip, zip-bomb)."""
    pass


# Security guard limits
MAX_ARCHIVE_UPLOAD_BYTES = 50 * 1024 * 1024       # 50 MB
MAX_UNCOMPRESSED_TOTAL_BYTES = 100 * 1024 * 1024  # 100 MB
MAX_DECOMPRESSION_RATIO = 100.0                   # Max 100:1 compression ratio
MAX_TOTAL_FILE_COUNT = 1000                       # Max 1,000 files per archive
MAX_SINGLE_FILE_BYTES = 25 * 1024 * 1024          # 25 MB max per individual file


class SafeArchiveIngester:
    """Safely validates and unpacks zip archives with strict security guards."""

    @classmethod
    def validate_and_extract(
        cls,
        archive_bytes: bytes,
        target_dir: Path,
    ) -> list[dict[str, Any]]:
        """
        Validate zip archive integrity and extract files safely.
        Returns a list of extracted file metadata dictionaries.
        """
        if len(archive_bytes) > MAX_ARCHIVE_UPLOAD_BYTES:
            raise ArchiveSecurityViolation(
                f"Archive upload exceeds maximum allowed size of {MAX_ARCHIVE_UPLOAD_BYTES / (1024 * 1024):.0f}MB."
            )

        try:
            zip_buffer = io.BytesIO(archive_bytes)
            zf = zipfile.ZipFile(zip_buffer)
        except zipfile.BadZipFile as err:
            raise ArchiveSecurityViolation(f"Malformed or corrupted zip archive: {str(err)}")

        entries = zf.infolist()
        if len(entries) > MAX_TOTAL_FILE_COUNT:
            raise ArchiveSecurityViolation(
                f"Archive contains {len(entries)} entries, exceeding the maximum limit of {MAX_TOTAL_FILE_COUNT} files."
            )

        target_dir = Path(target_dir).resolve()
        target_dir.mkdir(parents=True, exist_ok=True)

        total_uncompressed_bytes = 0
        extracted_files: list[dict[str, Any]] = []

        # Pass 1: Security Audit of all archive entries
        for info in entries:
            filename = info.filename
            # Zip-Slip Guard: Reject path traversal sequences
            if ".." in filename or filename.startswith(("/", "\\")):
                raise ArchiveSecurityViolation(
                    f"Zip-slip path traversal attempt detected in entry: '{filename}'"
                )

            # Resolve expected target path
            dest_file = (target_dir / filename).resolve()
            try:
                # Ensure target path stays strictly inside target_dir
                dest_file.relative_to(target_dir)
            except ValueError:
                raise ArchiveSecurityViolation(
                    f"Zip-slip target outside workspace destination: '{filename}'"
                )

            # Zip-Bomb Guard: Check single entry compression ratio
            if info.file_size > 50 * 1024:  # Only enforce ratio for non-trivial file sizes
                ratio = info.file_size / max(1, info.compress_size)
                if ratio > MAX_DECOMPRESSION_RATIO:
                    raise ArchiveSecurityViolation(
                        f"Zip-bomb decompression ratio {ratio:.1f}:1 exceeded limit of {MAX_DECOMPRESSION_RATIO}:1 on entry '{filename}'"
                    )

            if info.file_size > MAX_SINGLE_FILE_BYTES:
                raise ArchiveSecurityViolation(
                    f"Single file '{filename}' size ({info.file_size} bytes) exceeds limit ({MAX_SINGLE_FILE_BYTES} bytes)."
                )

            total_uncompressed_bytes += info.file_size
            if total_uncompressed_bytes > MAX_UNCOMPRESSED_TOTAL_BYTES:
                raise ArchiveSecurityViolation(
                    f"Zip-bomb total uncompressed size exceeds limit of {MAX_UNCOMPRESSED_TOTAL_BYTES / (1024 * 1024):.0f}MB."
                )

        # Pass 2: Extract verified entries
        for info in entries:
            if info.is_dir():
                (target_dir / info.filename).mkdir(parents=True, exist_ok=True)
                continue

            dest_file = target_dir / info.filename
            dest_file.parent.mkdir(parents=True, exist_ok=True)

            with zf.open(info) as src, open(dest_file, "wb") as dst:
                data = src.read()
                dst.write(data)

            is_bin = is_binary_content(data)
            detection = detect_file_language(dest_file, content_sample=data)

            content_text = ""
            if not is_bin:
                content_text = data.decode("utf-8", errors="replace")

            rel_path = str(dest_file.relative_to(target_dir)).replace("\\", "/")
            extracted_files.append({
                "path": rel_path,
                "filename": dest_file.name,
                "language": detection.language,
                "category": detection.category,
                "is_binary": is_bin,
                "is_executable": detection.is_supported_for_execution,
                "size_bytes": len(data),
                "content": content_text if not is_bin else "[Binary File]",
            })

        return extracted_files
