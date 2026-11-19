"""
Base LLM Provider Interface and Data Transfer Objects
"""

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str


class LLMRequest(BaseModel):
    agent_role: str  # scanner, reproducer, root_cause, patcher, critic, explainer, dataset_fixer
    messages: list[LLMMessage]
    temperature: float = 0.2
    max_tokens: int = 2048
    metadata: dict[str, Any] = Field(default_factory=dict)


class LLMResponse(BaseModel):
    provider: str
    model: str
    content: str
    raw_response: dict[str, Any] | None = None
    cached: bool = False
    tokens_used: int = 0


class BaseLLMProvider(ABC):
    @abstractmethod
    async def complete(self, request: LLMRequest) -> LLMResponse:
        """Executes a chat completion request."""

    @abstractmethod
    async def test_connection(self) -> dict[str, Any]:
        """Tests provider connectivity and authentication."""
