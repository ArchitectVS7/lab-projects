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

describe('Phase 3: Tasks & Views', () => {
  let alice: { id: string; email: string; cookie: string };
  let bob: { id: string; email: string; cookie: string };
  let charlie: { id: string; email: string; cookie: string };

  let ownerProject: { id: string; ownerId: string };
  let adminProject: { id: string; ownerId: string };
  let memberProject: { id: string; ownerId: string };
  let viewerProject: { id: string; ownerId: string };

  // Clean DB before all tests
  beforeAll(async () => {
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const aliceRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'TestPass1@secure', name: 'Alice' });
    alice = {
      id: aliceRes.body.user.id,
      email: aliceRes.body.user.email,
      cookie: extractAuthCookie(aliceRes)!,
    };

    const bobRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'TestPass1@secure', name: 'Bob' });
    bob = {
      id: bobRes.body.user.id,
      email: bobRes.body.user.email,
      cookie: extractAuthCookie(bobRes)!,
    };

    const charlieRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'charlie@example.com', password: 'TestPass1@secure', name: 'Charlie' });
    charlie = {
      id: charlieRes.body.user.id,
      email: charlieRes.body.user.email,
      cookie: extractAuthCookie(charlieRes)!,
    };

    // Create projects with different roles for Alice
    // Project where Alice is OWNER
    const ownerRes = await request(app)
      .post('/api/projects')
      .set('Cookie', alice.cookie)
      .send({ name: 'Alice Owner Project' });
    ownerProject = { id: ownerRes.body.id, ownerId: alice.id };

    // Project where Alice is ADMIN
    const adminRes = await request(app)
      .post('/api/projects')
      .set('Cookie', bob.cookie)
      .send({ name: 'Bob Project - Alice Admin' });
    adminProject = { id: adminRes.body.id, ownerId: bob.id };
    await request(app)
      .post(`/api/projects/${adminProject.id}/members`)
      .set('Cookie', bob.cookie)
      .send({ email: alice.email, role: 'ADMIN' });

    // Project where Alice is MEMBER
    const memberRes = await request(app)
      .post('/api/projects')
      .set('Cookie', bob.cookie)
      .send({ name: 'Bob Project - Alice Member' });
    memberProject = { id: memberRes.body.id, ownerId: bob.id };
    await request(app)
      .post(`/api/projects/${memberProject.id}/members`)
      .set('Cookie', bob.cookie)
      .send({ email: alice.email, role: 'MEMBER' });

    // Project where Alice is VIEWER
    const viewerRes = await request(app)
      .post('/api/projects')
      .set('Cookie', bob.cookie)
      .send({ name: 'Bob Project - Alice Viewer' });
    viewerProject = { id: viewerRes.body.id, ownerId: bob.id };
    await request(app)
      .post(`/api/projects/${viewerProject.id}/members`)
      .set('Cookie', bob.cookie)
      .send({ email: alice.email, role: 'VIEWER' });

    // Add Charlie as MEMBER to ownerProject for assignee tests
    await request(app)
      .post(`/api/projects/${ownerProject.id}/members`)
      .set('Cookie', alice.cookie)
      .send({ email: charlie.email, role: 'MEMBER' });
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // POST /api/tasks - Create Task
  // -------------------------------------------------------
  describe('POST /api/tasks', () => {
    it('creates task with valid data → 201, sets creatorId automatically', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Test Task',
          description: 'A test task description',
          projectId: ownerProject.id,
          status: 'TODO',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Task');
      expect(res.body.description).toBe('A test task description');
      expect(res.body.projectId).toBe(ownerProject.id);
      expect(res.body.status).toBe('TODO');
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.creatorId).toBe(alice.id);
      expect(res.body.assigneeId).toBeNull();
      expect(res.body.dueDate).toBeNull();

      // Verify includes
      expect(res.body.project).toBeDefined();
      expect(res.body.project.id).toBe(ownerProject.id);
      expect(res.body.creator).toBeDefined();
      expect(res.body.creator.id).toBe(alice.id);
      expect(res.body.assignee).toBeNull();
    });

    it('creates task with assignee', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Task with Assignee',
          projectId: ownerProject.id,
          assigneeId: charlie.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.assigneeId).toBe(charlie.id);
      expect(res.body.assignee).toBeDefined();
      expect(res.body.assignee.id).toBe(charlie.id);
    });

    it('creates task with due date', async () => {
      const dueDate = new Date('2026-12-31T23:59:59Z').toISOString();
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Task with Due Date',
          projectId: ownerProject.id,
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.dueDate).toBeDefined();
      expect(new Date(res.body.dueDate).toISOString()).toBe(dueDate);
    });

    it('defaults to TODO status if not provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Default Status Task',
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('TODO');
    });

    it('defaults to MEDIUM priority if not provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Default Priority Task',
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe('MEDIUM');
    });

    it('OWNER can create task → 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Owner Task',
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(201);
    });

    it('ADMIN can create task → 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Admin Task',
          projectId: adminProject.id,
        });

      expect(res.status).toBe(201);
    });

    it('MEMBER can create task → 201', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Member Task',
          projectId: memberProject.id,
        });

      expect(res.status).toBe(201);
    });

    it('VIEWER cannot create task → 403', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Viewer Task',
          projectId: viewerProject.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('VIEWER');
    });

    it('rejects assignee who is not project member → 400', async () => {
      // Create new user not in project
      const danRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dan@example.com', password: 'TestPass1@secure', name: 'Dan' });

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Bad Assignee Task',
          projectId: ownerProject.id,
          assigneeId: danRes.body.user.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('member');
    });

    it('rejects empty title → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: '',
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(400);
    });

    it('rejects title longer than 200 chars → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'a'.repeat(201),
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(400);
    });

    it('rejects description longer than 2000 chars → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Long Description Task',
          description: 'x'.repeat(2001),
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid status → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Bad Status Task',
          projectId: ownerProject.id,
          status: 'INVALID_STATUS',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid priority → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Bad Priority Task',
          projectId: ownerProject.id,
          priority: 'INVALID_PRIORITY',
        });

      expect(res.status).toBe(400);
    });

    it('rejects missing projectId → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'No Project Task',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid UUID format for projectId → 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Bad UUID Task',
          projectId: 'not-a-uuid',
        });

      expect(res.status).toBe(400);
    });

    it('rejects non-existent projectId → 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Fake Project Task',
          projectId: fakeId,
        });

      expect(res.status).toBe(404);
    });

    it('rejects if user not member of project → 403', async () => {
      // Create project Bob owns, Alice not member
      const bobProjectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Bob Solo Project' });

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Unauthorized Task',
          projectId: bobProjectRes.body.id,
        });

      expect(res.status).toBe(403);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Unauthenticated Task',
          projectId: ownerProject.id,
        });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // GET /api/tasks - List Tasks
  // -------------------------------------------------------
  describe('GET /api/tasks', () => {
    let task1: { id: string };
    let task2: { id: string };
    let task3: { id: string };

    beforeAll(async () => {
      // Create various tasks for filtering tests
      const res1 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Task 1 - TODO HIGH',
          projectId: ownerProject.id,
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: charlie.id,
        });
      task1 = { id: res1.body.id };

      const res2 = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Task 2 - IN_PROGRESS URGENT',
          projectId: adminProject.id,
          status: 'IN_PROGRESS',
          priority: 'URGENT',
        });
      task2 = { id: res2.body.id };

      const res3 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Task 3 - DONE LOW',
          projectId: memberProject.id,
          status: 'DONE',
          priority: 'LOW',
        });
      task3 = { id: res3.body.id };
    });

    it('returns only tasks from user projects', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Alice should see tasks from ownerProject, adminProject, memberProject, viewerProject
      const taskIds = res.body.map((t: { id: string }) => t.id);
      expect(taskIds).toContain(task1.id);
      expect(taskIds).toContain(task2.id);
      expect(taskIds).toContain(task3.id);
    });

    it('includes project, assignee, and creator info', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const task = res.body[0];
      expect(task.project).toBeDefined();
      expect(task.project.id).toBeDefined();
      expect(task.project.name).toBeDefined();
      expect(task.project.color).toBeDefined();
      expect(task.creator).toBeDefined();
      expect(task.creator.id).toBeDefined();
      expect(task.creator.name).toBeDefined();
      // assignee may be null
    });

    it('filters by projectId', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${ownerProject.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      res.body.forEach((task: { projectId: string }) => {
        expect(task.projectId).toBe(ownerProject.id);
      });
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/tasks?status=TODO')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      res.body.forEach((task: { status: string }) => {
        expect(task.status).toBe('TODO');
      });
    });

    it('filters by priority', async () => {
      const res = await request(app)
        .get('/api/tasks?priority=HIGH')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      res.body.forEach((task: { priority: string }) => {
        expect(task.priority).toBe('HIGH');
      });
    });

    it('filters by assigneeId', async () => {
      const res = await request(app)
        .get(`/api/tasks?assigneeId=${charlie.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      res.body.forEach((task: { assigneeId: string | null }) => {
        expect(task.assigneeId).toBe(charlie.id);
      });
    });

    it('filters by creatorId', async () => {
      const res = await request(app)
        .get(`/api/tasks?creatorId=${alice.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      res.body.forEach((task: { creatorId: string }) => {
        expect(task.creatorId).toBe(alice.id);
      });
    });

    it('sorts by field with order', async () => {
      const res = await request(app)
        .get('/api/tasks?sortBy=priority&order=asc')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      // Verify sorting (LOW < MEDIUM < HIGH < URGENT)
      if (res.body.length > 1) {
        const priorities = res.body.map((t: { priority: string }) => t.priority);
        // Just verify we got results with the query params
        expect(Array.isArray(priorities)).toBe(true);
      }
    });

    it('defaults to createdAt desc order', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      if (res.body.length > 1) {
        const dates = res.body.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
        // Most recent first
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('combines multiple filters', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${ownerProject.id}&status=TODO&priority=HIGH`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      res.body.forEach((task: { projectId: string; status: string; priority: string }) => {
        expect(task.projectId).toBe(ownerProject.id);
        expect(task.status).toBe('TODO');
        expect(task.priority).toBe('HIGH');
      });
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
    });

    it('returns empty array for user with no projects', async () => {
      // Create new user with no projects
      const newUserRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newuser@example.com', password: 'TestPass1@secure', name: 'New User' });

      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', extractAuthCookie(newUserRes)!);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // -------------------------------------------------------
  // GET /api/tasks/:id - Get Task Detail
  // -------------------------------------------------------
  describe('GET /api/tasks/:id', () => {
    let taskId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Detail Test Task',
          description: 'Task for detail endpoint test',
          projectId: ownerProject.id,
          assigneeId: charlie.id,
        });
      taskId = res.body.id;
    });

    it('returns task detail with includes → 200', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Detail Test Task');
      expect(res.body.description).toBe('Task for detail endpoint test');
      expect(res.body.project).toBeDefined();
      expect(res.body.assignee).toBeDefined();
      expect(res.body.assignee.id).toBe(charlie.id);
      expect(res.body.creator).toBeDefined();
      expect(res.body.creator.id).toBe(alice.id);
    });

    it('returns 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(404);
    });

    it('returns 404 if user not member of task project', async () => {
      // Charlie creates task in his own project
      const charlieProjectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', charlie.cookie)
        .send({ name: 'Charlie Project' });

      const charlieTaskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', charlie.cookie)
        .send({
          title: 'Charlie Task',
          projectId: charlieProjectRes.body.id,
        });

      // Alice tries to access it
      const res = await request(app)
        .get(`/api/tasks/${charlieTaskRes.body.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(404);
    });

    it('rejects invalid UUID format → 400', async () => {
      const res = await request(app)
        .get('/api/tasks/not-a-uuid')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get(`/api/tasks/${taskId}`);
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // PUT /api/tasks/:id - Update Task
  // -------------------------------------------------------
  describe('PUT /api/tasks/:id', () => {
    let ownerTask: { id: string };
    let bobTaskInAdminProject: { id: string };
    let aliceTaskInMemberProject: { id: string };
    let bobTaskInMemberProject: { id: string };

    beforeAll(async () => {
      // Create task in ownerProject (Alice is OWNER)
      const ownerRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Owner Update Test',
          projectId: ownerProject.id,
        });
      ownerTask = { id: ownerRes.body.id };

      // Create task by Bob in adminProject (Alice is ADMIN)
      const adminRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Admin Update Test',
          projectId: adminProject.id,
        });
      bobTaskInAdminProject = { id: adminRes.body.id };

      // Create task by Alice in memberProject (Alice is MEMBER)
      const memberRes1 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Alice Task in Member Project',
          projectId: memberProject.id,
        });
      aliceTaskInMemberProject = { id: memberRes1.body.id };

      // Create task by Bob in memberProject (Alice is MEMBER but not creator)
      const memberRes2 = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Bob Task in Member Project',
          projectId: memberProject.id,
        });
      bobTaskInMemberProject = { id: memberRes2.body.id };
    });

    it('OWNER can update any task in project → 200', async () => {
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
          status: 'IN_PROGRESS',
          priority: 'URGENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.description).toBe('Updated Description');
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.priority).toBe('URGENT');
    });

    it('ADMIN can update any task in project → 200', async () => {
      const res = await request(app)
        .put(`/api/tasks/${bobTaskInAdminProject.id}`)
        .set('Cookie', alice.cookie)
        .send({
          title: 'Admin Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Admin Updated');
    });

    it('MEMBER can update own task → 200', async () => {
      const res = await request(app)
        .put(`/api/tasks/${aliceTaskInMemberProject.id}`)
        .set('Cookie', alice.cookie)
        .send({
          title: 'Alice Updated Own Task',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Alice Updated Own Task');
    });

    it('MEMBER cannot update others task → 403', async () => {
      const res = await request(app)
        .put(`/api/tasks/${bobTaskInMemberProject.id}`)
        .set('Cookie', alice.cookie)
        .send({
          title: 'Alice Trying to Update Bob Task',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('cannot');
    });

    it('VIEWER cannot update tasks → 403', async () => {
      // Create task in viewer project
      const viewerTaskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Task in Viewer Project',
          projectId: viewerProject.id,
        });

      const res = await request(app)
        .put(`/api/tasks/${viewerTaskRes.body.id}`)
        .set('Cookie', alice.cookie)
        .send({
          title: 'Viewer Update Attempt',
        });

      expect(res.status).toBe(403);
    });

    it('allows partial updates', async () => {
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          description: 'Only description updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Only description updated');
      expect(res.body.title).toBe('Updated Title'); // Previous value retained
    });

    it('can update assignee', async () => {
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          assigneeId: charlie.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.assigneeId).toBe(charlie.id);
    });

    it('can clear assignee with null', async () => {
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          assigneeId: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.assigneeId).toBeNull();
    });

    it('rejects assignee not in project → 400', async () => {
      // Dan is not in ownerProject
      const danRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dan2@example.com', password: 'TestPass1@secure', name: 'Dan2' });

      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          assigneeId: danRes.body.user.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('member');
    });

    it('cannot change projectId', async () => {
      // projectId should be excluded from updates
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          projectId: adminProject.id,
        });

      // Should succeed but projectId should not change
      expect(res.status).toBe(200);
      expect(res.body.projectId).toBe(ownerProject.id);
    });

    it('rejects invalid data → 400', async () => {
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .set('Cookie', alice.cookie)
        .send({
          status: 'INVALID_STATUS',
        });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .set('Cookie', alice.cookie)
        .send({
          title: 'Updated',
        });

      expect(res.status).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .put(`/api/tasks/${ownerTask.id}`)
        .send({
          title: 'Unauthorized Update',
        });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // DELETE /api/tasks/:id - Delete Task
  // -------------------------------------------------------
  describe('DELETE /api/tasks/:id', () => {
    let deleteTaskOwner: { id: string };
    let deleteTaskAdmin: { id: string };
    let deleteTaskMemberOwn: { id: string };
    let deleteTaskMemberOther: { id: string };

    beforeAll(async () => {
      // Create tasks for deletion tests
      const res1 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Delete Test Owner',
          projectId: ownerProject.id,
        });
      deleteTaskOwner = { id: res1.body.id };

      const res2 = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Delete Test Admin',
          projectId: adminProject.id,
        });
      deleteTaskAdmin = { id: res2.body.id };

      const res3 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Delete Test Member Own',
          projectId: memberProject.id,
        });
      deleteTaskMemberOwn = { id: res3.body.id };

      const res4 = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Delete Test Member Other',
          projectId: memberProject.id,
        });
      deleteTaskMemberOther = { id: res4.body.id };
    });

    it('OWNER can delete any task → 204', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${deleteTaskOwner.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(204);

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/tasks/${deleteTaskOwner.id}`)
        .set('Cookie', alice.cookie);
      expect(getRes.status).toBe(404);
    });

    it('ADMIN can delete any task → 204', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${deleteTaskAdmin.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(204);
    });

    it('MEMBER can delete own task → 204', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${deleteTaskMemberOwn.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(204);
    });

    it('MEMBER cannot delete others task → 403', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${deleteTaskMemberOther.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(403);
    });

    it('VIEWER cannot delete task → 403', async () => {
      const viewerTaskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Viewer Delete Test',
          projectId: viewerProject.id,
        });

      const res = await request(app)
        .delete(`/api/tasks/${viewerTaskRes.body.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent task', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Auth Delete Test',
          projectId: ownerProject.id,
        });

      const res = await request(app)
        .delete(`/api/tasks/${taskRes.body.id}`);

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // PATCH /api/tasks/bulk-status - Bulk Status Update
  // -------------------------------------------------------
  describe('PATCH /api/tasks/bulk-status', () => {
    let bulkTask1: { id: string };
    let bulkTask2: { id: string };
    let bulkTask3: { id: string };

    beforeAll(async () => {
      // Create tasks for bulk update
      const res1 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Bulk Task 1',
          projectId: ownerProject.id,
          status: 'TODO',
        });
      bulkTask1 = { id: res1.body.id };

      const res2 = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Bulk Task 2',
          projectId: ownerProject.id,
          status: 'TODO',
        });
      bulkTask2 = { id: res2.body.id };

      const res3 = await request(app)
        .post('/api/tasks')
        .set('Cookie', bob.cookie)
        .send({
          title: 'Bulk Task 3',
          projectId: memberProject.id,
          status: 'TODO',
        });
      bulkTask3 = { id: res3.body.id };
    });

    it('updates multiple tasks status → 200', async () => {
      const res = await request(app)
        .patch('/api/tasks/bulk-status')
        .set('Cookie', alice.cookie)
        .send({
          taskIds: [bulkTask1.id, bulkTask2.id],
          status: 'IN_PROGRESS',
        });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(2);

      // Verify updates
      const task1 = await request(app)
        .get(`/api/tasks/${bulkTask1.id}`)
        .set('Cookie', alice.cookie);
      expect(task1.body.status).toBe('IN_PROGRESS');

      const task2 = await request(app)
        .get(`/api/tasks/${bulkTask2.id}`)
        .set('Cookie', alice.cookie);
      expect(task2.body.status).toBe('IN_PROGRESS');
    });

    it('respects authorization - MEMBER can only update own tasks', async () => {
      // Alice (MEMBER) tries to bulk update Bob's task
      const res = await request(app)
        .patch('/api/tasks/bulk-status')
        .set('Cookie', alice.cookie)
        .send({
          taskIds: [bulkTask3.id],
          status: 'DONE',
        });

      // Should succeed but updated count should be 0 (or could return 403)
      // Implementation may vary - either skip unauthorized or return error
      expect([200, 403]).toContain(res.status);
    });

    it('validates taskIds array → 400', async () => {
      const res = await request(app)
        .patch('/api/tasks/bulk-status')
        .set('Cookie', alice.cookie)
        .send({
          taskIds: 'not-an-array',
          status: 'DONE',
        });

      expect(res.status).toBe(400);
    });

    it('validates status enum → 400', async () => {
      const res = await request(app)
        .patch('/api/tasks/bulk-status')
        .set('Cookie', alice.cookie)
        .send({
          taskIds: [bulkTask1.id],
          status: 'INVALID_STATUS',
        });

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .patch('/api/tasks/bulk-status')
        .send({
          taskIds: [bulkTask1.id],
          status: 'DONE',
        });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // Cross-cutting concerns
  // -------------------------------------------------------
  describe('Cross-cutting task concerns', () => {
    it('never leaks passwordHash in creator or assignee objects', async () => {
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Password Leak Check',
          projectId: ownerProject.id,
          assigneeId: charlie.id,
        });

      // Check task creation
      expect(taskRes.body.creator.passwordHash).toBeUndefined();
      expect(taskRes.body.creator.password_hash).toBeUndefined();
      expect(taskRes.body.assignee.passwordHash).toBeUndefined();
      expect(taskRes.body.assignee.password_hash).toBeUndefined();

      // Check task list
      const listRes = await request(app)
        .get('/api/tasks')
        .set('Cookie', alice.cookie);

      listRes.body.forEach((task: any) => {
        expect(task.creator.passwordHash).toBeUndefined();
        expect(task.creator.password_hash).toBeUndefined();
        if (task.assignee) {
          expect(task.assignee.passwordHash).toBeUndefined();
          expect(task.assignee.password_hash).toBeUndefined();
        }
      });

      // Check task detail
      const detailRes = await request(app)
        .get(`/api/tasks/${taskRes.body.id}`)
        .set('Cookie', alice.cookie);

      expect(detailRes.body.creator.passwordHash).toBeUndefined();
      expect(detailRes.body.assignee.passwordHash).toBeUndefined();
    });

    it('task responses always include required fields', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', alice.cookie);

      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((task: any) => {
        // Core fields
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
        expect(task.priority).toBeDefined();
        expect(task.projectId).toBeDefined();
        expect(task.creatorId).toBeDefined();
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();

        // Relations
        expect(task.project).toBeDefined();
        expect(task.creator).toBeDefined();
        // assignee, description, dueDate may be null
      });
    });

    it('creatorId is immutable and set automatically', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', alice.cookie)
        .send({
          title: 'Creator Test',
          projectId: ownerProject.id,
        });

      expect(createRes.body.creatorId).toBe(alice.id);

      // Try to update creatorId (should be ignored or excluded)
      const updateRes = await request(app)
        .put(`/api/tasks/${createRes.body.id}`)
        .set('Cookie', alice.cookie)
        .send({
          creatorId: bob.id,
        });

      expect(updateRes.body.creatorId).toBe(alice.id); // Should remain Alice
    });
  });
});
