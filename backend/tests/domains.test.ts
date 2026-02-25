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

// Helper: register a user and return their auth cookie
async function registerUser(email: string, password: string, name: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name });
  const cookie = extractAuthCookie(res);
  if (!cookie) throw new Error(`Failed to register ${email}: ${JSON.stringify(res.body)}`);
  return cookie;
}

// Helper: create a project for a user (returns project id)
async function createProject(cookie: string, projectName = 'Test Project'): Promise<string> {
  const res = await request(app)
    .post('/api/projects')
    .set('Cookie', cookie)
    .send({ name: projectName, color: '#3b82f6' });
  if (res.status !== 201) throw new Error(`Failed to create project: ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}

// Helper: create a task for a user
async function createTask(cookie: string, projectId: string, title = 'Test Task'): Promise<string> {
  const res = await request(app)
    .post('/api/tasks')
    .set('Cookie', cookie)
    .send({ title, projectId });
  if (res.status !== 201) throw new Error(`Failed to create task: ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}

describe('Domains API', () => {
  const user1Email = 'domains-user1@example.com';
  const user2Email = 'domains-user2@example.com';
  const password = 'Password1';

  let user1Cookie: string;
  let user2Cookie: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.taskDomain.deleteMany();
    await prisma.domain.deleteMany({ where: { user: { email: { in: [user1Email, user2Email] } } } });
    await prisma.task.deleteMany({ where: { creator: { email: { in: [user1Email, user2Email] } } } });
    await prisma.projectMember.deleteMany({ where: { user: { email: { in: [user1Email, user2Email] } } } });
    await prisma.project.deleteMany({ where: { owner: { email: { in: [user1Email, user2Email] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [user1Email, user2Email] } } });

    user1Cookie = await registerUser(user1Email, password, 'Domain User One');
    user2Cookie = await registerUser(user2Email, password, 'Domain User Two');

    const me1 = await request(app).get('/api/auth/me').set('Cookie', user1Cookie);
    const me2 = await request(app).get('/api/auth/me').set('Cookie', user2Cookie);
    user1Id = me1.body.user.id as string;
    user2Id = me2.body.user.id as string;
  });

  afterAll(async () => {
    await prisma.taskDomain.deleteMany();
    await prisma.domain.deleteMany({ where: { userId: { in: [user1Id, user2Id] } } });
    await prisma.task.deleteMany({ where: { creatorId: { in: [user1Id, user2Id] } } });
    await prisma.projectMember.deleteMany({ where: { userId: { in: [user1Id, user2Id] } } });
    await prisma.project.deleteMany({ where: { ownerId: { in: [user1Id, user2Id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // GET /api/domains — auto-seeding
  // -------------------------------------------------------
  describe('GET /api/domains', () => {
    it('auto-seeds 5 default domains for a new user', async () => {
      const res = await request(app)
        .get('/api/domains')
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(5);

      const names = res.body.map((d: { name: string }) => d.name);
      expect(names).toContain('Coding');
      expect(names).toContain('Marketing');
      expect(names).toContain('Book Writing');
      expect(names).toContain('Rock Band');
      expect(names).toContain('Health & Hobbies');
    });

    it('returns domains with _count.tasks field', async () => {
      const res = await request(app)
        .get('/api/domains')
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(200);
      expect(res.body[0]._count).toBeDefined();
      expect(typeof res.body[0]._count.tasks).toBe('number');
    });

    it('does not re-seed on subsequent calls', async () => {
      const res1 = await request(app).get('/api/domains').set('Cookie', user1Cookie);
      const res2 = await request(app).get('/api/domains').set('Cookie', user1Cookie);

      expect(res1.body.length).toBe(res2.body.length);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/domains');
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // POST /api/domains — create domain
  // -------------------------------------------------------
  describe('POST /api/domains', () => {
    it('creates a domain with valid data → 201', async () => {
      const res = await request(app)
        .post('/api/domains')
        .set('Cookie', user2Cookie)
        .send({ name: 'Finance', color: '#f59e0b', icon: '💰', sortOrder: 10 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Finance');
      expect(res.body.color).toBe('#f59e0b');
      expect(res.body.icon).toBe('💰');
      expect(res.body.sortOrder).toBe(10);
      expect(res.body.userId).toBe(user2Id);
    });

    it('creates a domain with minimal data (name only)', async () => {
      const res = await request(app)
        .post('/api/domains')
        .set('Cookie', user2Cookie)
        .send({ name: 'Minimal Domain' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Minimal Domain');
      expect(res.body.color).toBeDefined();
      expect(res.body.icon).toBeDefined();
    });

    it('rejects empty name → 400', async () => {
      const res = await request(app)
        .post('/api/domains')
        .set('Cookie', user2Cookie)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });

    it('rejects name longer than 100 chars → 400', async () => {
      const res = await request(app)
        .post('/api/domains')
        .set('Cookie', user2Cookie)
        .send({ name: 'a'.repeat(101) });

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/domains')
        .send({ name: 'Unauthorized Domain' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // PUT /api/domains/:id — update domain
  // -------------------------------------------------------
  describe('PUT /api/domains/:id', () => {
    let domainId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/domains')
        .set('Cookie', user1Cookie)
        .send({ name: 'To Update' });
      domainId = res.body.id as string;
    });

    it('updates domain fields → 200', async () => {
      const res = await request(app)
        .put(`/api/domains/${domainId}`)
        .set('Cookie', user1Cookie)
        .send({ name: 'Updated Name', color: '#ff0000', icon: '🚀' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.color).toBe('#ff0000');
      expect(res.body.icon).toBe('🚀');
    });

    it('returns 403 when another user tries to update', async () => {
      const res = await request(app)
        .put(`/api/domains/${domainId}`)
        .set('Cookie', user2Cookie)
        .send({ name: 'Hijacked' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent domain', async () => {
      const res = await request(app)
        .put('/api/domains/00000000-0000-0000-0000-000000000000')
        .set('Cookie', user1Cookie)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .put(`/api/domains/${domainId}`)
        .send({ name: 'Unauthed' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // POST/DELETE /api/domains/:id/tasks/:taskId
  // -------------------------------------------------------
  describe('Task assignment', () => {
    let domainId: string;
    let taskId: string;

    beforeAll(async () => {
      const domRes = await request(app)
        .post('/api/domains')
        .set('Cookie', user1Cookie)
        .send({ name: 'Task Assignment Domain' });
      domainId = domRes.body.id as string;

      const projectId = await createProject(user1Cookie, 'Domain Task Project');
      taskId = await createTask(user1Cookie, projectId, 'Task for Domain');
    });

    it('assigns task to domain → 201', async () => {
      const res = await request(app)
        .post(`/api/domains/${domainId}/tasks/${taskId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(201);
      expect(res.body.taskId).toBe(taskId);
      expect(res.body.domainId).toBe(domainId);
      expect(res.body.domain).toBeDefined();
    });

    it('removes task from domain → 204', async () => {
      const res = await request(app)
        .delete(`/api/domains/${domainId}/tasks/${taskId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(204);
    });

    it('returns 403 when user2 tries to assign task to user1 domain', async () => {
      const res = await request(app)
        .post(`/api/domains/${domainId}/tasks/${taskId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(403);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post(`/api/domains/${domainId}/tasks/${taskId}`);

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // DELETE /api/domains/:id — delete domain
  // -------------------------------------------------------
  describe('DELETE /api/domains/:id', () => {
    let domainId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/domains')
        .set('Cookie', user1Cookie)
        .send({ name: 'To Delete' });
      domainId = res.body.id as string;
    });

    it('returns 403 when another user tries to delete', async () => {
      const res = await request(app)
        .delete(`/api/domains/${domainId}`)
        .set('Cookie', user2Cookie);

      expect(res.status).toBe(403);
    });

    it('deletes domain → 204', async () => {
      const res = await request(app)
        .delete(`/api/domains/${domainId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(204);
    });

    it('returns 404 after deletion', async () => {
      const res = await request(app)
        .delete(`/api/domains/${domainId}`)
        .set('Cookie', user1Cookie);

      expect(res.status).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .delete('/api/domains/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
    });
  });
});
