"""
Security, Secrets Redaction, and Sanitization Engine
Protects confidential developer assets and tokens from leaking into prompts or logs.
"""

import re
from typing import Dict, Any


SECRET_PATTERNS = [
    # Generic API Keys & Tokens
    (re.compile(r'(?i)(api[_-]?key|secret|token|password|auth|bearer)\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.]{12,})["\']?'), r'\1="[REDACTED_SECRET]"'),
    # GitHub Tokens
    (re.compile(r'gh[pousr]_[A-Za-z0-9_]{36,255}'), '[REDACTED_GITHUB_TOKEN]'),
    (re.compile(r'github_pat_[A-Za-z0-9_]{82}'), '[REDACTED_GITHUB_PAT]'),
    # Private Keys
    (re.compile(r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----'), '[REDACTED_PRIVATE_KEY]'),
    # Slack / Discord Webhooks
    (re.compile(r'https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+'), '[REDACTED_SLACK_WEBHOOK]'),
    # JWTs
    (re.compile(r'eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}'), '[REDACTED_JWT]'),
]


def redact_secrets(content: str) -> str:
    """
    Scans text for common secret signatures, tokens, and credentials,
    replacing them with safe placeholder tokens.
    """
    if not content:
        return content

    sanitized = content
    for pattern, replacement in SECRET_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)

    return sanitized


def mask_secret(value: str) -> str:
    """Masks a secret string showing only the first 3 and last 2 characters."""
    if not value:
        return "(empty)"
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}...{value[-2:]}"
