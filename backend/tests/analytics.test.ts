import request from 'supertest';
import { PrismaClient, TaskStatus } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

// Helper: extract auth cookie from response
function extractAuthCookie(res: request.Response): string | undefined {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return undefined;
    const arr = Array.isArray(cookies) ? cookies : [cookies];
    return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

describe('Analytics API', () => {
    let authCookie: string;
    let userId: string;
    let projectId: string;

    beforeAll(async () => {
        // Cleanup
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'analytics@example.com' } });

        // Create User
        const regRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'analytics@example.com', password: 'Password1', name: 'Analytics User' });

        authCookie = extractAuthCookie(regRes)!;
        userId = regRes.body.user.id;

        // Create Project
        const proj = await prisma.project.create({
            data: { name: 'Analytics Proj', ownerId: userId }
        });
        projectId = proj.id;
    });

    afterAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'analytics@example.com' } });
        await prisma.$disconnect();
    });

    describe('GET /api/analytics/insights', () => {
        beforeEach(async () => {
            await prisma.task.deleteMany({ where: { projectId } });
        });

        it('returns empty stats for no tasks', async () => {
            const res = await request(app)
                .get('/api/analytics/insights')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.velocity.thisWeek).toBe(0);
            expect(res.body.velocity.lastWeek).toBe(0);
            expect(res.body.velocity.changePercent).toBe(0);
            expect(res.body.patterns.mostProductiveDay).toBe('N/A');
        });

        it('calculates velocity correctly (improvement)', async () => {
            const now = new Date();
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

            // 1 task last week
            await prisma.task.create({
                data: {
                    title: 'Old Task', status: 'DONE', projectId, creatorId: userId, assigneeId: userId,
                    updatedAt: tenDaysAgo // Last week
                }
            });

            // 2 tasks this week (100% increase)
            await prisma.task.createMany({
                data: [
                    { title: 'New 1', status: 'DONE', projectId, creatorId: userId, assigneeId: userId, updatedAt: threeDaysAgo },
                    { title: 'New 2', status: 'DONE', projectId, creatorId: userId, assigneeId: userId, updatedAt: now }
                ]
            });

            const res = await request(app)
                .get('/api/analytics/insights')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.velocity.lastWeek).toBe(1);
            expect(res.body.velocity.thisWeek).toBe(2);
            expect(res.body.velocity.changePercent).toBe(100);
            expect(res.body.insight).toContain("You're on fire!");
        });

        it('calculates velocity correctly (decline)', async () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

            // 2 tasks last week
            await prisma.task.createMany({
                data: [
                    { title: 'Old 1', status: 'DONE', projectId, creatorId: userId, assigneeId: userId, updatedAt: tenDaysAgo },
                    { title: 'Old 2', status: 'DONE', projectId, creatorId: userId, assigneeId: userId, updatedAt: tenDaysAgo }
                ]
            });

            // 1 task this week (50% decrease)
            await prisma.task.create({
                data: {
                    title: 'New 1', status: 'DONE', projectId, creatorId: userId, assigneeId: userId,
                    updatedAt: threeDaysAgo
                }
            });

            const res = await request(app)
                .get('/api/analytics/insights')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.velocity.lastWeek).toBe(2);
            expect(res.body.velocity.thisWeek).toBe(1);
            expect(res.body.velocity.changePercent).toBe(-50);
            expect(res.body.insight).toContain("slower");
        });

        it('identifies most productive day', async () => {
            // Create 2 tasks on the same day of the week (e.g., today)
            const now = new Date();
            await prisma.task.createMany({
                data: [
                    { title: 'Task 1', status: 'DONE', projectId, creatorId: userId, assigneeId: userId, updatedAt: now },
                    { title: 'Task 2', status: 'DONE', projectId, creatorId: userId, assigneeId: userId, updatedAt: now }
                ]
            });

            const res = await request(app)
                .get('/api/analytics/insights')
                .set('Cookie', authCookie);

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[now.getDay()];

            expect(res.body.patterns.mostProductiveDay).toBe(today);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).get('/api/analytics/insights');
            expect(res.status).toBe(401);
        });
    });
});
