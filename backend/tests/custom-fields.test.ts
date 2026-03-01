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

describe('Custom Fields', () => {
  let owner: { id: string; email: string; cookie: string };
  let member: { id: string; email: string; cookie: string };
  let projectId: string;

  beforeAll(async () => {
    // Clean DB
    await prisma.customFieldValue.deleteMany();
    await prisma.customFieldDefinition.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Register owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'cf-owner@test.com', password: 'P@ssword1234', name: 'CF Owner' });
    owner = {
      id: ownerRes.body.user.id,
      email: 'cf-owner@test.com',
      cookie: extractAuthCookie(ownerRes)!,
    };

    // Register member
    const memberRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'cf-member@test.com', password: 'P@ssword1234', name: 'CF Member' });
    member = {
      id: memberRes.body.user.id,
      email: 'cf-member@test.com',
      cookie: extractAuthCookie(memberRes)!,
    };

    // Create a project by owner
    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', owner.cookie)
      .send({ name: 'CF Test Project' });
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    await prisma.customFieldValue.deleteMany();
    await prisma.customFieldDefinition.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // 1. Options validation for SELECT (DROPDOWN) fields
  // -------------------------------------------------------
  describe('options validation', () => {
    it('should accept a valid options array on a DROPDOWN field (201)', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Priority Level',
          type: 'DROPDOWN',
          options: ['Low', 'Medium', 'High'],
          projectId,
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('DROPDOWN');
      expect(Array.isArray(res.body.options)).toBe(true);
      expect(res.body.options).toEqual(['Low', 'Medium', 'High']);

      // Clean up
      await prisma.customFieldDefinition.delete({ where: { id: res.body.id } });
    });

    it('should reject options on a TEXT field with 400', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Text Field With Options',
          type: 'TEXT',
          options: ['option1', 'option2'],
          projectId,
        });

      expect(res.status).toBe(400);
    });

    it('should reject options on a NUMBER field with 400', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Number Field With Options',
          type: 'NUMBER',
          options: ['1', '2'],
          projectId,
        });

      expect(res.status).toBe(400);
    });

    it('should reject options on a DATE field with 400', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Date Field With Options',
          type: 'DATE',
          options: ['2026-01-01'],
          projectId,
        });

      expect(res.status).toBe(400);
    });

    it('should reject an options array with more than 50 items', async () => {
      const tooManyOptions = Array.from({ length: 51 }, (_, i) => `Option ${i + 1}`);

      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Too Many Options',
          type: 'DROPDOWN',
          options: tooManyOptions,
          projectId,
        });

      expect(res.status).toBe(400);
    });

    it('should accept exactly 50 options (boundary)', async () => {
      const exactly50 = Array.from({ length: 50 }, (_, i) => `Option ${i + 1}`);

      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Max Options Field',
          type: 'DROPDOWN',
          options: exactly50,
          projectId,
        });

      expect(res.status).toBe(201);
      expect(res.body.options).toHaveLength(50);

      // Clean up
      await prisma.customFieldDefinition.delete({ where: { id: res.body.id } });
    });

    it('should reject options with an item longer than 100 characters', async () => {
      const longOption = 'a'.repeat(101);

      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Long Option Field',
          type: 'DROPDOWN',
          options: ['Valid', longOption],
          projectId,
        });

      expect(res.status).toBe(400);
    });

    it('should accept options items up to exactly 100 characters (boundary)', async () => {
      const maxLengthOption = 'a'.repeat(100);

      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Max Char Option Field',
          type: 'DROPDOWN',
          options: ['Short', maxLengthOption],
          projectId,
        });

      expect(res.status).toBe(201);
      expect(res.body.options).toContain(maxLengthOption);

      // Clean up
      await prisma.customFieldDefinition.delete({ where: { id: res.body.id } });
    });
  });

  // -------------------------------------------------------
  // 2. DROPDOWN field requires options (existing rule)
  // -------------------------------------------------------
  describe('DROPDOWN field requirements', () => {
    it('should require options for DROPDOWN fields (400)', async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Missing Options Dropdown',
          type: 'DROPDOWN',
          projectId,
        });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------
  // 3. GET returns parsed options array
  // -------------------------------------------------------
  describe('options serialization round-trip', () => {
    let dropdownFieldId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/custom-fields')
        .set('Cookie', owner.cookie)
        .send({
          name: 'Status',
          type: 'DROPDOWN',
          options: ['Todo', 'In Progress', 'Done'],
          projectId,
        });
      dropdownFieldId = res.body.id;
    });

    afterAll(async () => {
      await prisma.customFieldDefinition.deleteMany({ where: { projectId } });
    });

    it('should return options as an array (not a JSON string) in GET response', async () => {
      const res = await request(app)
        .get(`/api/custom-fields?projectId=${projectId}`)
        .set('Cookie', owner.cookie);

      expect(res.status).toBe(200);
      const field = res.body.find((f: any) => f.id === dropdownFieldId);
      expect(field).toBeDefined();
      expect(Array.isArray(field.options)).toBe(true);
      expect(field.options).toEqual(['Todo', 'In Progress', 'Done']);
    });

    it('should return options as an array after PUT update', async () => {
      const res = await request(app)
        .put(`/api/custom-fields/${dropdownFieldId}`)
        .set('Cookie', owner.cookie)
        .send({ options: ['Open', 'Closed'] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.options)).toBe(true);
      expect(res.body.options).toEqual(['Open', 'Closed']);
    });

    it('should reject update with options on non-dropdown type', async () => {
      const res = await request(app)
        .put(`/api/custom-fields/${dropdownFieldId}`)
        .set('Cookie', owner.cookie)
        .send({ type: 'TEXT', options: ['Should', 'Fail'] });

      expect(res.status).toBe(400);
    });
  });
});
