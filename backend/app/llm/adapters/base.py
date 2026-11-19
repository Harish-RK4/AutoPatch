"""
Base LLM Adapter Interface
Defines the standard contract for all external and local model providers.
"""

from abc import ABC, abstractmethod
from typing import Any

from app.llm.base import LLMRequest, LLMResponse


class BaseLLMAdapter(ABC):
    """Abstract interface for LLM provider adapters."""

    provider_name: str

    @abstractmethod
    async def complete(self, request: LLMRequest, model: str) -> LLMResponse:
        """Execute a text completion or chat turn with the provider."""

    @abstractmethod
    async def test_connection(self) -> dict[str, Any]:
        """Test authentication and reachability for this provider."""
