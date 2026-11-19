"""
Firebase Cloud Messaging (FCM) & Push Notification Dispatcher
Provides real FCM delivery when Firebase Admin credentials exist, with robust,
zero-external-dependency simulation fallback for free-tier and demo environments.
"""

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.notifications.models import DeviceRegistration, NotificationRecord, NotificationRequest

logger = logging.getLogger("autopatch.notifications")


class FCMNotificationService:
    def __init__(self) -> None:
        self._devices: dict[str, DeviceRegistration] = {}
        self._notifications: list[NotificationRecord] = [
            NotificationRecord(
                id="notif-init-001",
                type="scan_completed",
                title="Pipeline Scan Completed",
                body="Scan finished: 6 bugs identified in Python Marks Calculator workspace.",
                read=False,
                status="delivered_simulated",
            ),
            NotificationRecord(
                id="notif-init-002",
                type="bug_confirmed",
                title="Critical Flaw Confirmed",
                body="Defect confirmed with repro input marks=-5 in calculator.py (L5-L12).",
                read=False,
                status="delivered_simulated",
            ),
            NotificationRecord(
                id="notif-init-003",
                type="patch_verified",
                title="Patch Verified: V4 Proven",
                body="Candidate #1 passed all 14 regression tests in isolated sandbox.",
                read=False,
                status="delivered_simulated",
            ),
            NotificationRecord(
                id="notif-init-004",
                type="review_needed",
                title="Review Awaiting Sign-Off",
                body="Low-risk patch proposed for student marks bounds validation.",
                read=True,
                status="delivered_simulated",
            ),
        ]
        self._fcm_app_initialized = False

    @property
    def is_fcm_configured(self) -> bool:
        """Determines if actual Firebase Admin credentials are provided."""
        return bool(
            settings.FIREBASE_PROJECT_ID
            and settings.FIREBASE_CLIENT_EMAIL
            and settings.FIREBASE_PRIVATE_KEY
        )

    def register_device(self, reg: DeviceRegistration) -> dict[str, Any]:
        """Registers or updates a device push token."""
        self._devices[reg.token] = reg
        logger.info(
            "Registered push device token %s... (platform: %s, total active: %d)",
            reg.token[:12],
            reg.platform,
            len(self._devices),
        )
        return {
            "status": "registered",
            "token": reg.token,
            "platform": reg.platform,
            "total_active_devices": len(self._devices),
        }

    def unregister_device(self, token: str) -> bool:
        """Removes a device push token."""
        if token in self._devices:
            del self._devices[token]
            logger.info("Unregistered push device token %s... (active remaining: %d)", token[:12], len(self._devices))
            return True
        return False

    def get_registered_devices(self, user_id: str | None = None) -> list[DeviceRegistration]:
        if user_id:
            return [d for d in self._devices.values() if d.user_id == user_id]
        return list(self._devices.values())

    async def send_notification(self, payload: NotificationRequest) -> dict[str, Any]:
        """
        Dispatches push notification to matching registered tokens.
        If FCM credentials are configured, sends via Firebase Admin SDK.
        Otherwise, records and dispatches via simulated delivery mode.
        """
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        target_tokens = [
            d.token
            for d in self._devices.values()
            if payload.user_id is None or d.user_id == payload.user_id
        ]

        # In production with Firebase configured, we would attempt FCM delivery
        delivery_mode = "simulated"
        status = "delivered_simulated"

        if self.is_fcm_configured and target_tokens:
            try:
                # Lazy import firebase_admin if configured
                import firebase_admin
                from firebase_admin import credentials, messaging

                if not self._fcm_app_initialized:
                    cred_dict = {
                        "project_id": settings.FIREBASE_PROJECT_ID,
                        "client_email": settings.FIREBASE_CLIENT_EMAIL,
                        "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n") if settings.FIREBASE_PRIVATE_KEY else "",
                    }
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred)
                    self._fcm_app_initialized = True

                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=payload.title,
                        body=payload.body,
                    ),
                    data=payload.data,
                    tokens=target_tokens,
                )
                response = messaging.send_multicast(message)
                delivery_mode = "fcm_live"
                status = f"delivered (success: {response.success_count}, fail: {response.failure_count})"
            except (ImportError, RuntimeError, OSError, ValueError) as exc:
                logger.warning("FCM delivery attempt failed, falling back to simulated: %s", exc)
                delivery_mode = "simulated_fallback"
                status = "delivered_simulated"

        # Record notification item in history
        record = NotificationRecord(
            id=notif_id,
            type=payload.type,
            title=payload.title,
            body=payload.body,
            icon=payload.icon,
            data=payload.data,
            user_id=payload.user_id,
            read=False,
            status=status,
            created_at=datetime.now(UTC).isoformat(),
        )
        self._notifications.insert(0, record)

        logger.info(
            "Push notification [%s] dispatched: '%s' (%s, target tokens: %d)",
            notif_id,
            payload.title,
            delivery_mode,
            len(target_tokens),
        )

        return {
            "success": True,
            "notification_id": notif_id,
            "delivery_mode": delivery_mode,
            "status": status,
            "recipients_count": len(target_tokens),
            "title": payload.title,
        }

    def list_notifications(
        self, user_id: str | None = None, limit: int = 50
    ) -> list[NotificationRecord]:
        """Retrieves chronological notification items."""
        items = self._notifications
        if user_id:
            items = [n for n in items if n.user_id is None or n.user_id == user_id]
        return items[:limit]

    def mark_as_read(self, notification_id: str) -> bool:
        """Marks a single notification as read."""
        for n in self._notifications:
            if n.id == notification_id:
                n.read = True
                return True
        return False

    def mark_all_as_read(self, user_id: str | None = None) -> int:
        """Marks all notifications for a user as read."""
        count = 0
        for n in self._notifications:
            if (user_id is None or n.user_id == user_id) and not n.read:
                n.read = True
                count += 1
        return count


# Singleton service instance
notification_service = FCMNotificationService()
