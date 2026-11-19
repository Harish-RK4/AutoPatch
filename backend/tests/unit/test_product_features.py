"""
Unit Tests for Phase P8 Product Features:
- Repository Memory & Feedback Learning
- Security CWE/OWASP Classification & OSV Dependency Scanner
- Crash-to-Fix Trace Intake
- GitHub PR Bot Webhook
- One-Click Patch Rollback & Analytics
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.memory.repo_memory import repo_memory
from app.security.scanner import get_cwe_owasp_tag, parse_requirements_txt, security_scanner


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_repository_memory_service():
    project_id = "test-proj-memory-1"
    repo_memory.record_decision(
        patch_id="p-1",
        project_id=project_id,
        bug_id="b-1",
        decision="accept",
        strategy="minimal_diff",
        rationale="Clean and idiomatic solution.",
    )
    repo_memory.record_decision(
        patch_id="p-2",
        project_id=project_id,
        bug_id="b-2",
        decision="reject",
        strategy="heavy_refactor",
        rationale="Too invasive for patch window.",
    )

    mem = repo_memory.get_project_memory(project_id)
    assert mem["total_decisions"] == 2
    assert mem["accepted_count"] == 1
    assert mem["rejected_count"] == 1
    assert mem["acceptance_rate"] == 50.0
    assert "minimal_diff" in mem["preferred_strategies"]
    assert "heavy_refactor" in mem["rejected_strategies"]

    hints = repo_memory.get_critic_hints(project_id)
    assert any("heavy_refactor" in h for h in hints)


def test_security_cwe_owasp_classification():
    bounds_cwe = get_cwe_owasp_tag("missing_bounds_check")
    assert bounds_cwe["cwe_id"] == "CWE-20"
    assert "A04:2021" in bounds_cwe["owasp_category"]

    cmd_cwe = get_cwe_owasp_tag("command_injection")
    assert cmd_cwe["cwe_id"] == "CWE-78"
    assert "A03:2021" in cmd_cwe["owasp_category"]

    unknown = get_cwe_owasp_tag("unusual_edge_case")
    assert unknown["cwe_id"] == "CWE-699"


def test_parse_requirements_txt():
    sample_reqs = """
    # Production dependencies
    requests==2.28.1
    urllib3>=1.26.5
    fastapi~=0.100.0
    pytest
    """
    pkgs = parse_requirements_txt(sample_reqs)
    assert ("requests", "2.28.1") in pkgs
    assert ("urllib3", "1.26.5") in pkgs
    assert ("fastapi", "0.100.0") in pkgs
    assert ("pytest", "latest") in pkgs


@pytest.mark.asyncio
async def test_security_scanner_empty_version():
    res = await security_scanner.scan_package_osv("requests", "latest")
    assert res == []


def test_crash_intake_raw_trace(client: TestClient):
    raw_trace = """Traceback (most recent call last):
  File "calculator.py", line 12, in calculate_grade
    raise ValueError("Marks cannot be negative")
ValueError: Marks cannot be negative: -5.0"""

    resp = client.post(
        "/api/v1/intake/crash",
        json={"raw_trace": raw_trace, "project_id": "demo-proj-001"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "intake_successful"
    assert data["extracted_context"]["file"] == "calculator.py"
    assert data["extracted_context"]["line"] == 12
    assert data["extracted_context"]["exception_type"] == "ValueError"
    assert data["security_tags"]["cwe_id"] == "CWE-20"
    assert "explanation" in data


def test_crash_intake_sentry_event(client: TestClient):
    sentry_event = {
        "exception": {
            "values": [
                {
                    "type": "ZeroDivisionError",
                    "value": "float division by zero",
                    "stacktrace": {
                        "frames": [
                            {"filename": "stats.py", "lineno": 44, "function": "compute_mean"}
                        ]
                    },
                }
            ]
        }
    }
    resp = client.post(
        "/api/v1/intake/crash",
        json={"sentry_event": sentry_event, "project_id": "demo-proj-001"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["extracted_context"]["file"] == "stats.py"
    assert data["extracted_context"]["line"] == 44
    assert data["extracted_context"]["exception_type"] == "ZeroDivisionError"


def test_github_webhook_ping_and_pr(client: TestClient):
    # Ping
    ping_resp = client.post(
        "/api/v1/webhook/github",
        headers={"X-GitHub-Event": "ping"},
        json={"zen": "Design for failure."},
    )
    assert ping_resp.status_code == 200
    assert ping_resp.json()["status"] == "pong"

    # Pull Request
    pr_payload = {
        "action": "opened",
        "pull_request": {
            "number": 42,
            "title": "Fix calculate_grade bounds logic",
            "head": {"sha": "c0ffee123"},
        },
        "repository": {"full_name": "Harish-RK4/AutoPatch"},
    }
    pr_resp = client.post(
        "/api/v1/webhook/github",
        headers={"X-GitHub-Event": "pull_request"},
        json=pr_payload,
    )
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert pr_data["status"] == "processed"
    assert pr_data["pr_number"] == 42
    assert "V4 Proven" in pr_data["bot_comment"]
    assert pr_data["confidence"] == 100


def test_patch_rollback_and_memory(client: TestClient):
    # Rollback demo patch
    rb_resp = client.post("/api/v1/patches/demo-patch-001/rollback")
    assert rb_resp.status_code == 200
    rb_data = rb_resp.json()
    assert rb_data["status"] == "rolled_back"
    assert rb_data["rollback_branch"] == "autopatch/revert-demo-patch-001"
    assert "revert_diff" in rb_data

    # Memory endpoint
    mem_resp = client.get("/api/v1/patches/memory/demo-proj-001")
    assert mem_resp.status_code == 200
    assert "memory" in mem_resp.json()
    assert "critic_hints" in mem_resp.json()


def test_analytics_and_manifest_scan(client: TestClient):
    # Analytics
    an_resp = client.get("/api/v1/analytics")
    assert an_resp.status_code == 200
    an_data = an_resp.json()
    assert "verification_ladder" in an_data
    assert "V4" in an_data["verification_ladder"]
    assert "auto_fix_rate" in an_data
    assert "cwe_distribution" in an_data

    # Security scan manifest
    sec_resp = client.post(
        "/api/v1/security/scan-manifest",
        json={"manifest_type": "requirements.txt", "content": "fastapi==0.100.0"},
    )
    assert sec_resp.status_code == 200
    assert "vulnerabilities_found" in sec_resp.json()
