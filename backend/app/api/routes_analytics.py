"""
Analytics and Security Manifest Audit API
Provides comprehensive system telemetry, verification ladder breakdowns,
and dependency vulnerability scanning via OSV.dev.
"""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.demo.seed_data import DEMO_BUGS, DEMO_PATCHES, DEMO_PROJECTS
from app.patcher.pipeline import ACTIVE_PATCHES, PROJECT_PIPELINE_RUNS
from app.security.scanner import get_cwe_owasp_tag, security_scanner

router = APIRouter(tags=["Analytics & Security"])


class ManifestScanRequest(BaseModel):
    manifest_type: str = Field("requirements.txt", description="Manifest type (requirements.txt)")
    content: str = Field(
        ...,
        description="Manifest file contents",
        examples=["requests==2.25.1\nurllib3==1.26.4\nflask==1.1.2"],
    )


@router.get("/analytics")
async def get_system_analytics() -> dict[str, Any]:
    """Computes comprehensive engineering analytics, verification confidence, and CWE telemetry."""
    # Combine active and demo records if in demo mode
    active_bugs = [b for run in PROJECT_PIPELINE_RUNS.values() for b in getattr(run, "bugs", [])]
    all_patches = list(ACTIVE_PATCHES.values())

    if settings.DEMO_MODE:
        all_bugs_data = [b if isinstance(b, dict) else b.to_dict() for b in active_bugs] + DEMO_BUGS
        all_patches_data = [p if isinstance(p, dict) else p.to_dict() for p in all_patches] + DEMO_PATCHES
        project_count = len(DEMO_PROJECTS)
    else:
        all_bugs_data = [b if isinstance(b, dict) else b.to_dict() for b in active_bugs]
        all_patches_data = [p if isinstance(p, dict) else p.to_dict() for p in all_patches]
        project_count = max(1, len(PROJECT_PIPELINE_RUNS))

    total_bugs = len(all_bugs_data)
    total_patches = len(all_patches_data)

    # Verification ladder counts
    ladder_counts = {"V4": 0, "V3": 0, "V2": 0, "V1": 0, "V0": 0}
    total_conf = 0.0

    for p in all_patches_data:
        v_level = p.get("verification_level", "V0")
        for key in ladder_counts:
            if key in v_level:
                ladder_counts[key] += 1
                break
        total_conf += float(p.get("confidence_score", 0.0))

    avg_confidence = round(total_conf / total_patches, 1) if total_patches > 0 else 0.0

    # Auto-fix rate: patches with V3 or V4
    proven_count = ladder_counts["V4"] + ladder_counts["V3"]
    auto_fix_rate = round((proven_count / total_patches) * 100, 1) if total_patches > 0 else 0.0

    # CWE distribution
    cwe_counts: dict[str, int] = {}
    for b in all_bugs_data:
        ft = b.get("type") or b.get("flaw_type", "logic_boundary_defect")
        cwe_info = get_cwe_owasp_tag(ft)
        cwe_id = cwe_info["cwe_id"]
        cwe_counts[cwe_id] = cwe_counts.get(cwe_id, 0) + 1

    # Time saved: estimated 2.5 hours per verified patch
    time_saved_hours = round(proven_count * 2.5, 1)

    return {
        "total_projects": project_count,
        "total_bugs_detected": total_bugs,
        "total_patches_generated": total_patches,
        "verification_ladder": ladder_counts,
        "average_confidence": avg_confidence,
        "auto_fix_rate": auto_fix_rate,
        "cwe_distribution": cwe_counts,
        "estimated_engineering_hours_saved": time_saved_hours,
        "sandbox_runs_executed": total_patches * 2,  # pre and post verification runs
    }


@router.post("/security/scan-manifest")
async def scan_dependency_manifest(payload: ManifestScanRequest) -> dict[str, Any]:
    """Audits dependencies against open OSV.dev vulnerability database."""
    advisories = await security_scanner.scan_manifest(
        manifest_content=payload.content, manifest_type=payload.manifest_type
    )
    return {
        "manifest_type": payload.manifest_type,
        "vulnerabilities_found": len(advisories),
        "advisories": advisories,
        "status": "vulnerable" if advisories else "clean",
    }
