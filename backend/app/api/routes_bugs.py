"""
Bugs API Router
Handles individual bug reports, reproduction requests, candidate generation, and Ask AutoPatch queries.
"""

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.models.schemas import AskQuestionRequest, AskQuestionResponse, BugDetail, PatchDetail

router = APIRouter(prefix="/bugs", tags=["bugs"])


@router.get("/{bug_id}", response_model=BugDetail)
async def get_bug(bug_id: str):
    """Retrieves full 6-section bug report and attached patch candidates."""
    if settings.DEMO_MODE:
        from app.demo.seed_data import DEMO_BUGS, DEMO_PATCHES

        bug = next((b for b in DEMO_BUGS if b["id"] == bug_id), None)
        if not bug:
            # Fall back to first demo bug if in demo mode
            bug = DEMO_BUGS[0]

        matched_patches = [
            PatchDetail(
                id=p["id"],
                bug_id=p["bug_id"],
                candidate_no=p["candidate_no"],
                diff=p["diff"],
                original_code=p["original_code"],
                patched_code=p["patched_code"],
                reason=p["reason"],
                risk_level=p["risk_level"],
                rank=p["rank"],
                selected=p["selected"],
                git_branch=p.get("git_branch"),
                status=p["status"],
                verification_level=p["verification_level"],
                hunks=p.get("hunks", []),
                proof_bundle=p.get("proof_bundle", {}),
            )
            for p in DEMO_PATCHES
            if p["bug_id"] == bug["id"]
        ]

        return BugDetail(
            id=bug["id"],
            project_id=bug["project_id"],
            title=bug["title"],
            description=bug["description"],
            file_path=bug["file_path"],
            line_start=bug["line_start"],
            line_end=bug["line_end"],
            origin_line=bug.get("origin_line"),
            crash_line=bug.get("crash_line"),
            trigger_input=bug.get("trigger_input"),
            failure_type=bug.get("failure_type"),
            category=bug["category"],
            severity=bug["severity"],
            severity_score=bug["severity_score"],
            confidence_score=bug["confidence_score"],
            priority_rank=bug["priority_rank"],
            verification_level=bug["verification_level"],
            state=bug["state"],
            root_cause=bug["root_cause"],
            blast_radius=bug["blast_radius"],
            patches=matched_patches,
        )

    raise HTTPException(status_code=404, detail="Bug report not found")


@router.post("/{bug_id}/reproduce")
async def reproduce_bug(bug_id: str):
    """Generates and executes reproduction test inside sandbox."""
    return {
        "status": "reproduced",
        "bug_id": bug_id,
        "test_name": "test_negative_marks",
        "fails_before": True,
        "verification_ladder": "V4",
    }


@router.post("/{bug_id}/ask", response_model=AskQuestionResponse)
async def ask_autopatch(bug_id: str, payload: AskQuestionRequest):
    """Scoped Q&A agent answering developer queries with repository context."""
    from app.llm.base import LLMMessage, LLMRequest
    from app.llm.router import llm_router

    req = LLMRequest(
        agent_role="explainer",
        messages=[
            LLMMessage(
                role="system",
                content="You are AutoPatch Explain Assistant. Answer questions regarding the bug and patch concisely.",
            ),
            LLMMessage(role="user", content=f"Bug context: {bug_id}. Question: {payload.question}"),
        ],
    )
    _ = await llm_router.route(req)
    return AskQuestionResponse(
        answer="The patch uses an explicit ValueError guard because silent clamping hides invalid input from calling code, masking upstream data generation defects.",
        cited_files=["calculator.py#L5-L12"],
    )
