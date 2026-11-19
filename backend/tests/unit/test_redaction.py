"""
Unit tests for secret redaction filter.
"""

from app.core.security import redact_secrets, mask_secret


def test_redact_secrets_masks_keys():
    prompt = "Here is my key: api_key='secret_key_123456789012' and bearer token: Authorization: Bearer eyJhbGciOi.eyJzdWIi.signature"
    sanitized = redact_secrets(prompt)
    assert "secret_key_123456789012" not in sanitized
    assert "[REDACTED_SECRET]" in sanitized or "[REDACTED_JWT]" in sanitized


def test_mask_secret_helper():
    assert mask_secret("") == "(empty)"
    assert mask_secret("short") == "***"
    assert mask_secret("sk-1234567890abcdef") == "sk-...ef"
