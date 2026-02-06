// ============ Channel Types ============

export type ChannelType = 'email' | 'sms' | 'push';

// ============ Notification Types ============

export interface SendNotificationRequest {
  channel: ChannelType;
  recipient: Recipient;
  content: NotificationContent;
  priority?: Priority;
  scheduledAt?: Date;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}

export interface Recipient {
  userId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
}

export interface NotificationContent {
  // Template-based
  templateId?: string;
  templateData?: Record<string, unknown>;

  // Email
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;

  // SMS
  body?: string;

  // Push
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: string;
}

export type Priority = 'low' | 'normal' | 'high' | 'critical';

// ============ Notification Record ============

export interface Notification {
  id: string;
  channel: ChannelType;
  recipient: Recipient;
  content: NotificationContent;
  priority: Priority;
  status: NotificationStatus;
  
  // Tracking
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  lastError?: string;
  
  // Delivery info
  providerId?: string;        // ID from provider (SendGrid, Twilio, etc.)
  providerName?: string;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  
  // Timestamps
  scheduledAt?: Date;
  queuedAt: Date;
  sentAt?: Date;
  failedAt?: Date;
  
  // Metadata
  idempotencyKey?: string;
  metadata: Record<string, string>;
}

export type NotificationStatus =
  | 'queued'
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'cancelled';

// ============ Delivery Types ============

export interface DeliveryResult {
  success: boolean;
  providerId?: string;
  providerName: string;
  error?: DeliveryError;
  timestamp: Date;
}

export interface DeliveryError {
  code: string;
  message: string;
  retryable: boolean;
  permanent: boolean;   // e.g., invalid email, unsubscribed
}

// ============ Webhook Events ============

export interface DeliveryWebhookEvent {
  notificationId: string;
  providerId: string;
  provider: string;
  event: DeliveryEventType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type DeliveryEventType =
  | 'delivered'
  | 'bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'complained';

// ============ Retry Configuration ============

export interface RetryConfig {
  maxAttempts: number;
  backoff: BackoffStrategy;
  initialDelayMs: number;
  maxDelayMs: number;
}

export type BackoffStrategy = 'fixed' | 'exponential' | 'linear';

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  backoff: 'exponential',
  initialDelayMs: 60_000,      // 1 minute
  maxDelayMs: 3600_000,        // 1 hour
};
