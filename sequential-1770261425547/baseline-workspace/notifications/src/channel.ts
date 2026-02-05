import { Notification, DeliveryResult, DeliveryWebhookEvent, ChannelType } from './types';

/**
 * Interface for notification channel providers.
 * Implement this for each delivery method (email, SMS, push).
 */
export interface NotificationChannel {
  /** Channel type */
  readonly channelType: ChannelType;
  
  /** Provider name (e.g., "sendgrid", "twilio") */
  readonly providerName: string;

  /**
   * Send a single notification.
   */
  send(notification: Notification): Promise<DeliveryResult>;

  /**
   * Send multiple notifications (optional batch optimization).
   */
  sendBatch?(notifications: Notification[]): Promise<DeliveryResult[]>;

  /**
   * Check delivery status with provider (optional).
   */
  getStatus?(providerId: string): Promise<DeliveryResult>;

  /**
   * Parse incoming webhook from provider.
   */
  parseWebhook?(payload: unknown, signature?: string): Promise<DeliveryWebhookEvent>;

  /**
   * Validate recipient has required fields for this channel.
   */
  validateRecipient(notification: Notification): string | null;
}
