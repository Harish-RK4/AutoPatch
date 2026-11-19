"""
Unit Tests for Phase P3 Complete Multi-Provider LLM Router
Verifies:
1. GeminiAdapter request building & response parsing
2. GroqAdapter request building & response parsing
3. OllamaAdapter request building & offline fallback
4. TokenBucketRateLimiter RPM & TPM enforcement
5. LLMResponseCache SHA-256 key hashing & hits
6. Automatic fallback chain on provider error
7. Settings API endpoints (test, test-all, mode switch)
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.llm.adapters.gemini import GeminiAdapter
from app.llm.adapters.groq import GroqAdapter
from app.llm.adapters.ollama import OllamaAdapter
from app.llm.base import LLMMessage, LLMRequest, LLMResponse
from app.llm.cache import LLMResponseCache
from app.llm.rate_limiter import TokenBucketRateLimiter
from app.llm.router import llm_router
from app.main import app

# ── Rate Limiter Tests ──────────────────────────────────────────────────

class TestRateLimiter:
    def test_rate_limiter_allows_under_quota(self):
        limiter = TokenBucketRateLimiter(limits={"test_provider": {"rpm": 3, "tpm": 1000}})
        assert limiter.can_consume("test_provider", estimated_tokens=100) is True
        limiter.consume("test_provider", tokens=100)
        limiter.consume("test_provider", tokens=100)
        assert limiter.can_consume("test_provider", estimated_tokens=100) is True

    def test_rate_limiter_blocks_on_rpm_exhaustion(self):
        limiter = TokenBucketRateLimiter(limits={"test_provider": {"rpm": 2, "tpm": 1000}})
        limiter.consume("test_provider", tokens=50)
        limiter.consume("test_provider", tokens=50)
        # 3rd request in same minute must be rejected
        assert limiter.can_consume("test_provider", estimated_tokens=50) is False

    def test_rate_limiter_blocks_on_tpm_exhaustion(self):
        limiter = TokenBucketRateLimiter(limits={"test_provider": {"rpm": 10, "tpm": 200}})
        limiter.consume("test_provider", tokens=150)
        # Request requiring 100 tokens exceeds 200 TPM
        assert limiter.can_consume("test_provider", estimated_tokens=100) is False

    def test_rate_limiter_status(self):
        limiter = TokenBucketRateLimiter(limits={"test_provider": {"rpm": 5, "tpm": 500}})
        limiter.consume("test_provider", tokens=100)
        status = limiter.get_status("test_provider")
        assert status["rpm_used"] == 1
        assert status["rpm_remaining"] == 4
        assert status["tpm_used"] == 100
        assert status["tpm_remaining"] == 400


# ── Response Cache Tests ────────────────────────────────────────────────

class TestResponseCache:
    def test_cache_key_generation_and_storage(self):
        cache = LLMResponseCache()
        req = LLMRequest(
            agent_role="scanner",
            messages=[LLMMessage(role="user", content="scan this file")],
            temperature=0.2,
        )
        key = cache.compute_key(req, model="test-model")
        assert isinstance(key, str) and len(key) == 64

        assert cache.get(key) is None
        cache.set(key, "Cached scan result")
        assert cache.get(key) == "Cached scan result"
        assert cache.size() == 1

        cache.clear()
        assert cache.size() == 0


# ── Provider Adapter Tests ──────────────────────────────────────────────

class TestAdapters:
    @pytest.mark.asyncio
    async def test_gemini_adapter_formatting(self):
        adapter = GeminiAdapter()
        req = LLMRequest(
            agent_role="patcher",
            messages=[LLMMessage(role="user", content="Fix null pointer")],
            temperature=0.1,
        )
        mock_resp = {
            "candidates": [
                {"content": {"parts": [{"text": "Fixed code snippet"}]}}
            ],
            "usageMetadata": {
                "promptTokenCount": 10,
                "candidatesTokenCount": 20,
            },
        }
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(status_code=200, json=lambda: mock_resp)
            res = await adapter.complete(req, model="gemini-3.5-flash-lite")
            assert res.provider == "gemini"
            assert res.content == "Fixed code snippet"
            assert res.prompt_tokens == 10

    @pytest.mark.asyncio
    async def test_groq_adapter_formatting(self):
        adapter = GroqAdapter()
        req = LLMRequest(
            agent_role="critic",
            messages=[LLMMessage(role="user", content="Review patch")],
            temperature=0.0,
        )
        mock_resp = {
            "choices": [
                {"message": {"content": "Critic assessment: Approved"}}
            ],
            "usage": {
                "prompt_tokens": 15,
                "completion_tokens": 8,
                "total_tokens": 23,
            },
        }
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(status_code=200, json=lambda: mock_resp)
            res = await adapter.complete(req, model="qwen/qwen3.8-27b")
            assert res.provider == "groq"
            assert "Approved" in res.content
            assert res.total_tokens == 23

    @pytest.mark.asyncio
    async def test_ollama_adapter_offline_handling(self):
        adapter = OllamaAdapter()
        conn_test = await adapter.test_connection()
        assert conn_test["provider"] == "ollama"
        assert "status" in conn_test


# ── Router Fallback Chain Tests ─────────────────────────────────────────

class TestRouterFallback:
    @pytest.mark.asyncio
    async def test_router_fallback_when_primary_fails(self):
        # Set LLM_MODE to free
        orig_mode = settings.LLM_MODE
        settings.LLM_MODE = "free"
        try:
            req = LLMRequest(
                agent_role="root_cause",
                messages=[LLMMessage(role="user", content="Find defect")],
            )
            # Simulate primary failing, secondary succeeding
            with patch.object(
                llm_router.gemini_adapter, "complete", side_effect=RuntimeError("Gemini 503 Overloaded")
            ), patch.object(
                llm_router.groq_adapter, "complete", return_value=LLMResponse(
                    provider="groq", model="qwen/qwen3.8-27b", content="Root cause found by Groq"
                )
            ):
                res = await llm_router.route(req)
                assert res.provider == "groq"
                assert "Groq" in res.content
        finally:
            settings.LLM_MODE = orig_mode

    @pytest.mark.asyncio
    async def test_router_all_fail_falls_back_to_mock(self):
        orig_mode = settings.LLM_MODE
        settings.LLM_MODE = "free"
        try:
            req = LLMRequest(
                agent_role="scanner",
                messages=[LLMMessage(role="user", content="Scan code")],
            )
            with patch.object(
                llm_router.gemini_adapter, "complete", side_effect=RuntimeError("Gemini 503")
            ), patch.object(
                llm_router.groq_adapter, "complete", side_effect=RuntimeError("Groq 429")
            ):
                res = await llm_router.route(req)
                assert res.provider == "mock"
        finally:
            settings.LLM_MODE = orig_mode


# ── Settings API Endpoint Tests ─────────────────────────────────────────

class TestSettingsEndpoints:
    @pytest.mark.asyncio
    async def test_get_llm_settings(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/settings/llm")
            assert resp.status_code == 200
            data = resp.json()
            assert "mode" in data
            assert "providers" in data
            assert len(data["providers"]) >= 3

    @pytest.mark.asyncio
    async def test_test_llm_connection_mock(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/v1/settings/llm/test/mock")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] in ("ready", "connected")

    @pytest.mark.asyncio
    async def test_update_llm_mode(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/v1/settings/llm/mode", json={"mode": "mock"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["mode"] == "mock"
