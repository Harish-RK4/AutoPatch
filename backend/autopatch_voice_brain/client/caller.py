"""
AutoPatch Voice Client SDK.
Provides a simple 1-line Python interface for any project to trigger
interactive conversational phone calls.
"""

from __future__ import annotations

import httpx
from typing import Optional
from autopatch_voice_brain.config import settings


class AutoPatchVoiceClient:
    """
    Client for triggering AutoPatch voice calls.
    Can trigger via direct Twilio API or via the AutoPatch Voice API microservice.
    """

    def __init__(self, api_base_url: Optional[str] = None):
        self.api_base_url = (api_base_url or settings.twilio_webhook_base_url).rstrip("/")

    def notify_fix(
        self,
        phone_number: str,
        developer_name: str,
        file_or_module: str,
        broken_code: str,
        fix_applied: str,
        test_results: str = "All tests passing",
    ) -> dict:
        """
        Synchronous helper to trigger an interactive call to a developer.
        """
        import asyncio
        return asyncio.run(
            self.notify_fix_async(
                phone_number=phone_number,
                developer_name=developer_name,
                file_or_module=file_or_module,
                broken_code=broken_code,
                fix_applied=fix_applied,
                test_results=test_results,
            )
        )

    async def notify_fix_async(
        self,
        phone_number: str,
        developer_name: str,
        file_or_module: str,
        broken_code: str,
        fix_applied: str,
        test_results: str = "All tests passing",
    ) -> dict:
        """
        Asynchronous helper to trigger an interactive call to a developer.
        """
        url = f"{self.api_base_url}/api/v1/autopatch-voice/call"
        payload = {
            "to_phone_number": phone_number,
            "developer_name": developer_name,
            "file_or_module": file_or_module,
            "broken_code_summary": broken_code,
            "fix_details": fix_applied,
            "test_results": test_results,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
