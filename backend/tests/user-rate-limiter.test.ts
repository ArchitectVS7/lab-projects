/**
 * Per-user rate limiter tests.
 *
 * Enables TEST_RATE_LIMITER so the limiter is not skipped in test env.
 * Registers a user, logs in to obtain an auth cookie, then fires 301 requests
 * against a lightweight authenticated endpoint and asserts the 301st gets a 429.
 */
import request from 'supertest';
import prisma from '../src/lib/prisma';

// Must be set BEFORE importing app so the limiter is not skipped.
process.env.TEST_RATE_LIMITER = 'true';

// Imported after env var is set.
// eslint-disable-next-line import/first
import app from '../src/app';

const TEST_EMAIL = 'user-rate-limit@example.com';
const TEST_PASSWORD = 'Str0ngP@ssword!';
const TEST_NAME = 'Rate Limit Test User';

describe('Per-user rate limiter', () => {
  let authCookie: string;

  beforeAll(async () => {
    // Clean up any leftover record from a previous run.
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

    // Register a new user.
    await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME })
      .expect(201);

    // Log in to obtain an auth cookie.
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'] as string | string[];
    const arr = Array.isArray(cookies) ? cookies : [cookies];
    const cookie = arr.find((c: string) => c.trim().startsWith('auth_token='));
    if (!cookie) throw new Error('auth_token cookie not found in login response');
    authCookie = cookie;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    delete process.env.TEST_RATE_LIMITER;
    await prisma.$disconnect();
  });

  it('allows first 300 requests and blocks the 301st with 429', async () => {
    // Fire 300 requests — all should be allowed (status 200).
    for (let i = 0; i < 300; i++) {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      // Any non-429 status is acceptable here (200, 401 edge-cases, etc.).
      expect(res.status).not.toBe(429);
    }

    // The 301st request must be rejected with 429.
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/rate limit|429|too many/i);
  }, 60_000); // generous timeout for 301 sequential requests
});
