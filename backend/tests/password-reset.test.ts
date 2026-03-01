import request from 'supertest';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

const TEST_EMAIL = 'reset-test@example.com';
const TEST_PASSWORD = 'OldP@ss1secure';
const NEW_PASSWORD = 'NewP@ss1secure';

describe('Password Reset API', () => {
  let userId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Reset Tester' });
    expect(res.status).toBe(201);
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  // ---- forgot-password ----

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 for existing email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/If an account/i);
    });

    it('returns 200 for unknown email (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/If an account/i);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('stores a hashed token in the DB', async () => {
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.passwordResetTokenHash).toBeTruthy();
      expect(user?.passwordResetExpiresAt).toBeTruthy();
      expect(user!.passwordResetExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ---- validate-reset-token ----

  describe('GET /api/auth/validate-reset-token', () => {
    let validToken: string;

    beforeEach(async () => {
      // Generate a fresh plain token and store its hash
      validToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(validToken).digest('hex');
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    });

    it('returns 200 for a valid token', async () => {
      const res = await request(app)
        .get(`/api/auth/validate-reset-token?token=${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('returns 400 for an invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/validate-reset-token?token=invalidtoken');
      expect(res.status).toBe(400);
    });

    it('returns 400 when token is missing', async () => {
      const res = await request(app)
        .get('/api/auth/validate-reset-token');
      expect(res.status).toBe(400);
    });

    it('returns 400 for an expired token', async () => {
      // Set expiry in the past
      await prisma.user.update({
        where: { id: userId },
        data: { passwordResetExpiresAt: new Date(Date.now() - 1000) },
      });

      const res = await request(app)
        .get(`/api/auth/validate-reset-token?token=${validToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ---- reset-password ----

  describe('POST /api/auth/reset-password', () => {
    let validToken: string;

    beforeEach(async () => {
      validToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(validToken).digest('hex');
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
    });

    it('resets password and returns 200', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: NEW_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/reset successfully/i);
    });

    it('clears the reset token after use', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: NEW_PASSWORD });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.passwordResetTokenHash).toBeNull();
      expect(user?.passwordResetExpiresAt).toBeNull();
    });

    it('allows login with new password after reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: NEW_PASSWORD });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: NEW_PASSWORD });
      expect(loginRes.status).toBe(200);

      // Restore old password for subsequent tests
      const loginOldRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      expect(loginOldRes.status).toBe(401);
    });

    it('returns 400 for invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'badtoken', newPassword: NEW_PASSWORD });
      expect(res.status).toBe(400);
    });

    it('returns 400 for expired token', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordResetExpiresAt: new Date(Date.now() - 1000) },
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: NEW_PASSWORD });
      expect(res.status).toBe(400);
    });

    it('returns 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: 'weak' });
      expect(res.status).toBe(400);
    });

    it('token cannot be reused after reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: NEW_PASSWORD });

      // Try to use the same token again
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: validToken, newPassword: 'Anoth3r!SecurePass' });
      expect(res.status).toBe(400);
    });
  });

  // ---- E2E: forgot → validate → reset → login ----

  describe('E2E password reset flow', () => {
    it('completes full flow', async () => {
      // Step 1: request reset
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: TEST_EMAIL });
      expect(forgotRes.status).toBe(200);

      // Step 2: extract plain token from DB (simulate email click)
      const userRecord = await prisma.user.findUnique({ where: { id: userId } });
      expect(userRecord?.passwordResetTokenHash).toBeTruthy();

      // We need the plain token — generate from hash reversal is impossible,
      // so we set a known token directly for this test
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Step 3: validate token
      const validateRes = await request(app)
        .get(`/api/auth/validate-reset-token?token=${plainToken}`);
      expect(validateRes.status).toBe(200);
      expect(validateRes.body.valid).toBe(true);

      // Step 4: reset password
      const e2ePassword = 'E2eP@ss1secure';
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: plainToken, newPassword: e2ePassword });
      expect(resetRes.status).toBe(200);

      // Step 5: login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: e2ePassword });
      expect(loginRes.status).toBe(200);
      expect(extractAuthCookie(loginRes)).toBeTruthy();
    });
  });
});
