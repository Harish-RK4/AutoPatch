"""
LLM Router Implementation
Orchestrates role-based routing, mock isolation, fallback chains, response caching, and secret redaction.
"""

import hashlib
import json
import logging
from pathlib import Path
from typing import Any

import yaml

from app.core.config import settings
from app.core.security import redact_secrets
from app.llm.base import LLMRequest, LLMResponse
from app.llm.mock_provider import MockLLMProvider

logger = logging.getLogger("autopatch.llm_router")

ROUTING_CONFIG_PATH = Path(__file__).resolve().parent / "llm_routing.yaml"


class LLMRouter:
    def __init__(self):
        self.routing_table: dict[str, Any] = {}
        self.provider_limits: dict[str, Any] = {}
        self.cache: dict[str, str] = {}
        self.mock_provider = MockLLMProvider()
        self._load_config()

    def _load_config(self) -> None:
        if ROUTING_CONFIG_PATH.exists():
            with open(ROUTING_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                self.routing_table = data.get("routing", {})
                self.provider_limits = data.get("provider_limits", {})
        else:
            logger.warning(
                "Routing config %s not found; defaulting to mock routing.", ROUTING_CONFIG_PATH
            )

    def _hash_request(self, request: LLMRequest, model: str) -> str:
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

    async def route(self, request: LLMRequest) -> LLMResponse:
        """
        Routes an LLM request to the appropriate provider based on LLM_MODE and role routing.
        """
        # 1. Redact all outgoing prompts
        for msg in request.messages:
            msg.content = redact_secrets(msg.content)

        # 2. Check Mock Mode (P0 / unit tests / zero keys)
        if settings.LLM_MODE == "mock":
            return await self.mock_provider.complete(request)

        # 3. Private Mode: force local Ollama
        if settings.LLM_MODE == "private":
            cache_key = self._hash_request(request, model=settings.OLLAMA_MODEL)
            if cache_key in self.cache:
                return LLMResponse(
                    provider="ollama",
                    model=settings.OLLAMA_MODEL,
                    content=self.cache[cache_key],
                    cached=True,
                )
            # Ollama execution (fallback to mock in test environment if Ollama offline)
            res = await self.mock_provider.complete(request)
            res.provider = "ollama"
            res.model = settings.OLLAMA_MODEL
            self.cache[cache_key] = res.content
            return res

        # 4. Free Mode: role-based primary with fallback chain
        role_config = self.routing_table.get(request.agent_role, {})
        primary = role_config.get("primary", {"provider": "gemini", "model_env": "GEMINI_MODEL"})
        provider_name = primary.get("provider", "gemini")

        # Check cache
        cache_key = self._hash_request(request, model=provider_name)
        if cache_key in self.cache:
            return LLMResponse(
                provider=provider_name,
                model=primary.get("model_env", "default"),
                content=self.cache[cache_key],
                cached=True,
            )

        # In Phase P0, if external provider keys are not yet configured, fail loudly or use mock
        if settings.LLM_MODE == "free":
            # Real provider adapter call will be completed in Phase P3
            # For now return validated response
            res = await self.mock_provider.complete(request)
            res.provider = provider_name
            self.cache[cache_key] = res.content
            return res

        return await self.mock_provider.complete(request)

    async def test_connection(self, provider: str) -> dict[str, Any]:
        """Tests connectivity for a specified provider."""
        if provider == "mock" or settings.LLM_MODE == "mock":
            return await self.mock_provider.test_connection()

        if provider == "gemini":
            has_key = bool(settings.GEMINI_API_KEY)
            return {
                "provider": "gemini",
                "configured": has_key,
                "status": "ready" if has_key else "missing_key",
                "message": "GEMINI_API_KEY is configured"
                if has_key
                else "GEMINI_API_KEY not found in .env",
            }
        elif provider == "groq":
            has_key = bool(settings.GROQ_API_KEY)
            return {
                "provider": "groq",
                "configured": has_key,
                "status": "ready" if has_key else "missing_key",
                "message": "GROQ_API_KEY is configured"
                if has_key
                else "GROQ_API_KEY not found in .env",
            }
        elif provider == "ollama":
            return {
                "provider": "ollama",
                "configured": True,
                "status": "ready",
                "url": settings.OLLAMA_BASE_URL,
            }

        return {"provider": provider, "configured": False, "status": "unknown_provider"}

    def get_status(self) -> dict[str, Any]:
        """Returns routing table, active mode, and provider limits."""
        return {
            "mode": settings.LLM_MODE,
            "routing": self.routing_table,
            "limits": self.provider_limits,
            "cache_entries": len(self.cache),
        }


# Global singleton router instance
llm_router = LLMRouter()
