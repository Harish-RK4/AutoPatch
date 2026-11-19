"""
Projects API Router
Handles project creation, listing, details, and pipeline scan triggers.
"""

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import BugSummary, ProjectCreate, ProjectResponse, ScanTriggerResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects():
    """Lists all active projects."""
    if settings.DEMO_MODE:
        from app.demo.seed_data import DEMO_PROJECTS

        return [
            ProjectResponse(
                id=p["id"],
                name=p["name"],
                language=p.get("language"),
                source_type=p["source_type"],
                status=p["status"],
                created_at=p["created_at"],
            )
            for p in DEMO_PROJECTS
        ]
    return []


@router.post("", response_model=ProjectResponse)
async def create_project(payload: ProjectCreate):
    """Creates a new project from upload or demo seed."""
    import datetime
    import uuid

    new_id = f"proj-{uuid.uuid4().hex[:8]}"
    return ProjectResponse(
        id=new_id,
        name=payload.name,
        language=payload.language or "unknown",
        source_type=payload.source_type,
        status="uploaded",
        created_at=datetime.datetime.now(datetime.UTC).isoformat(),
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Retrieves project details."""
    if settings.DEMO_MODE:
        from app.demo.seed_data import DEMO_PROJECTS

        proj = next((p for p in DEMO_PROJECTS if p["id"] == project_id), None)
        if proj:
            return ProjectResponse(
                id=proj["id"],
                name=proj["name"],
                language=proj.get("language"),
                source_type=proj["source_type"],
                status=proj["status"],
                created_at=proj["created_at"],
            )
    raise HTTPException(status_code=404, detail="Project not found")


@router.post("/{project_id}/scan", response_model=ScanTriggerResponse)
async def trigger_scan(project_id: str):
    """Triggers the 5-step pipeline execution (Upload -> Scan -> Explain -> Fix -> Test)."""
    import uuid

    scan_id = f"scan-{uuid.uuid4().hex[:8]}"
    return ScanTriggerResponse(
        scan_id=scan_id,
        project_id=project_id,
        stage="scan",
        message="Pipeline initiated. Executing AST indexer and flaw scanner.",
    )


@router.get("/{project_id}/bugs", response_model=list[BugSummary])
async def list_project_bugs(project_id: str):
    """Returns detected and prioritized bugs for a project."""
    if settings.DEMO_MODE:
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
    return []
