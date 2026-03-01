import request from 'supertest';
import { PrismaClient, NotificationType } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

function extractAuthCookie(res: request.Response): string | undefined {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return undefined;
    const arr = Array.isArray(cookies) ? cookies : [cookies];
    return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

describe('Cursor-based Pagination', () => {
    let authCookie: string;
    let userId: string;
    let projectId: string;

    beforeAll(async () => {
        // Clean up
        await prisma.activityLog.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'cursor-pagination@example.com' } });

        const regRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'cursor-pagination@example.com', password: 'TestPass1@secure', name: 'Cursor User' });

        authCookie = extractAuthCookie(regRes)!;
        userId = regRes.body.user.id;

        const proj = await prisma.project.create({
            data: {
                name: 'Cursor Pagination Test',
                ownerId: userId,
                members: { create: { userId, role: 'OWNER' } },
            },
        });
        projectId = proj.id;
    });

    afterAll(async () => {
        await prisma.activityLog.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'cursor-pagination@example.com' } });
        await prisma.$disconnect();
    });

    // ==========================================
    // Tasks cursor-based pagination
    // ==========================================
    describe('GET /api/tasks (cursor-based)', () => {
        beforeAll(async () => {
            await prisma.task.deleteMany();
            // Create 25 tasks with staggered timestamps
            for (let i = 0; i < 25; i++) {
                await prisma.task.create({
                    data: {
                        title: `CTask ${String(i + 1).padStart(2, '0')}`,
                        status: i % 4 === 0 ? 'DONE' : 'TODO',
                        priority: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
                        projectId,
                        creatorId: userId,
                        createdAt: new Date(Date.now() - (25 - i) * 60000), // each 1 min apart
                    },
                });
            }
        });

        it('returns cursor-paginated first page when cursor param is present (empty)', async () => {
            const res = await request(app)
                .get('/api/tasks?cursor=&limit=10')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.data.length).toBe(10);
            expect(res.body.pagination.hasMore).toBe(true);
            expect(res.body.pagination.nextCursor).toBeTruthy();
            expect(res.body.pagination.limit).toBe(10);
            expect(res.body.pagination.total).toBe(25);
        });

        it('returns correct second page using cursor from first page', async () => {
            // Get first page
            const page1 = await request(app)
                .get('/api/tasks?cursor=&limit=10')
                .set('Cookie', authCookie);

            expect(page1.body.pagination.nextCursor).toBeTruthy();

            // Get second page
            const page2 = await request(app)
                .get(`/api/tasks?cursor=${page1.body.pagination.nextCursor}&limit=10`)
                .set('Cookie', authCookie);

            expect(page2.status).toBe(200);
            expect(page2.body.data.length).toBe(10);
            expect(page2.body.pagination.hasMore).toBe(true);
            expect(page2.body.pagination.total).toBe(25);

            // Ensure no overlap between page 1 and page 2
            const page1Ids = new Set(page1.body.data.map((t: any) => t.id));
            const page2Ids = page2.body.data.map((t: any) => t.id);
            for (const id of page2Ids) {
                expect(page1Ids.has(id)).toBe(false);
            }
        });

        it('returns partial last page with hasMore=false', async () => {
            // Get first page
            const page1 = await request(app)
                .get('/api/tasks?cursor=&limit=10')
                .set('Cookie', authCookie);

            // Get second page
            const page2 = await request(app)
                .get(`/api/tasks?cursor=${page1.body.pagination.nextCursor}&limit=10`)
                .set('Cookie', authCookie);

            // Get third (last) page
            const page3 = await request(app)
                .get(`/api/tasks?cursor=${page2.body.pagination.nextCursor}&limit=10`)
                .set('Cookie', authCookie);

            expect(page3.status).toBe(200);
            expect(page3.body.data.length).toBe(5);
            expect(page3.body.pagination.hasMore).toBe(false);
            expect(page3.body.pagination.nextCursor).toBeNull();
        });

        it('traverses all 25 tasks across pages without duplication or gaps', async () => {
            const allIds: string[] = [];
            let cursor: string | undefined;

            // Page through all results
            for (let i = 0; i < 10; i++) { // safety limit
                const url = cursor
                    ? `/api/tasks?cursor=${cursor}&limit=10`
                    : '/api/tasks?cursor=&limit=10';

                const res = await request(app)
                    .get(url)
                    .set('Cookie', authCookie);

                allIds.push(...res.body.data.map((t: any) => t.id));

                if (!res.body.pagination.hasMore) break;
                cursor = res.body.pagination.nextCursor;
            }

            expect(allIds.length).toBe(25);
            // No duplicates
            expect(new Set(allIds).size).toBe(25);
        });

        it('enforces max limit of 100', async () => {
            const res = await request(app)
                .get('/api/tasks?cursor=&limit=999')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBe(100);
        });

        it('defaults limit to 20', async () => {
            const res = await request(app)
                .get('/api/tasks?cursor=')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(20);
            expect(res.body.pagination.limit).toBe(20);
        });

        it('works with filters (cursor + filter interaction)', async () => {
            const res = await request(app)
                .get('/api/tasks?cursor=&limit=5&status=DONE')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            // All returned tasks should have status DONE
            for (const task of res.body.data) {
                expect(task.status).toBe('DONE');
            }
            // Total should reflect filtered count, not all tasks
            expect(res.body.pagination.total).toBeLessThan(25);
        });

        it('cursor + filter: pages through filtered results correctly', async () => {
            const allDone: string[] = [];
            let cursor: string | undefined;

            for (let i = 0; i < 10; i++) {
                const url = cursor
                    ? `/api/tasks?cursor=${cursor}&limit=3&status=DONE`
                    : '/api/tasks?cursor=&limit=3&status=DONE';

                const res = await request(app)
                    .get(url)
                    .set('Cookie', authCookie);

                for (const task of res.body.data) {
                    expect(task.status).toBe('DONE');
                }
                allDone.push(...res.body.data.map((t: any) => t.id));

                if (!res.body.pagination.hasMore) break;
                cursor = res.body.pagination.nextCursor;
            }

            // Verify we got all DONE tasks
            const expectedDoneCount = await prisma.task.count({
                where: { projectId, status: 'DONE' },
            });
            expect(allDone.length).toBe(expectedDoneCount);
            expect(new Set(allDone).size).toBe(expectedDoneCount);
        });

        it('cursor + priority filter works correctly', async () => {
            const res = await request(app)
                .get('/api/tasks?cursor=&limit=100&priority=HIGH')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            for (const task of res.body.data) {
                expect(task.priority).toBe('HIGH');
            }
            const expectedHighCount = await prisma.task.count({
                where: { projectId, priority: 'HIGH' },
            });
            expect(res.body.pagination.total).toBe(expectedHighCount);
        });

        it('backward compat: raw array without cursor or page param', async () => {
            const res = await request(app)
                .get('/api/tasks')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(25);
        });

        it('backward compat: offset-based pagination still works', async () => {
            const res = await request(app)
                .get('/api/tasks?page=1&limit=10')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.data.length).toBe(10);
            expect(res.body.pagination).toHaveProperty('page', 1);
            expect(res.body.pagination).toHaveProperty('totalPages');
        });
    });

    // ==========================================
    // Notifications cursor-based pagination
    // ==========================================
    describe('GET /api/notifications (cursor-based)', () => {
        beforeAll(async () => {
            await prisma.notification.deleteMany();
            // Create 15 notifications with staggered timestamps
            for (let i = 0; i < 15; i++) {
                await prisma.notification.create({
                    data: {
                        userId,
                        type: NotificationType.TASK_ASSIGNED,
                        title: `Notif ${String(i + 1).padStart(2, '0')}`,
                        message: `Message ${i + 1}`,
                        read: i < 5, // first 5 are read, rest are unread
                        createdAt: new Date(Date.now() - (15 - i) * 60000),
                    },
                });
            }
        });

        it('returns cursor-paginated first page', async () => {
            const res = await request(app)
                .get('/api/notifications?cursor=&limit=5')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.data.length).toBe(5);
            expect(res.body.pagination.hasMore).toBe(true);
            expect(res.body.pagination.nextCursor).toBeTruthy();
            expect(res.body.pagination.total).toBe(15);
        });

        it('pages through all notifications without duplication', async () => {
            const allIds: string[] = [];
            let cursor: string | undefined;

            for (let i = 0; i < 10; i++) {
                const url = cursor
                    ? `/api/notifications?cursor=${cursor}&limit=5`
                    : '/api/notifications?cursor=&limit=5';

                const res = await request(app)
                    .get(url)
                    .set('Cookie', authCookie);

                allIds.push(...res.body.data.map((n: any) => n.id));

                if (!res.body.pagination.hasMore) break;
                cursor = res.body.pagination.nextCursor;
            }

            expect(allIds.length).toBe(15);
            expect(new Set(allIds).size).toBe(15);
        });

        it('cursor + unreadOnly filter interaction', async () => {
            const res = await request(app)
                .get('/api/notifications?cursor=&limit=100&unreadOnly=true')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            for (const notif of res.body.data) {
                expect(notif.read).toBe(false);
            }
            expect(res.body.pagination.total).toBe(10); // 10 unread
        });

        it('enforces max limit of 100', async () => {
            const res = await request(app)
                .get('/api/notifications?cursor=&limit=500')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBe(100);
        });

        it('backward compat: raw array without cursor param', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(15);
        });
    });

    // ==========================================
    // Activity Logs cursor-based pagination
    // ==========================================
    describe('GET /api/tasks/:id/activity (cursor-based)', () => {
        let taskId: string;

        beforeAll(async () => {
            // Create a task
            const taskRes = await request(app)
                .post('/api/tasks')
                .set('Cookie', authCookie)
                .send({ title: 'Activity Pagination Task', projectId });
            taskId = taskRes.body.id;

            // Generate multiple activity logs by updating the task several times
            const statuses = ['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'TODO', 'IN_PROGRESS'];
            const priorities = ['HIGH', 'URGENT', 'LOW', 'MEDIUM', 'HIGH'];

            for (let i = 0; i < statuses.length; i++) {
                await request(app)
                    .put(`/api/tasks/${taskId}`)
                    .set('Cookie', authCookie)
                    .send({ status: statuses[i], priority: priorities[i] });
            }
        });

        it('returns cursor-paginated first page', async () => {
            const res = await request(app)
                .get(`/api/tasks/${taskId}/activity?cursor=&limit=3`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.data.length).toBe(3);
            expect(res.body.pagination.limit).toBe(3);
        });

        it('pages through all activity logs without duplication', async () => {
            const allIds: string[] = [];
            let cursor: string | undefined;

            for (let i = 0; i < 20; i++) {
                const url = cursor
                    ? `/api/tasks/${taskId}/activity?cursor=${cursor}&limit=3`
                    : `/api/tasks/${taskId}/activity?cursor=&limit=3`;

                const res = await request(app)
                    .get(url)
                    .set('Cookie', authCookie);

                allIds.push(...res.body.data.map((l: any) => l.id));

                if (!res.body.pagination.hasMore) break;
                cursor = res.body.pagination.nextCursor;
            }

            // All unique
            expect(new Set(allIds).size).toBe(allIds.length);
            // Should have the CREATED log + update logs
            expect(allIds.length).toBeGreaterThanOrEqual(2);
        });

        it('backward compat: raw array without cursor param', async () => {
            const res = await request(app)
                .get(`/api/tasks/${taskId}/activity`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(2);
        });

        it('enforces max limit of 200', async () => {
            const res = await request(app)
                .get(`/api/tasks/${taskId}/activity?cursor=&limit=999`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBe(200);
        });

        it('returns 404 for non-existent task', async () => {
            const res = await request(app)
                .get('/api/tasks/00000000-0000-0000-0000-000000000000/activity?cursor=&limit=5')
                .set('Cookie', authCookie);

            expect(res.status).toBe(404);
        });
    });
});
