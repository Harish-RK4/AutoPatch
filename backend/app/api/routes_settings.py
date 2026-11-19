"""
Settings API Router
Exposes LLM router status, active provider limits, and connection verification tests.
"""

from typing import Dict, Any
from fastapi import APIRouter
from app.core.config import settings
from app.core.security import mask_secret
from app.llm.router import llm_router

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/llm")
async def get_llm_settings():
    """Returns LLM router configuration, routing table, and active status."""
    status = llm_router.get_status()
    return {
        "mode": status["mode"],
        "routing": status["routing"],
        "limits": status["limits"],
        "cache_entries": status["cache_entries"],
        "providers": [
            {
                "id": "gemini",
                "name": "Google Gemini Flash",
                "model": settings.GEMINI_MODEL,
                "configured": bool(settings.GEMINI_API_KEY),
                "masked_key": mask_secret(settings.GEMINI_API_KEY or "")
            },
            {
                "id": "groq",
                "name": "Groq LLaMA",
                "model": settings.GROQ_MODEL,
                "configured": bool(settings.GROQ_API_KEY),
                "masked_key": mask_secret(settings.GROQ_API_KEY or "")
            },
            {
                "id": "mistral",
                "name": "Mistral Codestral",
                "model": settings.MISTRAL_CODE_MODEL,
                "configured": bool(settings.MISTRAL_API_KEY),
                "masked_key": mask_secret(settings.MISTRAL_API_KEY or "")
            },
            {
                "id": "openrouter",
                "name": "OpenRouter Free",
                "model": settings.OPENROUTER_MODEL,
                "configured": bool(settings.OPENROUTER_API_KEY),
                "masked_key": mask_secret(settings.OPENROUTER_API_KEY or "")
            },
            {
                "id": "ollama",
                "name": "Local Ollama",
                "model": settings.OLLAMA_MODEL,
                "configured": True,
                "url": settings.OLLAMA_BASE_URL
            }
        ]
    }


@router.post("/llm/test/{provider_id}")
async def test_llm_connection(provider_id: str) -> Dict[str, Any]:
    """Triggers live connectivity test for a specific provider."""
    return await llm_router.test_connection(provider_id)
