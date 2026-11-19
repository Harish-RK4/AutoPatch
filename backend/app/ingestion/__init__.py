"""
Ingestion Package
Security-hardened archive unpacking and polyglot language detection.
"""

from app.ingestion.archive import (
    ArchiveSecurityViolation,
    SafeArchiveIngester,
    MAX_ARCHIVE_UPLOAD_BYTES,
)
from app.ingestion.detector import (
    DetectionResult,
    detect_file_language,
    is_binary_content,
)

__all__ = [
    "ArchiveSecurityViolation",
    "SafeArchiveIngester",
    "MAX_ARCHIVE_UPLOAD_BYTES",
    "DetectionResult",
    "detect_file_language",
    "is_binary_content",
]
