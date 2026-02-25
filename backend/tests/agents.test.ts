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

describe('Agent Delegation API', () => {
  let authCookie: string;
  let userId: string;
  let projectId: string;
  let taskId: string;
  let delegationId: string;

  // Second user for access control tests
  let otherCookie: string;
  let otherTaskId: string;

  beforeAll(async () => {
    // Clean up
    await prisma.agentDelegation.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Register primary test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'agent-test@example.com', password: 'Password1', name: 'Agent Tester' });
    expect(regRes.status).toBe(201);
    authCookie = extractAuthCookie(regRes)!;
    userId = regRes.body.user.id;

    // Create a project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Agent Test Project', color: '#6366f1' });
    expect(projRes.status).toBe(201);
    projectId = projRes.body.id;

    // Create a task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({ title: 'Task to Delegate', projectId, priority: 'HIGH' });
    expect(taskRes.status).toBe(201);
    taskId = taskRes.body.id;

    // Register a second user
    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'agent-other@example.com', password: 'Password1', name: 'Other User' });
    expect(reg2.status).toBe(201);
    otherCookie = extractAuthCookie(reg2)!;

    // Create a project and task for the other user
    const proj2 = await request(app)
      .post('/api/projects')
      .set('Cookie', otherCookie)
      .send({ name: 'Other Project', color: '#000000' });
    expect(proj2.status).toBe(201);

    const task2 = await request(app)
      .post('/api/tasks')
      .set('Cookie', otherCookie)
      .send({ title: 'Other User Task', projectId: proj2.body.id });
    expect(task2.status).toBe(201);
    otherTaskId = task2.body.id;
  });

  afterAll(async () => {
    await prisma.agentDelegation.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------
  // POST /api/agents/delegate
  // ---------------------------------------------------------
  describe('POST /api/agents/delegate', () => {
    it('requires authentication → 401', async () => {
      const res = await request(app)
        .post('/api/agents/delegate')
        .send({ taskId, agentType: 'RESEARCH' });
      expect(res.status).toBe(401);
    });

    it('creates a delegation → 201', async () => {
      const res = await request(app)
        .post('/api/agents/delegate')
        .set('Cookie', authCookie)
        .send({ taskId, agentType: 'RESEARCH', instructions: 'Do research on this topic' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.taskId).toBe(taskId);
      expect(res.body.userId).toBe(userId);
      expect(res.body.agentType).toBe('RESEARCH');
      expect(res.body.status).toBe('QUEUED');
      expect(res.body.instructions).toBe('Do research on this topic');
      delegationId = res.body.id;
    });

    it('rejects invalid agentType → 400', async () => {
      const res = await request(app)
        .post('/api/agents/delegate')
        .set('Cookie', authCookie)
        .send({ taskId, agentType: 'INVALID_TYPE' });

      expect(res.status).toBe(400);
    });

    it('rejects delegation of another user task → 403', async () => {
      const res = await request(app)
        .post('/api/agents/delegate')
        .set('Cookie', authCookie)
        .send({ taskId: otherTaskId, agentType: 'CODE' });

      expect([403, 404]).toContain(res.status);
    });

    it('rejects non-existent task → 404', async () => {
      const res = await request(app)
        .post('/api/agents/delegate')
        .set('Cookie', authCookie)
        .send({ taskId: '00000000-0000-0000-0000-000000000000', agentType: 'CODE' });

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------
  // GET /api/agents/queue
  // ---------------------------------------------------------
  describe('GET /api/agents/queue', () => {
    it('requires authentication → 401', async () => {
      const res = await request(app).get('/api/agents/queue');
      expect(res.status).toBe(401);
    });

    it('returns user delegations', async () => {
      const res = await request(app)
        .get('/api/agents/queue')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const delegation = res.body.find((d: { id: string }) => d.id === delegationId);
      expect(delegation).toBeDefined();
      expect(delegation.task).toBeDefined();
      expect(delegation.task.title).toBe('Task to Delegate');
    });

    it('does not return other users delegations', async () => {
      const res = await request(app)
        .get('/api/agents/queue')
        .set('Cookie', otherCookie);

      expect(res.status).toBe(200);
      const found = res.body.find((d: { id: string }) => d.id === delegationId);
      expect(found).toBeUndefined();
    });
  });

  // ---------------------------------------------------------
  // GET /api/agents/queue/:agentType
  // ---------------------------------------------------------
  describe('GET /api/agents/queue/:agentType', () => {
    it('requires authentication → 401', async () => {
      const res = await request(app).get('/api/agents/queue/RESEARCH');
      expect(res.status).toBe(401);
    });

    it('returns filtered delegations by agent type', async () => {
      const res = await request(app)
        .get('/api/agents/queue/RESEARCH')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((d: { agentType: string }) => {
        expect(d.agentType).toBe('RESEARCH');
      });
    });

    it('returns empty array for type with no delegations', async () => {
      const res = await request(app)
        .get('/api/agents/queue/ANALYTICS')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('rejects invalid agentType → 400', async () => {
      const res = await request(app)
        .get('/api/agents/queue/INVALID')
        .set('Cookie', authCookie);

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------
  // PUT /api/agents/:id/status
  // ---------------------------------------------------------
  describe('PUT /api/agents/:id/status', () => {
    it('requires authentication → 401', async () => {
      const res = await request(app)
        .put(`/api/agents/${delegationId}/status`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(401);
    });

    it('updates status with auth (authenticated callback)', async () => {
      const res = await request(app)
        .put(`/api/agents/${delegationId}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.startedAt).toBeDefined();
    });

    it('updates status to COMPLETED and sets completedAt', async () => {
      const res = await request(app)
        .put(`/api/agents/${delegationId}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'COMPLETED', result: 'Research complete: found 5 sources.' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.result).toBe('Research complete: found 5 sources.');
      expect(res.body.completedAt).toBeDefined();
    });

    it('rejects invalid status → 400', async () => {
      const res = await request(app)
        .put(`/api/agents/${delegationId}/status`)
        .set('Cookie', authCookie)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent delegation', async () => {
      const res = await request(app)
        .put('/api/agents/00000000-0000-0000-0000-000000000000/status')
        .set('Cookie', authCookie)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------
  // DELETE /api/agents/:id
  // ---------------------------------------------------------
  describe('DELETE /api/agents/:id', () => {
    let deleteDelegationId: string;

    beforeAll(async () => {
      // Create a fresh delegation to delete
      const res = await request(app)
        .post('/api/agents/delegate')
        .set('Cookie', authCookie)
        .send({ taskId, agentType: 'WRITING' });
      expect(res.status).toBe(201);
      deleteDelegationId = res.body.id;
    });

    it('requires authentication → 401', async () => {
      const res = await request(app)
        .delete(`/api/agents/${deleteDelegationId}`);
      expect(res.status).toBe(401);
    });

    it('rejects deletion by non-owner → 403', async () => {
      const res = await request(app)
        .delete(`/api/agents/${deleteDelegationId}`)
        .set('Cookie', otherCookie);
      expect(res.status).toBe(403);
    });

    it('deletes delegation → 204', async () => {
      const res = await request(app)
        .delete(`/api/agents/${deleteDelegationId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(204);

      // Verify it no longer appears in queue
      const queueRes = await request(app)
        .get('/api/agents/queue')
        .set('Cookie', authCookie);
      expect(queueRes.status).toBe(200);
      const found = queueRes.body.find((d: { id: string }) => d.id === deleteDelegationId);
      expect(found).toBeUndefined();
    });
  });
});
