"""
Token Bucket & Sliding Window Rate Limiter
Prevents exceeding free-tier limits for Gemini, Groq, Mistral, and OpenRouter.
"""

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderQuota:
    rpm_limit: int
    tpm_limit: int
    requests: deque = field(default_factory=deque)  # timestamps of requests in the last 60s
    tokens: deque = field(default_factory=deque)  # (timestamp, token_count) tuples


DEFAULT_LIMITS: dict[str, dict[str, int]] = {
    "gemini": {"rpm": 15, "tpm": 1_000_000},
    "groq": {"rpm": 30, "tpm": 6_000},
    "mistral": {"rpm": 5, "tpm": 50_000},
    "openrouter": {"rpm": 10, "tpm": 20_000},
    "ollama": {"rpm": 120, "tpm": 500_000},
    "mock": {"rpm": 10_000, "tpm": 10_000_000},
}


class TokenBucketRateLimiter:
    """Sliding-window rate limiter enforcing RPM and TPM boundaries per provider."""

    def __init__(self, limits: dict[str, dict[str, int]] | None = None):
        cfg = limits or DEFAULT_LIMITS
        self.quotas: dict[str, ProviderQuota] = {
            p: ProviderQuota(
                rpm_limit=data.get("rpm", 30),
                tpm_limit=data.get("tpm", 10_000),
            )
            for p, data in cfg.items()
        }

    def _purge_old_entries(self, provider: str, now: float) -> None:
        if provider not in self.quotas:
            return
        quota = self.quotas[provider]
        window_start = now - 60.0

        while quota.requests and quota.requests[0] <= window_start:
            quota.requests.popleft()

        while quota.tokens and quota.tokens[0][0] <= window_start:
            quota.tokens.popleft()

    def can_consume(self, provider: str, estimated_tokens: int = 200) -> bool:
        """Check if request can be made without exceeding RPM or TPM."""
        if provider not in self.quotas:
            return True

        now = time.time()
        self._purge_old_entries(provider, now)
        quota = self.quotas[provider]

        current_rpm = len(quota.requests)
        current_tpm = sum(t[1] for t in quota.tokens)

        if current_rpm >= quota.rpm_limit:
            return False
        return (current_tpm + estimated_tokens) <= quota.tpm_limit

    def consume(self, provider: str, tokens: int = 200) -> None:
        """Record consumption of 1 request and N tokens."""
        if provider not in self.quotas:
            self.quotas[provider] = ProviderQuota(rpm_limit=30, tpm_limit=10_000)

        now = time.time()
        quota = self.quotas[provider]
        quota.requests.append(now)
        quota.tokens.append((now, tokens))

    def get_status(self, provider: str) -> dict[str, Any]:
        """Get current usage stats for a provider."""
        if provider not in self.quotas:
            return {"rpm_used": 0, "rpm_limit": 30, "tpm_used": 0, "tpm_limit": 10_000}

        now = time.time()
        self._purge_old_entries(provider, now)
        quota = self.quotas[provider]

        rpm_used = len(quota.requests)
        tpm_used = sum(t[1] for t in quota.tokens)

        return {
            "rpm_used": rpm_used,
            "rpm_limit": quota.rpm_limit,
            "rpm_remaining": max(0, quota.rpm_limit - rpm_used),
            "tpm_used": tpm_used,
            "tpm_limit": quota.tpm_limit,
            "tpm_remaining": max(0, quota.tpm_limit - tpm_used),
        }
