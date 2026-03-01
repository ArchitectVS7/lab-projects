import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import crypto from 'crypto';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.startsWith('auth_token='));
}

describe('Webhooks', () => {
  let user1: { id: string; email: string; cookie: string };
  let user2: { id: string; email: string; cookie: string };
  let projectId: string;

  // Local HTTP test server for receiving webhook deliveries
  let testServer: http.Server;
  let testServerPort: number;
  let receivedRequests: Array<{
    headers: http.IncomingHttpHeaders;
    body: string;
    parsed: any;
  }>;

  beforeAll(async () => {
    // Clean DB using TRUNCATE CASCADE to handle all FK relationships reliably
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        webhook_logs, webhooks,
        activity_logs, comments, notifications,
        time_entries, task_dependencies, task_tags, task_domains,
        custom_field_values, custom_field_definitions, tags, attachments,
        agent_delegations, recurring_tasks, tasks,
        project_members, projects,
        daily_checkins, domains,
        user_achievements, user_quests, user_skills,
        xp_logs, streak_protection_logs,
        usage_records, subscriptions,
        api_keys, users
      RESTART IDENTITY CASCADE
    `);

    // Register user1 (upgrade to PRO — webhooks are gated)
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'wh-user1@test.com', password: 'P@ssword1234', name: 'Webhook User1' });
    user1 = {
      id: user1Res.body.user.id,
      email: 'wh-user1@test.com',
      cookie: extractAuthCookie(user1Res)!,
    };
    await prisma.user.update({ where: { id: user1.id }, data: { plan: 'PRO' } });

    // Register user2 (upgrade to PRO — webhooks are gated)
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'wh-user2@test.com', password: 'P@ssword1234', name: 'Webhook User2' });
    user2 = {
      id: user2Res.body.user.id,
      email: 'wh-user2@test.com',
      cookie: extractAuthCookie(user2Res)!,
    };
    await prisma.user.update({ where: { id: user2.id }, data: { plan: 'PRO' } });

    // Create a project by user1
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', user1.cookie)
      .send({ name: 'Webhook Test Project' });
    projectId = projRes.body.id;

    // Start local HTTP test server on a random port
    receivedRequests = [];
    testServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          // leave parsed as null
        }
        receivedRequests.push({
          headers: req.headers,
          body,
          parsed,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise<void>((resolve) => {
      testServer.listen(0, '127.0.0.1', () => {
        const addr = testServer.address() as { port: number };
        testServerPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Close test server
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });

    // Clean DB using TRUNCATE CASCADE to handle all FK relationships reliably
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        webhook_logs, webhooks,
        activity_logs, comments, notifications,
        time_entries, task_dependencies, task_tags, task_domains,
        custom_field_values, custom_field_definitions, tags, attachments,
        agent_delegations, recurring_tasks, tasks,
        project_members, projects,
        daily_checkins, domains,
        user_achievements, user_quests, user_skills,
        xp_logs, streak_protection_logs,
        usage_records, subscriptions,
        api_keys, users
      RESTART IDENTITY CASCADE
    `);
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // 1. CRUD
  // -------------------------------------------------------
  describe('CRUD', () => {
    let webhookId: string;
    let webhookSecret: string;

    it('should require authentication (401)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({ url: 'https://example.com/hook', events: ['task.created'] });

      expect(res.status).toBe(401);
    });

    it('should create a webhook and return secret (201)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({
          url: 'https://example.com/hook',
          events: ['task.created', 'task.updated'],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('secret');
      expect(typeof res.body.secret).toBe('string');
      expect(res.body.secret.length).toBeGreaterThan(0);
      expect(res.body.url).toBe('https://example.com/hook');
      expect(res.body.events).toEqual(['task.created', 'task.updated']);
      expect(res.body.active).toBe(true);
      expect(res.body.failureCount).toBe(0);

      webhookId = res.body.id;
      webhookSecret = res.body.secret;
    });

    it('should list user webhooks', async () => {
      const res = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const webhook = res.body.find((w: any) => w.id === webhookId);
      expect(webhook).toBeDefined();
      expect(webhook.url).toBe('https://example.com/hook');
      // Secret should NOT be included in list response
      expect(webhook).not.toHaveProperty('secret');
    });

    it('should not list another user\'s webhooks', async () => {
      const res = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user2.cookie);

      expect(res.status).toBe(200);
      const webhook = res.body.find((w: any) => w.id === webhookId);
      expect(webhook).toBeUndefined();
    });

    it('should update a webhook (url, events, active)', async () => {
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Cookie', user1.cookie)
        .send({
          url: 'https://example.com/updated-hook',
          events: ['task.created'],
          active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://example.com/updated-hook');
      expect(res.body.events).toEqual(['task.created']);
      expect(res.body.active).toBe(false);
    });

    it('should re-activate webhook for later tests', async () => {
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Cookie', user1.cookie)
        .send({
          url: 'https://example.com/hook',
          events: ['task.created', 'task.updated'],
          active: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.active).toBe(true);
    });

    it('should delete a webhook (204)', async () => {
      // Create a throwaway webhook to delete
      const createRes = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({
          url: 'https://example.com/to-delete',
          events: ['task.deleted'],
        });
      const toDeleteId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/webhooks/${toDeleteId}`)
        .set('Cookie', user1.cookie);

      expect(res.status).toBe(204);

      // Verify it is gone
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const found = listRes.body.find((w: any) => w.id === toDeleteId);
      expect(found).toBeUndefined();
    });

    it('should return 404 when deleting non-existent webhook', async () => {
      const res = await request(app)
        .delete('/api/webhooks/00000000-0000-0000-0000-000000000000')
        .set('Cookie', user1.cookie);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------
  // 2. Validation
  // -------------------------------------------------------
  describe('Validation', () => {
    it('should reject invalid URL (400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'not-a-url', events: ['task.created'] });

      expect(res.status).toBe(400);
    });

    it('should reject empty events array (400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'https://example.com/hook', events: [] });

      expect(res.status).toBe(400);
    });

    it('should reject missing events field (400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'https://example.com/hook' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid event name (400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'https://example.com/hook', events: ['invalid.event'] });

      expect(res.status).toBe(400);
    });

    it('should reject mixed valid and invalid events (400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({
          url: 'https://example.com/hook',
          events: ['task.created', 'bogus.event'],
        });

      expect(res.status).toBe(400);
    });

    it('should reject localhost webhook URL (SSRF protection, 400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'http://localhost/hook', events: ['task.created'] });

      expect(res.status).toBe(400);
    });

    it('should reject 127.0.0.1 webhook URL (SSRF protection, 400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'http://127.0.0.1/hook', events: ['task.created'] });

      expect(res.status).toBe(400);
    });

    it('should reject 192.168.x.x webhook URL (SSRF protection, 400)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'http://192.168.1.1/hook', events: ['task.created'] });

      expect(res.status).toBe(400);
    });

    it('should accept a valid public URL (201)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({ url: 'https://example.com/hook', events: ['task.created'] });

      expect(res.status).toBe(201);
      // Clean up
      await prisma.webhook.delete({ where: { id: res.body.id } });
    });

    it('should reject non-owner update (403)', async () => {
      // Get user1's webhook
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const webhookId = listRes.body[0].id;

      // user2 tries to update user1's webhook
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Cookie', user2.cookie)
        .send({ url: 'https://evil.com/hook' });

      expect(res.status).toBe(403);
    });

    it('should reject non-owner delete (403)', async () => {
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const webhookId = listRes.body[0].id;

      const res = await request(app)
        .delete(`/api/webhooks/${webhookId}`)
        .set('Cookie', user2.cookie);

      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------
  // 3. Dispatch
  // -------------------------------------------------------
  describe('Dispatch', () => {
    let dispatchWebhookId: string;
    let dispatchWebhookSecret: string;

    beforeAll(async () => {
      // Clean up any webhooks from earlier tests and create a fresh one
      await prisma.webhookLog.deleteMany();
      await prisma.webhook.deleteMany({ where: { userId: user1.id } });

      // Insert the dispatch webhook directly via Prisma (bypasses SSRF validation
      // intentionally — dispatch tests need a real local server to receive deliveries)
      dispatchWebhookSecret = crypto.randomBytes(32).toString('hex');
      const created = await prisma.webhook.create({
        data: {
          userId: user1.id,
          url: `http://127.0.0.1:${testServerPort}/dispatch`,
          events: ['task.created'],
          secret: dispatchWebhookSecret,
        },
      });
      dispatchWebhookId = created.id;

      // Clear any previously received requests
      receivedRequests = [];
    });

    it('should deliver webhook when a subscribed event fires', async () => {
      // Create a task (triggers task.created event)
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', user1.cookie)
        .send({ title: 'Webhook dispatch test task', projectId });

      expect(taskRes.status).toBe(201);

      // Wait for fire-and-forget delivery
      await new Promise((r) => setTimeout(r, 500));

      // The test server should have received the webhook POST
      expect(receivedRequests.length).toBeGreaterThanOrEqual(1);

      const delivery = receivedRequests[receivedRequests.length - 1];
      expect(delivery.parsed).toBeDefined();
      expect(delivery.parsed.event).toBe('task.created');
      expect(delivery.parsed.timestamp).toBeDefined();
      expect(delivery.parsed.data).toBeDefined();
      expect(delivery.parsed.data.title).toBe('Webhook dispatch test task');
    });

    it('should include correct X-Webhook-Event header', async () => {
      const delivery = receivedRequests[receivedRequests.length - 1];
      expect(delivery.headers['x-webhook-event']).toBe('task.created');
    });

    it('should include valid HMAC-SHA256 signature', async () => {
      const delivery = receivedRequests[receivedRequests.length - 1];
      const signature = delivery.headers['x-webhook-signature'] as string;

      expect(signature).toBeDefined();

      const expectedSignature = crypto
        .createHmac('sha256', dispatchWebhookSecret)
        .update(delivery.body)
        .digest('hex');

      expect(signature).toBe(expectedSignature);
    });

    it('should NOT deliver webhook for non-subscribed events', async () => {
      // The webhook only subscribes to task.created, not task.updated
      const requestCountBefore = receivedRequests.length;

      // Get existing task to update
      const tasksRes = await request(app)
        .get('/api/tasks')
        .set('Cookie', user1.cookie);
      const taskId = tasksRes.body.data
        ? tasksRes.body.data[0].id
        : tasksRes.body[0].id;

      // Update the task (triggers task.updated, which we did NOT subscribe to)
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', user1.cookie)
        .send({ title: 'Updated title for non-subscribed test' });

      // Wait for any potential delivery
      await new Promise((r) => setTimeout(r, 500));

      // Request count should NOT have increased
      expect(receivedRequests.length).toBe(requestCountBefore);
    });

    it('should create a delivery log entry on successful dispatch', async () => {
      const logs = await prisma.webhookLog.findMany({
        where: { webhookId: dispatchWebhookId },
        orderBy: { createdAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      const latestLog = logs[0];
      expect(latestLog.event).toBe('task.created');
      expect(latestLog.statusCode).toBe(200);
      expect(latestLog.error).toBeNull();
    });

    it('should include a deliveryId in the WebhookLog entry', async () => {
      const logs = await prisma.webhookLog.findMany({
        where: { webhookId: dispatchWebhookId },
        orderBy: { createdAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      const latestLog = logs[0];
      expect(latestLog.deliveryId).toBeDefined();
      expect(typeof latestLog.deliveryId).toBe('string');
      // Should be a valid UUID format
      expect(latestLog.deliveryId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should include deliveryId in the webhook payload body', async () => {
      const delivery = receivedRequests[receivedRequests.length - 1];
      expect(delivery.parsed).toBeDefined();
      expect(delivery.parsed.deliveryId).toBeDefined();
      expect(typeof delivery.parsed.deliveryId).toBe('string');
      expect(delivery.parsed.deliveryId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should have unique deliveryIds across separate deliveries', async () => {
      // Create another task to trigger a second delivery
      await request(app)
        .post('/api/tasks')
        .set('Cookie', user1.cookie)
        .send({ title: 'Second delivery dedup test task', projectId });

      await new Promise((r) => setTimeout(r, 500));

      const logs = await prisma.webhookLog.findMany({
        where: { webhookId: dispatchWebhookId },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });

      expect(logs.length).toBe(2);
      expect(logs[0].deliveryId).not.toBe(logs[1].deliveryId);
    });

    it('should not deliver to inactive webhooks', async () => {
      // Deactivate the webhook
      await request(app)
        .put(`/api/webhooks/${dispatchWebhookId}`)
        .set('Cookie', user1.cookie)
        .send({ active: false });

      const requestCountBefore = receivedRequests.length;

      // Create another task
      await request(app)
        .post('/api/tasks')
        .set('Cookie', user1.cookie)
        .send({ title: 'Should not trigger webhook', projectId });

      await new Promise((r) => setTimeout(r, 500));

      // No new requests should have arrived
      expect(receivedRequests.length).toBe(requestCountBefore);

      // Re-activate for any further tests
      await request(app)
        .put(`/api/webhooks/${dispatchWebhookId}`)
        .set('Cookie', user1.cookie)
        .send({ active: true });
    });
  });

  // -------------------------------------------------------
  // 4. Delivery Logs
  // -------------------------------------------------------
  describe('Delivery Logs', () => {
    it('should return delivery logs for a webhook via GET /api/webhooks/:id/logs', async () => {
      // Get user1's webhook
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const webhookId = listRes.body[0].id;

      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/logs`)
        .set('Cookie', user1.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have at least one log from the dispatch tests
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('event');
      expect(res.body[0]).toHaveProperty('webhookId');
      expect(res.body[0]).toHaveProperty('createdAt');
    });

    it('should require authentication for delivery logs (401)', async () => {
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const webhookId = listRes.body[0].id;

      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/logs`);

      expect(res.status).toBe(401);
    });

    it('should deny access to another user\'s webhook logs (403)', async () => {
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const webhookId = listRes.body[0].id;

      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/logs`)
        .set('Cookie', user2.cookie);

      expect(res.status).toBe(403);
    });

    it('should return 404 for logs of non-existent webhook', async () => {
      const res = await request(app)
        .get('/api/webhooks/00000000-0000-0000-0000-000000000000/logs')
        .set('Cookie', user1.cookie);

      expect(res.status).toBe(404);
    });

    it('should order logs by most recent first', async () => {
      const listRes = await request(app)
        .get('/api/webhooks')
        .set('Cookie', user1.cookie);
      const webhookId = listRes.body[0].id;

      const res = await request(app)
        .get(`/api/webhooks/${webhookId}/logs`)
        .set('Cookie', user1.cookie);

      expect(res.status).toBe(200);
      if (res.body.length >= 2) {
        const first = new Date(res.body[0].createdAt).getTime();
        const second = new Date(res.body[1].createdAt).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });
  });

  // -------------------------------------------------------
  // 5. Log Retention (90-day cleanup)
  // -------------------------------------------------------
  describe('Log Retention', () => {
    let retentionWebhookId: string;

    beforeAll(async () => {
      // Clean up all webhooks and logs, create a fresh webhook for this suite
      await prisma.webhookLog.deleteMany();
      await prisma.webhook.deleteMany({ where: { userId: user1.id } });

      // Insert the retention webhook directly via Prisma (bypasses SSRF validation
      // intentionally — this test needs a local server to receive deliveries)
      const retentionSecret = crypto.randomBytes(32).toString('hex');
      const created = await prisma.webhook.create({
        data: {
          userId: user1.id,
          url: `http://127.0.0.1:${testServerPort}/retention`,
          events: ['task.created'],
          secret: retentionSecret,
        },
      });
      retentionWebhookId = created.id;
      receivedRequests = [];
    });

    it('should delete logs older than 90 days after a new delivery', async () => {
      // Insert 3 old log entries with createdAt > 90 days ago
      const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      await prisma.webhookLog.createMany({
        data: [
          { webhookId: retentionWebhookId, event: 'task.created', statusCode: 200, createdAt: oldDate },
          { webhookId: retentionWebhookId, event: 'task.created', statusCode: 200, createdAt: oldDate },
          { webhookId: retentionWebhookId, event: 'task.created', error: 'timeout', createdAt: oldDate },
        ],
      });

      // Verify the old logs are in the DB before triggering a delivery
      const beforeCount = await prisma.webhookLog.count({ where: { webhookId: retentionWebhookId } });
      expect(beforeCount).toBe(3);

      // Trigger a new delivery by creating a task (fires task.created)
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', user1.cookie)
        .send({ title: 'Retention test task', projectId });
      expect(taskRes.status).toBe(201);

      // Wait for the fire-and-forget delivery AND the async cleanup to complete
      await new Promise((r) => setTimeout(r, 1000));

      // Old logs (>90 days) should have been deleted; only the new log remains
      const remainingLogs = await prisma.webhookLog.findMany({
        where: { webhookId: retentionWebhookId },
        orderBy: { createdAt: 'desc' },
      });

      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const oldLogsRemaining = remainingLogs.filter((l) => l.createdAt < cutoff);
      expect(oldLogsRemaining).toHaveLength(0);

      // The new delivery log should be present
      expect(remainingLogs.length).toBeGreaterThanOrEqual(1);
      expect(remainingLogs[0].event).toBe('task.created');
    });
  });
});
