"""
Device Registration & Push Notification Endpoints
Handles FCM device tokens, notification inbox, and push dispatch triggers.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.config import settings
from app.notifications.fcm import notification_service
from app.notifications.models import DeviceRegistration, NotificationRequest

router = APIRouter(prefix="/notifications", tags=["Notifications"])
device_router = APIRouter(prefix="/devices", tags=["Devices"])


class TestPushRequest(BaseModel):
    title: str = "Test AutoPatch Alert"
    body: str = "This is a test notification from AutoPatch Verification Engine."
    user_id: str | None = None


@device_router.post("", status_code=201)
async def register_device(payload: DeviceRegistration) -> dict[str, Any]:
    """Register or refresh an FCM device push token."""
    return notification_service.register_device(payload)


@device_router.delete("/{token}")
async def unregister_device(token: str) -> dict[str, Any]:
    """Unregister an FCM device push token."""
    success = notification_service.unregister_device(token)
    if not success:
        raise HTTPException(status_code=404, detail="Device token not found")
    return {"status": "unregistered", "token": token}


@router.get("")
async def get_notifications(
    user_id: str | None = Query(None, description="Filter by user identifier"),
    limit: int = Query(50, ge=1, le=100),
) -> list[dict[str, Any]]:
    """Retrieve in-app notifications for the user."""
    items = notification_service.list_notifications(user_id=user_id, limit=limit)
    return [item.model_dump() for item in items]


@router.post("/test")
async def send_test_notification(payload: TestPushRequest) -> dict[str, Any]:
    """Dispatches a test push notification to registered devices."""
    req = NotificationRequest(
        title=payload.title,
        body=payload.body,
        type="review_needed",
        user_id=payload.user_id,
        data={"action_url": "/dashboard"},
    )
    result = await notification_service.send_notification(req)
    return result


@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str) -> dict[str, Any]:
    """Marks a specific notification as read."""
    success = notification_service.mark_as_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "id": notification_id, "read": True}


@router.post("/read-all")
async def mark_all_notifications_read(user_id: str | None = None) -> dict[str, Any]:
    """Marks all notifications as read."""
    count = notification_service.mark_all_as_read(user_id=user_id)
    return {"status": "success", "marked_read_count": count}


@router.get("/status")
async def get_notification_service_status() -> dict[str, Any]:
    """Returns FCM service readiness and registered device count."""
    devices = notification_service.get_registered_devices()
    return {
        "fcm_configured": notification_service.is_fcm_configured,
        "firebase_project_id": settings.FIREBASE_PROJECT_ID or None,
        "active_devices_count": len(devices),
        "demo_mode": settings.DEMO_MODE,
        "delivery_mode": "fcm_live" if notification_service.is_fcm_configured else "simulated",
    }
