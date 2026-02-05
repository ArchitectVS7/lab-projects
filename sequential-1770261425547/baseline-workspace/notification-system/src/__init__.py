"""Notification System"""

from .types import (
    Channel,
    Urgency,
    DeliveryStatus,
    Notification,
    DeliveryRecord,
    UserPreferences,
)
from .service import NotificationService, NotifyResult, DeliveryStatusResult
from .worker import NotificationWorker, run_worker
from .preferences import PreferencesService
from .quiet_hours import QuietHoursService
from .templates import TemplateService, InMemoryTemplateRepository
from .queue import NotificationQueue, InMemoryQueue
from .channels import (
    NotificationChannel,
    EmailChannel,
    SMSChannel,
    PushChannel,
)
from .repository import (
    InMemoryNotificationRepository,
    InMemoryDeliveryRepository,
    InMemoryPreferencesRepository,
)

__all__ = [
    # Types
    "Channel",
    "Urgency",
    "DeliveryStatus",
    "Notification",
    "DeliveryRecord",
    "UserPreferences",
    # Service
    "NotificationService",
    "NotifyResult",
    "DeliveryStatusResult",
    # Worker
    "NotificationWorker",
    "run_worker",
    # Supporting services
    "PreferencesService",
    "QuietHoursService",
    "TemplateService",
    "InMemoryTemplateRepository",
    # Queue
    "NotificationQueue",
    "InMemoryQueue",
    # Channels
    "NotificationChannel",
    "EmailChannel",
    "SMSChannel",
    "PushChannel",
    # Repositories
    "InMemoryNotificationRepository",
    "InMemoryDeliveryRepository",
    "InMemoryPreferencesRepository",
]
