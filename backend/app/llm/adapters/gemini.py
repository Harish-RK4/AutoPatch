"""
Google Gemini Provider Adapter
Supports Google Generative Language API (e.g. gemini-3.5-flash-lite, gemini-3.8-flash, gemini-2.5-flash).
"""

import time
from typing import Any

import httpx

from app.core.config import settings
from app.llm.adapters.base import BaseLLMAdapter
from app.llm.base import LLMRequest, LLMResponse


class GeminiAdapter(BaseLLMAdapter):
    provider_name = "gemini"

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.default_model = settings.GEMINI_MODEL or "gemini-3.5-flash-lite"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def complete(self, request: LLMRequest, model: str | None = None) -> LLMResponse:
        active_model = model or self.default_model
        # Strip models/ prefix if passed
        clean_model = active_model.replace("models/", "")

        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured in .env.")

        url = f"{self.base_url}/models/{clean_model}:generateContent?key={self.api_key}"

        # Build contents structure
        contents = []
        for msg in request.messages:
            role = "user" if msg.role in ("user", "system") else "model"
            contents.append(
                {
                    "role": role,
                    "parts": [{"text": msg.content}],
                }
            )

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)

        if resp.status_code != 200:
            err_detail = resp.text
            try:
                err_json = resp.json()
                err_detail = err_json.get("error", {}).get("message", err_detail)
            except (ValueError, KeyError):
                err_detail = resp.text
            raise RuntimeError(f"Gemini API error (HTTP {resp.status_code}): {err_detail}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini API returned zero candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])
        generated_text = "".join(p.get("text", "") for p in parts)

        usage = data.get("usageMetadata", {})
        prompt_tokens = usage.get("promptTokenCount", 0)
        completion_tokens = usage.get("candidatesTokenCount", 0)

        return LLMResponse(
            provider="gemini",
            model=clean_model,
            content=generated_text,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cached=False,
        )

    async def test_connection(self) -> dict[str, Any]:
        if not self.api_key:
            return {
                "provider": "gemini",
                "configured": False,
                "status": "missing_key",
                "latency_ms": None,
                "message": "GEMINI_API_KEY is not configured in .env.",
            }

        start_time = time.perf_counter()
        clean_model = self.default_model.replace("models/", "")
        url = f"{self.base_url}/models/{clean_model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": "Ping"}]}],
            "generationConfig": {"maxOutputTokens": 3},
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code == 200:
                return {
                    "provider": "gemini",
                    "configured": True,
                    "status": "connected",
                    "latency_ms": latency_ms,
                    "model": clean_model,
                    "message": f"Successfully connected to Gemini API ({clean_model}) in {latency_ms}ms.",
                }
            else:
                err_msg = resp.text
                try:
                    err_msg = resp.json().get("error", {}).get("message", err_msg)
                except (ValueError, KeyError):
                    err_msg = resp.text
                return {
                    "provider": "gemini",
                    "configured": True,
                    "status": "error",
                    "latency_ms": latency_ms,
                    "message": f"Gemini HTTP {resp.status_code}: {err_msg}",
                }
        except (httpx.HTTPError, RuntimeError, OSError) as exc:
            return {
                "provider": "gemini",
                "configured": True,
                "status": "error",
                "latency_ms": None,
                "message": f"Connection failed: {exc!s}",
            }
