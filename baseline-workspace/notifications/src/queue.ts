import { Notification, Priority } from './types';

/**
 * Interface for notification queue.
 * Implement with Redis/BullMQ, SQS, RabbitMQ, etc.
 */
export interface NotificationQueue {
  /**
   * Add notification to queue.
   */
  enqueue(notification: Notification): Promise<void>;

  /**
   * Add notification to queue with delay.
   */
  enqueueDelayed(notification: Notification, delayMs: number): Promise<void>;

  /**
   * Add notification scheduled for specific time.
   */
  enqueueScheduled(notification: Notification, scheduledAt: Date): Promise<void>;

  /**
   * Process notifications from queue.
   */
  process(handler: (notification: Notification) => Promise<void>): void;

  /**
   * Get queue stats.
   */
  getStats(): Promise<QueueStats>;
}

export interface QueueStats {
  queued: number;
  processing: number;
  delayed: number;
  failed: number;
}

/**
 * Map priority to queue processing order.
 */
export function priorityToWeight(priority: Priority): number {
  switch (priority) {
    case 'critical': return 10;
    case 'high': return 5;
    case 'normal': return 2;
    case 'low': return 1;
  }
}
