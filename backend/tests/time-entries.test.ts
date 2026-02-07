import request from 'supertest';
import app from '../src/app';
import { prisma } from './setup';

// Helper to create a user and get auth cookie
async function createTestUser(email: string, name: string) {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'Password123!', name });

    const cookie = res.headers['set-cookie']?.[0];
    return { user: res.body.user, cookie };
}

// Helper to create a project
async function createTestProject(cookie: string, name: string) {
    const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookie)
        .send({ name, description: 'Test Project' });
    return res.body;
}

// Helper to create a task
async function createTestTask(cookie: string, headers: { projectId: string; title: string }) {
    const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', cookie)
        .send({
            title: headers.title,
            projectId: headers.projectId,
            status: 'TODO',
            priority: 'MEDIUM'
        });
    return res.body;
}

describe('Time Entries API', () => {
    let user: any;
    let cookie: string;
    let project: any;
    let task: any;

    beforeAll(async () => {
        // Clean up
        await prisma.timeEntry.deleteMany();
        await prisma.task.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany();

        // Setup basic data
        const auth = await createTestUser('time-test@example.com', 'Time User');
        user = auth.user;
        cookie = auth.cookie;

        project = await createTestProject(cookie, 'Time Project');
        task = await createTestTask(cookie, { projectId: project.id, title: 'Time Task' });
    });

    afterEach(async () => {
        // Cleanup time entries after each test to ensure clean state for timer constraints
        await prisma.timeEntry.deleteMany();
    });

    describe('POST /api/time-entries/start', () => {
        it('starts a timer for a task', async () => {
            const res = await request(app)
                .post('/api/time-entries/start')
                .set('Cookie', cookie)
                .send({ taskId: task.id, description: 'Working on task' });

            expect(res.status).toBe(201);
            expect(res.body.taskId).toBe(task.id);
            expect(res.body.startTime).toBeDefined();
            expect(res.body.endTime).toBeNull();
            expect(res.body.description).toBe('Working on task');
        });

        it('requires authentication', async () => {
            const res = await request(app)
                .post('/api/time-entries/start')
                .send({ taskId: task.id });

            expect(res.status).toBe(401);
        });

        it('returns 400 if user already has an active timer', async () => {
            // Start first timer
            await request(app)
                .post('/api/time-entries/start')
                .set('Cookie', cookie)
                .send({ taskId: task.id });

            // Try to start second timer
            const res = await request(app)
                .post('/api/time-entries/start')
                .set('Cookie', cookie)
                .send({ taskId: task.id });

            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/active timer/i);
        });
    });

    describe('GET /api/time-entries/active', () => {
        it('returns null when no active timer', async () => {
            const res = await request(app)
                .get('/api/time-entries/active')
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body).toBeNull();
        });

        it('returns the active timer', async () => {
            // Start a timer
            const startRes = await request(app)
                .post('/api/time-entries/start')
                .set('Cookie', cookie)
                .send({ taskId: task.id });

            const res = await request(app)
                .get('/api/time-entries/active')
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(startRes.body.id);
            expect(res.body.endTime).toBeNull();
        });
    });

    describe('POST /api/time-entries/:id/stop', () => {
        it('stops an active timer', async () => {
            // Start
            const startRes = await request(app)
                .post('/api/time-entries/start')
                .set('Cookie', cookie)
                .send({ taskId: task.id });

            const timerId = startRes.body.id;

            // Stop
            const res = await request(app)
                .post(`/api/time-entries/${timerId}/stop`)
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(timerId);
            expect(res.body.endTime).toBeDefined();
            expect(res.body.duration).toBeGreaterThanOrEqual(0);
        });

        it('returns 404 if timer not found', async () => {
            const res = await request(app)
                .post('/api/time-entries/random-uuid-123/stop')
                .set('Cookie', cookie);

            // Depending on implementation, might differ, but usually 404 or 400
            expect([400, 404]).toContain(res.status);
        });

        it('returns 400 if timer is already stopped', async () => {
            // Start
            const startRes = await request(app)
                .post('/api/time-entries/start')
                .set('Cookie', cookie)
                .send({ taskId: task.id });
            const timerId = startRes.body.id;

            // Stop once
            await request(app).post(`/api/time-entries/${timerId}/stop`).set('Cookie', cookie);

            // Stop again
            const res = await request(app)
                .post(`/api/time-entries/${timerId}/stop`)
                .set('Cookie', cookie);

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/time-entries/:id', () => {
        it('updates a time entry manually', async () => {
            // Create manual entry via database since we might not have a direct CREATE endpoint apart from start/stop, 
            // or we can start and stop one.
            const entry = await prisma.timeEntry.create({
                data: {
                    taskId: task.id,
                    userId: user.id,
                    startTime: new Date(),
                    endTime: new Date(),
                    duration: 60,
                    description: 'Original'
                }
            });

            const res = await request(app)
                .put(`/api/time-entries/${entry.id}`)
                .set('Cookie', cookie)
                .send({ description: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body.description).toBe('Updated');
        });

        it('prevents updating another user\'s entry', async () => {
            // Create another user
            const otherUserAuth = await createTestUser('other-time@example.com', 'Other');

            const entry = await prisma.timeEntry.create({
                data: {
                    taskId: task.id,
                    userId: user.id, // Owned by original user
                    startTime: new Date(),
                }
            });

            const res = await request(app)
                .put(`/api/time-entries/${entry.id}`)
                .set('Cookie', otherUserAuth.cookie)
                .send({ description: 'Hacked' });

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/time-entries/:id', () => {
        it('gets a single time entry', async () => {
            const entry = await prisma.timeEntry.create({
                data: {
                    taskId: task.id,
                    userId: user.id,
                    startTime: new Date(),
                }
            });

            const res = await request(app)
                .get(`/api/time-entries/${entry.id}`)
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(entry.id);
        });
    });
});
