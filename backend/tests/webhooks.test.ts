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
    // Clean DB in correct order (respecting FK constraints)
    await prisma.webhookLog.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.recurringTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Register user1
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'wh-user1@test.com', password: 'Password1', name: 'Webhook User1' });
    user1 = {
      id: user1Res.body.user.id,
      email: 'wh-user1@test.com',
      cookie: extractAuthCookie(user1Res)!,
    };

    // Register user2
    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'wh-user2@test.com', password: 'Password1', name: 'Webhook User2' });
    user2 = {
      id: user2Res.body.user.id,
      email: 'wh-user2@test.com',
      cookie: extractAuthCookie(user2Res)!,
    };

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

    // Clean DB
    await prisma.webhookLog.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.recurringTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
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
          url: `http://127.0.0.1:${testServerPort}/hook`,
          events: ['task.created', 'task.updated'],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('secret');
      expect(typeof res.body.secret).toBe('string');
      expect(res.body.secret.length).toBeGreaterThan(0);
      expect(res.body.url).toBe(`http://127.0.0.1:${testServerPort}/hook`);
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
      expect(webhook.url).toBe(`http://127.0.0.1:${testServerPort}/hook`);
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
          url: `http://127.0.0.1:${testServerPort}/updated-hook`,
          events: ['task.created'],
          active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.url).toBe(`http://127.0.0.1:${testServerPort}/updated-hook`);
      expect(res.body.events).toEqual(['task.created']);
      expect(res.body.active).toBe(false);
    });

    it('should re-activate webhook for later tests', async () => {
      const res = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Cookie', user1.cookie)
        .send({
          url: `http://127.0.0.1:${testServerPort}/hook`,
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

      const res = await request(app)
        .post('/api/webhooks')
        .set('Cookie', user1.cookie)
        .send({
          url: `http://127.0.0.1:${testServerPort}/dispatch`,
          events: ['task.created'],
        });

      dispatchWebhookId = res.body.id;
      dispatchWebhookSecret = res.body.secret;

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
});
