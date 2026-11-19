"""
AutoPatch Voice Brain - Standalone Microservice Server.
Can be run directly via:
    python -m autopatch_voice_brain.api.standalone_server
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from autopatch_voice_brain.api.router import router as voice_router

app = FastAPI(
    title="AutoPatch Voice Agent Brain API",
    description="Conversational Voice Calling Microservice for AutoPatch Code Repair & Dataset Healing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": "AutoPatch Voice Brain",
        "version": "1.0.0",
        "status": "ready",
        "docs": "/docs",
    }


def main():
    uvicorn.run("autopatch_voice_brain.api.standalone_server:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
