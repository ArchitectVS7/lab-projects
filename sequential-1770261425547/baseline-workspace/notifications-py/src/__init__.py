"""Notification system package."""

from .service import NotificationService
from .models import (
    ChannelType,
    Priority,
    NotificationStatus,
    DeliveryEventType,
    Recipient,
    NotificationContent,
    SendNotificationRequest,
    Notification,
    DeliveryResult,
    DeliveryError,
    DeliveryWebhookEvent,
    RetryConfig,
)
from .interfaces import (
    NotificationChannel,
    NotificationStore,
    NotificationQueue,
    PreferencesStore,
)
from .preferences import (
    UserPreferences,
    ChannelPreference,
    QuietHours,
    PreferenceChecker,
)
from .errors import (
    NotificationError,
    NotificationBlockedError,
    NotificationNotFoundError,
    InvalidRecipientError,
    ChannelNotFoundError,
    DeliveryFailedError,
)

__all__ = [
    # Service
    "NotificationService",
    
    # Models
    "ChannelType",
    "Priority",
    "NotificationStatus",
    "DeliveryEventType",
    "Recipient",
    "NotificationContent",
    "SendNotificationRequest",
    "Notification",
    "DeliveryResult",
    "DeliveryError",
    "DeliveryWebhookEvent",
    "RetryConfig",
    
    # Interfaces
    "NotificationChannel",
    "NotificationStore",
    "NotificationQueue",
    "PreferencesStore",
    
    # Preferences
    "UserPreferences",
    "ChannelPreference",
    "QuietHours",
    "PreferenceChecker",
    
    # Errors
    "NotificationError",
    "NotificationBlockedError",
    "NotificationNotFoundError",
    "InvalidRecipientError",
    "ChannelNotFoundError",
    "DeliveryFailedError",
]
