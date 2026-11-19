"""
Pydantic Schemas for Projects, Scans, Bugs, Patches, and Settings
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str
    source_type: str = "upload" # upload | git | demo
    language: Optional[str] = None
    repo_url: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    language: Optional[str] = None
    source_type: str
    status: str
    created_at: str


class BugSummary(BaseModel):
    id: str
    project_id: str
    title: str
    file_path: str
    line_start: int
    line_end: int
    origin_line: Optional[int] = None
    crash_line: Optional[int] = None
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
    if_not_fixed: Optional[str] = None
    side_effects: List[str] = Field(default_factory=list)
    alternatives: List[str] = Field(default_factory=list)


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
    git_branch: Optional[str] = None
    status: str # proposed | accepted | rejected | needs_review
    verification_level: str
    hunks: List[PatchHunk] = Field(default_factory=list)
    proof_bundle: Dict[str, Any] = Field(default_factory=dict)


class BugDetail(BugSummary):
    description: str
    trigger_input: Optional[Dict[str, Any]] = None
    failure_type: Optional[str] = None
    severity_score: float
    priority_rank: int
    root_cause: Dict[str, Any]
    blast_radius: Dict[str, Any]
    patches: List[PatchDetail] = Field(default_factory=list)


class PatchDecision(BaseModel):
    action: str # accept | reject | needs_review
    note: Optional[str] = None


class ScanTriggerResponse(BaseModel):
    scan_id: str
    project_id: str
    stage: str # upload | scan | explain | fix | test | done
    message: str


class AskQuestionRequest(BaseModel):
    question: str


class AskQuestionResponse(BaseModel):
    answer: str
    cited_files: List[str] = Field(default_factory=list)
