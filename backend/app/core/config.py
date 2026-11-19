"""
Application Configuration and Environment Schema Validation
Enforces fail-fast production guards and validated settings.
"""

from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve project root relative to this file
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_FILE = ROOT_DIR / ".env" if (ROOT_DIR / ".env").exists() else BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore"
    )

    # Runtime Environment
    APP_ENV: Literal["development", "production", "test"] = "development"
    NODE_ENV: Literal["development", "production", "test"] = "development"

    # Auth & Demo Isolation
    NEXT_PUBLIC_AUTH_MODE: Literal["demo", "supabase"] = "demo"
    DEMO_MODE: bool = True

    # LLM Router Mode
    LLM_MODE: Literal["mock", "free", "private"] = "mock"

    # Free Tier Providers (Optional in mock mode)
    GEMINI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None
    CEREBRAS_API_KEY: str | None = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Model IDs
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    OPENROUTER_MODEL: str = "meta-llama/llama-3.1-8b-instruct:free"
    MISTRAL_CODE_MODEL: str = "codestral-latest"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"

    # Infrastructure
    REDIS_URL: str = "redis://localhost:6379/0"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 3000

    # Sandbox Isolation Configuration
    # 'docker' (production default: network-none, cpus, memory caps)
    # 'local_dev' (dev-only fallback: temp dir, process timeout, secret env scrubbing)
    SANDBOX_MODE: Literal["docker", "local_dev"] = "local_dev"

    # Supabase (Optional for Phase P0)
    NEXT_PUBLIC_SUPABASE_URL: str | None = None
    NEXT_PUBLIC_SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    DATABASE_URL: str | None = None

    # Firebase (Optional for Phase P0)
    FIREBASE_PROJECT_ID: str | None = None
    FIREBASE_CLIENT_EMAIL: str | None = None
    FIREBASE_PRIVATE_KEY: str | None = None

    @model_validator(mode="after")
    def enforce_production_guards(self) -> "Settings":
        """
        Binding Production Guards:
        1. Under no circumstances may DEMO_MODE be enabled in production environments.
        2. In production, SANDBOX_MODE MUST be 'docker'. local_dev is strictly forbidden in production.
        """
        is_production = self.APP_ENV == "production" or self.NODE_ENV == "production"
        if is_production and self.DEMO_MODE:
            raise RuntimeError(
                "FATAL CONFIGURATION ERROR: DEMO_MODE=True is strictly forbidden in production. "
                "Ensure DEMO_MODE=false and NEXT_PUBLIC_AUTH_MODE=supabase before deployment."
            )
        if is_production and self.SANDBOX_MODE == "local_dev":
            raise RuntimeError(
                "FATAL CONFIGURATION ERROR: SANDBOX_MODE=local_dev is strictly forbidden in production. "
                "Production execution requires full Docker container isolation (SANDBOX_MODE=docker)."
            )
        return self


# Global singleton settings instance
settings = Settings()
