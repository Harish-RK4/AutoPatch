"""
Ingestion Package
Security-hardened archive unpacking and polyglot language detection.
"""

from app.ingestion.archive import (
    MAX_ARCHIVE_UPLOAD_BYTES,
    ArchiveSecurityViolation,
    SafeArchiveIngester,
)
from app.ingestion.detector import (
    DetectionResult,
    detect_file_language,
    is_binary_content,
)

__all__ = [
    "MAX_ARCHIVE_UPLOAD_BYTES",
    "ArchiveSecurityViolation",
    "DetectionResult",
    "SafeArchiveIngester",
    "detect_file_language",
    "is_binary_content",
]
