"""
Pytest configuration and fixtures.
Ensures all tests execute with LLM_MODE=mock and zero external keys.
"""

import os
import pytest
from httpx import AsyncClient, ASGITransport

# Force mock mode for all tests
os.environ["LLM_MODE"] = "mock"
os.environ["DEMO_MODE"] = "true"
os.environ["APP_ENV"] = "test"
os.environ["NODE_ENV"] = "test"

from app.main import app


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
