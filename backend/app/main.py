"""
AutoPatch Backend Application Entrypoint
FastAPI web service exposing the autonomous repair pipeline, routing, and review APIs.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_analytics import router as analytics_router
from app.api.routes_auth import router as auth_router
from app.api.routes_bugs import router as bugs_router
from app.api.routes_intake import router as intake_router
from app.api.routes_notifications import device_router as devices_router
from app.api.routes_notifications import router as notifications_router
from app.api.routes_patches import router as patches_router
from app.api.routes_projects import router as projects_router
from app.api.routes_settings import router as settings_router
from app.api.routes_webhook import router as webhook_router
from app.core.config import settings
from app.core.queue import job_queue

import os
import sys
from pathlib import Path

# Ensure project root and backend root are in sys.path for autopatch_voice_brain
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
for search_path in (str(ROOT_DIR), str(BACKEND_DIR)):
    if search_path not in sys.path:
        sys.path.insert(0, search_path)

from autopatch_voice_brain import autopatch_voice_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize background job queue
    await job_queue.initialize()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="AutoPatch API",
    description="Autonomous Software Bug Detection and Repair System API",
    version="0.1.0",
    lifespan=lifespan,
)

# Dynamic CORS Configuration for local development and cloud production (Vercel)
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    default_origins.extend([origin.strip() for origin in extra_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(bugs_router, prefix="/api/v1")
app.include_router(patches_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(devices_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(intake_router, prefix="/api/v1")
app.include_router(webhook_router, prefix="/api/v1")
app.include_router(autopatch_voice_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """System health check endpoint for monitoring and container orchestration."""
    return {
        "status": "healthy",
        "service": "autopatch-backend",
        "app_env": settings.APP_ENV,
        "demo_mode": settings.DEMO_MODE,
        "llm_mode": settings.LLM_MODE,
        "auth_mode": settings.NEXT_PUBLIC_AUTH_MODE,
    }


@app.get("/")
async def root():
    return {
        "name": "AutoPatch API",
        "version": "0.1.0",
        "docs_url": "/docs",
        "health_url": "/health",
    }
