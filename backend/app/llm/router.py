"""
LLM Router Implementation — Phase P3
Orchestrates role-based routing, real multi-provider adapters (Gemini, Groq, Ollama),
token-bucket rate limiting, automatic fallback chains, response caching, and secret redaction.
"""

import logging
from pathlib import Path
from typing import Any

import httpx
import yaml

from app.core.config import settings
from app.core.security import redact_secrets
from app.llm.adapters.gemini import GeminiAdapter
from app.llm.adapters.groq import GroqAdapter
from app.llm.adapters.ollama import OllamaAdapter
from app.llm.base import LLMRequest, LLMResponse
from app.llm.cache import LLMResponseCache
from app.llm.mock_provider import MockLLMProvider
from app.llm.rate_limiter import TokenBucketRateLimiter

logger = logging.getLogger("autopatch.llm_router")
ROUTING_CONFIG_PATH = Path(__file__).resolve().parent / "llm_routing.yaml"


class LLMRouter:
    def __init__(self):
        self.routing_table: dict[str, Any] = {}
        self.provider_limits: dict[str, Any] = {}
        self.cache = LLMResponseCache()
        self.rate_limiter = TokenBucketRateLimiter()

        # Initialize adapters
        self.mock_provider = MockLLMProvider()
        self.gemini_adapter = GeminiAdapter()
        self.groq_adapter = GroqAdapter()
        self.ollama_adapter = OllamaAdapter()

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

    def _get_adapter(self, provider_name: str) -> Any:
        if provider_name == "gemini":
            return self.gemini_adapter
        elif provider_name == "groq":
            return self.groq_adapter
        elif provider_name == "ollama":
            return self.ollama_adapter
        return self.mock_provider

    def _resolve_model(self, model_env_name: str, provider: str) -> str:
        """Resolve the active model name from settings or fallback."""
        if hasattr(settings, model_env_name):
            val = getattr(settings, model_env_name)
            if val:
                return val
        if provider == "gemini":
            return settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        elif provider == "groq":
            return settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        elif provider == "ollama":
            return settings.OLLAMA_MODEL or "qwen2.5-coder:7b"
        return "default-model"

    async def route(self, request: LLMRequest) -> LLMResponse:
        """
        Routes an LLM request to the appropriate provider based on LLM_MODE,
        agent role, rate limit availability, and fallback chains.
        """
        # 1. Redact all outgoing prompts
        for msg in request.messages:
            msg.content = redact_secrets(msg.content)

        # 2. Check Mock Mode (zero keys needed / deterministic test fixtures)
        if settings.LLM_MODE == "mock":
            return await self.mock_provider.complete(request)

        # 3. Private Mode: force local Ollama
        if settings.LLM_MODE == "private":
            cache_key = self.cache.compute_key(request, model=settings.OLLAMA_MODEL)
            cached_text = self.cache.get(cache_key)
            if cached_text:
                return LLMResponse(
                    provider="ollama",
                    model=settings.OLLAMA_MODEL,
                    content=cached_text,
                    cached=True,
                )
            try:
                res = await self.ollama_adapter.complete(request, model=settings.OLLAMA_MODEL)
                self.cache.set(cache_key, res.content)
                return res
            except (RuntimeError, ValueError, httpx.HTTPError, OSError) as exc:
                logger.warning("Ollama offline in private mode, falling back to mock: %s", exc)
                return await self.mock_provider.complete(request)

        # 4. Free Mode: role-based primary with automatic fallback chain
        role_config = self.routing_table.get(request.agent_role, {})
        primary = role_config.get("primary", {"provider": "gemini", "model_env": "GEMINI_MODEL"})
        fallbacks = role_config.get("fallbacks", [{"provider": "groq", "model_env": "GROQ_MODEL"}])

        candidates = [primary] + fallbacks

        for target in candidates:
            provider_name = target.get("provider", "gemini")
            model_env = target.get("model_env", "GEMINI_MODEL")
            model_name = self._resolve_model(model_env, provider_name)

            # Check cache
            cache_key = self.cache.compute_key(request, model=model_name)
            cached_text = self.cache.get(cache_key)
            if cached_text:
                return LLMResponse(
                    provider=provider_name,
                    model=model_name,
                    content=cached_text,
                    cached=True,
                )

            # Check rate limiter
            if not self.rate_limiter.can_consume(provider_name):
                logger.warning(
                    "Rate limit reached for provider %s, triggering fallback.", provider_name
                )
                continue

            adapter = self._get_adapter(provider_name)
            try:
                if provider_name in ("gemini", "groq", "ollama"):
                    res = await adapter.complete(request, model=model_name)
                else:
                    res = await adapter.complete(request)
                tokens_count = (
                    getattr(res, "total_tokens", 0) or getattr(res, "tokens_used", 0) or 200
                )
                self.rate_limiter.consume(provider_name, tokens=tokens_count)
                self.cache.set(cache_key, res.content)
                return res
            except (RuntimeError, ValueError, httpx.HTTPError, OSError) as exc:
                logger.warning(
                    "Provider %s (%s) failed: %s. Attempting fallback.",
                    provider_name,
                    model_name,
                    exc,
                )
                continue

        # If all candidates in chain failed, fallback to deterministic mock
        logger.warning("All providers in fallback chain exhausted; falling back to mock provider.")
        return await self.mock_provider.complete(request)

    async def test_connection(self, provider: str) -> dict[str, Any]:
        """Tests connectivity and latency for a specified provider."""
        if provider == "mock" or settings.LLM_MODE == "mock":
            return await self.mock_provider.test_connection()
        elif provider == "gemini":
            return await self.gemini_adapter.test_connection()
        elif provider == "groq":
            return await self.groq_adapter.test_connection()
        elif provider == "ollama":
            return await self.ollama_adapter.test_connection()

        return {"provider": provider, "configured": False, "status": "unknown_provider"}

    async def test_all_connections(self) -> dict[str, Any]:
        """Runs connectivity tests across all configured free-tier providers."""
        gemini_res = await self.gemini_adapter.test_connection()
        groq_res = await self.groq_adapter.test_connection()
        ollama_res = await self.ollama_adapter.test_connection()
        mock_res = await self.mock_provider.test_connection()

        return {
            "mode": settings.LLM_MODE,
            "providers": {
                "gemini": gemini_res,
                "groq": groq_res,
                "ollama": ollama_res,
                "mock": mock_res,
            },
        }

    # Alias complete to route for compatibility
    complete = route

    def get_status(self) -> dict[str, Any]:
        """Returns routing table, active mode, limits, and cache stats."""
        return {
            "mode": settings.LLM_MODE,
            "routing": self.routing_table,
            "limits": self.provider_limits,
            "cache_entries": self.cache.size(),
            "rate_limits": {
                "gemini": self.rate_limiter.get_status("gemini"),
                "groq": self.rate_limiter.get_status("groq"),
            },
        }


# Global singleton router instance
llm_router = LLMRouter()
