import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

describe('API Keys', () => {
  let user1Cookie: string;
  let user1Id: string;
  let user2Cookie: string;
  let user2Id: string;
  let user1ApiKey: string;
  let user1ApiKeyId: string;

  beforeAll(async () => {
    // Clean DB in dependency order
    await prisma.apiKey.deleteMany();
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
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'apikey-user1@test.com', password: 'Password1', name: 'API Key User 1' });
    user1Cookie = extractAuthCookie(res1)!;
    user1Id = res1.body.user.id;

    // Register user2
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'apikey-user2@test.com', password: 'Password1', name: 'API Key User 2' });
    user2Cookie = extractAuthCookie(res2)!;
    user2Id = res2.body.user.id;

    // Create an API key for user1 (used across several tests)
    const keyRes = await request(app)
      .post('/api/auth/api-keys')
      .set('Cookie', user1Cookie)
      .send({ name: 'Default Key' });
    user1ApiKey = keyRes.body.key;
    user1ApiKeyId = keyRes.body.id;
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany();
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

  // -----------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------
  describe('POST /api/auth/api-keys', () => {
    it('creates an API key and returns it with taskman_ prefix (201)', async () => {
      const res = await request(app)
        .post('/api/auth/api-keys')
        .set('Cookie', user1Cookie)
        .send({ name: 'My CI Key' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('My CI Key');
      expect(res.body.key).toBeDefined();
      expect(res.body.key).toMatch(/^taskman_/);
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.lastUsedAt).toBeNull();
      // Must NOT include keyHash in response
      expect(res.body.keyHash).toBeUndefined();
    });

    it('rejects missing name with 400', async () => {
      const res = await request(app)
        .post('/api/auth/api-keys')
        .set('Cookie', user1Cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('rejects empty name with 400', async () => {
      const res = await request(app)
        .post('/api/auth/api-keys')
        .set('Cookie', user1Cookie)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('requires authentication (401 without cookie)', async () => {
      const res = await request(app)
        .post('/api/auth/api-keys')
        .send({ name: 'No Auth Key' });

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------
  // LIST
  // -----------------------------------------------------------
  describe('GET /api/auth/api-keys', () => {
    it('returns the list of keys for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/auth/api-keys')
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // user1 created "Default Key" in beforeAll and "My CI Key" in create test
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Each key should have id, name, createdAt, lastUsedAt
      const firstKey = res.body[0];
      expect(firstKey.id).toBeDefined();
      expect(firstKey.name).toBeDefined();
      expect(firstKey.createdAt).toBeDefined();
      expect('lastUsedAt' in firstKey).toBe(true);

      // Must NOT include keyHash or key (plaintext)
      expect(firstKey.keyHash).toBeUndefined();
      expect(firstKey.key).toBeUndefined();
    });

    it('returns empty array for user with no keys', async () => {
      const res = await request(app)
        .get('/api/auth/api-keys')
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  // -----------------------------------------------------------
  // AUTH VIA API KEY
  // -----------------------------------------------------------
  describe('Authentication via X-API-Key header', () => {
    it('authenticates GET /api/auth/me with valid API key (200)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('X-API-Key', user1ApiKey);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(user1Id);
      expect(res.body.user.email).toBe('apikey-user1@test.com');
    });

    it('rejects an invalid API key (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('X-API-Key', 'taskman_aW52YWxpZDppbnZhbGlk');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid API key');
    });

    it('rejects a malformed (non-taskman_) key (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('X-API-Key', 'not-a-valid-key-format');

      // Without taskman_ prefix, falls through to JWT path and fails
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------
  // lastUsedAt
  // -----------------------------------------------------------
  describe('lastUsedAt tracking', () => {
    it('updates lastUsedAt after the key is used for authentication', async () => {
      // First verify lastUsedAt is null (key not used yet via the "Default Key")
      const listBefore = await request(app)
        .get('/api/auth/api-keys')
        .set('Cookie', user1Cookie);

      const keyBefore = listBefore.body.find((k: { id: string }) => k.id === user1ApiKeyId);
      // It may already have been used by a previous test, so we just record the value
      const lastUsedBefore = keyBefore?.lastUsedAt;

      // Use the API key to make an authenticated request
      await request(app)
        .get('/api/auth/me')
        .set('X-API-Key', user1ApiKey);

      // The lastUsedAt update is fire-and-forget, give it a moment
      await new Promise((resolve) => setTimeout(resolve, 200));

      const listAfter = await request(app)
        .get('/api/auth/api-keys')
        .set('Cookie', user1Cookie);

      const keyAfter = listAfter.body.find((k: { id: string }) => k.id === user1ApiKeyId);
      expect(keyAfter.lastUsedAt).not.toBeNull();

      // If it was null before, it should now be set
      if (lastUsedBefore === null) {
        expect(keyAfter.lastUsedAt).toBeDefined();
        expect(new Date(keyAfter.lastUsedAt).getTime()).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------
  // REVOKE (DELETE)
  // -----------------------------------------------------------
  describe('DELETE /api/auth/api-keys/:id', () => {
    let keyToDeleteId: string;
    let keyToDeletePlain: string;

    beforeAll(async () => {
      // Create a dedicated key for revocation tests
      const res = await request(app)
        .post('/api/auth/api-keys')
        .set('Cookie', user1Cookie)
        .send({ name: 'Revocable Key' });
      keyToDeleteId = res.body.id;
      keyToDeletePlain = res.body.key;
    });

    it('owner can revoke their own key (204)', async () => {
      const res = await request(app)
        .delete(`/api/auth/api-keys/${keyToDeleteId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(204);

      // Verify the key no longer appears in the list
      const listRes = await request(app)
        .get('/api/auth/api-keys')
        .set('Cookie', user1Cookie);

      const found = listRes.body.find((k: { id: string }) => k.id === keyToDeleteId);
      expect(found).toBeUndefined();
    });

    it('revoked key no longer authenticates (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('X-API-Key', keyToDeletePlain);

      expect(res.status).toBe(401);
    });

    it('another user cannot revoke someone else\'s key (403)', async () => {
      const res = await request(app)
        .delete(`/api/auth/api-keys/${user1ApiKeyId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('You can only revoke your own API keys');
    });

    it('returns 404 for non-existent key id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/auth/api-keys/${fakeId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API key not found');
    });
  });

  // -----------------------------------------------------------
  // RATE LIMIT / CONCURRENT REQUESTS
  // -----------------------------------------------------------
  describe('Multiple rapid requests with API key', () => {
    it('5 concurrent requests all succeed (rate limiter skips in test env)', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/auth/me')
          .set('X-API-Key', user1ApiKey)
      );

      const results = await Promise.all(requests);

      for (const res of results) {
        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe(user1Id);
      }
    });
  });
});
