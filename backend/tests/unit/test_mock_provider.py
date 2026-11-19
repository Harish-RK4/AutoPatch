"""
Unit tests for deterministic Mock LLM Provider.
"""

import json
import pytest
from app.llm.mock_provider import MockLLMProvider
from app.llm.base import LLMRequest, LLMMessage


@pytest.mark.asyncio
async def test_mock_provider_all_agent_roles():
    provider = MockLLMProvider()
    roles = ["scanner", "reproducer", "root_cause", "patcher", "critic", "explainer", "dataset_fixer"]

    for role in roles:
        req = LLMRequest(
            agent_role=role,
            messages=[LLMMessage(role="user", content="Test prompt")]
        )
        res = await provider.complete(req)
        assert res.provider == "mock"
        assert res.content is not None
        # Must be valid json for these structured agents
        data = json.loads(res.content)
        assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_mock_provider_test_connection():
    provider = MockLLMProvider()
    res = await provider.test_connection()
    assert res["status"] == "connected"
    assert res["provider"] == "mock"
