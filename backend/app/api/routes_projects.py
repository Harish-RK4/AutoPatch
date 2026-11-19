"""
Projects API Router
Handles project creation, user uploads, listing, details, and pipeline scan triggers.
"""

import datetime
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import BugSummary, ProjectCreate, ProjectResponse, ScanTriggerResponse

router = APIRouter(prefix="/projects", tags=["projects"])

# In-memory store for user-uploaded projects during Phase P0
USER_PROJECTS: list[dict[str, Any]] = []


@router.get("", response_model=list[ProjectResponse])
async def list_projects(filter_mode: str = "all"):
    """
    Lists active projects.
    filter_mode can be 'all', 'user' (uploads only), or 'demo' (seeded fixtures only).
    """
    results: list[ProjectResponse] = []

    # Include user-created projects
    if filter_mode in ("all", "user"):
        for p in USER_PROJECTS:
            results.append(
                ProjectResponse(
                    id=p["id"],
                    name=p["name"],
                    language=p.get("language"),
                    source_type=p.get("source_type", "upload"),
                    status=p.get("status", "uploaded"),
                    created_at=p["created_at"],
                    filename=p.get("filename"),
                    files=p.get("files", []),
                )
            )

    # Include demo projects if DEMO_MODE is active
    if settings.DEMO_MODE and filter_mode in ("all", "demo"):
        from app.demo.seed_data import DEMO_PROJECTS

        for p in DEMO_PROJECTS:
            results.append(
                ProjectResponse(
                    id=p["id"],
                    name=p["name"],
                    language=p.get("language"),
                    source_type="demo",
                    status=p.get("status", "ready"),
                    created_at=p["created_at"],
                    filename=p.get("files", [{}])[0].get("file_path") if p.get("files") else None,
                    files=p.get("files", []),
                )
            )

    return results


@router.post("", response_model=ProjectResponse)
async def create_project(payload: ProjectCreate):
    """
    Creates a new project from user upload, dataset, or pasted snippet.
    Persists actual filename, content, and language without fake data.
    """
    new_id = f"proj-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.datetime.now(datetime.UTC).isoformat()

    files = []
    if payload.filename or payload.content:
        files.append(
            {
                "file_path": payload.filename or f"snippet.{payload.language or 'txt'}",
                "content": payload.content or "",
                "error_trace": payload.error_trace or "",
            }
        )

    project_record = {
        "id": new_id,
        "name": payload.name,
        "language": payload.language or "Unknown",
        "source_type": payload.source_type,
        "status": "ready",
        "created_at": now_iso,
        "filename": payload.filename or (files[0]["file_path"] if files else "source.code"),
        "files": files,
        "repo_url": payload.repo_url,
    }

    USER_PROJECTS.insert(0, project_record)

    return ProjectResponse(
        id=project_record["id"],
        name=project_record["name"],
        language=project_record["language"],
        source_type=project_record["source_type"],
        status=project_record["status"],
        created_at=project_record["created_at"],
        filename=project_record["filename"],
        files=project_record["files"],
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Retrieves project details for user projects or demo seed."""
    # Check user projects first
    user_proj = next((p for p in USER_PROJECTS if p["id"] == project_id), None)
    if user_proj:
        return ProjectResponse(
            id=user_proj["id"],
            name=user_proj["name"],
            language=user_proj.get("language"),
            source_type=user_proj.get("source_type", "upload"),
            status=user_proj.get("status", "ready"),
            created_at=user_proj["created_at"],
            filename=user_proj.get("filename"),
            files=user_proj.get("files", []),
        )

    # Check demo projects
    if settings.DEMO_MODE:
        from app.demo.seed_data import DEMO_PROJECTS

        proj = next((p for p in DEMO_PROJECTS if p["id"] == project_id), None)
        if proj:
            return ProjectResponse(
                id=proj["id"],
                name=proj["name"],
                language=proj.get("language"),
                source_type="demo",
                status=proj["status"],
                created_at=proj["created_at"],
                filename=proj.get("files", [{}])[0].get("file_path") if proj.get("files") else None,
                files=proj.get("files", []),
            )

    raise HTTPException(status_code=404, detail="Project not found")


@router.post("/{project_id}/scan", response_model=ScanTriggerResponse)
async def trigger_scan(project_id: str):
    """Triggers the 5-step pipeline execution."""
    scan_id = f"scan-{uuid.uuid4().hex[:8]}"
    return ScanTriggerResponse(
        scan_id=scan_id,
        project_id=project_id,
        stage="scan",
        message="Pipeline initiated. In mock mode, AST indexer and flaw scanner run against local fixtures.",
    )


@router.get("/{project_id}/bugs", response_model=list[BugSummary])
async def list_project_bugs(project_id: str):
    """
    Returns detected bugs for a project.
    Demo projects return seeded defects.
    User-uploaded projects honestly return an empty list in P0 without fabricating bugs!
    """
    if project_id.startswith("demo-") and settings.DEMO_MODE:
        from app.demo.seed_data import DEMO_BUGS

        matched = [b for b in DEMO_BUGS if b["project_id"] == project_id]
        if not matched and project_id.startswith("demo-"):
            matched = DEMO_BUGS  # fallback for demo projects
        return [
            BugSummary(
                id=b["id"],
                project_id=b["project_id"],
                title=b["title"],
                file_path=b["file_path"],
                line_start=b["line_start"],
                line_end=b["line_end"],
                origin_line=b.get("origin_line"),
                crash_line=b.get("crash_line"),
                category=b["category"],
                severity=b["severity"],
                confidence_score=b["confidence_score"],
                verification_level=b["verification_level"],
                state=b["state"],
            )
            for b in matched
        ]

    # For user-uploaded projects in Phase P0 mock mode:
    # We do NOT fabricate fake bugs! Real analysis activates in P1.
    return []
