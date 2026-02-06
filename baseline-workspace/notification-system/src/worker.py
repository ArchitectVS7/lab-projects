"""
Notification Worker

Processes jobs from the queue and sends via channel providers.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from .types import (
    Channel,
    DeliveryStatus,
    NotificationJob,
)
from .queue import NotificationQueue
from .templates import TemplateService
from .channels import NotificationChannel, RenderedContent
from .repository import DeliveryRepository


logger = logging.getLogger(__name__)


# Retry delays in seconds (exponential backoff)
RETRY_DELAYS = [60, 300, 1800, 7200]  # 1m, 5m, 30m, 2h


class NotificationWorker:
    """
    Worker that processes notification jobs.
    
    Run one worker per channel, or a single worker handling all channels.
    """

    def __init__(
        self,
        queue: NotificationQueue,
        template_service: TemplateService,
        delivery_repo: DeliveryRepository,
        channels: dict[Channel, NotificationChannel],
    ):
        self.queue = queue
        self.templates = template_service
        self.delivery_repo = delivery_repo
        self.channels = channels
        self._running = False

    async def start(self, channel: Optional[Channel] = None):
        """
        Start processing jobs.
        
        Args:
            channel: Specific channel to process, or None for all
        """
        self._running = True
        logger.info(f"Worker started for channel: {channel or 'all'}")
        
        while self._running:
            try:
                await self._process_next(channel)
            except Exception as e:
                logger.exception(f"Worker error: {e}")
                await asyncio.sleep(1)

    def stop(self):
        """Stop the worker."""
        self._running = False
        logger.info("Worker stopping...")

    async def _process_next(self, channel: Optional[Channel] = None):
        """Process the next job from the queue."""
        # Get next job
        if channel:
            job = await self.queue.dequeue(channel.value)
        else:
            # Try each channel
            job = None
            for ch in Channel:
                job = await self.queue.dequeue(ch.value)
                if job:
                    break
        
        if not job:
            # No jobs available, wait a bit
            await asyncio.sleep(0.5)
            return
        
        await self._process_job(job)

    async def _process_job(self, job: NotificationJob):
        """Process a single notification job."""
        logger.info(f"Processing job {job.id} for {job.channel.value}")
        
        # Update delivery record to sending
        self.delivery_repo.update_status(
            record_id=job.delivery_record_id,
            status=DeliveryStatus.SENDING,
        )
        
        # Get channel provider
        channel_provider = self.channels.get(job.channel)
        if not channel_provider:
            logger.error(f"No provider for channel {job.channel}")
            await self._handle_failure(
                job=job,
                error=f"No provider for channel {job.channel}",
                retryable=False,
            )
            return
        
        # Validate recipient
        if not channel_provider.validate_recipient(job.recipient):
            logger.warning(f"Invalid recipient: {job.recipient}")
            await self._handle_failure(
                job=job,
                error=f"Invalid recipient format",
                retryable=False,
            )
            return
        
        # Render template
        try:
            content = self.templates.render(
                notification_type=job.type,
                channel=job.channel,
                data=job.data,
            )
        except Exception as e:
            logger.exception(f"Template rendering failed: {e}")
            await self._handle_failure(
                job=job,
                error=f"Template error: {e}",
                retryable=False,
            )
            return
        
        # Send via provider
        result = await channel_provider.send(job.recipient, content)
        
        if result.success:
            await self._handle_success(job, result.provider_message_id)
        else:
            await self._handle_failure(
                job=job,
                error=result.error or "Unknown error",
                retryable=result.retryable,
            )

    async def _handle_success(
        self,
        job: NotificationJob,
        provider_message_id: Optional[str],
    ):
        """Handle successful send."""
        logger.info(f"Job {job.id} sent successfully")
        
        self.delivery_repo.update_status(
            record_id=job.delivery_record_id,
            status=DeliveryStatus.SENT,
            provider_message_id=provider_message_id,
        )
        
        await self.queue.complete(job.id)

    async def _handle_failure(
        self,
        job: NotificationJob,
        error: str,
        retryable: bool,
    ):
        """Handle failed send."""
        job.attempts += 1
        
        # Determine if we should retry
        should_retry = retryable and job.attempts < job.max_attempts
        
        if should_retry:
            # Calculate retry delay
            delay_index = min(job.attempts - 1, len(RETRY_DELAYS) - 1)
            retry_delay = RETRY_DELAYS[delay_index]
            
            logger.warning(
                f"Job {job.id} failed (attempt {job.attempts}), "
                f"retrying in {retry_delay}s: {error}"
            )
            
            # Update record
            record = self.delivery_repo.get(job.delivery_record_id)
            if record:
                record.attempts = job.attempts
                record.last_error = error
                record.updated_at = datetime.utcnow()
                self.delivery_repo.save(record)
            
            # Requeue with delay
            await self.queue.fail(
                job_id=job.id,
                error=error,
                retry=True,
                retry_delay_seconds=retry_delay,
            )
        else:
            logger.error(
                f"Job {job.id} failed permanently after {job.attempts} attempts: {error}"
            )
            
            # Mark as failed
            self.delivery_repo.update_status(
                record_id=job.delivery_record_id,
                status=DeliveryStatus.FAILED,
                error=error,
            )
            
            await self.queue.fail(
                job_id=job.id,
                error=error,
                retry=False,
            )


async def run_worker(
    queue: NotificationQueue,
    template_service: TemplateService,
    delivery_repo: DeliveryRepository,
    channels: dict[Channel, NotificationChannel],
    channel: Optional[Channel] = None,
):
    """
    Convenience function to run a worker.
    
    Usage:
        asyncio.run(run_worker(queue, templates, repo, channels))
    """
    worker = NotificationWorker(
        queue=queue,
        template_service=template_service,
        delivery_repo=delivery_repo,
        channels=channels,
    )
    await worker.start(channel)
