import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

// Helper: extract auth cookie from response
function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.startsWith('auth_token='));
}

// Helper: parse cookie attributes
function parseCookie(cookieStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  cookieStr.split(';').forEach((part, i) => {
    const [key, val] = part.trim().split('=');
    if (i === 0) {
      attrs['name'] = key;
      attrs['value'] = val;
    } else {
      attrs[key.toLowerCase().trim()] = val ?? 'true';
    }
  });
  return attrs;
}

describe('Phase 1: Authentication', () => {
  // Clean DB before all auth tests
  beforeAll(async () => {
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // POST /api/auth/register
  // -------------------------------------------------------
  describe('POST /api/auth/register', () => {
    it('registers with valid data → 201, user returned, cookie set', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.avatarUrl).toBeNull();
      expect(res.body.user.createdAt).toBeDefined();
      // Must NOT return passwordHash
      expect(res.body.user.passwordHash).toBeUndefined();

      // Cookie must be set
      const cookie = extractAuthCookie(res);
      expect(cookie).toBeDefined();
    });

    it('sets cookie with correct attributes (httpOnly, path)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'cookie-test@example.com', password: 'Password1', name: 'Cookie Test' });

      const cookie = extractAuthCookie(res);
      expect(cookie).toBeDefined();
      const attrs = parseCookie(cookie!);
      expect(attrs['httponly']).toBe('true');
      expect(attrs['path']).toBe('/');
    });

    it('normalizes email to lowercase', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'UPPER@Example.COM', password: 'Password1', name: 'Upper User' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('upper@example.com');
    });

    it('rejects duplicate email → 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Password1', name: 'Duplicate' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('rejects invalid email → 400 Zod error', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'Password1', name: 'Bad Email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.some((d: { field: string }) => d.field === 'email')).toBe(true);
    });

    it('rejects password without uppercase → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak1@example.com', password: 'password1', name: 'Weak Pass' });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: { message: string }) =>
        d.message.includes('uppercase')
      )).toBe(true);
    });

    it('rejects password without lowercase → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak2@example.com', password: 'PASSWORD1', name: 'Weak Pass' });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: { message: string }) =>
        d.message.includes('lowercase')
      )).toBe(true);
    });

    it('rejects password without digit → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak3@example.com', password: 'Passwordx', name: 'Weak Pass' });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: { message: string }) =>
        d.message.includes('digit')
      )).toBe(true);
    });

    it('rejects password shorter than 8 chars → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak4@example.com', password: 'Pass1', name: 'Weak Pass' });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: { message: string }) =>
        d.message.includes('8 characters')
      )).toBe(true);
    });

    it('rejects name shorter than 2 chars → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'shortname@example.com', password: 'Password1', name: 'A' });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: { field: string }) => d.field === 'name')).toBe(true);
    });

    it('rejects missing fields → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------
  // POST /api/auth/login
  // -------------------------------------------------------
  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials → 200, user returned with createdAt, cookie set', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.createdAt).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();

      const cookie = extractAuthCookie(res);
      expect(cookie).toBeDefined();
    });

    it('normalizes email on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'TEST@Example.COM', password: 'Password1' });

      expect(res.status).toBe(200);
    });

    it('rejects wrong password → 401, generic message (no user enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('rejects non-existent email → 401, same generic message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password1' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('rejects invalid email format → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email', password: 'Password1' });

      expect(res.status).toBe(400);
    });

    it('rejects empty password → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: '' });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------
  // POST /api/auth/logout
  // -------------------------------------------------------
  describe('POST /api/auth/logout', () => {
    it('clears the auth cookie → 200', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout successful');

      // Cookie should be cleared (maxAge=0 or expires in the past)
      const cookie = extractAuthCookie(res);
      expect(cookie).toBeDefined();
      // The cleared cookie should have an expiry in the past or max-age=0
      const attrs = parseCookie(cookie!);
      const hasExpiredOrZero =
        attrs['max-age'] === '0' ||
        (attrs['expires'] && new Date(attrs['expires']) < new Date());
      expect(hasExpiredOrZero).toBe(true);
    });
  });

  // -------------------------------------------------------
  // GET /api/auth/me
  // -------------------------------------------------------
  describe('GET /api/auth/me', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });
      authCookie = extractAuthCookie(loginRes)!;
    });

    it('returns current user with valid cookie → 200', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('returns 401 without any cookie or token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'auth_token=invalid-garbage-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    it('supports Bearer token in Authorization header', async () => {
      // Extract the raw token value from the cookie
      const tokenMatch = authCookie.match(/auth_token=([^;]+)/);
      expect(tokenMatch).toBeDefined();
      const token = tokenMatch![1];

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
    });
  });

  // -------------------------------------------------------
  // POST /api/auth/refresh
  // -------------------------------------------------------
  describe('POST /api/auth/refresh', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });
      authCookie = extractAuthCookie(loginRes)!;
    });

    it('refreshes token → 200, new cookie set, and new cookie works for /me', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Token refreshed');

      const newCookie = extractAuthCookie(res);
      expect(newCookie).toBeDefined();

      // Verify the refreshed cookie is usable for authenticated requests
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', newCookie!);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('test@example.com');
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // PUT /api/auth/profile
  // -------------------------------------------------------
  describe('PUT /api/auth/profile', () => {
    let authCookie: string;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });
      authCookie = extractAuthCookie(loginRes)!;
    });

    it('updates name → 200, returns updated user', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', authCookie)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('updates avatarUrl → 200', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', authCookie)
        .send({ avatarUrl: 'https://example.com/avatar.png' });

      expect(res.status).toBe(200);
      expect(res.body.user.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('clears avatarUrl with null → 200', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', authCookie)
        .send({ avatarUrl: null });

      expect(res.status).toBe(200);
      expect(res.body.user.avatarUrl).toBeNull();
    });

    it('rejects invalid avatarUrl → 400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', authCookie)
        .send({ avatarUrl: 'not-a-url' });

      expect(res.status).toBe(400);
    });

    it('rejects name shorter than 2 chars → 400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', authCookie)
        .send({ name: 'A' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ name: 'Hacker' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // PUT /api/auth/password
  // -------------------------------------------------------
  describe('PUT /api/auth/password', () => {
    let authCookie: string;

    beforeAll(async () => {
      // Reset name back for clarity
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });
      authCookie = extractAuthCookie(loginRes)!;
    });

    it('changes password with correct current → 200', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Cookie', authCookie)
        .send({ currentPassword: 'Password1', newPassword: 'NewPassword2' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password updated successfully');

      // Verify new password works for login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'NewPassword2' });
      expect(loginRes.status).toBe(200);

      // Verify old password no longer works
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' });
      expect(oldLoginRes.status).toBe(401);
    });

    it('rejects wrong current password → 401', async () => {
      // Re-login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'NewPassword2' });
      authCookie = extractAuthCookie(loginRes)!;

      const res = await request(app)
        .put('/api/auth/password')
        .set('Cookie', authCookie)
        .send({ currentPassword: 'WrongCurrent1', newPassword: 'AnotherPassword3' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Current password is incorrect');
    });

    it('rejects weak new password → 400', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .set('Cookie', authCookie)
        .send({ currentPassword: 'NewPassword2', newPassword: 'weak' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .put('/api/auth/password')
        .send({ currentPassword: 'x', newPassword: 'Password1' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // Cross-cutting concerns
  // -------------------------------------------------------
  describe('Cross-cutting auth concerns', () => {
    it('never leaks passwordHash in any response', async () => {
      // Register
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'leak-check@example.com', password: 'Password1', name: 'Leak Check' });
      expect(regRes.body.user.passwordHash).toBeUndefined();
      expect(regRes.body.user.password_hash).toBeUndefined();

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'leak-check@example.com', password: 'Password1' });
      expect(loginRes.body.user.passwordHash).toBeUndefined();
      expect(loginRes.body.user.password_hash).toBeUndefined();

      // Me
      const cookie = extractAuthCookie(loginRes)!;
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);
      expect(meRes.body.user.passwordHash).toBeUndefined();
      expect(meRes.body.user.password_hash).toBeUndefined();

      // Profile update
      const profRes = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', cookie)
        .send({ name: 'Leak Check Updated' });
      expect(profRes.body.user.passwordHash).toBeUndefined();
      expect(profRes.body.user.password_hash).toBeUndefined();
    });

    it('user object always includes id, email, name, avatarUrl', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'leak-check@example.com', password: 'Password1' });

      const user = res.body.user;
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect('avatarUrl' in user).toBe(true);
    });
  });
});
