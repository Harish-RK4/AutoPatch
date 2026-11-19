"""
API integration and contract tests.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "autopatch-backend"


@pytest.mark.asyncio
async def test_list_projects(async_client: AsyncClient):
    response = await async_client.get("/api/v1/projects")
    assert response.status_code == 200
    projects = response.json()
    assert isinstance(projects, list)
    assert len(projects) >= 1
    # Check that demo project exists
    calc = next((p for p in projects if p["name"] == "Python Marks Calculator"), None)
    assert calc is not None


@pytest.mark.asyncio
async def test_get_project_bugs(async_client: AsyncClient):
    response = await async_client.get("/api/v1/projects/demo-proj-001/bugs")
    assert response.status_code == 200
    bugs = response.json()
    assert len(bugs) >= 1
    bug = bugs[0]
    assert bug["verification_level"] in ["V0", "V1", "V2", "V3", "V4"]
    assert "calculator.py" in bug["file_path"]


@pytest.mark.asyncio
async def test_get_bug_detail_and_patches(async_client: AsyncClient):
    response = await async_client.get("/api/v1/bugs/demo-bug-001")
    assert response.status_code == 200
    detail = response.json()
    assert detail["title"] == "Missing bounds validation on student marks"
    assert "root_cause" in detail
    assert "blast_radius" in detail
    assert len(detail["patches"]) >= 1
    assert detail["patches"][0]["verification_level"] == "V4"


@pytest.mark.asyncio
async def test_patch_decision(async_client: AsyncClient):
    payload = {"action": "accept", "note": "Verified by test suite and approved."}
    response = await async_client.post("/api/v1/patches/demo-patch-001/decision", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["action"] == "accept"
    assert res["status"] == "recorded"


@pytest.mark.asyncio
async def test_settings_llm_endpoint(async_client: AsyncClient):
    response = await async_client.get("/api/v1/settings/llm")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "mock"
    assert len(data["providers"]) >= 4
