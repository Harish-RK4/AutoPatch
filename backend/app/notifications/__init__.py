"""
AutoPatch Notifications Package
"""

from app.notifications.fcm import notification_service
from app.notifications.models import DeviceRegistration, NotificationRecord, NotificationRequest

__all__ = [
    "DeviceRegistration",
    "NotificationRecord",
    "NotificationRequest",
    "notification_service",
]
