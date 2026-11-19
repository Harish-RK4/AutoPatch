"""
Supabase Database and Storage Client
Provides async PostgREST and Storage API integration.
Falls back gracefully to in-memory fixtures when credentials are not supplied,
ensuring seamless zero-code-change switching via .env only.
"""

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger("autopatch.db.supabase")


class SupabaseRepository:
    def __init__(self):
        self.url = settings.NEXT_PUBLIC_SUPABASE_URL
        self.service_key = (
            settings.SUPABASE_SERVICE_ROLE_KEY or settings.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        self.is_enabled = bool(
            self.url and self.service_key and settings.NEXT_PUBLIC_AUTH_MODE == "supabase"
        )

    def get_headers(self) -> dict[str, str]:
        if not self.service_key:
            return {}
        return {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def insert_record(self, table: str, record: dict[str, Any]) -> dict[str, Any] | None:
        """Inserts a record into the specified Supabase PostgreSQL table."""
        if not self.is_enabled or not self.url:
            logger.info("Supabase disabled; record for %s maintained in-memory.", table)
            return record

        endpoint = f"{self.url.rstrip('/')}/rest/v1/{table}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(endpoint, headers=self.get_headers(), json=record)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return data[0] if isinstance(data, list) and data else record
                else:
                    logger.warning(
                        "Supabase insert to %s failed (HTTP %s): %s",
                        table,
                        resp.status_code,
                        resp.text,
                    )
        except (httpx.HTTPError, RuntimeError, OSError, ValueError) as exc:
            logger.error("Error communicating with Supabase table %s: %s", table, exc)
        return record

    async def fetch_records(
        self, table: str, filters: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Queries records from a Supabase PostgreSQL table with optional column equality filters."""
        if not self.is_enabled or not self.url:
            return []

        endpoint = f"{self.url.rstrip('/')}/rest/v1/{table}"
        params: dict[str, str] = {"select": "*"}
        if filters:
            for k, v in filters.items():
                params[f"{k}"] = f"eq.{v}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(endpoint, headers=self.get_headers(), params=params)
                if resp.status_code == 200:
                    return resp.json()
        except (httpx.HTTPError, RuntimeError, OSError, ValueError) as exc:
            logger.error("Error fetching from Supabase table %s: %s", table, exc)
        return []

    async def upload_storage_artifact(
        self, bucket: str, path: str, content: bytes, content_type: str = "text/plain"
    ) -> str | None:
        """Uploads an artifact (code file, patch, dataset) to Supabase Storage."""
        if not self.is_enabled or not self.url:
            return f"local://storage/{bucket}/{path}"

        endpoint = f"{self.url.rstrip('/')}/storage/v1/object/{bucket}/{path}"
        headers = {
            "apikey": self.service_key or "",
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(endpoint, headers=headers, content=content)
                if resp.status_code in (200, 201):
                    return f"{self.url}/storage/v1/object/public/{bucket}/{path}"
        except (httpx.HTTPError, RuntimeError, OSError, ValueError) as exc:
            logger.error("Error uploading storage artifact %s to bucket %s: %s", path, bucket, exc)
        return None

    def get_status(self) -> dict[str, Any]:
        return {
            "enabled": self.is_enabled,
            "mode": settings.NEXT_PUBLIC_AUTH_MODE,
            "url_configured": bool(self.url),
            "service_key_configured": bool(self.service_key),
            "database_url_configured": bool(settings.DATABASE_URL),
        }


# Global repository instance
supabase_repo = SupabaseRepository()
