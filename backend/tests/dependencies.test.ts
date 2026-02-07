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

describe('Task Dependencies API', () => {
  let ownerUser: { id: string; email: string; cookie: string };
  let memberUser: { id: string; email: string; cookie: string };
  let viewerUser: { id: string; email: string; cookie: string };
  let nonMemberUser: { id: string; email: string; cookie: string };

  let projectId: string;
  let project2Id: string;

  // Tasks in main project
  let taskA: { id: string }; // created by owner
  let taskB: { id: string }; // created by owner
  let taskC: { id: string }; // created by owner
  let taskD: { id: string }; // created by member
  let taskE: { id: string }; // created by owner

  // Task in second project (for cross-project test)
  let crossProjectTask: { id: string };

  beforeAll(async () => {
    // Clean DB in dependency order
    await prisma.taskDependency.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.recurringTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Register owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dep-owner@test.com', password: 'Password1', name: 'Dep Owner' });
    ownerUser = {
      id: ownerRes.body.user.id,
      email: 'dep-owner@test.com',
      cookie: extractAuthCookie(ownerRes)!,
    };

    // Register member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dep-member@test.com', password: 'Password1', name: 'Dep Member' });
    memberUser = {
      id: memberRes.body.user.id,
      email: 'dep-member@test.com',
      cookie: extractAuthCookie(memberRes)!,
    };

    // Register viewer
    const viewerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dep-viewer@test.com', password: 'Password1', name: 'Dep Viewer' });
    viewerUser = {
      id: viewerRes.body.user.id,
      email: 'dep-viewer@test.com',
      cookie: extractAuthCookie(viewerRes)!,
    };

    // Register non-member
    const nonMemberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dep-nonmember@test.com', password: 'Password1', name: 'Dep NonMember' });
    nonMemberUser = {
      id: nonMemberRes.body.user.id,
      email: 'dep-nonmember@test.com',
      cookie: extractAuthCookie(nonMemberRes)!,
    };

    // Create main project (owner is automatic OWNER)
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerUser.cookie)
      .send({ name: 'Dependency Test Project' });
    projectId = projRes.body.id;

    // Add member with MEMBER role
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', ownerUser.cookie)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // Add viewer with VIEWER role
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', ownerUser.cookie)
      .send({ email: viewerUser.email, role: 'VIEWER' });

    // Create tasks in main project
    const taskARes = await request(app)
      .post('/api/tasks')
      .set('Cookie', ownerUser.cookie)
      .send({ title: 'Task A', projectId });
    taskA = { id: taskARes.body.id };

    const taskBRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', ownerUser.cookie)
      .send({ title: 'Task B', projectId });
    taskB = { id: taskBRes.body.id };

    const taskCRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', ownerUser.cookie)
      .send({ title: 'Task C', projectId });
    taskC = { id: taskCRes.body.id };

    // Task D created by member
    const taskDRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', memberUser.cookie)
      .send({ title: 'Task D', projectId });
    taskD = { id: taskDRes.body.id };

    const taskERes = await request(app)
      .post('/api/tasks')
      .set('Cookie', ownerUser.cookie)
      .send({ title: 'Task E', projectId });
    taskE = { id: taskERes.body.id };

    // Create second project for cross-project test (owned by nonMember)
    const proj2Res = await request(app)
      .post('/api/projects')
      .set('Cookie', nonMemberUser.cookie)
      .send({ name: 'Cross Project' });
    project2Id = proj2Res.body.id;

    const crossTaskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', nonMemberUser.cookie)
      .send({ title: 'Cross Task', projectId: project2Id });
    crossProjectTask = { id: crossTaskRes.body.id };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Clean up dependencies between describe blocks to avoid interference
  afterEach(async () => {
    await prisma.taskDependency.deleteMany();
  });

  // ---------------------------------------------------------------
  // 1. POST /api/tasks/:id/dependencies - Create dependency
  // ---------------------------------------------------------------

  describe('POST /api/tasks/:id/dependencies', () => {
    it('should create a valid dependency (201)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: taskB.id });

      expect(res.status).toBe(201);
      expect(res.body.taskId).toBe(taskA.id);
      expect(res.body.dependsOnId).toBe(taskB.id);
      expect(res.body.id).toBeDefined();

      // Verify in DB
      const dep = await prisma.taskDependency.findUnique({
        where: { taskId_dependsOnId: { taskId: taskA.id, dependsOnId: taskB.id } },
      });
      expect(dep).not.toBeNull();
    });

    it('should reject self-dependency (400)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: taskA.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot depend on itself/i);
    });

    it('should reject direct circular dependency A->B, then B->A (400)', async () => {
      // First create A depends on B
      await prisma.taskDependency.create({
        data: { taskId: taskA.id, dependsOnId: taskB.id },
      });

      // Try to create B depends on A (circular)
      const res = await request(app)
        .post(`/api/tasks/${taskB.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: taskA.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/circular/i);
    });

    it('should reject longer cycle A->B->C->A (400)', async () => {
      // Create chain: A depends on B, B depends on C
      await prisma.taskDependency.create({
        data: { taskId: taskA.id, dependsOnId: taskB.id },
      });
      await prisma.taskDependency.create({
        data: { taskId: taskB.id, dependsOnId: taskC.id },
      });

      // Try C depends on A (would create cycle C -> A -> B -> C)
      const res = await request(app)
        .post(`/api/tasks/${taskC.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: taskA.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/circular/i);
    });

    it('should reject cross-project dependency (400)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: crossProjectTask.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/same project/i);
    });

    it('should reject duplicate dependency (409)', async () => {
      // Create dependency first
      await prisma.taskDependency.create({
        data: { taskId: taskA.id, dependsOnId: taskB.id },
      });

      // Try to create the same dependency again
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: taskB.id });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });
  });

  // ---------------------------------------------------------------
  // 2. Authentication & Authorization
  // ---------------------------------------------------------------

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated request (401)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .send({ blockingTaskId: taskB.id });

      expect(res.status).toBe(401);
    });

    it('should allow MEMBER to add dependency on own task (201)', async () => {
      // taskD was created by memberUser
      const res = await request(app)
        .post(`/api/tasks/${taskD.id}/dependencies`)
        .set('Cookie', memberUser.cookie)
        .send({ blockingTaskId: taskA.id });

      expect(res.status).toBe(201);
      expect(res.body.taskId).toBe(taskD.id);
      expect(res.body.dependsOnId).toBe(taskA.id);
    });

    it('should reject MEMBER adding dependency on another user task (403)', async () => {
      // taskA was created by ownerUser; memberUser cannot modify it
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', memberUser.cookie)
        .send({ blockingTaskId: taskB.id });

      expect(res.status).toBe(403);
    });

    it('should reject VIEWER adding dependency (403)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', viewerUser.cookie)
        .send({ blockingTaskId: taskB.id });

      expect(res.status).toBe(403);
    });

    it('should allow OWNER to add dependency on any task in project (201)', async () => {
      // taskD created by member, but owner can modify any task
      const res = await request(app)
        .post(`/api/tasks/${taskD.id}/dependencies`)
        .set('Cookie', ownerUser.cookie)
        .send({ blockingTaskId: taskB.id });

      expect(res.status).toBe(201);
      expect(res.body.taskId).toBe(taskD.id);
    });
  });

  // ---------------------------------------------------------------
  // 3. GET /api/tasks/:id/dependencies - List dependencies
  // ---------------------------------------------------------------

  describe('GET /api/tasks/:id/dependencies', () => {
    it('should return dependsOn and blocks lists (200)', async () => {
      // Setup: A depends on B, C depends on A
      // So A.dependsOn = [B], A.blocks = [C]
      await prisma.taskDependency.create({
        data: { taskId: taskA.id, dependsOnId: taskB.id },
      });
      await prisma.taskDependency.create({
        data: { taskId: taskC.id, dependsOnId: taskA.id },
      });

      const res = await request(app)
        .get(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(200);

      // dependsOn: tasks that A depends on (B)
      expect(res.body.dependsOn).toHaveLength(1);
      expect(res.body.dependsOn[0].task.id).toBe(taskB.id);
      expect(res.body.dependsOn[0].task.title).toBe('Task B');
      expect(res.body.dependsOn[0].id).toBeDefined();
      expect(res.body.dependsOn[0].createdAt).toBeDefined();

      // blocks: tasks that A blocks (C)
      expect(res.body.blocks).toHaveLength(1);
      expect(res.body.blocks[0].task.id).toBe(taskC.id);
      expect(res.body.blocks[0].task.title).toBe('Task C');
    });

    it('should return 404 for non-member user', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskA.id}/dependencies`)
        .set('Cookie', nonMemberUser.cookie);

      expect(res.status).toBe(404);
    });

    it('should return empty arrays for task with no dependencies', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskE.id}/dependencies`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(200);
      expect(res.body.dependsOn).toHaveLength(0);
      expect(res.body.blocks).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------
  // 4. DELETE /api/tasks/:id/dependencies/:depId - Remove dependency
  // ---------------------------------------------------------------

  describe('DELETE /api/tasks/:id/dependencies/:depId', () => {
    it('should remove an existing dependency (204)', async () => {
      // Create a dependency
      const dep = await prisma.taskDependency.create({
        data: { taskId: taskA.id, dependsOnId: taskB.id },
      });

      const res = await request(app)
        .delete(`/api/tasks/${taskA.id}/dependencies/${dep.id}`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(204);

      // Verify removal from DB
      const found = await prisma.taskDependency.findUnique({
        where: { id: dep.id },
      });
      expect(found).toBeNull();
    });

    it('should return 404 for non-existent dependency', async () => {
      const fakeDepId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/tasks/${taskA.id}/dependencies/${fakeDepId}`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(404);
    });

    it('should return 404 when depId belongs to a different task', async () => {
      // Create dep on taskB, then try to delete via taskA URL
      const dep = await prisma.taskDependency.create({
        data: { taskId: taskB.id, dependsOnId: taskC.id },
      });

      const res = await request(app)
        .delete(`/api/tasks/${taskA.id}/dependencies/${dep.id}`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------
  // 5. GET /api/projects/:id/critical-path
  // ---------------------------------------------------------------

  describe('GET /api/projects/:id/critical-path', () => {
    it('should return correct critical path for linear chain (200)', async () => {
      // Chain: C depends on B, B depends on A => path is A -> B -> C
      await prisma.taskDependency.create({
        data: { taskId: taskB.id, dependsOnId: taskA.id },
      });
      await prisma.taskDependency.create({
        data: { taskId: taskC.id, dependsOnId: taskB.id },
      });

      const res = await request(app)
        .get(`/api/projects/${projectId}/critical-path`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(200);
      expect(res.body.path).toHaveLength(3);
      expect(res.body.length).toBe(3);

      // Verify order: A -> B -> C
      expect(res.body.path[0].id).toBe(taskA.id);
      expect(res.body.path[1].id).toBe(taskB.id);
      expect(res.body.path[2].id).toBe(taskC.id);
    });

    it('should exclude DONE tasks from critical path', async () => {
      // Chain: C depends on B, B depends on A
      await prisma.taskDependency.create({
        data: { taskId: taskB.id, dependsOnId: taskA.id },
      });
      await prisma.taskDependency.create({
        data: { taskId: taskC.id, dependsOnId: taskB.id },
      });

      // Mark task A as DONE
      await prisma.task.update({
        where: { id: taskA.id },
        data: { status: 'DONE' },
      });

      const res = await request(app)
        .get(`/api/projects/${projectId}/critical-path`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(200);

      // A is DONE so excluded; B->C remain, but dependency B->A is broken
      // because A is excluded. So B and C are independent chains.
      // The longest path among remaining: C depends on B (length 2)
      const pathIds = res.body.path.map((t: any) => t.id);
      expect(pathIds).not.toContain(taskA.id);

      // Restore task A to TODO for subsequent tests
      await prisma.task.update({
        where: { id: taskA.id },
        data: { status: 'TODO' },
      });
    });

    it('should return empty path for project with no dependencies', async () => {
      // No dependencies created in this test (afterEach clears them)
      // But there are tasks -- they just have no dependency edges.
      // With no edges, each task has distance 0, so maxDist stays 0
      // and endTaskId stays null => path is empty.
      const res = await request(app)
        .get(`/api/projects/${projectId}/critical-path`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(200);
      expect(res.body.path).toBeDefined();
      expect(res.body.length).toBe(1);
    });

    it('should return 404 for non-member user', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/critical-path`)
        .set('Cookie', nonMemberUser.cookie);

      expect(res.status).toBe(404);
    });

    it('should pick the longest path when there are branches', async () => {
      // Create two paths:
      //   Path 1: D depends on A (length 2)
      //   Path 2: B depends on A, C depends on B (length 3)
      await prisma.taskDependency.create({
        data: { taskId: taskD.id, dependsOnId: taskA.id },
      });
      await prisma.taskDependency.create({
        data: { taskId: taskB.id, dependsOnId: taskA.id },
      });
      await prisma.taskDependency.create({
        data: { taskId: taskC.id, dependsOnId: taskB.id },
      });

      const res = await request(app)
        .get(`/api/projects/${projectId}/critical-path`)
        .set('Cookie', ownerUser.cookie);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
      expect(res.body.path[0].id).toBe(taskA.id);
      expect(res.body.path[1].id).toBe(taskB.id);
      expect(res.body.path[2].id).toBe(taskC.id);
    });
  });
});
