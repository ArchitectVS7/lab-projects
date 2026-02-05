import { Notification, NotificationStatus, DeliveryEventType } from './types';

/**
 * Interface for notification persistence.
 * Implement with your database of choice (Postgres, MongoDB, etc.)
 */
export interface NotificationStore {
  /**
   * Create a new notification record.
   */
  create(notification: Notification): Promise<Notification>;

  /**
   * Get notification by ID.
   */
  get(id: string): Promise<Notification | null>;

  /**
   * Get notification by idempotency key.
   */
  getByIdempotencyKey(key: string): Promise<Notification | null>;

  /**
   * Update notification status and fields.
   */
  update(id: string, updates: Partial<Notification>): Promise<Notification>;

  /**
   * Mark notification as processing (with atomic check).
   * Returns null if already processing or completed.
   */
  markProcessing(id: string): Promise<Notification | null>;

  /**
   * Mark notification as sent.
   */
  markSent(id: string, providerId: string, providerName: string): Promise<Notification>;

  /**
   * Mark notification as failed (may retry).
   */
  markFailed(id: string, error: string, nextRetryAt?: Date): Promise<Notification>;

  /**
   * Mark notification as permanently failed.
   */
  markPermanentlyFailed(id: string, error: string): Promise<Notification>;

  /**
   * Update delivery status from webhook.
   */
  updateDeliveryStatus(
    providerId: string,
    event: DeliveryEventType,
    timestamp: Date
  ): Promise<Notification | null>;

  /**
   * Get notifications ready to retry.
   */
  getRetryable(limit: number): Promise<Notification[]>;

  /**
   * Get scheduled notifications ready to send.
   */
  getScheduledReady(limit: number): Promise<Notification[]>;

  /**
   * Get notifications by user ID.
   */
  getByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; status?: NotificationStatus }
  ): Promise<Notification[]>;
}
