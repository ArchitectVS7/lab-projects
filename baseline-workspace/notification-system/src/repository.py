"""Repository interfaces and in-memory implementations."""

from typing import Optional, Protocol
from datetime import datetime
from .types import (
    Notification,
    DeliveryRecord,
    DeliveryStatus,
    UserPreferences,
    Channel,
)


class NotificationRepository(Protocol):
    """Interface for notification storage."""
    
    def save(self, notification: Notification) -> None:
        ...
    
    def get(self, notification_id: str) -> Optional[Notification]:
        ...
    
    def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        ...


class DeliveryRepository(Protocol):
    """Interface for delivery record storage."""
    
    def save(self, record: DeliveryRecord) -> None:
        ...
    
    def get(self, record_id: str) -> Optional[DeliveryRecord]:
        ...
    
    def get_by_notification(self, notification_id: str) -> list[DeliveryRecord]:
        ...
    
    def get_by_provider_message_id(self, provider_message_id: str) -> Optional[DeliveryRecord]:
        ...
    
    def update_status(
        self,
        record_id: str,
        status: DeliveryStatus,
        provider_message_id: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        ...


class InMemoryNotificationRepository:
    """In-memory notification storage for development/testing."""

    def __init__(self):
        self.notifications: dict[str, Notification] = {}

    def save(self, notification: Notification) -> None:
        self.notifications[notification.id] = notification

    def get(self, notification_id: str) -> Optional[Notification]:
        return self.notifications.get(notification_id)

    def get_by_user(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        user_notifs = [
            n for n in self.notifications.values()
            if n.user_id == user_id
        ]
        user_notifs.sort(key=lambda n: n.created_at, reverse=True)
        return user_notifs[offset:offset + limit]


class InMemoryDeliveryRepository:
    """In-memory delivery record storage for development/testing."""

    def __init__(self):
        self.records: dict[str, DeliveryRecord] = {}

    def save(self, record: DeliveryRecord) -> None:
        self.records[record.id] = record

    def get(self, record_id: str) -> Optional[DeliveryRecord]:
        return self.records.get(record_id)

    def get_by_notification(self, notification_id: str) -> list[DeliveryRecord]:
        return [
            r for r in self.records.values()
            if r.notification_id == notification_id
        ]

    def get_by_provider_message_id(self, provider_message_id: str) -> Optional[DeliveryRecord]:
        for record in self.records.values():
            if record.provider_message_id == provider_message_id:
                return record
        return None

    def update_status(
        self,
        record_id: str,
        status: DeliveryStatus,
        provider_message_id: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        record = self.records.get(record_id)
        if not record:
            return
        
        record.status = status
        record.updated_at = datetime.utcnow()
        
        if provider_message_id:
            record.provider_message_id = provider_message_id
        
        if error:
            record.last_error = error
        
        if status == DeliveryStatus.SENT:
            record.sent_at = datetime.utcnow()
        elif status == DeliveryStatus.DELIVERED:
            record.delivered_at = datetime.utcnow()
        elif status == DeliveryStatus.FAILED:
            record.failed_at = datetime.utcnow()


class InMemoryPreferencesRepository:
    """In-memory preferences storage for development/testing."""

    def __init__(self):
        self.preferences: dict[str, UserPreferences] = {}

    def get(self, user_id: str) -> Optional[UserPreferences]:
        return self.preferences.get(user_id)

    def save(self, preferences: UserPreferences) -> None:
        self.preferences[preferences.user_id] = preferences
