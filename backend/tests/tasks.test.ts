/**
 * tasks.test.ts
 *
 * Focused security tests for task authorization checks.
 *
 * Verifies that:
 * - GET /api/tasks/:id returns 404 to non-members (no information leakage)
 * - GET /api/tasks/:id/activity returns 404 to non-members
 * - Legitimate project members can still access both endpoints
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.startsWith('auth_token='));
}

describe('Task Authorization Security', () => {
  let owner: { id: string; email: string; cookie: string };
  let member: { id: string; email: string; cookie: string };
  let nonMember: { id: string; email: string; cookie: string };

  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    // Clean DB
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.recurringTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'task-sec-owner@test.com', password: 'TestPass1@secure', name: 'Task Sec Owner' });
    owner = {
      id: ownerRes.body.user.id,
      email: 'task-sec-owner@test.com',
      cookie: extractAuthCookie(ownerRes)!,
    };

    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'task-sec-member@test.com', password: 'TestPass1@secure', name: 'Task Sec Member' });
    member = {
      id: memberRes.body.user.id,
      email: 'task-sec-member@test.com',
      cookie: extractAuthCookie(memberRes)!,
    };

    const nonMemberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'task-sec-nonmember@test.com', password: 'TestPass1@secure', name: 'Task Sec NonMember' });
    nonMember = {
      id: nonMemberRes.body.user.id,
      email: 'task-sec-nonmember@test.com',
      cookie: extractAuthCookie(nonMemberRes)!,
    };

    // Create project owned by owner, with member added
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', owner.cookie)
      .send({ name: 'Task Auth Test Project' });
    projectId = projRes.body.id;

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', owner.cookie)
      .send({ email: member.email, role: 'MEMBER' });

    // Create a task in that project
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', owner.cookie)
      .send({ title: 'Secure Task', projectId });
    taskId = taskRes.body.id;

    // Generate some activity by updating the task
    await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Cookie', owner.cookie)
      .send({ status: 'IN_PROGRESS' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // GET /api/tasks/:id - authorization bypass fix
  // -------------------------------------------------------
  describe('GET /api/tasks/:id', () => {
    it('owner can retrieve task → 200', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Cookie', owner.cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Secure Task');
    });

    it('project member can retrieve task → 200', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
    });

    it('non-member receives 404 (no information leakage) → 404', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Cookie', nonMember.cookie);

      // Must be 404, not 403, so task existence is not revealed
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------
  // GET /api/tasks/:id/activity - missing membership check fix
  // -------------------------------------------------------
  describe('GET /api/tasks/:id/activity', () => {
    it('owner can retrieve task activity → 200', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/activity`)
        .set('Cookie', owner.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('project member can retrieve task activity → 200', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/activity`)
        .set('Cookie', member.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('non-member receives 404 (no information leakage) → 404', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/activity`)
        .set('Cookie', nonMember.cookie);

      // Must be 404, not 403, so task existence is not revealed
      expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent task → 404', async () => {
      const res = await request(app)
        .get('/api/tasks/00000000-0000-0000-0000-000000000000/activity')
        .set('Cookie', owner.cookie);

      expect(res.status).toBe(404);
    });
  });
});
