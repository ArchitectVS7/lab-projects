"""Queue interface for async notification processing."""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Callable, Awaitable
from .types import NotificationJob


class NotificationQueue(ABC):
    """Abstract interface for notification job queue."""

    @abstractmethod
    async def enqueue(
        self,
        job: NotificationJob,
        delay_until: Optional[datetime] = None,
    ) -> str:
        """
        Add a job to the queue.
        
        Args:
            job: The notification job to enqueue
            delay_until: If set, delay processing until this time
            
        Returns:
            Job ID
        """
        pass

    @abstractmethod
    async def dequeue(self, channel: str) -> Optional[NotificationJob]:
        """
        Get the next job for a channel.
        
        Args:
            channel: Channel to get job for (email, sms, push)
            
        Returns:
            Next job or None if queue is empty
        """
        pass

    @abstractmethod
    async def complete(self, job_id: str) -> None:
        """Mark a job as completed."""
        pass

    @abstractmethod
    async def fail(
        self,
        job_id: str,
        error: str,
        retry: bool = True,
        retry_delay_seconds: int = 60,
    ) -> None:
        """
        Mark a job as failed.
        
        Args:
            job_id: Job ID
            error: Error message
            retry: Whether to retry the job
            retry_delay_seconds: Delay before retry
        """
        pass


class InMemoryQueue(NotificationQueue):
    """Simple in-memory queue for development/testing."""

    def __init__(self):
        self.queues: dict[str, list[tuple[datetime, NotificationJob]]] = {
            "email": [],
            "sms": [],
            "push": [],
        }
        self.jobs: dict[str, NotificationJob] = {}

    async def enqueue(
        self,
        job: NotificationJob,
        delay_until: Optional[datetime] = None,
    ) -> str:
        channel = job.channel.value
        process_at = delay_until or datetime.utcnow()
        
        self.queues[channel].append((process_at, job))
        self.queues[channel].sort(key=lambda x: x[0])  # Sort by process time
        self.jobs[job.id] = job
        
        return job.id

    async def dequeue(self, channel: str) -> Optional[NotificationJob]:
        if not self.queues.get(channel):
            return None
        
        now = datetime.utcnow()
        
        # Find first job ready to process
        for i, (process_at, job) in enumerate(self.queues[channel]):
            if process_at <= now:
                self.queues[channel].pop(i)
                return job
        
        return None

    async def complete(self, job_id: str) -> None:
        self.jobs.pop(job_id, None)

    async def fail(
        self,
        job_id: str,
        error: str,
        retry: bool = True,
        retry_delay_seconds: int = 60,
    ) -> None:
        job = self.jobs.get(job_id)
        if not job:
            return
        
        job.attempts += 1
        
        if retry and job.attempts < job.max_attempts:
            # Re-enqueue with delay
            from datetime import timedelta
            delay_until = datetime.utcnow() + timedelta(seconds=retry_delay_seconds)
            await self.enqueue(job, delay_until)
        else:
            # Job permanently failed
            self.jobs.pop(job_id, None)


# Redis/BullMQ implementation would go here
# class RedisQueue(NotificationQueue):
#     def __init__(self, redis_url: str):
#         ...
