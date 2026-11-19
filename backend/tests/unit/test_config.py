"""
Unit tests for configuration schema and production demo guard.
"""

import pytest
from app.core.config import Settings


def test_config_loads_defaults():
    s = Settings(APP_ENV="development", DEMO_MODE=True, LLM_MODE="mock")
    assert s.APP_ENV == "development"
    assert s.DEMO_MODE is True
    assert s.LLM_MODE == "mock"


def test_production_guard_rejects_demo_mode():
    """Confirms that DEMO_MODE=True under production raises a RuntimeError."""
    with pytest.raises(RuntimeError, match="DEMO_MODE=True is strictly forbidden in production"):
        Settings(APP_ENV="production", DEMO_MODE=True)


def test_production_guard_accepts_non_demo_mode():
    """Confirms that production mode is valid when DEMO_MODE=False."""
    s = Settings(APP_ENV="production", DEMO_MODE=False, NEXT_PUBLIC_AUTH_MODE="supabase")
    assert s.APP_ENV == "production"
    assert s.DEMO_MODE is False
