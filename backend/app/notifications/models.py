"""
AutoPatch Push Notification & Device Token Models
"""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class DeviceRegistration(BaseModel):
    token: str = Field(..., description="Unique FCM device registration token")
    platform: str = Field("web", description="Device platform (web, android, ios, macos)")
    user_id: str | None = Field(None, description="Optional associated user account identifier")
    registered_at: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="ISO 8601 registration timestamp"
    )


class NotificationRequest(BaseModel):
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification body content")
    type: str = Field("patch_verified", description="Notification category/type")
    icon: str | None = Field("/icons/icon-192x192.png", description="Icon URL")
    data: dict[str, str] = Field(
        default_factory=dict,
        description="Custom payload metadata (e.g. bug_id, patch_id, action_url)"
    )
    user_id: str | None = Field(None, description="Target specific user ID, or None for all")


class NotificationRecord(BaseModel):
    id: str = Field(..., description="Unique notification identifier")
    type: str = Field(..., description="Category: scan_completed, bug_confirmed, patch_verified, review_needed")
    title: str = Field(..., description="Title")
    body: str = Field(..., description="Body")
    icon: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    user_id: str | None = None
    read: bool = False
    status: str = Field("delivered_simulated", description="delivered, delivered_simulated, or failed")
    created_at: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat()
    )
