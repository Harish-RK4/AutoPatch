"""
Polyglot Language and Data Format Detector
Accurately identifies programming languages, structured datasets, configuration files,
and flags binary/unsupported assets.
"""

from pathlib import Path
from typing import NamedTuple


class DetectionResult(NamedTuple):
    language: str
    category: str  # "code", "dataset", "config", "binary", "text"
    is_supported_for_execution: bool
    is_binary: bool
    confidence: float


# Extension to language and category mapping
EXTENSION_MAP: dict[str, tuple[str, str, bool]] = {
    # Code languages
    ".py": ("python", "code", True),
    ".js": ("javascript", "code", True),
    ".jsx": ("javascript", "code", False),
    ".ts": ("typescript", "code", False),
    ".tsx": ("typescript", "code", False),
    ".c": ("c", "code", False),
    ".cpp": ("cpp", "code", False),
    ".cc": ("cpp", "code", False),
    ".h": ("c", "code", False),
    ".hpp": ("cpp", "code", False),
    ".go": ("go", "code", False),
    ".rs": ("rust", "code", False),
    ".java": ("java", "code", False),
    ".rb": ("ruby", "code", False),
    ".php": ("php", "code", False),
    ".sh": ("shell", "code", False),
    ".bash": ("shell", "code", False),
    ".sql": ("sql", "code", False),
    # Data formats
    ".json": ("json", "dataset", False),
    ".csv": ("csv", "dataset", False),
    ".tsv": ("tsv", "dataset", False),
    ".parquet": ("parquet", "dataset", False),
    ".sqlite": ("sqlite", "dataset", False),
    ".db": ("sqlite", "dataset", False),
    # Config & Markup
    ".yaml": ("yaml", "config", False),
    ".yml": ("yaml", "config", False),
    ".toml": ("toml", "config", False),
    ".xml": ("xml", "config", False),
    ".md": ("markdown", "text", False),
    ".txt": ("text", "text", False),
}

MANIFEST_FILENAMES: dict[str, tuple[str, str, bool]] = {
    "package.json": ("javascript", "config", False),
    "package-lock.json": ("json", "config", False),
    "requirements.txt": ("python", "config", False),
    "pyproject.toml": ("python", "config", False),
    "pipfile": ("python", "config", False),
    "cargo.toml": ("rust", "config", False),
    "go.mod": ("go", "config", False),
    "pom.xml": ("java", "config", False),
    "gemfile": ("ruby", "config", False),
    "dockerfile": ("docker", "config", False),
}


def is_binary_content(data: bytes) -> bool:
    """Check if byte sequence contains null bytes or high ratio of non-printable bytes."""
    if not data:
        return False
    if b"\x00" in data[:1024]:
        return True
    # Check ASCII text proportion
    text_chars = bytearray({7, 8, 9, 10, 12, 13, 27} | set(range(0x20, 0x100)) - {0x7F})
    non_text = data[:1024].translate(None, text_chars)
    return len(non_text) / len(data[:1024]) > 0.30


def detect_file_language(
    file_path: str | Path, content_sample: bytes | None = None
) -> DetectionResult:
    """
    Detect language, category, and execution support from filename, manifests,
    shebang, and content sniffing.
    """
    path = Path(file_path)
    filename = path.name.lower()
    suffix = path.suffix.lower()

    # 1. Check binary sample
    if content_sample and is_binary_content(content_sample):
        return DetectionResult(
            language="binary",
            category="binary",
            is_supported_for_execution=False,
            is_binary=True,
            confidence=0.99,
        )

    # 2. Check known project manifest filenames
    if filename in MANIFEST_FILENAMES:
        lang, cat, supported = MANIFEST_FILENAMES[filename]
        return DetectionResult(
            language=lang,
            category=cat,
            is_supported_for_execution=supported,
            is_binary=False,
            confidence=0.95,
        )

    # 3. Check extension
    if suffix in EXTENSION_MAP:
        lang, cat, supported = EXTENSION_MAP[suffix]
        return DetectionResult(
            language=lang,
            category=cat,
            is_supported_for_execution=supported,
            is_binary=False,
            confidence=0.90,
        )

    # 4. Check shebang line if text sample provided
    if content_sample:
        try:
            first_line = content_sample.split(b"\n")[0].decode("utf-8", errors="ignore").strip()
            if first_line.startswith("#!"):
                if "python" in first_line:
                    return DetectionResult("python", "code", True, False, 0.95)
                elif "node" in first_line or "deno" in first_line:
                    return DetectionResult("javascript", "code", True, False, 0.95)
                elif "bash" in first_line or "sh" in first_line:
                    return DetectionResult("shell", "code", False, False, 0.85)
        except (UnicodeDecodeError, IndexError, ValueError):
            return DetectionResult(
                language="unknown",
                category="text",
                is_supported_for_execution=False,
                is_binary=False,
                confidence=0.10,
            )

    return DetectionResult(
        language="unknown",
        category="text",
        is_supported_for_execution=False,
        is_binary=False,
        confidence=0.10,
    )
