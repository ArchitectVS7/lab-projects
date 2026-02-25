import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

// Helper: extract auth cookie from response
function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

// Helper: register a user and return auth cookie
async function registerAndLogin(email: string, password = 'Password1', name = 'Test User'): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name });
  const cookie = extractAuthCookie(res);
  if (!cookie) throw new Error('Failed to get auth cookie during registration');
  return cookie;
}

describe('Daily Check-ins API', () => {
  let authCookie: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up related records before deleting users
    await prisma.dailyCheckin.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: { in: ['checkin-test@example.com', 'checkin-unauth@example.com'] } } });

    authCookie = await registerAndLogin('checkin-test@example.com');

    const user = await prisma.user.findUnique({ where: { email: 'checkin-test@example.com' } });
    userId = user!.id;
  });

  afterAll(async () => {
    await prisma.dailyCheckin.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: { in: ['checkin-test@example.com', 'checkin-unauth@example.com'] } } });
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // POST /api/checkins
  // -------------------------------------------------------
  describe('POST /api/checkins', () => {
    it('creates a check-in and returns 200', async () => {
      // Clean up any existing check-in for today
      const today = new Date(new Date().toISOString().slice(0, 10));
      await prisma.dailyCheckin.deleteMany({ where: { userId, date: today } });

      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: '1. Ship feature\n2. Review PRs', energyLevel: 7 });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.priorities).toBe('1. Ship feature\n2. Review PRs');
      expect(res.body.energyLevel).toBe(7);
      expect(res.body.focusDomains).toEqual([]);
      expect(res.body.blockers).toBeNull();
    });

    it('upserts on same day - idempotent, still returns 200', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: 'Updated priorities', energyLevel: 8, blockers: 'Meeting overload' });

      expect(res.status).toBe(200);
      expect(res.body.priorities).toBe('Updated priorities');
      expect(res.body.energyLevel).toBe(8);
      expect(res.body.blockers).toBe('Meeting overload');
    });

    it('creates check-in with focusDomains array', async () => {
      const today = new Date(new Date().toISOString().slice(0, 10));
      await prisma.dailyCheckin.deleteMany({ where: { userId, date: today } });

      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: 'Focus on domains', energyLevel: 6, focusDomains: ['domain-id-1', 'domain-id-2'] });

      expect(res.status).toBe(200);
      expect(res.body.focusDomains).toEqual(['domain-id-1', 'domain-id-2']);
    });
  });

  // -------------------------------------------------------
  // GET /api/checkins/today
  // -------------------------------------------------------
  describe('GET /api/checkins/today', () => {
    it('returns today\'s check-in', async () => {
      const res = await request(app)
        .get('/api/checkins/today')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(userId);
    });
  });

  // -------------------------------------------------------
  // GET /api/checkins/streak
  // -------------------------------------------------------
  describe('GET /api/checkins/streak', () => {
    it('returns streak count', async () => {
      const res = await request(app)
        .get('/api/checkins/streak')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(typeof res.body.streak).toBe('number');
      expect(res.body.streak).toBeGreaterThanOrEqual(1);
      expect(res.body.lastCheckin).toBeDefined();
    });
  });

  // -------------------------------------------------------
  // GET /api/checkins
  // -------------------------------------------------------
  describe('GET /api/checkins', () => {
    it('lists check-ins with pagination', async () => {
      const res = await request(app)
        .get('/api/checkins?limit=10&offset=0')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.checkins)).toBe(true);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('filters by date range', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/checkins?startDate=${today}&endDate=${today}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.checkins)).toBe(true);
    });
  });

  // -------------------------------------------------------
  // DELETE /api/checkins/:id
  // -------------------------------------------------------
  describe('DELETE /api/checkins/:id', () => {
    it('deletes a check-in', async () => {
      // Create a separate check-in to delete by inserting directly
      const yesterday = new Date(new Date().toISOString().slice(0, 10));
      yesterday.setDate(yesterday.getDate() - 1);

      const created = await prisma.dailyCheckin.upsert({
        where: { userId_date: { userId, date: yesterday } },
        create: { userId, date: yesterday, priorities: 'To delete', energyLevel: 5, focusDomains: [] },
        update: { priorities: 'To delete', energyLevel: 5 },
      });

      const res = await request(app)
        .delete(`/api/checkins/${created.id}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(204);

      // Verify deleted
      const check = await prisma.dailyCheckin.findUnique({ where: { id: created.id } });
      expect(check).toBeNull();
    });
  });

  // -------------------------------------------------------
  // GET /api/checkins/today - when none exists
  // -------------------------------------------------------
  describe('GET /api/checkins/today - no check-in', () => {
    it('returns 404 when no check-in for today', async () => {
      // Register a fresh user with no check-ins
      const freshCookie = await registerAndLogin('checkin-nodata@example.com');

      const res = await request(app)
        .get('/api/checkins/today')
        .set('Cookie', freshCookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No check-in for today');

      // Cleanup
      await prisma.user.deleteMany({ where: { email: 'checkin-nodata@example.com' } });
    });
  });

  // -------------------------------------------------------
  // Auth checks
  // -------------------------------------------------------
  describe('Unauthenticated requests', () => {
    it('POST /api/checkins without auth returns 401', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .send({ priorities: 'Test', energyLevel: 5 });

      expect(res.status).toBe(401);
    });

    it('GET /api/checkins without auth returns 401', async () => {
      const res = await request(app).get('/api/checkins');
      expect(res.status).toBe(401);
    });

    it('GET /api/checkins/today without auth returns 401', async () => {
      const res = await request(app).get('/api/checkins/today');
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // Zod validation
  // -------------------------------------------------------
  describe('Validation', () => {
    it('rejects energyLevel > 10 with 400', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: 'Test', energyLevel: 11 });

      expect(res.status).toBe(400);
    });

    it('rejects energyLevel < 1 with 400', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: 'Test', energyLevel: 0 });

      expect(res.status).toBe(400);
    });

    it('rejects empty priorities with 400', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: '', energyLevel: 5 });

      expect(res.status).toBe(400);
    });

    it('rejects missing energyLevel with 400', async () => {
      const res = await request(app)
        .post('/api/checkins')
        .set('Cookie', authCookie)
        .send({ priorities: 'Test' });

      expect(res.status).toBe(400);
    });
  });
});
