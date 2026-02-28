import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

describe('Milestone Import API', () => {
  let ownerCookie: string;
  let memberCookie: string;
  let viewerCookie: string;
  let ownerId: string;
  let projectId: string;
  let projectName: string;
  let apiKey: string;

  beforeAll(async () => {
    // Clean up any leftover test data
    await prisma.taskDependency.deleteMany({
      where: { task: { creator: { email: { startsWith: 'import-' } } } },
    });
    await prisma.taskDomain.deleteMany({
      where: { task: { creator: { email: { startsWith: 'import-' } } } },
    });
    await prisma.taskTag.deleteMany({
      where: { task: { creator: { email: { startsWith: 'import-' } } } },
    });
    await prisma.activityLog.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.task.deleteMany({
      where: { creator: { email: { startsWith: 'import-' } } },
    });
    await prisma.tag.deleteMany({
      where: { project: { owner: { email: { startsWith: 'import-' } } } },
    });
    await prisma.domain.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.apiKey.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.projectMember.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.project.deleteMany({
      where: { owner: { email: { startsWith: 'import-' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'import-' } },
    });

    // Register owner (upgrade to PRO — API key creation is gated)
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'import-owner@example.com', password: 'Password1', name: 'Import Owner' });
    expect(ownerRes.status).toBe(201);
    ownerCookie = extractAuthCookie(ownerRes)!;
    ownerId = ownerRes.body.user.id;
    await prisma.user.update({ where: { id: ownerId }, data: { plan: 'PRO' } });

    // Register member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'import-member@example.com', password: 'Password1', name: 'Import Member' });
    expect(memberRes.status).toBe(201);
    memberCookie = extractAuthCookie(memberRes)!;

    // Register viewer
    const viewerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'import-viewer@example.com', password: 'Password1', name: 'Import Viewer' });
    expect(viewerRes.status).toBe(201);
    viewerCookie = extractAuthCookie(viewerRes)!;

    // Create project
    projectName = 'Import Test Project';
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: projectName, color: '#6366f1' });
    expect(projRes.status).toBe(201);
    projectId = projRes.body.id;

    // Add member (MEMBER role)
    const addMemberRes = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', ownerCookie)
      .send({ email: 'import-member@example.com', role: 'MEMBER' });
    expect(addMemberRes.status).toBe(201);

    // Add viewer (VIEWER role)
    const addViewerRes = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', ownerCookie)
      .send({ email: 'import-viewer@example.com', role: 'VIEWER' });
    expect(addViewerRes.status).toBe(201);

    // Generate API key for owner
    const keyRes = await request(app)
      .post('/api/auth/api-keys')
      .set('Cookie', ownerCookie)
      .send({ name: 'import-test-key' });
    expect(keyRes.status).toBe(201);
    apiKey = keyRes.body.key;

    // Seed domains for owner (auto-seed via GET)
    await request(app)
      .get('/api/domains')
      .set('Cookie', ownerCookie);
  });

  afterAll(async () => {
    await prisma.taskDependency.deleteMany({
      where: { task: { creator: { email: { startsWith: 'import-' } } } },
    });
    await prisma.taskDomain.deleteMany({
      where: { task: { creator: { email: { startsWith: 'import-' } } } },
    });
    await prisma.taskTag.deleteMany({
      where: { task: { creator: { email: { startsWith: 'import-' } } } },
    });
    await prisma.activityLog.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.task.deleteMany({
      where: { creator: { email: { startsWith: 'import-' } } },
    });
    await prisma.tag.deleteMany({
      where: { project: { owner: { email: { startsWith: 'import-' } } } },
    });
    await prisma.domain.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.apiKey.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.projectMember.deleteMany({
      where: { user: { email: { startsWith: 'import-' } } },
    });
    await prisma.project.deleteMany({
      where: { owner: { email: { startsWith: 'import-' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'import-' } },
    });
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // Auth
  // -------------------------------------------------------
  describe('Authentication', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .send({ project: projectName, milestones: [{ title: 'Test' }] });
      expect(res.status).toBe(401);
    });

    it('works with cookie auth', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones: [{ title: 'Cookie Task' }] });
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(1);
    });

    it('works with API key auth', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('X-API-Key', apiKey)
        .send({ project: projectName, milestones: [{ title: 'API Key Task' }] });
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(1);
    });
  });

  // -------------------------------------------------------
  // Validation
  // -------------------------------------------------------
  describe('Validation', () => {
    it('rejects missing project field', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ milestones: [{ title: 'Test' }] });
      expect(res.status).toBe(400);
    });

    it('rejects empty milestones array', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones: [] });
      expect(res.status).toBe(400);
    });

    it('rejects invalid priority', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones: [{ title: 'Test', priority: 'CRITICAL' }] });
      expect(res.status).toBe(400);
    });

    it('rejects invalid status', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones: [{ title: 'Test', status: 'BLOCKED' }] });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------
  // Project Resolution
  // -------------------------------------------------------
  describe('Project resolution', () => {
    it('resolves project by UUID', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectId, milestones: [{ title: 'UUID Resolve' }] });
      expect(res.status).toBe(201);
      expect(res.body.project.id).toBe(projectId);
    });

    it('resolves project by name', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones: [{ title: 'Name Resolve' }] });
      expect(res.status).toBe(201);
      expect(res.body.project.name).toBe(projectName);
    });

    it('resolves project name case-insensitively', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName.toLowerCase(), milestones: [{ title: 'Case Test' }] });
      expect(res.status).toBe(201);
      expect(res.body.project.name).toBe(projectName);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: 'no-such-project', milestones: [{ title: 'Nope' }] });
      expect(res.status).toBe(404);
    });

    it('returns 404 if user is not a member', async () => {
      // Register a fresh user who is NOT a member of the project
      const freshRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'import-outsider@example.com', password: 'Password1', name: 'Outsider' });
      const freshCookie = extractAuthCookie(freshRes)!;

      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', freshCookie)
        .send({ project: projectName, milestones: [{ title: 'No Access' }] });
      expect(res.status).toBe(404);

      // Clean up outsider
      await prisma.user.deleteMany({ where: { email: 'import-outsider@example.com' } });
    });
  });

  // -------------------------------------------------------
  // Permissions
  // -------------------------------------------------------
  describe('Permissions', () => {
    it('OWNER can import → 201', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones: [{ title: 'Owner Import' }] });
      expect(res.status).toBe(201);
    });

    it('MEMBER can import → 201', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', memberCookie)
        .send({ project: projectName, milestones: [{ title: 'Member Import' }] });
      expect(res.status).toBe(201);
    });

    it('VIEWER cannot import → 403', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', viewerCookie)
        .send({ project: projectName, milestones: [{ title: 'Viewer Import' }] });
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------
  // Tags
  // -------------------------------------------------------
  describe('Tags', () => {
    it('creates new tags automatically', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          milestones: [{ title: 'Tagged Task', tags: ['milestone', 'phase-1'] }],
        });
      expect(res.status).toBe(201);

      const tags = await prisma.tag.findMany({
        where: { projectId, name: { in: ['milestone', 'phase-1'] } },
      });
      expect(tags.length).toBe(2);
    });

    it('reuses existing tags', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          milestones: [{ title: 'Reuse Tag', tags: ['milestone'] }],
        });
      expect(res.status).toBe(201);

      // Should still only have one tag named 'milestone'
      const tags = await prisma.tag.findMany({
        where: { projectId, name: 'milestone' },
      });
      expect(tags.length).toBe(1);
    });
  });

  // -------------------------------------------------------
  // Domains
  // -------------------------------------------------------
  describe('Domains', () => {
    it('matches existing domains', async () => {
      // Get the auto-seeded domain names
      const domains = await prisma.domain.findMany({ where: { userId: ownerId } });
      expect(domains.length).toBeGreaterThan(0);
      const domainName = domains[0].name;

      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          milestones: [{ title: 'Domain Task', domains: [domainName] }],
        });
      expect(res.status).toBe(201);
      expect(res.body.warnings.length).toBe(0);
    });

    it('warns on missing domains (does not fail)', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          milestones: [{ title: 'Bad Domain', domains: ['NonexistentDomain'] }],
        });
      expect(res.status).toBe(201);
      expect(res.body.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('NonexistentDomain')]),
      );
    });
  });

  // -------------------------------------------------------
  // Dependencies
  // -------------------------------------------------------
  describe('Dependencies', () => {
    it('wires dependencies within the batch', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          milestones: [
            { title: 'Dep A' },
            { title: 'Dep B', dependsOn: ['Dep A'] },
          ],
        });
      expect(res.status).toBe(201);

      const taskB = res.body.tasks.find((t: { title: string }) => t.title === 'Dep B');
      const dep = await prisma.taskDependency.findFirst({
        where: { taskId: taskB.id },
      });
      expect(dep).not.toBeNull();
    });

    it('warns on missing dependency title', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          milestones: [
            { title: 'Dep C', dependsOn: ['Ghost Task'] },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Ghost Task')]),
      );
    });
  });

  // -------------------------------------------------------
  // Bulk import
  // -------------------------------------------------------
  describe('Bulk import', () => {
    it('creates multiple tasks with correct count', async () => {
      const milestones = Array.from({ length: 5 }, (_, i) => ({
        title: `Bulk Task ${i + 1}`,
        priority: i % 2 === 0 ? 'HIGH' as const : 'LOW' as const,
      }));

      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({ project: projectName, milestones });
      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(5);
      expect(res.body.tasks).toHaveLength(5);
    });

    it('returns correct response shape', async () => {
      const res = await request(app)
        .post('/api/import/milestones')
        .set('Cookie', ownerCookie)
        .send({
          project: projectName,
          source: 'claude-code-test',
          milestones: [{ title: 'Shape Check', priority: 'URGENT', status: 'TODO' }],
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        imported: 1,
        project: { id: projectId, name: projectName },
        source: 'claude-code-test',
        warnings: expect.any(Array),
      });
      expect(res.body.tasks[0]).toMatchObject({
        id: expect.any(String),
        title: 'Shape Check',
        status: 'TODO',
        priority: 'URGENT',
      });
    });
  });
});
