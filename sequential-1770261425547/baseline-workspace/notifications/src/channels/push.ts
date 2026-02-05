import { NotificationChannel } from '../channel';
import { Notification, DeliveryResult, ChannelType } from '../types';

export interface PushProviderConfig {
  projectId: string;
  credentials: object;  // Firebase service account
}

/**
 * Firebase Cloud Messaging (FCM) push channel implementation.
 */
export class FCMChannel implements NotificationChannel {
  readonly channelType: ChannelType = 'push';
  readonly providerName = 'fcm';

  private projectId: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: PushProviderConfig) {
    this.projectId = config.projectId;
    // In real implementation, initialize Firebase Admin SDK
  }

  validateRecipient(notification: Notification): string | null {
    if (!notification.recipient.deviceTokens?.length) {
      return 'At least one device token is required';
    }
    return null;
  }

  async send(notification: Notification): Promise<DeliveryResult> {
    const { recipient, content } = notification;
    const tokens = recipient.deviceTokens!;

    // Send to all device tokens
    const results = await Promise.all(
      tokens.map((token) => this.sendToDevice(token, notification.id, content))
    );

    // Consider success if at least one succeeded
    const successCount = results.filter((r) => r.success).length;
    const failedTokens = results
      .filter((r) => !r.success && r.invalidToken)
      .map((_, i) => tokens[i]);

    if (successCount > 0) {
      return {
        success: true,
        providerId: results.find((r) => r.messageId)?.messageId,
        providerName: this.providerName,
        timestamp: new Date(),
      };
    }

    return {
      success: false,
      providerName: this.providerName,
      error: {
        code: 'ALL_FAILED',
        message: `Failed to send to all ${tokens.length} devices`,
        retryable: failedTokens.length < tokens.length,
        permanent: failedTokens.length === tokens.length,
      },
      timestamp: new Date(),
    };
  }

  async sendBatch(notifications: Notification[]): Promise<DeliveryResult[]> {
    // FCM supports batching up to 500 messages
    return Promise.all(notifications.map((n) => this.send(n)));
  }

  private async sendToDevice(
    token: string,
    notificationId: string,
    content: Notification['content']
  ): Promise<{ success: boolean; messageId?: string; invalidToken?: boolean }> {
    const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

    const message = {
      message: {
        token,
        notification: {
          title: content.title,
          body: content.message,
        },
        data: {
          notification_id: notificationId,
          ...Object.fromEntries(
            Object.entries(content.data ?? {}).map(([k, v]) => [k, String(v)])
          ),
        },
        android: {
          notification: {
            sound: content.sound ?? 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: content.sound ?? 'default',
              badge: content.badge,
            },
          },
        },
      },
    };

    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const isInvalidToken = error.error?.details?.some(
          (d: { errorCode?: string }) =>
            d.errorCode === 'UNREGISTERED' || d.errorCode === 'INVALID_ARGUMENT'
        );
        return { success: false, invalidToken: isInvalidToken };
      }

      const data = await response.json();
      return { success: true, messageId: data.name };
    } catch {
      return { success: false };
    }
  }

  private async getAccessToken(): Promise<string> {
    // In real implementation, use Google Auth Library
    // This is a placeholder
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    // Refresh token logic here
    throw new Error('Token refresh not implemented - use Firebase Admin SDK');
  }
}
