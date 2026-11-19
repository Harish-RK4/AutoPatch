"""
AutoPatch Backend Application Entrypoint
FastAPI web service exposing the autonomous repair pipeline, routing, and review APIs.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_bugs import router as bugs_router
from app.api.routes_patches import router as patches_router
from app.api.routes_projects import router as projects_router
from app.api.routes_settings import router as settings_router
from app.core.config import settings
from app.core.queue import job_queue


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

# CORS Middleware allowing frontend development access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(projects_router, prefix="/api/v1")
app.include_router(bugs_router, prefix="/api/v1")
app.include_router(patches_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")


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
