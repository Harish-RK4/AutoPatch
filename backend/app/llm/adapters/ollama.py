"""
Ollama Local Provider Adapter
Supports air-gapped local model inference via local Ollama daemon.
"""

import time
from typing import Any

import httpx

from app.core.config import settings
from app.llm.adapters.base import BaseLLMAdapter
from app.llm.base import LLMRequest, LLMResponse


class OllamaAdapter(BaseLLMAdapter):
    provider_name = "ollama"

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.default_model = settings.OLLAMA_MODEL or "qwen2.5-coder:7b"

    async def complete(self, request: LLMRequest, model: str | None = None) -> LLMResponse:
        active_model = model or self.default_model
        url = f"{self.base_url}/api/chat"

        messages = [m.model_dump() for m in request.messages]
        payload = {
            "model": active_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": request.temperature,
            },
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload)

        if resp.status_code != 200:
            raise RuntimeError(f"Ollama local daemon error (HTTP {resp.status_code}): {resp.text}")

        data = resp.json()
        content = data.get("message", {}).get("content", "")
        prompt_tokens = data.get("prompt_eval_count", 0)
        completion_tokens = data.get("eval_count", 0)

        return LLMResponse(
            provider="ollama",
            model=active_model,
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cached=False,
        )

    async def test_connection(self) -> dict[str, Any]:
        start_time = time.perf_counter()
        url = f"{self.base_url}/api/tags"

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code == 200:
                models = [m.get("name") for m in resp.json().get("models", [])]
                return {
                    "provider": "ollama",
                    "configured": True,
                    "status": "connected",
                    "latency_ms": latency_ms,
                    "models_available": models,
                    "message": f"Ollama daemon online at {self.base_url} ({len(models)} model(s) loaded).",
                }
            else:
                return {
                    "provider": "ollama",
                    "configured": True,
                    "status": "offline",
                    "latency_ms": None,
                    "message": f"Ollama daemon responded with HTTP {resp.status_code}.",
                }
        except (httpx.HTTPError, OSError, RuntimeError):
            return {
                "provider": "ollama",
                "configured": False,
                "status": "offline",
                "latency_ms": None,
                "message": f"Ollama daemon not running at {self.base_url}. (Optional: required only for Private Mode)",
            }
