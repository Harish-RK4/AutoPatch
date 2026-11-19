"""
Pydantic Schemas for Projects, Scans, Bugs, Patches, and Settings
"""

from typing import Any

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str
    source_type: str = "upload"  # upload | dataset | paste | git | demo
    language: str | None = None
    repo_url: str | None = None
    filename: str | None = None
    content: str | None = None
    error_trace: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    language: str | None = None
    source_type: str
    status: str
    created_at: str
    filename: str | None = None
    files: list[dict[str, Any]] = Field(default_factory=list)
    patched_content: str | None = None
    unified_diff: str | None = None
    patches: list[dict[str, Any]] = Field(default_factory=list)


class BugSummary(BaseModel):
    id: str
    project_id: str
    title: str
    file_path: str
    line_start: int
    line_end: int
    origin_line: int | None = None
    crash_line: int | None = None
    category: str
    severity: str
    confidence_score: float
    verification_level: str
    state: str


class PatchHunk(BaseModel):
    hunk_no: int
    file_path: str
    line_start: int
    line_end: int
    original_code: str
    new_code: str
    why_wrong: str
    why_fix_works: str
    if_not_fixed: str | None = None
    side_effects: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)


class PatchDetail(BaseModel):
    id: str
    bug_id: str
    candidate_no: int
    diff: str
    original_code: str
    patched_code: str
    reason: str
    risk_level: str
    rank: int
    selected: bool
    git_branch: str | None = None
    status: str  # proposed | accepted | rejected | needs_review
    verification_level: str
    hunks: list[PatchHunk] = Field(default_factory=list)
    proof_bundle: dict[str, Any] = Field(default_factory=dict)


class BugDetail(BugSummary):
    description: str
    trigger_input: dict[str, Any] | None = None
    failure_type: str | None = None
    severity_score: float
    priority_rank: int
    root_cause: dict[str, Any]
    blast_radius: dict[str, Any]
    stack_trace: str | None = None
    stack_frames: list[dict[str, Any]] = Field(default_factory=list)
    execution_trace: list[dict[str, Any]] = Field(default_factory=list)
    backward_slice: list[dict[str, Any]] = Field(default_factory=list)
    hunk_cards: list[dict[str, Any]] = Field(default_factory=list)
    is_hypothesis: bool = False
    patches: list[PatchDetail] = Field(default_factory=list)


class PatchDecision(BaseModel):
    action: str  # accept | reject | needs_review
    note: str | None = None


class ScanTriggerResponse(BaseModel):
    scan_id: str
    project_id: str
    stage: str  # upload | scan | explain | fix | test | done
    message: str


class AskQuestionRequest(BaseModel):
    question: str


class AskQuestionResponse(BaseModel):
    answer: str
    cited_files: list[str] = Field(default_factory=list)
