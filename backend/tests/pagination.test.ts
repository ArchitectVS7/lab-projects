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

describe('Pagination', () => {
    let authCookie: string;
    let userId: string;
    let projectId: string;

    beforeAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'pagination@example.com' } });

        const regRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'pagination@example.com', password: 'TestPass1@secure', name: 'Pagination User' });

        authCookie = extractAuthCookie(regRes)!;
        userId = regRes.body.user.id;

        const proj = await prisma.project.create({
            data: {
                name: 'Pagination Test',
                ownerId: userId,
                members: { create: { userId, role: 'OWNER' } },
            },
        });
        projectId = proj.id;

        // Create 25 tasks
        const tasks = Array.from({ length: 25 }, (_, i) => ({
            title: `Task ${String(i + 1).padStart(2, '0')}`,
            status: 'TODO' as const,
            priority: 'MEDIUM' as const,
            projectId,
            creatorId: userId,
        }));
        await prisma.task.createMany({ data: tasks });
    });

    afterAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'pagination@example.com' } });
        await prisma.$disconnect();
    });

    describe('GET /api/tasks', () => {
        it('returns raw array when no page param (backward compat)', async () => {
            const res = await request(app)
                .get('/api/tasks')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(25);
        });

        it('returns paginated envelope when page param is present', async () => {
            const res = await request(app)
                .get('/api/tasks?page=1&limit=10')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.data.length).toBe(10);
            expect(res.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3,
            });
        });

        it('returns correct page 2', async () => {
            const res = await request(app)
                .get('/api/tasks?page=2&limit=10')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(10);
            expect(res.body.pagination.page).toBe(2);
        });

        it('returns partial last page', async () => {
            const res = await request(app)
                .get('/api/tasks?page=3&limit=10')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(5);
            expect(res.body.pagination.page).toBe(3);
            expect(res.body.pagination.totalPages).toBe(3);
        });

        it('defaults to page=1 limit=20', async () => {
            const res = await request(app)
                .get('/api/tasks?page=1')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(20);
            expect(res.body.pagination.limit).toBe(20);
        });

        it('clamps limit to max 100', async () => {
            const res = await request(app)
                .get('/api/tasks?page=1&limit=999')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBe(100);
        });
    });

    describe('GET /api/projects', () => {
        it('returns raw array when no page param', async () => {
            const res = await request(app)
                .get('/api/projects')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('returns paginated envelope when page param present', async () => {
            const res = await request(app)
                .get('/api/projects?page=1&limit=10')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
        });
    });
});
