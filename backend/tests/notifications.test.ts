import request from 'supertest';
import { PrismaClient, NotificationType } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

// Helper: extract auth cookie from response
function extractAuthCookie(res: request.Response): string | undefined {
    const cookies = res.headers['set-cookie'];
    if (!cookies) return undefined;
    const arr = Array.isArray(cookies) ? cookies : [cookies];
    return arr.find((c: string) => c.trim().startsWith('auth_token='));
}

describe('Notifications API', () => {
    let authCookie: string;
    let userId: string;

    beforeAll(async () => {
        // Cleanup
        await prisma.notification.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'notif-user@example.com' } });

        // Create User
        const regRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'notif-user@example.com', password: 'Password1', name: 'Notif User' });

        authCookie = extractAuthCookie(regRes)!;
        userId = regRes.body.user.id;
    });

    afterAll(async () => {
        await prisma.notification.deleteMany();
        await prisma.user.deleteMany({ where: { email: 'notif-user@example.com' } });
        await prisma.$disconnect();
    });

    describe('GET /api/notifications', () => {
        beforeEach(async () => {
            await prisma.notification.deleteMany({ where: { userId } });
            await prisma.notification.createMany({
                data: [
                    {
                        userId,
                        type: NotificationType.TASK_ASSIGNED,
                        title: 'Task 1',
                        message: 'Assigned to you',
                        read: false,
                        createdAt: new Date(),
                    },
                    {
                        userId,
                        type: NotificationType.PROJECT_INVITE,
                        title: 'Project Alpha',
                        message: 'You were invited',
                        read: true,
                        createdAt: new Date(Date.now() - 10000), // older
                    },
                ],
            });
        });

        it('returns all notifications for user', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].title).toBe('Task 1'); // Most recent first
        });

        it('filters by unreadOnly=true', async () => {
            const res = await request(app)
                .get('/api/notifications?unreadOnly=true')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].read).toBe(false);
        });

        it('returns 401 without auth', async () => {
            const res = await request(app).get('/api/notifications');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        it('returns correct count of unread notifications', async () => {
            // 1 Unread from previous test setup (beforeEach runs again if wrapped properly, but here we reuse or re-setup)
            // Note: beforeEach is inside the strictly scoped describe blocks above? 
            // Actually standard pattern is to put beforeEach in outer Scope or per-describe.

            // Let's reset for this block specifically to be safe
            await prisma.notification.deleteMany({ where: { userId } });
            await prisma.notification.createMany({
                data: [
                    { userId, type: 'TASK_ASSIGNED', title: 'U1', message: 'M', read: false },
                    { userId, type: 'TASK_ASSIGNED', title: 'U2', message: 'M', read: false },
                    { userId, type: 'TASK_ASSIGNED', title: 'R1', message: 'M', read: true },
                ]
            });

            const res = await request(app)
                .get('/api/notifications/unread-count')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(2);
        });
    });

    describe('PATCH /api/notifications/mark-read', () => {
        let notifIds: string[] = [];

        beforeEach(async () => {
            await prisma.notification.deleteMany({ where: { userId } });
            // Create 2 unread notifications
            const n1 = await prisma.notification.create({
                data: { userId, type: 'TASK_ASSIGNED', title: 'N1', message: 'M', read: false }
            });
            const n2 = await prisma.notification.create({
                data: { userId, type: 'TASK_ASSIGNED', title: 'N2', message: 'M', read: false }
            });
            notifIds = [n1.id, n2.id];
        });

        it('marks specific notifications as read', async () => {
            const res = await request(app)
                .patch('/api/notifications/mark-read')
                .set('Cookie', authCookie)
                .send({ notificationIds: notifIds });

            expect(res.status).toBe(200);

            const updated = await prisma.notification.findMany({
                where: { id: { in: notifIds } }
            });
            expect(updated.every(n => n.read)).toBe(true);
        });

        it('returns 403 if trying to mark others notification', async () => {
            // Create another user and notification
            const otherUser = await prisma.user.create({
                data: { email: 'other@example.com', passwordHash: 'hash', name: 'Other' }
            });
            const otherNotif = await prisma.notification.create({
                data: { userId: otherUser.id, type: 'TASK_ASSIGNED', title: 'Other', message: 'M', read: false }
            });

            const res = await request(app)
                .patch('/api/notifications/mark-read')
                .set('Cookie', authCookie)
                .send({ notificationIds: [otherNotif.id] });

            expect(res.status).toBe(403);

            // Cleanup
            await prisma.notification.delete({ where: { id: otherNotif.id } });
            await prisma.user.delete({ where: { id: otherUser.id } });
        });
    });

    describe('PATCH /api/notifications/mark-all-read', () => {
        it('marks all user notifications as read', async () => {
            await prisma.notification.deleteMany({ where: { userId } });
            await prisma.notification.createMany({
                data: [
                    { userId, type: 'TASK_ASSIGNED', title: 'U1', message: 'M', read: false },
                    { userId, type: 'TASK_ASSIGNED', title: 'U2', message: 'M', read: false },
                ]
            });

            const res = await request(app)
                .patch('/api/notifications/mark-all-read')
                .set('Cookie', authCookie);

            expect(res.status).toBe(200);

            const count = await prisma.notification.count({
                where: { userId, read: false }
            });
            expect(count).toBe(0);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('deletes a notification', async () => {
            const notif = await prisma.notification.create({
                data: { userId, type: 'TASK_ASSIGNED', title: 'Del', message: 'M' }
            });

            const res = await request(app)
                .delete(`/api/notifications/${notif.id}`)
                .set('Cookie', authCookie);

            expect(res.status).toBe(204);

            const check = await prisma.notification.findUnique({ where: { id: notif.id } });
            expect(check).toBeNull();
        });

        it('returns 404 for non-existent notification', async () => {
            const res = await request(app)
                .delete('/api/notifications/00000000-0000-0000-0000-000000000000')
                .set('Cookie', authCookie);

            expect(res.status).toBe(404);
        });
    });
});
