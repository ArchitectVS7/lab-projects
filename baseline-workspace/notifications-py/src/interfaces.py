"""Abstract interfaces for notification system components."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Callable, Awaitable

from .models import (
    Notification,
    DeliveryResult,
    DeliveryWebhookEvent,
    ChannelType,
    NotificationStatus,
    DeliveryEventType,
)


class NotificationChannel(ABC):
    """Abstract interface for notification delivery channels."""
    
    @property
    @abstractmethod
    def channel_type(self) -> ChannelType:
        """Return the channel type (email, sms, push)."""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name (e.g., 'sendgrid', 'twilio')."""
        pass
    
    @abstractmethod
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send a notification. Returns delivery result."""
        pass
    
    @abstractmethod
    def validate_recipient(self, notification: Notification) -> Optional[str]:
        """Validate recipient has required fields. Returns error message or None."""
        pass
    
    async def send_batch(self, notifications: list[Notification]) -> list[DeliveryResult]:
        """Send multiple notifications. Default implementation sends one by one."""
        return [await self.send(n) for n in notifications]
    
    async def parse_webhook(
        self, payload: dict, signature: Optional[str] = None
    ) -> DeliveryWebhookEvent:
        """Parse incoming webhook from provider. Override if supported."""
        raise NotImplementedError(f"{self.provider_name} does not support webhooks")


class NotificationStore(ABC):
    """Abstract interface for notification persistence."""
    
    @abstractmethod
    async def create(self, notification: Notification) -> Notification:
        """Create a new notification record."""
        pass
    
    @abstractmethod
    async def get(self, notification_id: str) -> Optional[Notification]:
        """Get notification by ID."""
        pass
    
    @abstractmethod
    async def get_by_idempotency_key(self, key: str) -> Optional[Notification]:
        """Get notification by idempotency key."""
        pass
    
    @abstractmethod
    async def update(self, notification_id: str, **updates) -> Notification:
        """Update notification fields."""
        pass
    
    @abstractmethod
    async def mark_processing(self, notification_id: str) -> Optional[Notification]:
        """
        Atomically mark notification as processing.
        Returns None if already processing or completed (prevents double-processing).
        """
        pass
    
    @abstractmethod
    async def mark_sent(
        self, notification_id: str, provider_id: str, provider_name: str
    ) -> Notification:
        """Mark notification as sent."""
        pass
    
    @abstractmethod
    async def mark_failed(
        self, notification_id: str, error: str, next_retry_at: Optional[datetime] = None
    ) -> Notification:
        """Mark notification as failed (may retry)."""
        pass
    
    @abstractmethod
    async def mark_permanently_failed(
        self, notification_id: str, error: str
    ) -> Notification:
        """Mark notification as permanently failed (no retry)."""
        pass
    
    @abstractmethod
    async def update_delivery_status(
        self, provider_id: str, event: DeliveryEventType, timestamp: datetime
    ) -> Optional[Notification]:
        """Update delivery status from webhook."""
        pass
    
    @abstractmethod
    async def get_by_user_id(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[NotificationStatus] = None,
    ) -> list[Notification]:
        """Get notifications for a user."""
        pass


class NotificationQueue(ABC):
    """Abstract interface for notification job queue."""
    
    @abstractmethod
    async def enqueue(self, notification: Notification) -> None:
        """Add notification to queue for immediate processing."""
        pass
    
    @abstractmethod
    async def enqueue_delayed(self, notification: Notification, delay_seconds: int) -> None:
        """Add notification to queue with delay."""
        pass
    
    @abstractmethod
    async def enqueue_scheduled(self, notification: Notification, scheduled_at: datetime) -> None:
        """Add notification scheduled for specific time."""
        pass
    
    @abstractmethod
    def process(
        self, handler: Callable[[Notification], Awaitable[None]]
    ) -> None:
        """Start processing notifications from queue."""
        pass
    
    @abstractmethod
    async def get_stats(self) -> dict:
        """Get queue statistics."""
        pass


class PreferencesStore(ABC):
    """Abstract interface for user notification preferences."""
    
    @abstractmethod
    async def get(self, user_id: str) -> "UserPreferences":
        """Get user preferences (returns defaults if not set)."""
        pass
    
    @abstractmethod
    async def update(self, user_id: str, **updates) -> "UserPreferences":
        """Update user preferences."""
        pass
    
    @abstractmethod
    async def set_channel_enabled(
        self, user_id: str, channel: ChannelType, enabled: bool
    ) -> None:
        """Enable/disable a channel for user."""
        pass
    
    @abstractmethod
    async def set_quiet_hours(
        self, user_id: str, quiet_hours: Optional["QuietHours"]
    ) -> None:
        """Set quiet hours for user."""
        pass
    
    @abstractmethod
    async def record_sent(self, user_id: str, channel: ChannelType) -> None:
        """Record a notification was sent (for rate limiting)."""
        pass
    
    @abstractmethod
    async def get_send_counts(
        self, user_id: str, channel: ChannelType
    ) -> dict[str, int]:
        """Get send counts for rate limiting. Returns {'hourly': N, 'daily': N}."""
        pass


# Import here to avoid circular dependency
from .preferences import UserPreferences, QuietHours
