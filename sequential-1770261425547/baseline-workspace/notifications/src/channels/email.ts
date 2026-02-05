import { NotificationChannel } from '../channel';
import { Notification, DeliveryResult, DeliveryWebhookEvent, ChannelType } from '../types';

export interface EmailProviderConfig {
  apiKey: string;
  defaultFrom: string;
  webhookSecret?: string;
}

/**
 * SendGrid email channel implementation.
 */
export class SendGridChannel implements NotificationChannel {
  readonly channelType: ChannelType = 'email';
  readonly providerName = 'sendgrid';

  private apiKey: string;
  private defaultFrom: string;
  private webhookSecret?: string;

  constructor(config: EmailProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultFrom = config.defaultFrom;
    this.webhookSecret = config.webhookSecret;
  }

  validateRecipient(notification: Notification): string | null {
    if (!notification.recipient.email) {
      return 'Email address is required';
    }
    if (!this.isValidEmail(notification.recipient.email)) {
      return 'Invalid email address format';
    }
    return null;
  }

  async send(notification: Notification): Promise<DeliveryResult> {
    const { recipient, content } = notification;

    const payload = {
      personalizations: [{ to: [{ email: recipient.email }] }],
      from: { email: content.from ?? this.defaultFrom },
      subject: content.subject,
      content: [
        ...(content.text ? [{ type: 'text/plain', value: content.text }] : []),
        ...(content.html ? [{ type: 'text/html', value: content.html }] : []),
      ],
      custom_args: {
        notification_id: notification.id,
      },
    };

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          providerName: this.providerName,
          error: {
            code: error.errors?.[0]?.message ?? 'SEND_FAILED',
            message: error.errors?.[0]?.message ?? `HTTP ${response.status}`,
            retryable: response.status >= 500,
            permanent: response.status === 400,
          },
          timestamp: new Date(),
        };
      }

      const messageId = response.headers.get('x-message-id') ?? undefined;

      return {
        success: true,
        providerId: messageId,
        providerName: this.providerName,
        timestamp: new Date(),
      };
    } catch (err) {
      return {
        success: false,
        providerName: this.providerName,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
          permanent: false,
        },
        timestamp: new Date(),
      };
    }
  }

  async parseWebhook(payload: unknown): Promise<DeliveryWebhookEvent> {
    // SendGrid sends array of events
    const events = payload as Array<{
      event: string;
      sg_message_id: string;
      timestamp: number;
      notification_id?: string;
    }>;

    const event = events[0];

    return {
      notificationId: event.notification_id ?? '',
      providerId: event.sg_message_id,
      provider: this.providerName,
      event: this.mapEventType(event.event),
      timestamp: new Date(event.timestamp * 1000),
    };
  }

  private mapEventType(event: string): DeliveryWebhookEvent['event'] {
    switch (event) {
      case 'delivered': return 'delivered';
      case 'bounce': return 'bounced';
      case 'open': return 'opened';
      case 'click': return 'clicked';
      case 'unsubscribe': return 'unsubscribed';
      case 'spamreport': return 'complained';
      default: return 'delivered';
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
