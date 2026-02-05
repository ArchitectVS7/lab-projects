"""
Core Notification Service

This is the main entry point for sending notifications.
It orchestrates preferences, quiet hours, templates, and queueing.
"""

import uuid
from datetime import datetime
from dataclasses import dataclass
from typing import Optional

from .types import (
    Channel,
    Urgency,
    Notification,
    DeliveryRecord,
    DeliveryStatus,
    NotificationJob,
)
from .preferences import PreferencesService
from .quiet_hours import QuietHoursService
from .templates import TemplateService
from .queue import NotificationQueue
from .repository import NotificationRepository, DeliveryRepository


@dataclass
class NotifyResult:
    """Result of a notify() call."""
    notification_id: str
    queued_channels: list[Channel]
    skipped_channels: list[Channel]
    delayed_until: Optional[datetime] = None


@dataclass
class DeliveryStatusResult:
    """Delivery status for a notification."""
    notification: Notification
    deliveries: list[DeliveryRecord]


class NotificationService:
    """
    Core notification service.
    
    Handles the full notification flow:
    1. Check user preferences
    2. Filter to enabled channels
    3. Check quiet hours
    4. Enqueue for async delivery
    """

    def __init__(
        self,
        preferences_service: PreferencesService,
        quiet_hours_service: QuietHoursService,
        template_service: TemplateService,
        queue: NotificationQueue,
        notification_repo: NotificationRepository,
        delivery_repo: DeliveryRepository,
    ):
        self.preferences = preferences_service
        self.quiet_hours = quiet_hours_service
        self.templates = template_service
        self.queue = queue
        self.notification_repo = notification_repo
        self.delivery_repo = delivery_repo

    async def notify(
        self,
        user_id: str,
        notification_type: str,
        data: dict,
        urgency: Urgency = Urgency.NORMAL,
    ) -> NotifyResult:
        """
        Send a notification to a user.
        
        This method returns immediately after queueing.
        Actual delivery happens asynchronously via workers.
        
        Args:
            user_id: Target user ID
            notification_type: Type of notification (e.g., "order_shipped")
            data: Template variables
            urgency: Notification urgency level
            
        Returns:
            NotifyResult with notification ID and channel info
        """
        # Generate IDs
        notification_id = str(uuid.uuid4())
        
        # Get channels and recipients based on preferences
        channel_recipients = self.preferences.get_channels_for_notification(
            user_id=user_id,
            notification_type=notification_type,
            urgency=urgency,
        )
        
        if not channel_recipients:
            # No channels enabled, still create notification record
            notification = Notification(
                id=notification_id,
                user_id=user_id,
                type=notification_type,
                data=data,
                urgency=urgency,
                channels=[],
            )
            self.notification_repo.save(notification)
            
            return NotifyResult(
                notification_id=notification_id,
                queued_channels=[],
                skipped_channels=[],
            )
        
        # Check quiet hours
        user_prefs = self.preferences.get_preferences(user_id)
        should_bypass = self.preferences.should_bypass_quiet_hours(
            user_id=user_id,
            notification_type=notification_type,
            urgency=urgency,
        )
        
        quiet_result = self.quiet_hours.check(
            config=user_prefs.quiet_hours,
            bypass=should_bypass,
        )
        
        # Create notification record
        channels = list(set(ch for ch, _ in channel_recipients))
        notification = Notification(
            id=notification_id,
            user_id=user_id,
            type=notification_type,
            data=data,
            urgency=urgency,
            channels=channels,
        )
        self.notification_repo.save(notification)
        
        # Create delivery records and enqueue jobs
        queued_channels: list[Channel] = []
        
        for channel, recipient in channel_recipients:
            delivery_id = str(uuid.uuid4())
            
            # Create delivery record
            delivery = DeliveryRecord(
                id=delivery_id,
                notification_id=notification_id,
                channel=channel,
                recipient=recipient,
                status=DeliveryStatus.PENDING,
                scheduled_for=quiet_result.delay_until,
            )
            self.delivery_repo.save(delivery)
            
            # Create and enqueue job
            job = NotificationJob(
                id=str(uuid.uuid4()),
                notification_id=notification_id,
                delivery_record_id=delivery_id,
                user_id=user_id,
                type=notification_type,
                channel=channel,
                recipient=recipient,
                data=data,
                urgency=urgency,
                scheduled_for=quiet_result.delay_until,
            )
            
            await self.queue.enqueue(job, delay_until=quiet_result.delay_until)
            queued_channels.append(channel)
        
        return NotifyResult(
            notification_id=notification_id,
            queued_channels=queued_channels,
            skipped_channels=[],
            delayed_until=quiet_result.delay_until,
        )

    async def notify_many(
        self,
        user_ids: list[str],
        notification_type: str,
        data: dict,
        urgency: Urgency = Urgency.NORMAL,
    ) -> list[NotifyResult]:
        """
        Send notification to multiple users.
        
        Args:
            user_ids: List of target user IDs
            notification_type: Type of notification
            data: Template variables (same for all users)
            urgency: Notification urgency level
            
        Returns:
            List of NotifyResult, one per user
        """
        results = []
        for user_id in user_ids:
            result = await self.notify(
                user_id=user_id,
                notification_type=notification_type,
                data=data,
                urgency=urgency,
            )
            results.append(result)
        return results

    async def get_notification(self, notification_id: str) -> Optional[Notification]:
        """Get a notification by ID."""
        return self.notification_repo.get(notification_id)

    async def get_delivery_status(self, notification_id: str) -> Optional[DeliveryStatusResult]:
        """Get notification with all delivery records."""
        notification = self.notification_repo.get(notification_id)
        if not notification:
            return None
        
        deliveries = self.delivery_repo.get_by_notification(notification_id)
        
        return DeliveryStatusResult(
            notification=notification,
            deliveries=deliveries,
        )

    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        """Get notifications for a user."""
        return self.notification_repo.get_by_user(user_id, limit, offset)

    async def update_delivery_from_webhook(
        self,
        provider_message_id: str,
        status: DeliveryStatus,
        error: Optional[str] = None,
    ) -> bool:
        """
        Update delivery status from provider webhook.
        
        Args:
            provider_message_id: Message ID from the provider
            status: New delivery status
            error: Error message if failed
            
        Returns:
            True if record was found and updated
        """
        record = self.delivery_repo.get_by_provider_message_id(provider_message_id)
        if not record:
            return False
        
        self.delivery_repo.update_status(
            record_id=record.id,
            status=status,
            error=error,
        )
        return True

    async def retry_delivery(self, delivery_record_id: str) -> bool:
        """
        Manually retry a failed delivery.
        
        Args:
            delivery_record_id: ID of the delivery record to retry
            
        Returns:
            True if job was enqueued
        """
        record = self.delivery_repo.get(delivery_record_id)
        if not record:
            return False
        
        if record.status not in (DeliveryStatus.FAILED, DeliveryStatus.BOUNCED):
            return False
        
        notification = self.notification_repo.get(record.notification_id)
        if not notification:
            return False
        
        # Reset record
        record.status = DeliveryStatus.PENDING
        record.attempts = 0
        record.last_error = None
        record.failed_at = None
        self.delivery_repo.save(record)
        
        # Create new job
        job = NotificationJob(
            id=str(uuid.uuid4()),
            notification_id=notification.id,
            delivery_record_id=record.id,
            user_id=notification.user_id,
            type=notification.type,
            channel=record.channel,
            recipient=record.recipient,
            data=notification.data,
            urgency=notification.urgency,
        )
        
        await self.queue.enqueue(job)
        return True
