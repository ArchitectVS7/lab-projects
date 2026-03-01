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

describe('Calendar Feed API', () => {
  let authCookie: string;
  let userId: string;
  let projectId: string;
  let taskWithDueId: string;
  let taskNoDueId: string;
  let taskDoneId: string;
  let feedToken: string;

  // Second user for isolation tests
  let otherCookie: string;
  let otherProjectId: string;
  let otherTaskId: string;

  beforeAll(async () => {
    // Clean up
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Register primary user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'cal-test@example.com', password: 'TestPass1@secure', name: 'Cal Tester' });
    expect(regRes.status).toBe(201);
    authCookie = extractAuthCookie(regRes)!;
    userId = regRes.body.user.id;

    // Create project + tasks
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Cal Project', color: '#6366f1' });
    expect(projRes.status).toBe(201);
    projectId = projRes.body.id;

    // Task with due date
    const t1 = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({ title: 'Task With Due', projectId, priority: 'HIGH', dueDate: '2026-03-15T00:00:00.000Z' });
    expect(t1.status).toBe(201);
    taskWithDueId = t1.body.id;

    // Task without due date
    const t2 = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({ title: 'Task No Due', projectId, priority: 'LOW' });
    expect(t2.status).toBe(201);
    taskNoDueId = t2.body.id;

    // Task DONE with due date
    const t3 = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({ title: 'Task Done', projectId, priority: 'MEDIUM', dueDate: '2026-03-10T00:00:00.000Z', status: 'DONE' });
    expect(t3.status).toBe(201);
    taskDoneId = t3.body.id;

    // Register second user with their own project/task
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'cal-other@example.com', password: 'TestPass1@secure', name: 'Other User' });
    expect(reg2.status).toBe(201);
    otherCookie = extractAuthCookie(reg2)!;

    const proj2 = await request(app)
      .post('/api/projects')
      .set('Cookie', otherCookie)
      .send({ name: 'Other Project', color: '#ef4444' });
    expect(proj2.status).toBe(201);
    otherProjectId = proj2.body.id;

    const t4 = await request(app)
      .post('/api/tasks')
      .set('Cookie', otherCookie)
      .send({ title: 'Other Task', projectId: otherProjectId, priority: 'URGENT', dueDate: '2026-04-01T00:00:00.000Z' });
    expect(t4.status).toBe(201);
    otherTaskId = t4.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- Token management ---

  it('POST /token returns 401 without auth', async () => {
    const res = await request(app).post('/api/calendar/token');
    expect(res.status).toBe(401);
  });

  it('POST /token generates token and returns token + feedUrl', async () => {
    const res = await request(app)
      .post('/api/calendar/token')
      .set('Cookie', authCookie);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token).toHaveLength(64); // 32 bytes hex
    expect(res.body.feedUrl).toContain('/api/calendar/feed.ics?token=');
    expect(res.body.feedUrl).toContain(res.body.token);
    feedToken = res.body.token;
  });

  it('GET /token/status returns hasToken: true after generation (feedUrl is null — plaintext not stored)', async () => {
    const res = await request(app)
      .get('/api/calendar/token/status')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.hasToken).toBe(true);
    expect(res.body.createdAt).toBeTruthy();
    // feedUrl is null because only the hash is persisted; the plaintext is only
    // returned in the POST /token creation response.
    expect(res.body.feedUrl).toBeNull();
  });

  // --- Token hashing security tests ---

  it('stored DB value is a SHA-256 hash, not the plaintext token', async () => {
    // feedToken was captured from the POST /token response above.
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { calendarToken: true },
    });
    expect(dbUser?.calendarToken).toBeDefined();
    // Plaintext 64-char hex token must NOT be stored verbatim.
    expect(dbUser?.calendarToken).not.toBe(feedToken);
    // The stored value must be the SHA-256 hex digest of the plaintext token.
    const expectedHash = crypto.createHash('sha256').update(feedToken).digest('hex');
    expect(dbUser?.calendarToken).toBe(expectedHash);
  });

  it('GET /feed.ics accepts valid plaintext token and returns iCal data', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.text).toContain('BEGIN:VCALENDAR');
  });

  it('GET /feed.ics rejects the stored hash directly (must use plaintext)', async () => {
    const storedHash = crypto.createHash('sha256').update(feedToken).digest('hex');
    const res = await request(app).get(`/api/calendar/feed.ics?token=${storedHash}`);
    // Presenting the hash itself (not the plaintext) must fail because the server
    // would hash it again, producing a different value.
    expect(res.status).toBe(401);
  });

  it('GET /feed.ics returns 401 for a completely invalid token', async () => {
    const res = await request(app).get('/api/calendar/feed.ics?token=notarealtoken');
    expect(res.status).toBe(401);
  });

  it('GET /token/status returns hasToken: false and no feedUrl for user without token', async () => {
    const res = await request(app)
      .get('/api/calendar/token/status')
      .set('Cookie', otherCookie);
    expect(res.status).toBe(200);
    expect(res.body.hasToken).toBe(false);
    expect(res.body.feedUrl).toBeNull();
  });

  // --- Feed endpoint ---

  it('GET /feed.ics returns 401 without token', async () => {
    const res = await request(app).get('/api/calendar/feed.ics');
    expect(res.status).toBe(401);
  });

  it('GET /feed.ics returns 401 with invalid token', async () => {
    const res = await request(app).get('/api/calendar/feed.ics?token=invalid-token');
    expect(res.status).toBe(401);
  });

  it('GET /feed.ics returns valid iCal with correct content-type', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.text).toContain('BEGIN:VCALENDAR');
    expect(res.text).toContain('END:VCALENDAR');
  });

  it('includes only tasks with dueDate', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(res.text).toContain('Task With Due');
    expect(res.text).not.toContain('Task No Due');
  });

  it('excludes DONE tasks by default', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(res.text).toContain('Task With Due');
    expect(res.text).not.toContain('Task Done');
  });

  it('includes DONE tasks with includeDone=true', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}&includeDone=true`);
    expect(res.text).toContain('Task With Due');
    expect(res.text).toContain('Task Done');
  });

  it('events have correct UID and SUMMARY', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(res.text).toContain(`task-${taskWithDueId}@taskman`);
    expect(res.text).toContain('SUMMARY:Task With Due');
  });

  it('only includes tasks from user projects (not other users)', async () => {
    const res = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(res.text).not.toContain('Other Task');
  });

  // --- Regenerate ---

  it('regenerating replaces old token (old feed URL stops working, new one shown in status)', async () => {
    const oldToken = feedToken;

    // Generate new token
    const regenRes = await request(app)
      .post('/api/calendar/token')
      .set('Cookie', authCookie);
    expect(regenRes.status).toBe(201);
    feedToken = regenRes.body.token;

    // Old token should fail
    const oldRes = await request(app).get(`/api/calendar/feed.ics?token=${oldToken}`);
    expect(oldRes.status).toBe(401);

    // New token should work
    const newRes = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(newRes.status).toBe(200);

    // Status endpoint should still show hasToken: true (feedUrl is null — plaintext not stored)
    const statusRes = await request(app)
      .get('/api/calendar/token/status')
      .set('Cookie', authCookie);
    expect(statusRes.body.hasToken).toBe(true);
    expect(statusRes.body.feedUrl).toBeNull();
  });

  // --- Revoke ---

  it('DELETE /token revokes token, old feed returns 401', async () => {
    const delRes = await request(app)
      .delete('/api/calendar/token')
      .set('Cookie', authCookie);
    expect(delRes.status).toBe(204);

    // Token should no longer work
    const feedRes = await request(app).get(`/api/calendar/feed.ics?token=${feedToken}`);
    expect(feedRes.status).toBe(401);

    // Status should show no token and null feedUrl
    const statusRes = await request(app)
      .get('/api/calendar/token/status')
      .set('Cookie', authCookie);
    expect(statusRes.body.hasToken).toBe(false);
    expect(statusRes.body.feedUrl).toBeNull();
  });

  // suppress unused variable warnings
  void userId;
  void taskNoDueId;
  void taskDoneId;
  void otherTaskId;
});
