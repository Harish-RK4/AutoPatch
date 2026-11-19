"""
Test 1-Click Auto-Fix and Verified Patch Application
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_auto_fix_syntax_and_apply():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest snippet with syntax flaw
        create_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Syntax Test Proj",
                "source_type": "paste",
                "filename": "python.txt",
                "content": 'print("Hello',
            },
        )
        assert create_res.status_code == 200
        proj_data = create_res.json()
        project_id = proj_data["id"]
        assert proj_data["patched_content"] == 'print("Hello")'
        assert len(proj_data["patches"]) >= 1

        # 2. Get project details and verify patches are attached
        get_res = await client.get(f"/api/v1/projects/{project_id}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["patched_content"] == 'print("Hello")'
        assert "print(\"Hello\")" in get_data["unified_diff"]

        # 3. Apply the patch to workspace
        apply_res = await client.post(f"/api/v1/projects/{project_id}/apply-patch", json={})
        assert apply_res.status_code == 200
        apply_data = apply_res.json()
        assert apply_data["status"] == "applied"
        assert apply_data["patched_content"] == 'print("Hello")'

        # 4. Verify project updated status and content
        verify_res = await client.get(f"/api/v1/projects/{project_id}")
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["status"] == "fixed"
        assert verify_data["files"][0]["content"] == 'print("Hello")'
