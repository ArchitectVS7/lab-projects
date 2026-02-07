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

describe('Comments System', () => {
  let owner: { id: string; email: string; cookie: string; name: string };
  let admin: { id: string; email: string; cookie: string; name: string };
  let member: { id: string; email: string; cookie: string; name: string };
  let viewer: { id: string; email: string; cookie: string; name: string };
  let outsider: { id: string; email: string; cookie: string; name: string };

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
      .send({ email: 'c-owner@test.com', password: 'Password1', name: 'Owner User' });
    owner = { id: ownerRes.body.user.id, email: 'c-owner@test.com', cookie: extractAuthCookie(ownerRes)!, name: 'Owner User' };

    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'c-admin@test.com', password: 'Password1', name: 'Admin User' });
    admin = { id: adminRes.body.user.id, email: 'c-admin@test.com', cookie: extractAuthCookie(adminRes)!, name: 'Admin User' };

    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'c-member@test.com', password: 'Password1', name: 'Member User' });
    member = { id: memberRes.body.user.id, email: 'c-member@test.com', cookie: extractAuthCookie(memberRes)!, name: 'Member User' };

    const viewerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'c-viewer@test.com', password: 'Password1', name: 'Viewer User' });
    viewer = { id: viewerRes.body.user.id, email: 'c-viewer@test.com', cookie: extractAuthCookie(viewerRes)!, name: 'Viewer User' };

    const outsiderRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'c-outsider@test.com', password: 'Password1', name: 'Outsider User' });
    outsider = { id: outsiderRes.body.user.id, email: 'c-outsider@test.com', cookie: extractAuthCookie(outsiderRes)!, name: 'Outsider User' };

    // Create project and add members
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', owner.cookie)
      .send({ name: 'Comment Test Project' });
    projectId = projRes.body.id;

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

    // Create a task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', owner.cookie)
      .send({ title: 'Comment Test Task', projectId });
    taskId = taskRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- Comment CRUD ---

  describe('Comment CRUD', () => {
    let commentId: string;

    it('should create a comment', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'This is a test comment' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('This is a test comment');
      expect(res.body.authorId).toBe(member.id);
      expect(res.body.author.name).toBe('Member User');
      commentId = res.body.id;
    });

    it('should list comments for a task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Cookie', owner.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].content).toBe('This is a test comment');
    });

    it('should update own comment', async () => {
      const res = await request(app)
        .put(`/api/comments/${commentId}`)
        .set('Cookie', member.cookie)
        .send({ content: 'Updated comment content' });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Updated comment content');
      expect(res.body.editedAt).not.toBeNull();
    });

    it('should delete own comment', async () => {
      // Create a new comment to delete
      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'To be deleted' });

      const res = await request(app)
        .delete(`/api/comments/${createRes.body.id}`)
        .set('Cookie', member.cookie);

      expect(res.status).toBe(204);
    });
  });

  // --- Permission checks ---

  describe('Permission checks', () => {
    it('VIEWER should not be able to comment', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', viewer.cookie)
        .send({ content: 'Viewer comment' });

      expect(res.status).toBe(403);
    });

    it('VIEWER can read comments', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Cookie', viewer.cookie);

      expect(res.status).toBe(200);
    });

    it('MEMBER cannot edit others\' comments', async () => {
      // Owner creates a comment
      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', owner.cookie)
        .send({ content: 'Owner comment' });

      const res = await request(app)
        .put(`/api/comments/${createRes.body.id}`)
        .set('Cookie', member.cookie)
        .send({ content: 'Member trying to edit' });

      expect(res.status).toBe(403);
    });

    it('ADMIN can edit others\' comments', async () => {
      // Member creates a comment
      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Member comment to be edited by admin' });

      const res = await request(app)
        .put(`/api/comments/${createRes.body.id}`)
        .set('Cookie', admin.cookie)
        .send({ content: 'Admin edited this' });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Admin edited this');
    });

    it('ADMIN can delete others\' comments', async () => {
      const createRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Member comment to be deleted by admin' });

      const res = await request(app)
        .delete(`/api/comments/${createRes.body.id}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(204);
    });

    it('outsider cannot access comments', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Cookie', outsider.cookie);

      expect(res.status).toBe(404);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`);

      expect(res.status).toBe(401);
    });
  });

  // --- Validation ---

  describe('Validation', () => {
    it('should reject empty content', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('should reject content exceeding max length', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'x'.repeat(5001) });

      expect(res.status).toBe(400);
    });

    it('should reject invalid task ID', async () => {
      const res = await request(app)
        .post('/api/tasks/not-a-uuid/comments')
        .set('Cookie', member.cookie)
        .send({ content: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should reject comment for non-existent task', async () => {
      const res = await request(app)
        .post('/api/tasks/00000000-0000-0000-0000-000000000000/comments')
        .set('Cookie', member.cookie)
        .send({ content: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  // --- Reply threading ---

  describe('Reply threading', () => {
    let parentCommentId: string;

    it('should create a reply to a comment', async () => {
      // Create parent comment
      const parentRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', owner.cookie)
        .send({ content: 'Parent comment' });
      parentCommentId = parentRes.body.id;

      // Create reply
      const replyRes = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Reply to parent', parentId: parentCommentId });

      expect(replyRes.status).toBe(201);
      expect(replyRes.body.parentId).toBe(parentCommentId);
    });

    it('should include replies when listing comments', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskId}/comments`)
        .set('Cookie', owner.cookie);

      const parent = res.body.find((c: any) => c.id === parentCommentId);
      expect(parent).toBeDefined();
      expect(parent.replies.length).toBeGreaterThanOrEqual(1);
      expect(parent.replies[0].content).toBe('Reply to parent');
    });

    it('should reject reply to non-existent parent', async () => {
      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Bad reply', parentId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });
  });

  // --- @mention notifications ---

  describe('@mention notifications', () => {
    it('should create notification when mentioning a user', async () => {
      // Clear existing notifications
      await prisma.notification.deleteMany({ where: { userId: admin.id } });

      const res = await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Hey @Admin.User check this out' });

      expect(res.status).toBe(201);

      // Check notifications for admin
      const notifications = await prisma.notification.findMany({
        where: { userId: admin.id, type: 'MENTION' },
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].message).toContain('mentioned you');
    });

    it('should not notify self-mentions', async () => {
      // Clear existing notifications
      await prisma.notification.deleteMany({ where: { userId: member.id } });

      await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Mentioning myself @Member.User' });

      const notifications = await prisma.notification.findMany({
        where: { userId: member.id, type: 'MENTION' },
      });

      expect(notifications.length).toBe(0);
    });
  });

  // --- Activity logging for comments ---

  describe('Activity logging', () => {
    it('should log comment creation as COMMENT_ADDED', async () => {
      // Count existing activity logs
      const beforeCount = await prisma.activityLog.count({
        where: { taskId, action: 'COMMENT_ADDED' },
      });

      await request(app)
        .post(`/api/tasks/${taskId}/comments`)
        .set('Cookie', member.cookie)
        .send({ content: 'Activity log test comment' });

      const afterCount = await prisma.activityLog.count({
        where: { taskId, action: 'COMMENT_ADDED' },
      });

      expect(afterCount).toBe(beforeCount + 1);
    });
  });
});
