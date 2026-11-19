"""
Unit Tests for FCM Push Notification Dispatcher and Device Management
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.notifications.fcm import notification_service
from app.notifications.models import DeviceRegistration, NotificationRequest


@pytest.fixture
def test_client() -> TestClient:
    return TestClient(app)


@pytest.mark.asyncio
async def test_device_registration_and_unregistration():
    reg = DeviceRegistration(token="test-token-device-abc123", platform="web", user_id="user-001")
    res = notification_service.register_device(reg)
    assert res["status"] == "registered"
    assert res["token"] == "test-token-device-abc123"

    devices = notification_service.get_registered_devices(user_id="user-001")
    assert any(d.token == "test-token-device-abc123" for d in devices)

    unreg_success = notification_service.unregister_device("test-token-device-abc123")
    assert unreg_success is True

    # Duplicate unregister returns False
    assert notification_service.unregister_device("test-token-device-abc123") is False


@pytest.mark.asyncio
async def test_simulated_push_notification_dispatch():
    # Register mock token
    reg = DeviceRegistration(token="test-push-token-xyz789", platform="web")
    notification_service.register_device(reg)

    req = NotificationRequest(
        title="Patch V4 Verified",
        body="Boundary precondition candidate passed all sandbox checks.",
        type="patch_verified",
        data={"patch_id": "patch-101", "action_url": "/patches/patch-101"},
    )
    result = await notification_service.send_notification(req)

    assert result["success"] is True
    assert result["delivery_mode"] in ("simulated", "simulated_fallback")
    assert "notification_id" in result

    # Check notification exists in list
    notifications = notification_service.list_notifications(limit=10)
    matched = [n for n in notifications if n.id == result["notification_id"]]
    assert len(matched) == 1
    assert matched[0].title == "Patch V4 Verified"
    assert matched[0].read is False

    # Mark as read
    marked = notification_service.mark_as_read(result["notification_id"])
    assert marked is True
    assert matched[0].read is True

    # Clean up
    notification_service.unregister_device("test-push-token-xyz789")


def test_api_notification_routes(test_client: TestClient):
    # 1. Device registration
    dev_resp = test_client.post(
        "/api/v1/devices",
        json={"token": "api-test-token-456", "platform": "web", "user_id": "demo-user-001"},
    )
    assert dev_resp.status_code == 201
    assert dev_resp.json()["status"] == "registered"

    # 2. Status
    status_resp = test_client.get("/api/v1/notifications/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "active_devices_count" in data
    assert data["delivery_mode"] in ("simulated", "fcm_live")

    # 3. Test notification
    test_push = test_client.post(
        "/api/v1/notifications/test",
        json={"title": "Verification Alert", "body": "Scan completed"},
    )
    assert test_push.status_code == 200
    push_data = test_push.json()
    assert push_data["success"] is True
    notif_id = push_data["notification_id"]

    # 4. Fetch notifications
    list_resp = test_client.get("/api/v1/notifications")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(item["id"] == notif_id for item in items)

    # 5. Mark read
    read_resp = test_client.post(f"/api/v1/notifications/{notif_id}/read")
    assert read_resp.status_code == 200
    assert read_resp.json()["read"] is True

    # 6. Unregister
    del_resp = test_client.delete("/api/v1/devices/api-test-token-456")
    assert del_resp.status_code == 200
