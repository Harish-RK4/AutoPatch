"""
Settings API Router — Phase P3
Exposes LLM router status, active provider limits, live connection verification tests,
and runtime mode switching.
"""

from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import mask_secret
from app.db.supabase import supabase_repo
from app.llm.router import llm_router

router = APIRouter(prefix="/settings", tags=["settings"])


class ModeUpdateRequest(BaseModel):
    mode: Literal["mock", "free", "private"]


@router.get("/llm")
async def get_llm_settings():
    """Returns LLM router configuration, routing table, active mode, and rate limits."""
    status = llm_router.get_status()
    return {
        "mode": status["mode"],
        "routing": status["routing"],
        "limits": status["limits"],
        "cache_entries": status["cache_entries"],
        "rate_limits": status.get("rate_limits", {}),
        "providers": [
            {
                "id": "gemini",
                "name": "Google Gemini",
                "model": settings.GEMINI_MODEL,
                "configured": bool(settings.GEMINI_API_KEY),
                "masked_key": mask_secret(settings.GEMINI_API_KEY or ""),
                "status": "configured" if settings.GEMINI_API_KEY else "missing_key",
            },
            {
                "id": "groq",
                "name": "Groq Inference",
                "model": settings.GROQ_MODEL,
                "configured": bool(settings.GROQ_API_KEY),
                "masked_key": mask_secret(settings.GROQ_API_KEY or ""),
                "status": "configured" if settings.GROQ_API_KEY else "missing_key",
            },
            {
                "id": "ollama",
                "name": "Local Ollama (Private)",
                "model": settings.OLLAMA_MODEL,
                "configured": True,
                "url": settings.OLLAMA_BASE_URL,
                "status": "ready",
            },
            {
                "id": "mock",
                "name": "Deterministic Mock Provider",
                "model": "mock-p0-deterministic",
                "configured": True,
                "status": "ready",
            },
        ],
    }


@router.post("/llm/test/{provider_id}")
async def test_llm_connection(provider_id: str) -> dict[str, Any]:
    """Triggers live connectivity test for a specific provider."""
    return await llm_router.test_connection(provider_id)


@router.post("/llm/test-all")
async def test_all_llm_connections() -> dict[str, Any]:
    """Triggers connectivity test across all configured providers."""
    return await llm_router.test_all_connections()


@router.post("/llm/mode")
async def update_llm_mode(payload: ModeUpdateRequest):
    """Switches active LLM_MODE (free / mock / private) at runtime."""
    settings.LLM_MODE = payload.mode
    return {
        "status": "updated",
        "mode": settings.LLM_MODE,
        "message": f"LLM Router mode set to {settings.LLM_MODE}.",
    }


@router.get("/supabase")
async def get_supabase_settings():
    """Returns Supabase connection configuration, RLS policies status, and storage buckets."""
    status = supabase_repo.get_status()
    return {
        **status,
        "url": settings.NEXT_PUBLIC_SUPABASE_URL,
        "masked_service_key": mask_secret(settings.SUPABASE_SERVICE_ROLE_KEY or ""),
        "masked_anon_key": mask_secret(settings.NEXT_PUBLIC_SUPABASE_ANON_KEY or ""),
        "tables": [
            "profiles",
            "projects",
            "scans",
            "bugs",
            "repro_tests",
            "patches",
            "patch_hunks",
            "test_runs",
            "change_history",
            "repo_memory",
            "device_tokens",
            "notifications",
            "dataset_profiles",
            "dataset_changes",
        ],
        "buckets": ["projects", "patches", "datasets"],
        "rls_enabled": True,
    }


@router.post("/supabase/test")
async def test_supabase_connection():
    """Tests connectivity to configured Supabase project."""
    if not supabase_repo.is_enabled:
        return {
            "status": "mock_mode",
            "configured": False,
            "message": "NEXT_PUBLIC_AUTH_MODE=demo. Supabase is standing by for production credentials in .env.",
        }
    records = await supabase_repo.fetch_records("projects")
    return {
        "status": "connected",
        "configured": True,
        "message": f"Successfully connected to Supabase PostgREST endpoint ({len(records)} projects found).",
    }
