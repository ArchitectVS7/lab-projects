"""Notification system data models."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid


class ChannelType(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class Priority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationStatus(str, Enum):
    QUEUED = "queued"
    SCHEDULED = "scheduled"
    PROCESSING = "processing"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"
    CANCELLED = "cancelled"


class DeliveryEventType(str, Enum):
    DELIVERED = "delivered"
    BOUNCED = "bounced"
    OPENED = "opened"
    CLICKED = "clicked"
    UNSUBSCRIBED = "unsubscribed"
    COMPLAINED = "complained"


@dataclass
class Recipient:
    user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    device_tokens: Optional[list[str]] = None


@dataclass
class NotificationContent:
    # Template-based
    template_id: Optional[str] = None
    template_data: Optional[dict] = None
    
    # Email
    subject: Optional[str] = None
    html: Optional[str] = None
    text: Optional[str] = None
    from_address: Optional[str] = None
    reply_to: Optional[str] = None
    
    # SMS
    body: Optional[str] = None
    
    # Push
    title: Optional[str] = None
    message: Optional[str] = None
    data: Optional[dict] = None
    badge: Optional[int] = None
    sound: Optional[str] = None


@dataclass
class SendNotificationRequest:
    channel: ChannelType
    recipient: Recipient
    content: NotificationContent
    priority: Priority = Priority.NORMAL
    scheduled_at: Optional[datetime] = None
    idempotency_key: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class Notification:
    id: str
    channel: ChannelType
    recipient: Recipient
    content: NotificationContent
    priority: Priority
    status: NotificationStatus
    
    # Tracking
    attempts: int = 0
    max_attempts: int = 5
    last_attempt_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None
    last_error: Optional[str] = None
    
    # Provider info
    provider_id: Optional[str] = None
    provider_name: Optional[str] = None
    
    # Delivery tracking
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    
    # Scheduling
    scheduled_at: Optional[datetime] = None
    queued_at: datetime = field(default_factory=datetime.utcnow)
    
    # Metadata
    idempotency_key: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    
    @classmethod
    def from_request(cls, request: SendNotificationRequest, max_attempts: int = 5) -> "Notification":
        return cls(
            id=str(uuid.uuid4()),
            channel=request.channel,
            recipient=request.recipient,
            content=request.content,
            priority=request.priority,
            status=NotificationStatus.SCHEDULED if request.scheduled_at else NotificationStatus.QUEUED,
            max_attempts=max_attempts,
            scheduled_at=request.scheduled_at,
            idempotency_key=request.idempotency_key,
            metadata=request.metadata,
        )


@dataclass
class DeliveryResult:
    success: bool
    provider_name: str
    provider_id: Optional[str] = None
    error: Optional["DeliveryError"] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class DeliveryError:
    code: str
    message: str
    retryable: bool = True
    permanent: bool = False


@dataclass
class DeliveryWebhookEvent:
    notification_id: str
    provider_id: str
    provider: str
    event: DeliveryEventType
    timestamp: datetime
    metadata: Optional[dict] = None


@dataclass
class RetryConfig:
    max_attempts: int = 5
    initial_delay_seconds: int = 60
    max_delay_seconds: int = 3600
    backoff_multiplier: float = 2.0
