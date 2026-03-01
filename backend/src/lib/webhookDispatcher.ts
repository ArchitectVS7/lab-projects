import crypto, { randomUUID } from 'crypto';
import prisma from './prisma.js';

const WEBHOOK_EVENTS = [
  'task.created',
  'task.updated',
  'task.completed',
  'task.deleted',
  'project.created',
  'project.updated',
  'comment.added',
  'task.delegated',
  'task.agent_completed',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export const ALLOWED_WEBHOOK_EVENTS = WEBHOOK_EVENTS;

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: string,
  data: unknown,
  attempt: number = 1,
): Promise<void> {
  const deliveryId = randomUUID();
  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), deliveryId, data });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Upsert the delivery log (idempotent — keyed on deliveryId)
    await prisma.webhookLog.upsert({
      where: { deliveryId },
      update: { statusCode: response.status },
      create: {
        webhookId,
        event,
        statusCode: response.status,
        deliveryId,
      },
    });

    // Fire-and-forget: clean up logs older than 90 days for this webhook
    prisma.webhookLog.deleteMany({
      where: {
        webhookId,
        createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    }).catch((err) => console.error('[webhookDispatcher] Failed to cleanup old logs:', err));

    if (response.ok) {
      // Reset failure count on success
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { failureCount: 0 },
      });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error: unknown) {
    // Upsert the failure log (idempotent — keyed on deliveryId)
    await prisma.webhookLog.upsert({
      where: { deliveryId },
      update: { error: error instanceof Error ? error.message : 'Unknown error' },
      create: {
        webhookId,
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryId,
      },
    }).catch((err) => console.error(`[webhookDispatcher] Failed to log webhook failure for ${webhookId}:`, err));

    // Increment failure count
    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
    }).catch(() => null);

    // Auto-disable after 10 consecutive failures
    if (updated && updated.failureCount >= 10) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { active: false },
      }).catch((err) => console.error(`[webhookDispatcher] Failed to disable webhook ${webhookId}:`, err));
      return; // Don't retry if disabled
    }

    // Retry with exponential backoff (1s, 5s, 25s)
    if (attempt < 3) {
      const delay = Math.pow(5, attempt - 1) * 1000;
      setTimeout(() => {
        void deliverWebhook(webhookId, url, secret, event, data, attempt + 1);
      }, delay);
    }
  }
}

export async function dispatchWebhooks(event: string, data: unknown, userId: string): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        active: true,
        events: { has: event },
      },
    });

    for (const webhook of webhooks) {
      // Fire-and-forget: don't await delivery
      void deliverWebhook(webhook.id, webhook.url, webhook.secret, event, data).catch((err) => console.error(`[webhookDispatcher] Failed to deliver webhook ${webhook.id}:`, err));
    }
  } catch (error) {
    console.error('Failed to dispatch webhooks:', error);
  }
}
