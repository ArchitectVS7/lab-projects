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

describe('Export API', () => {
    let authCookie: string;
    let userId: string;
    let projectId: string;

    beforeAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'export@example.com' } });

        const regRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'export@example.com', password: 'Password1', name: 'Export User' });

        authCookie = extractAuthCookie(regRes)!;
        userId = regRes.body.user.id;

        const proj = await prisma.project.create({
            data: {
                name: 'Export Test Project',
                color: '#6366f1',
                ownerId: userId,
                members: { create: { userId, role: 'OWNER' } },
            },
        });
        projectId = proj.id;

        await prisma.task.createMany({
            data: [
                { title: 'Task One', description: 'First task', status: 'TODO', priority: 'HIGH', projectId, creatorId: userId },
                { title: 'Task Two', description: 'Second task', status: 'DONE', priority: 'LOW', projectId, creatorId: userId, assigneeId: userId },
                { title: 'Task, "Special"', description: 'Has commas and quotes', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId, creatorId: userId },
            ],
        });
    });

    afterAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'export@example.com' } });
        await prisma.$disconnect();
    });

    describe('GET /api/export/tasks', () => {
        it('returns 401 without auth', async () => {
            const res = await request(app).get('/api/export/tasks');
            expect(res.status).toBe(401);
        });

        it('exports tasks as CSV by default', async () => {
            const res = await request(app)
                .get('/api/export/tasks')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
            expect(res.headers['content-disposition']).toContain('tasks-export.csv');

            const lines = res.text.split('\n');
            // Header + 3 data rows
            expect(lines.length).toBe(4);
            expect(lines[0]).toBe('Title,Description,Status,Priority,Due Date,Project,Assignee,Creator,Created At,Updated At');
        });

        it('handles CSV special characters (commas, quotes)', async () => {
            const res = await request(app)
                .get('/api/export/tasks')
                .set('Cookie', authCookie);

            // The task with commas and quotes should be properly escaped
            expect(res.text).toContain('"Task, ""Special"""');
        });

        it('exports tasks as JSON when format=json', async () => {
            const res = await request(app)
                .get('/api/export/tasks?format=json')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/json');
            expect(res.headers['content-disposition']).toContain('tasks-export.json');

            const data = res.body;
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBe(3);
            expect(data[0]).toHaveProperty('title');
            expect(data[0]).toHaveProperty('status');
            expect(data[0]).toHaveProperty('project');
            // JSON export should flatten project to just the name
            expect(typeof data[0].project).toBe('string');
        });

        it('filters by projectId', async () => {
            const res = await request(app)
                .get(`/api/export/tasks?format=json&projectId=${projectId}`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it('returns 403 for project user is not a member of', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .get(`/api/export/tasks?projectId=${fakeId}`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(403);
        });
    });
});
