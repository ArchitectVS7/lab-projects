"""Core notification service."""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from .models import (
    Notification,
    SendNotificationRequest,
    DeliveryResult,
    DeliveryError,
    RetryConfig,
    ChannelType,
    NotificationStatus,
    Priority,
)
from .interfaces import (
    NotificationChannel,
    NotificationStore,
    NotificationQueue,
    PreferencesStore,
)
from .preferences import PreferenceChecker
from .errors import (
    NotificationBlockedError,
    NotificationNotFoundError,
    InvalidRecipientError,
    ChannelNotFoundError,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Main notification service.
    
    Handles queuing, delivery, retries, and tracking for multi-channel
    notifications with user preference support.
    
    Usage:
        service = NotificationService(
            store=postgres_store,
            queue=redis_queue,
            channels={ChannelType.EMAIL: sendgrid_channel, ...},
            preferences=preferences_store,
        )
        
        # Queue a notification (returns immediately)
        notification = await service.send(SendNotificationRequest(...))
        
        # Start worker to process queue
        service.start_worker()
    """
    
    def __init__(
        self,
        store: NotificationStore,
        queue: NotificationQueue,
        channels: dict[ChannelType, NotificationChannel],
        preferences: PreferencesStore,
        retry_config: Optional[RetryConfig] = None,
    ):
        self.store = store
        self.queue = queue
        self.channels = channels
        self.preferences = preferences
        self.preference_checker = PreferenceChecker(preferences)
        self.retry_config = retry_config or RetryConfig()
        self._worker_running = False
    
    # ==================== Public API ====================
    
    async def send(self, request: SendNotificationRequest) -> Notification:
        """
        Queue a notification for async delivery.
        
        Returns immediately with the notification record.
        Actual delivery happens in background worker.
        
        Args:
            request: The notification to send
            
        Returns:
            Notification record with ID and status
            
        Raises:
            NotificationBlockedError: If blocked by user preferences
            InvalidRecipientError: If recipient is invalid for channel
            ChannelNotFoundError: If channel is not configured
        """
        # Idempotency check
        if request.idempotency_key:
            existing = await self.store.get_by_idempotency_key(request.idempotency_key)
            if existing:
                logger.debug(f"Returning existing notification for idempotency key: {request.idempotency_key}")
                return existing
        
        # Validate channel exists
        channel = self.channels.get(request.channel)
        if not channel:
            raise ChannelNotFoundError(request.channel.value)
        
        # Check user preferences
        category = request.metadata.get("category", "transactional")
        pref_check = await self.preference_checker.can_send(
            request.recipient.user_id,
            request.channel,
            category,
            request.priority,
        )
        
        if not pref_check.allowed:
            if pref_check.delay_until:
                # Blocked by quiet hours - schedule for later
                logger.info(
                    f"Notification delayed until {pref_check.delay_until} due to quiet hours "
                    f"for user {request.recipient.user_id}"
                )
                request.scheduled_at = pref_check.delay_until
            else:
                # Blocked by other preference
                raise NotificationBlockedError(pref_check.reason)
        
        # Create notification record
        notification = Notification.from_request(request, self.retry_config.max_attempts)
        
        # Validate recipient
        validation_error = channel.validate_recipient(notification)
        if validation_error:
            raise InvalidRecipientError(request.channel.value, validation_error)
        
        # Save to store
        notification = await self.store.create(notification)
        logger.info(f"Created notification {notification.id} for {request.channel.value}")
        
        # Queue for delivery
        if request.scheduled_at and request.scheduled_at > datetime.utcnow():
            await self.queue.enqueue_scheduled(notification, request.scheduled_at)
            logger.debug(f"Scheduled notification {notification.id} for {request.scheduled_at}")
        else:
            await self.queue.enqueue(notification)
            logger.debug(f"Enqueued notification {notification.id}")
        
        return notification
    
    async def send_bulk(
        self, requests: list[SendNotificationRequest]
    ) -> list[Notification | NotificationBlockedError]:
        """
        Send multiple notifications.
        
        Returns list of Notification objects or errors for each request.
        Does not raise - errors are returned in the list.
        """
        results = []
        for request in requests:
            try:
                notification = await self.send(request)
                results.append(notification)
            except NotificationBlockedError as e:
                results.append(e)
        return results
    
    async def send_with_fallback(
        self,
        request: SendNotificationRequest,
        fallback_channels: list[ChannelType],
    ) -> Notification:
        """
        Send notification with fallback channels.
        
        If the primary channel is blocked by preferences, tries fallback channels
        in order until one succeeds.
        
        Args:
            request: The notification to send
            fallback_channels: Channels to try if primary is blocked
            
        Raises:
            NotificationBlockedError: If all channels are blocked
        """
        channels_to_try = [request.channel] + fallback_channels
        last_error = None
        
        for channel in channels_to_try:
            try:
                request.channel = channel
                return await self.send(request)
            except NotificationBlockedError as e:
                logger.debug(f"Channel {channel.value} blocked: {e.reason}")
                last_error = e
                continue
        
        raise NotificationBlockedError(
            f"All channels blocked by user preferences: {[c.value for c in channels_to_try]}"
        )
    
    async def get_status(self, notification_id: str) -> Notification:
        """Get notification status by ID."""
        notification = await self.store.get(notification_id)
        if not notification:
            raise NotificationNotFoundError(notification_id)
        return notification
    
    async def cancel(self, notification_id: str) -> bool:
        """
        Cancel a queued or scheduled notification.
        
        Returns True if cancelled, False if already sent/processing.
        """
        notification = await self.store.get(notification_id)
        if not notification:
            raise NotificationNotFoundError(notification_id)
        
        if notification.status in (NotificationStatus.QUEUED, NotificationStatus.SCHEDULED):
            await self.store.update(notification_id, status=NotificationStatus.CANCELLED)
            logger.info(f"Cancelled notification {notification_id}")
            return True
        
        logger.debug(f"Cannot cancel notification {notification_id} with status {notification.status}")
        return False
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        status: Optional[NotificationStatus] = None,
    ) -> list[Notification]:
        """Get notification history for a user."""
        return await self.store.get_by_user_id(user_id, limit, offset, status)
    
    # ==================== Worker Methods ====================
    
    def start_worker(self) -> None:
        """
        Start processing notifications from queue.
        
        Call this from your worker process.
        """
        if self._worker_running:
            logger.warning("Worker already running")
            return
        
        self._worker_running = True
        logger.info("Starting notification worker")
        
        self.queue.process(self._process_notification)
    
    async def _process_notification(self, notification: Notification) -> None:
        """Process a single notification from the queue."""
        logger.debug(f"Processing notification {notification.id}")
        
        # Check if cancelled
        current = await self.store.get(notification.id)
        if current and current.status == NotificationStatus.CANCELLED:
            logger.debug(f"Notification {notification.id} was cancelled")
            return
        
        # Atomic lock - prevent double processing
        locked = await self.store.mark_processing(notification.id)
        if not locked:
            logger.debug(f"Notification {notification.id} already processing or completed")
            return
        
        # Get channel
        channel = self.channels.get(notification.channel)
        if not channel:
            await self.store.mark_permanently_failed(
                notification.id,
                f"Unknown channel: {notification.channel.value}"
            )
            return
        
        # Attempt delivery
        result = await self._attempt_delivery(notification, channel)
        
        if result.success:
            await self._handle_success(notification, result)
        else:
            await self._handle_failure(notification, result)
    
    async def _attempt_delivery(
        self,
        notification: Notification,
        channel: NotificationChannel,
    ) -> DeliveryResult:
        """Attempt to deliver notification via channel."""
        try:
            logger.debug(f"Sending notification {notification.id} via {channel.provider_name}")
            return await channel.send(notification)
        except Exception as e:
            logger.exception(f"Error sending notification {notification.id}")
            return DeliveryResult(
                success=False,
                provider_name=channel.provider_name,
                error=DeliveryError(
                    code="SEND_ERROR",
                    message=str(e),
                    retryable=True,
                    permanent=False,
                ),
            )
    
    async def _handle_success(
        self,
        notification: Notification,
        result: DeliveryResult,
    ) -> None:
        """Handle successful delivery."""
        await self.store.mark_sent(
            notification.id,
            result.provider_id or "",
            result.provider_name,
        )
        
        # Record for rate limiting
        await self.preferences.record_sent(
            notification.recipient.user_id,
            notification.channel,
        )
        
        logger.info(
            f"Notification {notification.id} sent via {result.provider_name} "
            f"(provider_id: {result.provider_id})"
        )
    
    async def _handle_failure(
        self,
        notification: Notification,
        result: DeliveryResult,
    ) -> None:
        """Handle failed delivery - retry or mark as failed."""
        error = result.error
        attempts = notification.attempts + 1
        
        logger.warning(
            f"Notification {notification.id} failed (attempt {attempts}): "
            f"{error.code} - {error.message}"
        )
        
        # Permanent failure - don't retry
        if error.permanent or attempts >= notification.max_attempts:
            await self.store.mark_permanently_failed(notification.id, error.message)
            logger.error(f"Notification {notification.id} permanently failed after {attempts} attempts")
            return
        
        # Retryable failure - schedule retry
        if error.retryable:
            next_retry_at = self._calculate_next_retry(attempts)
            await self.store.mark_failed(notification.id, error.message, next_retry_at)
            
            delay_seconds = int((next_retry_at - datetime.utcnow()).total_seconds())
            await self.queue.enqueue_delayed(notification, delay_seconds)
            
            logger.info(f"Notification {notification.id} scheduled for retry at {next_retry_at}")
        else:
            await self.store.mark_permanently_failed(notification.id, error.message)
    
    def _calculate_next_retry(self, attempts: int) -> datetime:
        """Calculate next retry time using exponential backoff."""
        delay = self.retry_config.initial_delay_seconds * (
            self.retry_config.backoff_multiplier ** (attempts - 1)
        )
        delay = min(delay, self.retry_config.max_delay_seconds)
        return datetime.utcnow() + timedelta(seconds=delay)
    
    # ==================== Webhook Handling ====================
    
    async def handle_webhook(
        self,
        channel: ChannelType,
        payload: dict,
        signature: Optional[str] = None,
    ) -> None:
        """
        Process webhook from provider.
        
        Updates delivery status based on webhook event.
        """
        provider = self.channels.get(channel)
        if not provider:
            raise ChannelNotFoundError(channel.value)
        
        event = await provider.parse_webhook(payload, signature)
        
        updated = await self.store.update_delivery_status(
            event.provider_id,
            event.event,
            event.timestamp,
        )
        
        if updated:
            logger.info(
                f"Updated notification {updated.id} delivery status to {event.event.value}"
            )
        else:
            logger.warning(f"No notification found for provider_id {event.provider_id}")
