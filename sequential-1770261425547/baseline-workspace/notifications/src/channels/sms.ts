import { NotificationChannel } from '../channel';
import { Notification, DeliveryResult, DeliveryWebhookEvent, ChannelType } from '../types';

export interface SMSProviderConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

/**
 * Twilio SMS channel implementation.
 */
export class TwilioChannel implements NotificationChannel {
  readonly channelType: ChannelType = 'sms';
  readonly providerName = 'twilio';

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: SMSProviderConfig) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber;
  }

  validateRecipient(notification: Notification): string | null {
    if (!notification.recipient.phone) {
      return 'Phone number is required';
    }
    if (!this.isValidPhone(notification.recipient.phone)) {
      return 'Invalid phone number format (use E.164: +1234567890)';
    }
    return null;
  }

  async send(notification: Notification): Promise<DeliveryResult> {
    const { recipient, content } = notification;
    const body = content.body ?? content.message ?? content.text;

    if (!body) {
      return {
        success: false,
        providerName: this.providerName,
        error: {
          code: 'NO_CONTENT',
          message: 'SMS body is required',
          retryable: false,
          permanent: true,
        },
        timestamp: new Date(),
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const params = new URLSearchParams({
      To: recipient.phone!,
      From: this.fromNumber,
      Body: body,
      StatusCallback: `https://yourapp.com/webhooks/twilio?notification_id=${notification.id}`,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          providerName: this.providerName,
          error: {
            code: data.code?.toString() ?? 'SEND_FAILED',
            message: data.message ?? `HTTP ${response.status}`,
            retryable: response.status >= 500,
            permanent: this.isPermanentError(data.code),
          },
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        providerId: data.sid,
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
    const data = payload as {
      MessageSid: string;
      MessageStatus: string;
      notification_id?: string;
    };

    return {
      notificationId: data.notification_id ?? '',
      providerId: data.MessageSid,
      provider: this.providerName,
      event: this.mapStatus(data.MessageStatus),
      timestamp: new Date(),
    };
  }

  private mapStatus(status: string): DeliveryWebhookEvent['event'] {
    switch (status) {
      case 'delivered': return 'delivered';
      case 'undelivered':
      case 'failed': return 'bounced';
      default: return 'delivered';
    }
  }

  private isPermanentError(code?: number): boolean {
    // Twilio error codes for invalid numbers, blocked, etc.
    const permanentCodes = [21211, 21214, 21217, 21408, 21610, 21612];
    return code ? permanentCodes.includes(code) : false;
  }

  private isValidPhone(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }
}
