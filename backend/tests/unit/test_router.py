"""
Unit tests for LLM Router, caching, and role routing table.
"""

import pytest
from app.llm.router import LLMRouter
from app.llm.base import LLMRequest, LLMMessage


@pytest.mark.asyncio
async def test_router_loads_routing_yaml():
    router = LLMRouter()
    assert "scanner" in router.routing_table
    assert "reproducer" in router.routing_table
    assert "critic" in router.routing_table


@pytest.mark.asyncio
async def test_router_mock_mode_zero_keys():
    router = LLMRouter()
    req = LLMRequest(
        agent_role="scanner",
        messages=[LLMMessage(role="user", content="scan this function")]
    )
    res = await router.route(req)
    assert res.provider == "mock"
    assert res.tokens_used > 0


@pytest.mark.asyncio
async def test_router_connection_checks():
    router = LLMRouter()
    status = await router.test_connection("mock")
    assert status["status"] == "connected"
