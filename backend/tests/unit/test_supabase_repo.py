"""
Unit Tests for Supabase Repository and Cutover (Phase P6)
Tests graceful degradation, status reporting, table schema metadata,
and zero-code .env switching.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.supabase import SupabaseRepository
from app.main import app


def test_supabase_repo_initialization():
    repo = SupabaseRepository()
    status = repo.get_status()
    assert "enabled" in status
    assert "mode" in status
    assert "url_configured" in status


@pytest.mark.asyncio
async def test_supabase_graceful_degradation(monkeypatch):
    repo = SupabaseRepository()
    monkeypatch.setattr(repo, "is_enabled", False)
    # In demo/unconfigured state, insert_record should not crash and return the record
    sample_record = {"name": "Test Project", "source_type": "upload"}
    res = await repo.insert_record("projects", sample_record)
    assert res == sample_record

    # fetch_records should return empty list gracefully
    records = await repo.fetch_records("projects")
    assert isinstance(records, list)
    assert records == []


@pytest.mark.asyncio
async def test_supabase_settings_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/settings/supabase")
        assert resp.status_code == 200
        data = resp.json()
        assert "tables" in data
        assert "profiles" in data["tables"]
        assert "bugs" in data["tables"]
        assert "patches" in data["tables"]
        assert "dataset_profiles" in data["tables"]
        assert "dataset_changes" in data["tables"]
        assert data["rls_enabled"] is True

        test_resp = await client.post("/api/v1/settings/supabase/test")
        assert test_resp.status_code == 200
        test_data = test_resp.json()
        assert "status" in test_data
        assert "message" in test_data
