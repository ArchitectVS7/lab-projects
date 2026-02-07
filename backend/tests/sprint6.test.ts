import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

describe('Sprint 6: Tags, Custom Fields, Attachments', () => {
  let authCookie: string;
  let projectId: string;
  let taskId: string;
  let tagId: string;
  let fieldId: string;
  let attachmentId: string;

  beforeAll(async () => {
    // Clean up in correct order (foreign keys)
    await prisma.attachment.deleteMany();
    await prisma.customFieldValue.deleteMany();
    await prisma.customFieldDefinition.deleteMany();
    await prisma.taskTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Register user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'sprint6@test.com', password: 'Password1', name: 'Sprint6 Tester' });
    authCookie = extractAuthCookie(regRes)!;

    // Create project
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', authCookie)
      .send({ name: 'Sprint 6 Project', description: 'Test project' });
    projectId = projRes.body.id;

    // Create task
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', authCookie)
      .send({ title: 'Test Task', projectId });
    taskId = taskRes.body.id;
  });

  afterAll(async () => {
    await prisma.attachment.deleteMany();
    await prisma.customFieldValue.deleteMany();
    await prisma.customFieldDefinition.deleteMany();
    await prisma.taskTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // ---- TAGS ----
  describe('Tags API', () => {
    it('GET /api/tags without projectId returns 400', async () => {
      const res = await request(app).get('/api/tags').set('Cookie', authCookie);
      expect(res.status).toBe(400);
    });

    it('POST /api/tags creates a tag', async () => {
      const res = await request(app)
        .post('/api/tags')
        .set('Cookie', authCookie)
        .send({ name: 'Bug', color: '#ef4444', projectId });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Bug');
      expect(res.body.color).toBe('#ef4444');
      tagId = res.body.id;
    });

    it('GET /api/tags?projectId lists tags', async () => {
      const res = await request(app)
        .get(`/api/tags?projectId=${projectId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('PUT /api/tags/:id updates tag', async () => {
      const res = await request(app)
        .put(`/api/tags/${tagId}`)
        .set('Cookie', authCookie)
        .send({ name: 'Critical Bug', color: '#dc2626' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Critical Bug');
    });

    it('POST /api/tags/task/:taskId adds tag to task', async () => {
      const res = await request(app)
        .post(`/api/tags/task/${taskId}`)
        .set('Cookie', authCookie)
        .send({ tagId });
      expect(res.status).toBe(201);
      expect(res.body.tag).toBeDefined();
    });

    it('GET /api/tasks returns tasks with tags included', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      const task = res.body.find((t: any) => t.id === taskId);
      expect(task.tags).toBeDefined();
      expect(task.tags.length).toBeGreaterThanOrEqual(1);
    });

    it('DELETE /api/tags/task/:taskId/:tagId removes tag from task', async () => {
      const res = await request(app)
        .delete(`/api/tags/task/${taskId}/${tagId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(204);
    });

    it('DELETE /api/tags/:id deletes tag', async () => {
      const res = await request(app)
        .delete(`/api/tags/${tagId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(204);
    });
  });

  // ---- CUSTOM FIELDS ----
  describe('Custom Fields API', () => {
    it('POST /api/custom-fields creates TEXT field', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', authCookie)
        .send({ name: 'Effort', type: 'TEXT', projectId });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('TEXT');
      fieldId = res.body.id;
    });

    it('POST /api/custom-fields creates DROPDOWN field', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', authCookie)
        .send({ name: 'Environment', type: 'DROPDOWN', options: '["Dev","Staging","Prod"]', projectId });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('DROPDOWN');
    });

    it('GET /api/custom-fields?projectId lists fields', async () => {
      const res = await request(app)
        .get(`/api/custom-fields?projectId=${projectId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('PUT /api/custom-fields/:id updates field', async () => {
      const res = await request(app)
        .put(`/api/custom-fields/${fieldId}`)
        .set('Cookie', authCookie)
        .send({ name: 'Story Points' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Story Points');
    });

    it('PUT /api/custom-fields/task/:taskId sets field values', async () => {
      const res = await request(app)
        .put(`/api/custom-fields/task/${taskId}`)
        .set('Cookie', authCookie)
        .send({ fields: [{ fieldId, value: '5' }] });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].value).toBe('5');
    });

    it('GET /api/custom-fields/task/:taskId gets field values', async () => {
      const res = await request(app)
        .get(`/api/custom-fields/task/${taskId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].field).toBeDefined();
    });

    it('DELETE /api/custom-fields/:id deletes field', async () => {
      const res = await request(app)
        .delete(`/api/custom-fields/${fieldId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(204);
    });
  });

  // ---- ATTACHMENTS ----
  describe('Attachments API', () => {
    // Create a small test file
    const testFilePath = path.join(__dirname, 'test-upload.txt');

    beforeAll(() => {
      fs.writeFileSync(testFilePath, 'Hello, this is a test file for Sprint 6.');
    });

    afterAll(() => {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    });

    it('POST /api/attachments/task/:taskId uploads file', async () => {
      const res = await request(app)
        .post(`/api/attachments/task/${taskId}`)
        .set('Cookie', authCookie)
        .attach('file', testFilePath);
      expect(res.status).toBe(201);
      expect(res.body.originalName).toBe('test-upload.txt');
      expect(res.body.mimeType).toBe('text/plain');
      expect(res.body.uploadedBy).toBeDefined();
      attachmentId = res.body.id;
    });

    it('GET /api/attachments/task/:taskId lists attachments', async () => {
      const res = await request(app)
        .get(`/api/attachments/task/${taskId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('GET /api/attachments/:id/download downloads file', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(200);
    });

    it('DELETE /api/attachments/:id deletes attachment', async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set('Cookie', authCookie);
      expect(res.status).toBe(204);
    });
  });
});
