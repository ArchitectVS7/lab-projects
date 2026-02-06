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

describe('Phase 2: Projects & Team Management', () => {
  let alice: { id: string; email: string; cookie: string };
  let bob: { id: string; email: string; cookie: string };
  let charlie: { id: string; email: string; cookie: string };

  // Clean DB before all tests
  beforeAll(async () => {
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const aliceRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'Password1', name: 'Alice' });
    alice = {
      id: aliceRes.body.user.id,
      email: aliceRes.body.user.email,
      cookie: extractAuthCookie(aliceRes)!,
    };

    const bobRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'Password1', name: 'Bob' });
    bob = {
      id: bobRes.body.user.id,
      email: bobRes.body.user.email,
      cookie: extractAuthCookie(bobRes)!,
    };

    const charlieRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'charlie@example.com', password: 'Password1', name: 'Charlie' });
    charlie = {
      id: charlieRes.body.user.id,
      email: charlieRes.body.user.email,
      cookie: extractAuthCookie(charlieRes)!,
    };
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // -------------------------------------------------------
  // POST /api/projects - Create Project
  // -------------------------------------------------------
  describe('POST /api/projects', () => {
    it('creates a project with valid data → 201, auto-creates OWNER membership', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({
          name: 'Alice Project',
          description: 'A test project',
          color: '#6366f1',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Alice Project');
      expect(res.body.description).toBe('A test project');
      expect(res.body.color).toBe('#6366f1');
      expect(res.body.ownerId).toBe(alice.id);

      // Verify OWNER membership created
      expect(res.body.members).toBeDefined();
      expect(res.body.members.length).toBe(1);
      expect(res.body.members[0].userId).toBe(alice.id);
      expect(res.body.members[0].role).toBe('OWNER');

      // Verify owner details included
      expect(res.body.owner).toBeDefined();
      expect(res.body.owner.id).toBe(alice.id);
      expect(res.body.owner.email).toBe(alice.email);
      expect(res.body.owner.name).toBe('Alice');

      // Verify _count.tasks included
      expect(res.body._count).toBeDefined();
      expect(res.body._count.tasks).toBe(0);
    });

    it('uses default color if not provided', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({
          name: 'Default Color Project',
        });

      expect(res.status).toBe(201);
      expect(res.body.color).toBe('#6366f1');
    });

    it('accepts optional description', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({
          name: 'Bob Project',
          description: 'Bob description',
        });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Bob description');
    });

    it('rejects empty name → 400', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('rejects name longer than 100 chars → 400', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({
          name: 'a'.repeat(101),
        });

      expect(res.status).toBe(400);
    });

    it('rejects description longer than 500 chars → 400', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({
          name: 'Long Description Project',
          description: 'x'.repeat(501),
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid color format → 400', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({
          name: 'Bad Color',
          color: 'not-a-color',
        });

      expect(res.status).toBe(400);
      expect(res.body.details.some((d: { message: string }) =>
        d.message.includes('hex color')
      )).toBe(true);
    });

    it('rejects request without authentication → 401', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({
          name: 'Unauthorized Project',
        });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // GET /api/projects - List Projects
  // -------------------------------------------------------
  describe('GET /api/projects', () => {
    let sharedProject: { id: string };

    beforeAll(async () => {
      // Create a shared project owned by Bob with Alice as member
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Shared Project' });
      sharedProject = { id: projectRes.body.id };

      // Add Alice as ADMIN
      await request(app)
        .post(`/api/projects/${sharedProject.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'ADMIN' });
    });

    it('returns only projects where user is owner or member', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Alice should see: Alice Project (owner), Default Color Project (owner), Shared Project (member)
      const aliceProjects = res.body.filter((p: { ownerId: string }) => p.ownerId === alice.id);
      const sharedProjects = res.body.filter((p: { id: string }) => p.id === sharedProject.id);

      expect(aliceProjects.length).toBeGreaterThanOrEqual(2); // At least Alice Project and Default Color
      expect(sharedProjects.length).toBe(1);
    });

    it('returns projects ordered by createdAt desc', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);

      if (res.body.length > 1) {
        const dates = res.body.map((p: { createdAt: string }) => new Date(p.createdAt).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });

    it('includes owner, members, and task count', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const project = res.body[0];
      expect(project.owner).toBeDefined();
      expect(project.owner.id).toBeDefined();
      expect(project.owner.email).toBeDefined();
      expect(project.owner.name).toBeDefined();
      expect(project.members).toBeDefined();
      expect(Array.isArray(project.members)).toBe(true);
      expect(project._count).toBeDefined();
      expect(project._count.tasks).toBeDefined();
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('returns empty array for user with no projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', charlie.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // -------------------------------------------------------
  // GET /api/projects/:id - Get Project Detail
  // -------------------------------------------------------
  describe('GET /api/projects/:id', () => {
    let aliceProject: { id: string };

    beforeAll(async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Detail Test Project' });
      aliceProject = { id: projectRes.body.id };
    });

    it('returns project detail with tasks, members, owner → 200', async () => {
      const res = await request(app)
        .get(`/api/projects/${aliceProject.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(aliceProject.id);
      expect(res.body.name).toBe('Detail Test Project');

      // Verify owner details
      expect(res.body.owner).toBeDefined();
      expect(res.body.owner.id).toBe(alice.id);

      // Verify members
      expect(res.body.members).toBeDefined();
      expect(Array.isArray(res.body.members)).toBe(true);
      expect(res.body.members[0].user).toBeDefined();

      // Verify tasks
      expect(res.body.tasks).toBeDefined();
      expect(Array.isArray(res.body.tasks)).toBe(true);

      // Verify _count
      expect(res.body._count).toBeDefined();
      expect(res.body._count.tasks).toBe(0);
    });

    it('returns 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/projects/${fakeId}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('returns 404 for project user is not member of', async () => {
      // Charlie is not a member of Alice's project
      const res = await request(app)
        .get(`/api/projects/${aliceProject.id}`)
        .set('Cookie', charlie.cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Project not found');
    });

    it('rejects invalid UUID format → 400', async () => {
      const res = await request(app)
        .get('/api/projects/not-a-uuid')
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid project ID format');
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get(`/api/projects/${aliceProject.id}`);
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // PUT /api/projects/:id - Update Project
  // -------------------------------------------------------
  describe('PUT /api/projects/:id', () => {
    let ownerProject: { id: string };
    let adminProject: { id: string };
    let memberProject: { id: string };
    let viewerProject: { id: string };

    beforeAll(async () => {
      // Create project owned by Bob
      const ownerRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Owner Update Test' });
      ownerProject = { id: ownerRes.body.id };

      // Create projects with Alice in different roles
      const adminRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Admin Update Test' });
      adminProject = { id: adminRes.body.id };
      await request(app)
        .post(`/api/projects/${adminProject.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'ADMIN' });

      const memberRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Member Update Test' });
      memberProject = { id: memberRes.body.id };
      await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'MEMBER' });

      const viewerRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Viewer Update Test' });
      viewerProject = { id: viewerRes.body.id };
      await request(app)
        .post(`/api/projects/${viewerProject.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'VIEWER' });
    });

    it('OWNER can update project → 200', async () => {
      const res = await request(app)
        .put(`/api/projects/${ownerProject.id}`)
        .set('Cookie', bob.cookie)
        .send({
          name: 'Updated Name',
          description: 'Updated Description',
          color: '#ff0000',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.description).toBe('Updated Description');
      expect(res.body.color).toBe('#ff0000');
    });

    it('ADMIN can update project → 200', async () => {
      const res = await request(app)
        .put(`/api/projects/${adminProject.id}`)
        .set('Cookie', alice.cookie)
        .send({ name: 'Admin Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Admin Updated');
    });

    it('MEMBER cannot update project → 403', async () => {
      const res = await request(app)
        .put(`/api/projects/${memberProject.id}`)
        .set('Cookie', alice.cookie)
        .send({ name: 'Member Attempt' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only project owners and admins');
    });

    it('VIEWER cannot update project → 403', async () => {
      const res = await request(app)
        .put(`/api/projects/${viewerProject.id}`)
        .set('Cookie', alice.cookie)
        .send({ name: 'Viewer Attempt' });

      expect(res.status).toBe(403);
    });

    it('allows partial updates', async () => {
      const res = await request(app)
        .put(`/api/projects/${ownerProject.id}`)
        .set('Cookie', bob.cookie)
        .send({ description: 'Only description updated' });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Only description updated');
      expect(res.body.name).toBe('Updated Name'); // Previous value retained
    });

    it('rejects invalid data → 400', async () => {
      const res = await request(app)
        .put(`/api/projects/${ownerProject.id}`)
        .set('Cookie', bob.cookie)
        .send({ color: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .put(`/api/projects/${ownerProject.id}`)
        .send({ name: 'Unauthorized' });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // DELETE /api/projects/:id - Delete Project
  // -------------------------------------------------------
  describe('DELETE /api/projects/:id', () => {
    let deleteProject: { id: string };

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'To Be Deleted' });
      deleteProject = { id: res.body.id };

      // Add Alice as ADMIN
      await request(app)
        .post(`/api/projects/${deleteProject.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'ADMIN' });
    });

    it('OWNER can delete project → 204', async () => {
      const res = await request(app)
        .delete(`/api/projects/${deleteProject.id}`)
        .set('Cookie', bob.cookie);

      expect(res.status).toBe(204);

      // Verify project is deleted
      const getRes = await request(app)
        .get(`/api/projects/${deleteProject.id}`)
        .set('Cookie', bob.cookie);
      expect(getRes.status).toBe(404);
    });

    it('ADMIN cannot delete project → 403', async () => {
      // Create new project
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Admin Delete Test' });

      await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'ADMIN' });

      const res = await request(app)
        .delete(`/api/projects/${projectRes.body.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only the project owner');
    });

    it('MEMBER cannot delete project → 403', async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Member Delete Test' });

      await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: alice.email, role: 'MEMBER' });

      const res = await request(app)
        .delete(`/api/projects/${projectRes.body.id}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/projects/${fakeId}`)
        .set('Cookie', bob.cookie);

      expect(res.status).toBe(404);
    });

    it('returns 401 without authentication', async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', bob.cookie)
        .send({ name: 'Auth Delete Test' });

      const res = await request(app)
        .delete(`/api/projects/${projectRes.body.id}`);

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // POST /api/projects/:id/members - Add Member
  // -------------------------------------------------------
  describe('POST /api/projects/:id/members', () => {
    let memberProject: { id: string };

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Add Member Test' });
      memberProject = { id: res.body.id };
    });

    it('OWNER can add member → 201', async () => {
      const res = await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: bob.email, role: 'MEMBER' });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(bob.id);
      expect(res.body.projectId).toBe(memberProject.id);
      expect(res.body.role).toBe('MEMBER');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(bob.email);
    });

    it('ADMIN can add member → 201', async () => {
      // Create new project with Bob as ADMIN
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Admin Add Test' });

      await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: bob.email, role: 'ADMIN' });

      // Bob (ADMIN) adds Charlie
      const res = await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: charlie.email, role: 'VIEWER' });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(charlie.id);
    });

    it('normalizes email to lowercase when adding member', async () => {
      // Create project
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Email Normalization Test' });
      const projectId = projectRes.body.id;

      // Add Bob using mixed case email
      const mixedCaseEmail = bob.email.toUpperCase();
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: mixedCaseEmail, role: 'MEMBER' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(bob.email);
    });

    it('defaults to MEMBER role if not specified', async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Default Role Test' });

      const res = await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: charlie.email });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('MEMBER');
    });

    it('MEMBER cannot add member → 403', async () => {
      // Bob is already MEMBER in memberProject
      const res = await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: charlie.email });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only project owners and admins');
    });

    it('VIEWER cannot add member → 403', async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Viewer Add Test' });

      await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: bob.email, role: 'VIEWER' });

      const res = await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', bob.cookie)
        .send({ email: charlie.email });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent user email', async () => {
      const res = await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('returns 409 if user already a member', async () => {
      const res = await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: bob.email });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already a member');
    });

    it('rejects invalid email format → 400', async () => {
      const res = await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post(`/api/projects/${memberProject.id}/members`)
        .send({ email: charlie.email });

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // DELETE /api/projects/:id/members/:userId - Remove Member
  // -------------------------------------------------------
  describe('DELETE /api/projects/:id/members/:userId', () => {
    let removeProject: { id: string; ownerId: string };
    let adminId: string;
    let memberId: string;
    let viewerId: string;

    beforeAll(async () => {
      // Create project with multiple members
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Remove Member Test' });
      removeProject = { id: projectRes.body.id, ownerId: alice.id };

      // Add Bob as ADMIN
      const adminRes = await request(app)
        .post(`/api/projects/${removeProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: bob.email, role: 'ADMIN' });
      adminId = adminRes.body.userId;

      // Add Charlie as MEMBER
      const memberRes = await request(app)
        .post(`/api/projects/${removeProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: charlie.email, role: 'MEMBER' });
      memberId = memberRes.body.userId;

      // Create another user as VIEWER
      const viewerRegRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'viewer@example.com', password: 'Password1', name: 'Viewer' });
      viewerId = viewerRegRes.body.user.id;

      await request(app)
        .post(`/api/projects/${removeProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: 'viewer@example.com', role: 'VIEWER' });
    });

    it('OWNER can remove member → 204', async () => {
      const res = await request(app)
        .delete(`/api/projects/${removeProject.id}/members/${viewerId}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(204);

      // Verify member removed
      const projectRes = await request(app)
        .get(`/api/projects/${removeProject.id}`)
        .set('Cookie', alice.cookie);

      const removedMember = projectRes.body.members.find((m: { userId: string }) => m.userId === viewerId);
      expect(removedMember).toBeUndefined();
    });

    it('ADMIN can remove member → 204', async () => {
      // Bob (ADMIN) removes Charlie (MEMBER)
      const res = await request(app)
        .delete(`/api/projects/${removeProject.id}/members/${memberId}`)
        .set('Cookie', bob.cookie);

      expect(res.status).toBe(204);
    });

    it('cannot remove project OWNER → 400', async () => {
      const res = await request(app)
        .delete(`/api/projects/${removeProject.id}/members/${removeProject.ownerId}`)
        .set('Cookie', bob.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot remove the project owner');
    });

    it('MEMBER cannot remove member → 403', async () => {
      // Add Charlie back as MEMBER
      await request(app)
        .post(`/api/projects/${removeProject.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: charlie.email, role: 'MEMBER' });

      // Create another project with Charlie as MEMBER
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Member Remove Test' });

      await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: charlie.email, role: 'MEMBER' });

      await request(app)
        .post(`/api/projects/${projectRes.body.id}/members`)
        .set('Cookie', alice.cookie)
        .send({ email: bob.email, role: 'VIEWER' });

      // Charlie (MEMBER) tries to remove Bob
      const res = await request(app)
        .delete(`/api/projects/${projectRes.body.id}/members/${bob.id}`)
        .set('Cookie', charlie.cookie);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent member', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/projects/${removeProject.id}/members/${fakeId}`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not a member');
    });

    it('returns 403 for non-existent project (membership check happens first)', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/projects/${fakeProjectId}/members/${bob.id}`)
        .set('Cookie', alice.cookie);

      // Returns 403 because membership is checked before project existence
      // This is secure as it doesn't leak information about project existence
      expect(res.status).toBe(403);
    });

    it('rejects invalid UUID format → 400', async () => {
      const res = await request(app)
        .delete(`/api/projects/${removeProject.id}/members/not-a-uuid`)
        .set('Cookie', alice.cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid user ID format');
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .delete(`/api/projects/${removeProject.id}/members/${bob.id}`);

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------
  // Cross-cutting concerns
  // -------------------------------------------------------
  describe('Cross-cutting project concerns', () => {
    it('never leaks passwordHash in owner or member objects', async () => {
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', alice.cookie)
        .send({ name: 'Password Leak Check' });

      // Check project creation
      expect(projectRes.body.owner.passwordHash).toBeUndefined();
      expect(projectRes.body.owner.password_hash).toBeUndefined();

      // Check project list
      const listRes = await request(app)
        .get('/api/projects')
        .set('Cookie', alice.cookie);

      listRes.body.forEach((project: any) => {
        expect(project.owner.passwordHash).toBeUndefined();
        expect(project.owner.password_hash).toBeUndefined();
        project.members.forEach((member: any) => {
          expect(member.user.passwordHash).toBeUndefined();
          expect(member.user.password_hash).toBeUndefined();
        });
      });

      // Check project detail
      const detailRes = await request(app)
        .get(`/api/projects/${projectRes.body.id}`)
        .set('Cookie', alice.cookie);

      expect(detailRes.body.owner.passwordHash).toBeUndefined();
      detailRes.body.members.forEach((member: any) => {
        expect(member.user.passwordHash).toBeUndefined();
      });
    });

    it('project responses always include required fields', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', alice.cookie);

      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((project: any) => {
        // Core fields
        expect(project.id).toBeDefined();
        expect(project.name).toBeDefined();
        expect(project.color).toBeDefined();
        expect(project.ownerId).toBeDefined();
        expect(project.createdAt).toBeDefined();

        // Relations
        expect(project.owner).toBeDefined();
        expect(project.members).toBeDefined();
        expect(Array.isArray(project.members)).toBe(true);

        // Count
        expect(project._count).toBeDefined();
        expect(typeof project._count.tasks).toBe('number');
      });
    });
  });
});
