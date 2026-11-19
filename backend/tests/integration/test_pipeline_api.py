"""
Integration Tests for Phase P1 End-to-End Pipeline & Security Boundaries
Verifies:
1. Real archive upload, polyglot extraction, AST indexing, and project creation
2. 5-step autonomous pipeline execution with real sandbox duration
3. Real detected flaw listing (zero fake data)
4. Active synthesized patch retrieval
5. HTTP 400 rejection of zip-slip at API boundary
6. HTTP 400 rejection of zip-bomb at API boundary
"""

import io
import zipfile

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_archive_upload_and_pipeline_execution():
    """Full end-to-end integration: Upload zip -> AST index -> Scan -> Fix -> Dual Sandbox execution."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a zip archive with a flawed Python file
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr(
                "src/eval_runner.py",
                """
def execute_dynamic(code_str):
    # Critical security defect: eval()
    return eval(code_str)
""",
            )
            zf.writestr(
                "package.json",
                '{"name": "dynamic-runner", "version": "1.0.0"}',
            )

        files = {"archive": ("dynamic_runner.zip", zip_buf.getvalue(), "application/zip")}
        data = {"name": "Dynamic Runner Suite"}

        upload_resp = await client.post("/api/v1/projects/upload-archive", files=files, data=data)
        assert upload_resp.status_code == 200
        proj_data = upload_resp.json()
        assert proj_data["name"] == "Dynamic Runner Suite"
        assert len(proj_data["files"]) == 2
        proj_id = proj_data["id"]

        # 2. Run the Autonomous Pipeline
        pipeline_resp = await client.post(f"/api/v1/projects/{proj_id}/pipeline")
        assert pipeline_resp.status_code == 200
        pipeline_data = pipeline_resp.json()

        assert pipeline_data["status"] == "completed"
        assert pipeline_data["issues_count"] >= 1
        assert pipeline_data["patches_count"] >= 1
        assert pipeline_data["total_sandbox_duration_ms"] > 0
        assert "Not Network-Isolated" in pipeline_data["runner_label"]

        # 3. Verify detected bugs endpoint returns the real flaw
        bugs_resp = await client.get(f"/api/v1/projects/{proj_id}/bugs")
        assert bugs_resp.status_code == 200
        bugs_data = bugs_resp.json()
        assert len(bugs_data) >= 1
        assert "SEC-EVAL" in bugs_data[0]["title"]

        # 4. Verify patch is listed
        patches_resp = await client.get("/api/v1/patches")
        assert patches_resp.status_code == 200
        patches_data = patches_resp.json()
        assert any(p["file_path"] == "src/eval_runner.py" for p in patches_data)


@pytest.mark.asyncio
async def test_zip_slip_rejection_at_api_boundary():
    """Security Guard: Malicious zip-slip archive must be rejected with HTTP 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as zf:
            zf.writestr("../../etc/shadow", "root:$6$malicious_hash")

        files = {"archive": ("exploit.zip", zip_buf.getvalue(), "application/zip")}
        data = {"name": "Exploit Attempt"}

        resp = await client.post("/api/v1/projects/upload-archive", files=files, data=data)
        assert resp.status_code == 400
        assert "Zip-slip path traversal" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_zip_bomb_rejection_at_api_boundary():
    """Security Guard: Zip bomb with extreme compression ratio must be rejected with HTTP 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        zip_buf = io.BytesIO()
        repeated = b"0" * (4 * 1024 * 1024)
        with zipfile.ZipFile(zip_buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("huge_zeroes.dat", repeated)

        files = {"archive": ("bomb.zip", zip_buf.getvalue(), "application/zip")}
        data = {"name": "Zip Bomb Test"}

        resp = await client.post("/api/v1/projects/upload-archive", files=files, data=data)
        assert resp.status_code == 400
        assert "Zip-bomb decompression ratio" in resp.json()["detail"]
