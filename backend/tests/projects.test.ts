/**
 * projects.test.ts
 *
 * Integration tests for the /api/projects routes, focused on:
 * - CRUD operations (create, read, update, delete)
 * - RBAC enforcement: OWNER > ADMIN > MEMBER / VIEWER permissions
 * - Member management endpoints (add, remove, role change)
 * - Non-member isolation (no information leakage)
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractAuthCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as string[] | string | undefined;
  if (!cookies) throw new Error('No set-cookie header');
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  const auth = arr.find((c: string) => c.startsWith('auth_token='));
  if (!auth) throw new Error('auth_token cookie not found');
  return auth;
}

async function registerUser(suffix: string): Promise<{ id: string; email: string; cookie: string }> {
  const email = `proj-test-${suffix}@test.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'TestPass1@secure', name: `ProjTest ${suffix}` });
  return { id: res.body.user.id, email, cookie: extractAuthCookie(res) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Projects API', () => {
  let owner: { id: string; email: string; cookie: string };
  let admin: { id: string; email: string; cookie: string };
  let member: { id: string; email: string; cookie: string };
  let viewer: { id: string; email: string; cookie: string };
  let nonMember: { id: string; email: string; cookie: string };

  let projectId: string;

  beforeAll(async () => {
    // Clean DB state
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.recurringTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: 'proj-test-' } } });

    // Create test users
    [owner, admin, member, viewer, nonMember] = await Promise.all([
      registerUser('owner'),
      registerUser('admin'),
      registerUser('member'),
      registerUser('viewer'),
      registerUser('nonmember'),
    ]);

    // Owner creates the project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', owner.cookie)
      .send({ name: 'RBAC Test Project', description: 'Tests for project RBAC' });
    projectId = projRes.body.id;

    // Add admin, member, viewer with appropriate roles
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', owner.cookie)
      .send({ email: admin.email, role: 'ADMIN' });

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', owner.cookie)
      .send({ email: member.email, role: 'MEMBER' });

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', owner.cookie)
      .send({ email: viewer.email, role: 'VIEWER' });
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.recurringTask.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: 'proj-test-' } } });
    await prisma.$disconnect();
  });

  // ─── GET /api/projects ──────────────────────────────────────────────────────

  describe('GET /api/projects', () => {
    it('returns projects the caller is a member of', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', owner.cookie);
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map(p => p.id);
      expect(ids).toContain(projectId);
    });

    it('does not return projects the caller has no access to', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', nonMember.cookie);
      expect(res.status).toBe(200);
      const ids = (res.body as Array<{ id: string }>).map(p => p.id);
      expect(ids).not.toContain(projectId);
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/projects/:id ─────────────────────────────────────────────────

  describe('GET /api/projects/:id', () => {
    it('allows owner to read project details', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', owner.cookie);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(projectId);
      expect(res.body.name).toBe('RBAC Test Project');
    });

    it('allows all member roles to read project details', async () => {
      for (const user of [admin, member, viewer]) {
        const res = await request(app)
          .get(`/api/projects/${projectId}`)
          .set('Cookie', user.cookie);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(projectId);
      }
    });

    it('returns 404 for non-members (no information leakage)', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', nonMember.cookie);
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/projects ────────────────────────────────────────────────────

  describe('POST /api/projects', () => {
    it('creates a project and sets creator as OWNER', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', nonMember.cookie)
        .send({ name: 'NonMember Own Project' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('NonMember Own Project');

      const membership = await prisma.projectMember.findFirst({
        where: { projectId: res.body.id, userId: nonMember.id },
      });
      expect(membership?.role).toBe('OWNER');

      // Clean up
      await prisma.projectMember.deleteMany({ where: { projectId: res.body.id } });
      await prisma.project.delete({ where: { id: res.body.id } });
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: 'Should Fail' });
      expect(res.status).toBe(401);
    });
  });

  // ─── PUT /api/projects/:id ─────────────────────────────────────────────────

  describe('PUT /api/projects/:id — update (OWNER/ADMIN only)', () => {
    it('allows owner to update project name', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Cookie', owner.cookie)
        .send({ name: 'Updated Name by Owner' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name by Owner');
    });

    it('allows admin to update project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Cookie', admin.cookie)
        .send({ name: 'Updated by Admin' });
      expect(res.status).toBe(200);
    });

    it('blocks MEMBER from updating project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Cookie', member.cookie)
        .send({ name: 'Member Attempt' });
      expect(res.status).toBe(403);
    });

    it('blocks VIEWER from updating project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Cookie', viewer.cookie)
        .send({ name: 'Viewer Attempt' });
      expect(res.status).toBe(403);
    });

    it('blocks non-member from updating project', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Cookie', nonMember.cookie)
        .send({ name: 'Non-member Attempt' });
      expect(res.status).toBe(403);
    });
  });

  // ─── DELETE /api/projects/:id ──────────────────────────────────────────────

  describe('DELETE /api/projects/:id — owner only', () => {
    let tempProjectId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', owner.cookie)
        .send({ name: 'Temp Project for Deletion' });
      tempProjectId = res.body.id;

      // Add admin so we can test their inability to delete
      await request(app)
        .post(`/api/projects/${tempProjectId}/members`)
        .set('Cookie', owner.cookie)
        .send({ email: admin.email, role: 'ADMIN' });
    });

    afterEach(async () => {
      // Clean up if test didn't delete it
      await prisma.projectMember.deleteMany({ where: { projectId: tempProjectId } });
      await prisma.project.deleteMany({ where: { id: tempProjectId } });
    });

    it('allows owner to delete their project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${tempProjectId}`)
        .set('Cookie', owner.cookie);
      expect(res.status).toBe(204);
    });

    it('blocks admin from deleting a project they do not own', async () => {
      const res = await request(app)
        .delete(`/api/projects/${tempProjectId}`)
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(403);
    });

    it('blocks non-member from deleting a project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${tempProjectId}`)
        .set('Cookie', nonMember.cookie);
      expect(res.status).toBe(403);
    });
  });

  // ─── POST /api/projects/:id/members ───────────────────────────────────────

  describe('POST /api/projects/:id/members — add member (OWNER/ADMIN only)', () => {
    let extraUser: { id: string; email: string; cookie: string };

    beforeAll(async () => {
      extraUser = await registerUser('extra');
    });

    it('allows owner to add a new member', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', owner.cookie)
        .send({ email: extraUser.email, role: 'MEMBER' });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe('MEMBER');

      // Clean up
      await prisma.projectMember.deleteMany({ where: { projectId, userId: extraUser.id } });
    });

    it('allows admin to add a new member', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', admin.cookie)
        .send({ email: extraUser.email, role: 'VIEWER' });
      expect(res.status).toBe(201);

      // Clean up
      await prisma.projectMember.deleteMany({ where: { projectId, userId: extraUser.id } });
    });

    it('blocks MEMBER from adding members', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', member.cookie)
        .send({ email: extraUser.email, role: 'MEMBER' });
      expect(res.status).toBe(403);
    });

    it('blocks VIEWER from adding members', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', viewer.cookie)
        .send({ email: extraUser.email, role: 'MEMBER' });
      expect(res.status).toBe(403);
    });

    it('returns 409 when adding a user already in the project', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', owner.cookie)
        .send({ email: member.email, role: 'MEMBER' });
      expect(res.status).toBe(409);
    });

    it('returns 404 when adding a non-existent email', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', owner.cookie)
        .send({ email: 'nobody@nowhere.invalid', role: 'MEMBER' });
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/projects/:id/members/:userId ─────────────────────────────

  describe('DELETE /api/projects/:id/members/:userId — remove member (OWNER/ADMIN only)', () => {
    let targetUser: { id: string; email: string; cookie: string };

    beforeEach(async () => {
      targetUser = await registerUser(`rm-target-${Date.now()}`);
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', owner.cookie)
        .send({ email: targetUser.email, role: 'MEMBER' });
    });

    afterEach(async () => {
      await prisma.projectMember.deleteMany({ where: { projectId, userId: targetUser.id } });
      await prisma.user.deleteMany({ where: { id: targetUser.id } });
    });

    it('allows owner to remove a member', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/members/${targetUser.id}`)
        .set('Cookie', owner.cookie);
      expect(res.status).toBe(204);
    });

    it('allows admin to remove a member', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/members/${targetUser.id}`)
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(204);
    });

    it('blocks MEMBER from removing members', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/members/${targetUser.id}`)
        .set('Cookie', member.cookie);
      expect(res.status).toBe(403);
    });

    it('prevents removing the project owner', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/members/${owner.id}`)
        .set('Cookie', admin.cookie);
      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /api/projects/:id/members/:userId ──────────────────────────────

  describe('PATCH /api/projects/:id/members/:userId — change role (OWNER/ADMIN only)', () => {
    it('allows owner to promote a member to admin', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${member.id}`)
        .set('Cookie', owner.cookie)
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('ADMIN');

      // Restore original role
      await request(app)
        .patch(`/api/projects/${projectId}/members/${member.id}`)
        .set('Cookie', owner.cookie)
        .send({ role: 'MEMBER' });
    });

    it('allows admin to change a member role', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${viewer.id}`)
        .set('Cookie', admin.cookie)
        .send({ role: 'MEMBER' });
      expect(res.status).toBe(200);

      // Restore
      await request(app)
        .patch(`/api/projects/${projectId}/members/${viewer.id}`)
        .set('Cookie', owner.cookie)
        .send({ role: 'VIEWER' });
    });

    it('blocks MEMBER from changing roles', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${viewer.id}`)
        .set('Cookie', member.cookie)
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(403);
    });

    it('prevents changing the owner role', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${owner.id}`)
        .set('Cookie', admin.cookie)
        .send({ role: 'MEMBER' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid role values', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${member.id}`)
        .set('Cookie', owner.cookie)
        .send({ role: 'SUPERADMIN' });
      expect(res.status).toBe(400);
    });
  });
});
