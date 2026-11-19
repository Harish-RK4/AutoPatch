"""
Prompt and Model Response Cache
Prevents redundant LLM calls and saves quota on identical queries.
"""

import hashlib
import json
from typing import Any

from app.llm.base import LLMRequest


class LLMResponseCache:
    """In-memory SHA-256 response cache for LLM requests."""

    def __init__(self):
        self._cache: dict[str, str] = {}

    def compute_key(self, request: LLMRequest, model: str) -> str:
        serialized = json.dumps(
            {
                "model": model,
                "role": request.agent_role,
                "messages": [m.model_dump() for m in request.messages],
                "temp": request.temperature,
            },
            sort_keys=True,
        )
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get(self, key: str) -> str | None:
        return self._cache.get(key)

    def set(self, key: str, content: str) -> None:
        self._cache[key] = content

    def clear(self) -> None:
        self._cache.clear()

    def size(self) -> int:
        return len(self._cache)

    def get_stats(self) -> dict[str, Any]:
        return {
            "cached_responses": len(self._cache),
        }
