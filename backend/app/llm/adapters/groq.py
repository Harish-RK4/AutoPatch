"""
Groq Provider Adapter
Supports Groq high-speed inference API (e.g. qwen/qwen3.8-27b, llama-3.3-70b-versatile, mixtral).
"""

import time
from typing import Any

import httpx

from app.core.config import settings
from app.llm.adapters.base import BaseLLMAdapter
from app.llm.base import LLMRequest, LLMResponse


class GroqAdapter(BaseLLMAdapter):
    provider_name = "groq"

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.default_model = settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        self.base_url = "https://api.groq.com/openai/v1"

    async def complete(self, request: LLMRequest, model: str | None = None) -> LLMResponse:
        active_model = model or self.default_model

        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured in .env.")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = [m.model_dump() for m in request.messages]
        payload = {
            "model": active_model,
            "messages": messages,
            "temperature": request.temperature,
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code != 200:
            err_detail = resp.text
            try:
                err_json = resp.json()
                err_detail = err_json.get("error", {}).get("message", err_detail)
            except (ValueError, KeyError):
                err_detail = resp.text
            raise RuntimeError(f"Groq API error (HTTP {resp.status_code}): {err_detail}")

        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Groq API returned zero choices.")

        content = choices[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)

        return LLMResponse(
            provider="groq",
            model=active_model,
            content=content,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cached=False,
        )

    async def test_connection(self) -> dict[str, Any]:
        if not self.api_key:
            return {
                "provider": "groq",
                "configured": False,
                "status": "missing_key",
                "latency_ms": None,
                "message": "GROQ_API_KEY is not configured in .env.",
            }

        start_time = time.perf_counter()
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.default_model,
            "messages": [{"role": "user", "content": "Ping"}],
            "max_tokens": 3,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code == 200:
                return {
                    "provider": "groq",
                    "configured": True,
                    "status": "connected",
                    "latency_ms": latency_ms,
                    "model": self.default_model,
                    "message": f"Successfully connected to Groq API ({self.default_model}) in {latency_ms}ms.",
                }
            else:
                err_msg = resp.text
                try:
                    err_msg = resp.json().get("error", {}).get("message", err_msg)
                except (ValueError, KeyError):
                    err_msg = resp.text
                return {
                    "provider": "groq",
                    "configured": True,
                    "status": "error",
                    "latency_ms": latency_ms,
                    "message": f"Groq HTTP {resp.status_code}: {err_msg}",
                }
        except (httpx.HTTPError, RuntimeError, OSError) as exc:
            return {
                "provider": "groq",
                "configured": True,
                "status": "error",
                "latency_ms": None,
                "message": f"Connection failed: {exc!s}",
            }
