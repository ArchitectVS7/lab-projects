import { v4 as uuid } from 'uuid';
import {
  SendNotificationRequest,
  Notification,
  NotificationStatus,
  DeliveryResult,
  DeliveryWebhookEvent,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ChannelType,
} from './types';
import { NotificationChannel } from './channel';
import { NotificationStore } from './store';
import { NotificationQueue } from './queue';
import { PreferencesStore, PreferenceChecker } from './preferences';

/**
 * Error thrown when notification is blocked by user preferences.
 */
export class NotificationBlockedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'NotificationBlockedError';
  }
}

export interface NotificationServiceConfig {
  store: NotificationStore;
  queue: NotificationQueue;
  channels: Map<ChannelType, NotificationChannel>;
  preferences: PreferencesStore;
  retry?: Partial<RetryConfig>;
}

/**
 * Main notification service.
 * Handles queuing, delivery, retries, and tracking.
 */
export class NotificationService {
  private store: NotificationStore;
  private queue: NotificationQueue;
  private channels: Map<ChannelType, NotificationChannel>;
  private preferences: PreferencesStore;
  private preferenceChecker: PreferenceChecker;
  private retryConfig: RetryConfig;

  constructor(config: NotificationServiceConfig) {
    this.store = config.store;
    this.queue = config.queue;
    this.channels = config.channels;
    this.preferences = config.preferences;
    this.preferenceChecker = new PreferenceChecker(config.preferences);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
  }

  // ============ Public API ============

  /**
   * Queue a notification for async delivery.
   * Returns immediately with notification ID.
   */
  async send(request: SendNotificationRequest): Promise<Notification> {
    // Idempotency check
    if (request.idempotencyKey) {
      const existing = await this.store.getByIdempotencyKey(request.idempotencyKey);
      if (existing) return existing;
    }

    // Validate channel exists
    const channel = this.channels.get(request.channel);
    if (!channel) {
      throw new Error(`Unknown channel: ${request.channel}`);
    }

    // Check user preferences
    const category = request.metadata?.category ?? 'transactional';
    const prefCheck = await this.preferenceChecker.canSend(
      request.recipient.userId,
      request.channel,
      category,
      request.priority ?? 'normal'
    );

    if (!prefCheck.allowed) {
      // If blocked by quiet hours, schedule for when quiet hours end
      if (prefCheck.delayUntil) {
        request.scheduledAt = prefCheck.delayUntil;
      } else {
        throw new NotificationBlockedError(prefCheck.reason!);
      }
    }

    // Create notification record
    const notification: Notification = {
      id: uuid(),
      channel: request.channel,
      recipient: request.recipient,
      content: request.content,
      priority: request.priority ?? 'normal',
      status: request.scheduledAt ? 'scheduled' : 'queued',
      attempts: 0,
      maxAttempts: this.retryConfig.maxAttempts,
      queuedAt: new Date(),
      scheduledAt: request.scheduledAt,
      idempotencyKey: request.idempotencyKey,
      metadata: request.metadata ?? {},
    };

    // Validate recipient
    const validationError = channel.validateRecipient(notification);
    if (validationError) {
      throw new Error(`Invalid recipient: ${validationError}`);
    }

    // Save to store
    await this.store.create(notification);

    // Queue for delivery
    if (request.scheduledAt && request.scheduledAt > new Date()) {
      await this.queue.enqueueScheduled(notification, request.scheduledAt);
    } else {
      await this.queue.enqueue(notification);
    }

    return notification;
  }

  /**
   * Send notification, respecting preferences. If channel is disabled,
   * tries fallback channels.
   */
  async sendWithFallback(
    request: SendNotificationRequest,
    fallbackChannels: ChannelType[]
  ): Promise<Notification> {
    const channels = [request.channel, ...fallbackChannels];

    for (const channel of channels) {
      try {
        return await this.send({ ...request, channel });
      } catch (err) {
        if (err instanceof NotificationBlockedError) {
          continue; // Try next channel
        }
        throw err;
      }
    }

    throw new NotificationBlockedError(
      `All channels blocked by user preferences: ${channels.join(', ')}`
    );
  }

  /**
   * Send to multiple recipients.
   */
  async sendBulk(requests: SendNotificationRequest[]): Promise<Notification[]> {
    return Promise.all(requests.map((r) => this.send(r)));
  }

  /**
   * Get notification status.
   */
  async getStatus(notificationId: string): Promise<Notification | null> {
    return this.store.get(notificationId);
  }

  /**
   * Cancel a scheduled/queued notification.
   */
  async cancel(notificationId: string): Promise<boolean> {
    const notification = await this.store.get(notificationId);
    if (!notification) return false;

    if (notification.status === 'queued' || notification.status === 'scheduled') {
      await this.store.update(notificationId, { status: 'cancelled' });
      return true;
    }

    return false;
  }

  /**
   * Get notification history for a user.
   */
  async getUserNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; status?: NotificationStatus }
  ): Promise<Notification[]> {
    return this.store.getByUserId(userId, options);
  }

  // ============ Worker Methods ============

  /**
   * Start processing queue. Call this from your worker.
   */
  startWorker(): void {
    this.queue.process(async (notification) => {
      await this.processNotification(notification);
    });
  }

  /**
   * Process a single notification.
   */
  async processNotification(notification: Notification): Promise<void> {
    // Atomic check - prevent double processing
    const locked = await this.store.markProcessing(notification.id);
    if (!locked) return;

    const channel = this.channels.get(notification.channel);
    if (!channel) {
      await this.store.markPermanentlyFailed(
        notification.id,
        `Unknown channel: ${notification.channel}`
      );
      return;
    }

    // Attempt delivery
    const result = await this.attemptDelivery(notification, channel);

    if (result.success) {
      await this.store.markSent(notification.id, result.providerId!, result.providerName);
      // Record for rate limiting
      await this.preferences.recordSent(notification.recipient.userId, notification.channel);
    } else {
      await this.handleFailure(notification, result);
    }
  }

  /**
   * Process webhook from provider.
   */
  async handleWebhook(
    channel: ChannelType,
    payload: unknown,
    signature?: string
  ): Promise<void> {
    const provider = this.channels.get(channel);
    if (!provider?.parseWebhook) {
      throw new Error(`Channel ${channel} does not support webhooks`);
    }

    const event = await provider.parseWebhook(payload, signature);
    await this.store.updateDeliveryStatus(event.providerId, event.event, event.timestamp);
  }

  // ============ Private Methods ============

  private async attemptDelivery(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<DeliveryResult> {
    try {
      return await channel.send(notification);
    } catch (err) {
      return {
        success: false,
        providerName: channel.providerName,
        error: {
          code: 'SEND_ERROR',
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
          permanent: false,
        },
        timestamp: new Date(),
      };
    }
  }

  private async handleFailure(
    notification: Notification,
    result: DeliveryResult
  ): Promise<void> {
    const error = result.error!;
    const attempts = notification.attempts + 1;

    // Permanent failure - don't retry
    if (error.permanent || attempts >= notification.maxAttempts) {
      await this.store.markPermanentlyFailed(notification.id, error.message);
      return;
    }

    // Retryable failure - schedule retry
    if (error.retryable) {
      const nextRetryAt = this.calculateNextRetry(attempts);
      await this.store.markFailed(notification.id, error.message, nextRetryAt);
      await this.queue.enqueueDelayed(notification, nextRetryAt.getTime() - Date.now());
    } else {
      await this.store.markPermanentlyFailed(notification.id, error.message);
    }
  }

  private calculateNextRetry(attempts: number): Date {
    const { backoff, initialDelayMs, maxDelayMs } = this.retryConfig;

    let delayMs: number;
    switch (backoff) {
      case 'exponential':
        delayMs = initialDelayMs * Math.pow(2, attempts - 1);
        break;
      case 'linear':
        delayMs = initialDelayMs * attempts;
        break;
      case 'fixed':
      default:
        delayMs = initialDelayMs;
    }

    delayMs = Math.min(delayMs, maxDelayMs);
    return new Date(Date.now() + delayMs);
  }
}
