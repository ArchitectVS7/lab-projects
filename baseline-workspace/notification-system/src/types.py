"""Notification system types and enums."""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, time
from typing import Optional


class Channel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class Urgency(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"


@dataclass
class ChannelConfig:
    enabled: bool = True
    address: Optional[str] = None  # email address, phone, or None for push


@dataclass
class QuietHoursConfig:
    enabled: bool = False
    start: Optional[time] = None
    end: Optional[time] = None
    timezone: str = "UTC"
    bypass_for_urgent: bool = True


@dataclass
class TypePreference:
    enabled: bool = True
    channels: Optional[list[Channel]] = None  # None = use defaults
    bypass_quiet_hours: bool = False


@dataclass
class UserPreferences:
    user_id: str
    channels: dict[Channel, ChannelConfig] = field(default_factory=dict)
    quiet_hours: QuietHoursConfig = field(default_factory=QuietHoursConfig)
    type_preferences: dict[str, TypePreference] = field(default_factory=dict)
    unsubscribed_types: set[str] = field(default_factory=set)
    push_tokens: list[str] = field(default_factory=list)

    def __post_init__(self):
        # Set defaults for channels if not provided
        if not self.channels:
            self.channels = {
                Channel.EMAIL: ChannelConfig(enabled=True),
                Channel.SMS: ChannelConfig(enabled=False),
                Channel.PUSH: ChannelConfig(enabled=True),
            }


@dataclass
class Notification:
    id: str
    user_id: str
    type: str
    data: dict
    urgency: Urgency
    channels: list[Channel]
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class DeliveryRecord:
    id: str
    notification_id: str
    channel: Channel
    recipient: str
    status: DeliveryStatus = DeliveryStatus.PENDING
    attempts: int = 0
    max_attempts: int = 5
    provider_message_id: Optional[str] = None
    last_error: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class NotificationJob:
    """Job to be enqueued for async processing."""
    id: str
    notification_id: str
    delivery_record_id: str
    user_id: str
    type: str
    channel: Channel
    recipient: str
    data: dict
    urgency: Urgency
    attempts: int = 0
    max_attempts: int = 5
    scheduled_for: Optional[datetime] = None


@dataclass
class SendResult:
    success: bool
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    retryable: bool = False


@dataclass
class QuietHoursResult:
    blocked: bool
    delay_until: Optional[datetime] = None
