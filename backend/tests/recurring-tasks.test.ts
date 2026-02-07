import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';
import { calculateNextOccurrence } from '../src/lib/recurrence';

const prisma = new PrismaClient();

// Helper: extract auth cookie from response
function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.startsWith('auth_token='));
}

jest.setTimeout(30000);

let alice: { cookie: string; id: string };
let bob: { cookie: string; id: string };
let project: { id: string };
let task: { id: string };

beforeAll(async () => {
  // Clear database
  await prisma.recurringTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const aliceRes = await request(app).post('/api/auth/register').send({
    email: 'alice@recurring.test',
    password: 'Pass1234',
    name: 'Alice',
  });
  alice = {
    cookie: extractAuthCookie(aliceRes)!,
    id: aliceRes.body.user.id,
  };

  const bobRes = await request(app).post('/api/auth/register').send({
    email: 'bob@recurring.test',
    password: 'Pass1234',
    name: 'Bob',
  });
  bob = {
    cookie: extractAuthCookie(bobRes)!,
    id: bobRes.body.user.id,
  };

  // Create a project (alice is OWNER)
  const projectRes = await request(app)
    .post('/api/projects')
    .set('Cookie', alice.cookie)
    .send({ name: 'Recurring Project', description: 'For testing' });
  project = { id: projectRes.body.id };

  // Create a base task
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Cookie', alice.cookie)
    .send({
      title: 'Weekly Report',
      description: 'Submit weekly report',
      projectId: project.id,
      priority: 'HIGH',
    });
  task = { id: taskRes.body.id };
});

afterAll(async () => {
  await prisma.recurringTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('POST /api/recurring-tasks', () => {
  it('creates a daily recurring task → 201', async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('DAILY');
    expect(res.body.interval).toBe(1);
    expect(res.body.baseTaskId).toBe(task.id);
    expect(res.body.projectId).toBe(project.id);
  });

  it('creates a weekly recurring task with specific days → 201', async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'WEEKLY',
        interval: 1,
        daysOfWeek: '1,3,5',
        startDate: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('WEEKLY');
    expect(res.body.daysOfWeek).toBe('1,3,5');
  });

  it('creates a monthly recurring task → 201', async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'MONTHLY',
        interval: 1,
        dayOfMonth: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('MONTHLY');
    expect(res.body.dayOfMonth).toBe(15);
    expect(res.body.endDate).toBeTruthy();
  });

  it('rejects creation if base task not found → 404', async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: '00000000-0000-0000-0000-000000000000',
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });

    expect(res.status).toBe(404);
  });

  it('rejects creation by user without project access → 403', async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', bob.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });

    expect(res.status).toBe(403);
  });

  it('validates interval must be >= 1 → 400', async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 0,
        startDate: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/recurring-tasks', () => {
  it('lists user\'s recurring tasks → 200', async () => {
    const res = await request(app)
      .get('/api/recurring-tasks')
      .set('Cookie', alice.cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns empty array for user with no access → 200', async () => {
    const res = await request(app)
      .get('/api/recurring-tasks')
      .set('Cookie', bob.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/recurring-tasks/:id', () => {
  let recurringId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 2,
        startDate: new Date().toISOString(),
      });
    recurringId = res.body.id;
  });

  it('gets recurring task by id → 200', async () => {
    const res = await request(app)
      .get(`/api/recurring-tasks/${recurringId}`)
      .set('Cookie', alice.cookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(recurringId);
    expect(res.body.interval).toBe(2);
  });

  it('rejects access by user without project membership → 403', async () => {
    const res = await request(app)
      .get(`/api/recurring-tasks/${recurringId}`)
      .set('Cookie', bob.cookie);

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app)
      .get('/api/recurring-tasks/00000000-0000-0000-0000-000000000000')
      .set('Cookie', alice.cookie);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/recurring-tasks/:id', () => {
  it('deletes recurring task by creator → 204', async () => {
    // Create one to delete
    const createRes = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });
    const recurringId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/recurring-tasks/${recurringId}`)
      .set('Cookie', alice.cookie);

    expect(res.status).toBe(204);

    // Verify deleted
    const check = await request(app)
      .get(`/api/recurring-tasks/${recurringId}`)
      .set('Cookie', alice.cookie);
    expect(check.status).toBe(404);
  });

  it('rejects deletion by user without access → 403', async () => {
    // Create one to try to delete
    const createRes = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });
    const recurringId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/recurring-tasks/${recurringId}`)
      .set('Cookie', bob.cookie);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/recurring-tasks/:id/generate', () => {
  it('manually generates next task occurrence → 201', async () => {
    // Create a fresh recurring task for this test
    const createRes = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });
    const recurringId = createRes.body.id;

    const res = await request(app)
      .post(`/api/recurring-tasks/${recurringId}/generate`)
      .set('Cookie', alice.cookie);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Weekly Report');
    expect(res.body.isRecurring).toBe(true);
    expect(res.body.recurringTaskId).toBe(recurringId);
    expect(res.body.status).toBe('TODO');
  });

  it('rejects generation by user without access → 403', async () => {
    const createRes = await request(app)
      .post('/api/recurring-tasks')
      .set('Cookie', alice.cookie)
      .send({
        baseTaskId: task.id,
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date().toISOString(),
      });
    const recurringId = createRes.body.id;

    const res = await request(app)
      .post(`/api/recurring-tasks/${recurringId}/generate`)
      .set('Cookie', bob.cookie);

    expect(res.status).toBe(403);
  });
});

describe('Recurrence Logic', () => {
  it('calculates next daily occurrence correctly', () => {
    const start = new Date('2026-01-01T10:00:00Z');
    const next = calculateNextOccurrence(start, {
      frequency: 'DAILY',
      interval: 1,
    });

    expect(next.toISOString()).toBe('2026-01-02T10:00:00.000Z');
  });

  it('calculates next weekly occurrence with specific days', () => {
    const start = new Date('2026-01-01T10:00:00Z'); // Thursday
    const next = calculateNextOccurrence(start, {
      frequency: 'WEEKLY',
      interval: 1,
      daysOfWeek: '5', // Friday
    });

    expect(next.getDay()).toBe(5); // Friday
    expect(next > start).toBe(true);
  });

  it('calculates next monthly occurrence', () => {
    const start = new Date('2026-01-15T10:00:00Z');
    const next = calculateNextOccurrence(start, {
      frequency: 'MONTHLY',
      interval: 1,
      dayOfMonth: 15,
    });

    expect(next.toISOString()).toBe('2026-02-15T10:00:00.000Z');
  });

  it('handles monthly occurrence with day > days in month', () => {
    const start = new Date('2026-01-31T10:00:00Z');
    const next = calculateNextOccurrence(start, {
      frequency: 'MONTHLY',
      interval: 1,
      dayOfMonth: 31,
    });

    // February only has 28 days in 2026
    expect(next.getMonth()).toBe(1); // February (0-indexed)
    expect(next.getDate()).toBe(28);
  });
});
