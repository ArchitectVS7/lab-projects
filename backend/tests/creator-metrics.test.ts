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

describe('Creator Metrics API', () => {
    let ownerCookie: string;
    let adminCookie: string;
    let memberCookie: string;
    let viewerCookie: string;
    let nonMemberCookie: string;

    let ownerId: string;
    let adminId: string;
    let memberId: string;
    let viewerId: string;
    let nonMemberId: string;
    let projectId: string;

    beforeAll(async () => {
        // Cleanup
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        'cm-owner@test.com',
                        'cm-admin@test.com',
                        'cm-member@test.com',
                        'cm-viewer@test.com',
                        'cm-nonmember@test.com',
                    ],
                },
            },
        });

        // Create users
        const ownerRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'cm-owner@test.com', password: 'Password1', name: 'Owner User' });
        ownerCookie = extractAuthCookie(ownerRes)!;
        ownerId = ownerRes.body.user.id;

        const adminRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'cm-admin@test.com', password: 'Password1', name: 'Admin User' });
        adminCookie = extractAuthCookie(adminRes)!;
        adminId = adminRes.body.user.id;

        const memberRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'cm-member@test.com', password: 'Password1', name: 'Member User' });
        memberCookie = extractAuthCookie(memberRes)!;
        memberId = memberRes.body.user.id;

        const viewerRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'cm-viewer@test.com', password: 'Password1', name: 'Viewer User' });
        viewerCookie = extractAuthCookie(viewerRes)!;
        viewerId = viewerRes.body.user.id;

        const nonMemberRes = await request(app)
            .post('/api/auth/register')
            .send({ email: 'cm-nonmember@test.com', password: 'Password1', name: 'NonMember User' });
        nonMemberCookie = extractAuthCookie(nonMemberRes)!;
        nonMemberId = nonMemberRes.body.user.id;

        // Create project (owner is automatically added as OWNER member)
        const proj = await prisma.project.create({
            data: { name: 'Metrics Project', ownerId },
        });
        projectId = proj.id;

        // Add members with different roles
        await prisma.projectMember.createMany({
            data: [
                { projectId, userId: ownerId, role: 'OWNER' },
                { projectId, userId: adminId, role: 'ADMIN' },
                { projectId, userId: memberId, role: 'MEMBER' },
                { projectId, userId: viewerId, role: 'VIEWER' },
            ],
        });
    });

    afterAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: [
                        'cm-owner@test.com',
                        'cm-admin@test.com',
                        'cm-member@test.com',
                        'cm-viewer@test.com',
                        'cm-nonmember@test.com',
                    ],
                },
            },
        });
        await prisma.$disconnect();
    });

    // --- Permission Tests ---

    describe('Authorization', () => {
        it('returns 401 without authentication', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`);
            expect(res.status).toBe(401);
        });

        it('returns 403 for MEMBER role', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', memberCookie);
            expect(res.status).toBe(403);
        });

        it('returns 403 for VIEWER role', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', viewerCookie);
            expect(res.status).toBe(403);
        });

        it('returns 403 for non-member', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', nonMemberCookie);
            expect(res.status).toBe(403);
        });

        it('returns 200 for OWNER role', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);
            expect(res.status).toBe(200);
        });

        it('returns 200 for ADMIN role', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', adminCookie);
            expect(res.status).toBe(200);
        });

        it('returns 400 without projectId', async () => {
            const res = await request(app)
                .get('/api/analytics/creator-metrics')
                .set('Cookie', ownerCookie);
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('projectId');
        });

        it('returns 400 for invalid projectId format', async () => {
            const res = await request(app)
                .get('/api/analytics/creator-metrics?projectId=not-a-uuid')
                .set('Cookie', ownerCookie);
            expect(res.status).toBe(400);
        });
    });

    // --- Metric Calculation Tests ---

    describe('Metric Calculations', () => {
        beforeEach(async () => {
            await prisma.task.deleteMany({ where: { projectId } });
        });

        it('returns empty metrics for project with no tasks', async () => {
            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            expect(res.status).toBe(200);
            expect(res.body.projectId).toBe(projectId);
            expect(res.body.summary.totalTasks).toBe(0);
            expect(res.body.summary.totalDone).toBe(0);
            expect(res.body.summary.totalOpen).toBe(0);
            expect(res.body.summary.totalStale).toBe(0);
            expect(res.body.summary.memberCount).toBe(4); // owner, admin, member, viewer
            expect(res.body.creators).toHaveLength(4); // all members included
            expect(res.body.bottlenecks).toHaveLength(0);
        });

        it('counts tasks created per user correctly', async () => {
            // Owner creates 3 tasks, member creates 1
            await prisma.task.createMany({
                data: [
                    { title: 'T1', projectId, creatorId: ownerId, assigneeId: memberId },
                    { title: 'T2', projectId, creatorId: ownerId, assigneeId: adminId },
                    { title: 'T3', projectId, creatorId: ownerId, assigneeId: ownerId },
                    { title: 'T4', projectId, creatorId: memberId, assigneeId: memberId },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            expect(res.status).toBe(200);
            expect(res.body.summary.totalTasks).toBe(4);

            const ownerMetric = res.body.creators.find((c: any) => c.user.id === ownerId);
            const memberMetric = res.body.creators.find((c: any) => c.user.id === memberId);

            expect(ownerMetric.tasksCreated).toBe(3);
            expect(memberMetric.tasksCreated).toBe(1);
        });

        it('calculates self-assigned vs delegated ratio correctly', async () => {
            // Owner: 1 self-assigned, 2 delegated
            await prisma.task.createMany({
                data: [
                    { title: 'Self', projectId, creatorId: ownerId, assigneeId: ownerId },
                    { title: 'Delegated1', projectId, creatorId: ownerId, assigneeId: memberId },
                    { title: 'Delegated2', projectId, creatorId: ownerId, assigneeId: adminId },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            const ownerMetric = res.body.creators.find((c: any) => c.user.id === ownerId);
            expect(ownerMetric.selfAssigned).toBe(1);
            expect(ownerMetric.delegated).toBe(2);
            expect(ownerMetric.delegationRatio).toBe(67); // 2/3 = 66.67 -> rounded to 67
        });

        it('assigns correct badges based on delegation ratio', async () => {
            // Owner: 100% delegated -> "delegator"
            // Member: 100% self-assigned -> "doer"
            // Admin: 50/50 -> "balanced"
            await prisma.task.createMany({
                data: [
                    // Owner delegates everything
                    { title: 'OD1', projectId, creatorId: ownerId, assigneeId: memberId },
                    { title: 'OD2', projectId, creatorId: ownerId, assigneeId: adminId },
                    // Member self-assigns everything
                    { title: 'MS1', projectId, creatorId: memberId, assigneeId: memberId },
                    { title: 'MS2', projectId, creatorId: memberId, assigneeId: memberId },
                    // Admin: 1 self, 1 delegated
                    { title: 'AS1', projectId, creatorId: adminId, assigneeId: adminId },
                    { title: 'AD1', projectId, creatorId: adminId, assigneeId: memberId },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            const ownerMetric = res.body.creators.find((c: any) => c.user.id === ownerId);
            const memberMetric = res.body.creators.find((c: any) => c.user.id === memberId);
            const adminMetric = res.body.creators.find((c: any) => c.user.id === adminId);
            const viewerMetric = res.body.creators.find((c: any) => c.user.id === viewerId);

            expect(ownerMetric.badge).toBe('delegator');
            expect(memberMetric.badge).toBe('doer');
            expect(adminMetric.badge).toBe('balanced');
            expect(viewerMetric.badge).toBe('new'); // no tasks created
        });

        it('calculates velocity correctly for creators', async () => {
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

            // Owner: 2 done this week, 1 done last week -> +100% velocity
            await prisma.task.createMany({
                data: [
                    { title: 'V1', projectId, creatorId: ownerId, assigneeId: ownerId, status: 'DONE', updatedAt: threeDaysAgo },
                    { title: 'V2', projectId, creatorId: ownerId, assigneeId: ownerId, status: 'DONE', updatedAt: now },
                    { title: 'V3', projectId, creatorId: ownerId, assigneeId: ownerId, status: 'DONE', updatedAt: tenDaysAgo },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            const ownerMetric = res.body.creators.find((c: any) => c.user.id === ownerId);
            expect(ownerMetric.completedThisWeek).toBe(2);
            expect(ownerMetric.completedLastWeek).toBe(1);
            expect(ownerMetric.velocityChange).toBe(100); // 100% increase
        });

        it('identifies bottlenecks correctly', async () => {
            const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

            // Owner has 2 stale tasks (not DONE, updatedAt > 7 days ago)
            await prisma.task.createMany({
                data: [
                    { title: 'Stale1', projectId, creatorId: ownerId, assigneeId: ownerId, status: 'TODO', updatedAt: twentyDaysAgo },
                    { title: 'Stale2', projectId, creatorId: ownerId, assigneeId: ownerId, status: 'IN_PROGRESS', updatedAt: twentyDaysAgo },
                    { title: 'Active', projectId, creatorId: ownerId, assigneeId: ownerId, status: 'TODO' },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            expect(res.body.bottlenecks.length).toBeGreaterThan(0);
            const ownerBottleneck = res.body.bottlenecks.find((b: any) => b.user.id === ownerId);
            expect(ownerBottleneck).toBeDefined();
            expect(ownerBottleneck.staleTasks).toBe(2);
            expect(ownerBottleneck.openTasks).toBe(3); // all 3 are open (none DONE)
        });

        it('sorts creators by tasksCreated descending', async () => {
            await prisma.task.createMany({
                data: [
                    { title: 'M1', projectId, creatorId: memberId, assigneeId: memberId },
                    { title: 'M2', projectId, creatorId: memberId, assigneeId: memberId },
                    { title: 'M3', projectId, creatorId: memberId, assigneeId: memberId },
                    { title: 'O1', projectId, creatorId: ownerId, assigneeId: ownerId },
                    { title: 'A1', projectId, creatorId: adminId, assigneeId: adminId },
                    { title: 'A2', projectId, creatorId: adminId, assigneeId: adminId },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            const creatorIds = res.body.creators.map((c: any) => c.user.id);
            // member=3, admin=2, owner=1, viewer=0
            expect(creatorIds[0]).toBe(memberId);
            expect(creatorIds[1]).toBe(adminId);
            expect(creatorIds[2]).toBe(ownerId);
            expect(creatorIds[3]).toBe(viewerId);
        });

        it('includes summary statistics correctly', async () => {
            const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

            await prisma.task.createMany({
                data: [
                    { title: 'Done1', projectId, creatorId: ownerId, status: 'DONE' },
                    { title: 'Done2', projectId, creatorId: ownerId, status: 'DONE' },
                    { title: 'Open1', projectId, creatorId: ownerId, status: 'TODO' },
                    { title: 'Stale1', projectId, creatorId: ownerId, status: 'IN_PROGRESS', updatedAt: twentyDaysAgo },
                ],
            });

            const res = await request(app)
                .get(`/api/analytics/creator-metrics?projectId=${projectId}`)
                .set('Cookie', ownerCookie);

            expect(res.body.summary.totalTasks).toBe(4);
            expect(res.body.summary.totalDone).toBe(2);
            expect(res.body.summary.totalOpen).toBe(2);
            expect(res.body.summary.totalStale).toBe(1);
            expect(res.body.summary.memberCount).toBe(4);
        });
    });
});
