import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../src/app';

const prisma = new PrismaClient();

describe('Phase 4: Seed Data Verification', () => {
    beforeAll(async () => {
        // Clean database
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany();

        // Run seed script logic inline (same as seed.ts)
        const passwordHash = await bcrypt.hash('Password123', 12);

        const alice = await prisma.user.create({
            data: { email: 'alice@example.com', passwordHash, name: 'Alice Johnson' },
        });
        const bob = await prisma.user.create({
            data: { email: 'bob@example.com', passwordHash, name: 'Bob Smith' },
        });

        const projectWebsite = await prisma.project.create({
            data: {
                name: 'Website Redesign',
                description: 'Complete overhaul of the company website',
                color: '#6366f1',
                ownerId: alice.id,
                members: {
                    create: [
                        { userId: alice.id, role: 'OWNER' },
                        { userId: bob.id, role: 'MEMBER' },
                    ],
                },
            },
        });

        const projectMobile = await prisma.project.create({
            data: {
                name: 'Mobile App',
                description: 'React Native mobile application',
                color: '#f59e0b',
                ownerId: alice.id,
                members: {
                    create: [
                        { userId: alice.id, role: 'OWNER' },
                        { userId: bob.id, role: 'VIEWER' },
                    ],
                },
            },
        });

        const projectApi = await prisma.project.create({
            data: {
                name: 'API Platform',
                description: 'Internal API gateway and documentation',
                color: '#10b981',
                ownerId: bob.id,
                members: {
                    create: [
                        { userId: bob.id, role: 'OWNER' },
                        { userId: alice.id, role: 'ADMIN' },
                    ],
                },
            },
        });

        const tasks = [
            { title: 'Design homepage mockup', description: 'Create wireframes and visual design', status: 'DONE' as const, priority: 'HIGH' as const, projectId: projectWebsite.id, creatorId: alice.id, assigneeId: alice.id },
            { title: 'Implement navigation', description: 'Build responsive navigation component', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, projectId: projectWebsite.id, creatorId: alice.id, assigneeId: bob.id },
            { title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for deployment', status: 'TODO' as const, priority: 'URGENT' as const, projectId: projectWebsite.id, creatorId: bob.id, assigneeId: null },
            { title: 'Write unit tests', description: 'Add test coverage for core components', status: 'IN_REVIEW' as const, priority: 'MEDIUM' as const, projectId: projectWebsite.id, creatorId: bob.id, assigneeId: bob.id },
            { title: 'Design app screens', description: 'Create mobile UI designs', status: 'TODO' as const, priority: 'HIGH' as const, projectId: projectMobile.id, creatorId: alice.id, assigneeId: alice.id },
            { title: 'Set up React Native project', description: 'Initialize project with TypeScript template', status: 'DONE' as const, priority: 'HIGH' as const, projectId: projectMobile.id, creatorId: alice.id, assigneeId: alice.id },
            { title: 'Implement auth flow', description: 'Login, register, and session management', status: 'IN_PROGRESS' as const, priority: 'URGENT' as const, projectId: projectMobile.id, creatorId: alice.id, assigneeId: alice.id },
            { title: 'Define API schema', description: 'OpenAPI specification for all endpoints', status: 'DONE' as const, priority: 'HIGH' as const, projectId: projectApi.id, creatorId: bob.id, assigneeId: bob.id },
            { title: 'Implement rate limiting', description: 'Add rate limiting middleware to all routes', status: 'TODO' as const, priority: 'MEDIUM' as const, projectId: projectApi.id, creatorId: bob.id, assigneeId: alice.id },
            { title: 'Set up monitoring', description: 'Configure health checks and alerting', status: 'TODO' as const, priority: 'LOW' as const, projectId: projectApi.id, creatorId: alice.id, assigneeId: null, dueDate: new Date('2026-03-01') },
        ];

        for (const task of tasks) {
            await prisma.task.create({ data: task });
        }
    });

    afterAll(async () => {
        await prisma.task.deleteMany();
        await prisma.projectMember.deleteMany();
        await prisma.project.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
    });

    it('creates exactly 2 users', async () => {
        const users = await prisma.user.findMany();
        expect(users).toHaveLength(2);
        expect(users.map(u => u.email).sort()).toEqual(['alice@example.com', 'bob@example.com']);
    });

    it('creates exactly 3 projects', async () => {
        const projects = await prisma.project.findMany();
        expect(projects).toHaveLength(3);
        expect(projects.map(p => p.name).sort()).toEqual(['API Platform', 'Mobile App', 'Website Redesign']);
    });

    it('creates exactly 10 tasks', async () => {
        const tasks = await prisma.task.findMany();
        expect(tasks).toHaveLength(10);
    });

    it('alice can login with Password123', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com', password: 'Password123' });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('alice@example.com');
        expect(res.body.user.name).toBe('Alice Johnson');
    });

    it('bob can login with Password123', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'bob@example.com', password: 'Password123' });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('bob@example.com');
        expect(res.body.user.name).toBe('Bob Smith');
    });

    it('alice sees 3 projects (2 owned, 1 as admin)', async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'alice@example.com', password: 'Password123' });

        const cookies = loginRes.headers['set-cookie'];
        const cookie = Array.isArray(cookies)
            ? cookies.find((c: string) => c.startsWith('auth_token='))
            : cookies?.startsWith('auth_token=') ? cookies : undefined;

        const res = await request(app)
            .get('/api/projects')
            .set('Cookie', cookie!);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);

        // Alice owns Website Redesign and Mobile App
        const ownedProjects = res.body.filter((p: any) => p.owner.email === 'alice@example.com');
        expect(ownedProjects).toHaveLength(2);

        // Alice is ADMIN on API Platform
        const apiProject = res.body.find((p: any) => p.name === 'API Platform');
        expect(apiProject).toBeDefined();
        const aliceMembership = apiProject.members.find((m: any) => m.user.email === 'alice@example.com');
        expect(aliceMembership.role).toBe('ADMIN');
    });

    it('bob sees 3 projects (1 owned, 1 as member, 1 as viewer)', async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'bob@example.com', password: 'Password123' });

        const cookies = loginRes.headers['set-cookie'];
        const cookie = Array.isArray(cookies)
            ? cookies.find((c: string) => c.startsWith('auth_token='))
            : cookies?.startsWith('auth_token=') ? cookies : undefined;

        const res = await request(app)
            .get('/api/projects')
            .set('Cookie', cookie!);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);

        // Bob owns API Platform
        const ownedProjects = res.body.filter((p: any) => p.owner.email === 'bob@example.com');
        expect(ownedProjects).toHaveLength(1);
        expect(ownedProjects[0].name).toBe('API Platform');

        // Bob is MEMBER on Website Redesign
        const websiteProject = res.body.find((p: any) => p.name === 'Website Redesign');
        const bobWebsiteMembership = websiteProject.members.find((m: any) => m.user.email === 'bob@example.com');
        expect(bobWebsiteMembership.role).toBe('MEMBER');

        // Bob is VIEWER on Mobile App
        const mobileProject = res.body.find((p: any) => p.name === 'Mobile App');
        const bobMobileMembership = mobileProject.members.find((m: any) => m.user.email === 'bob@example.com');
        expect(bobMobileMembership.role).toBe('VIEWER');
    });

    it('tasks have correct status distribution', async () => {
        const tasks = await prisma.task.findMany();

        const todoCount = tasks.filter(t => t.status === 'TODO').length;
        const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
        const inReviewCount = tasks.filter(t => t.status === 'IN_REVIEW').length;
        const doneCount = tasks.filter(t => t.status === 'DONE').length;

        expect(todoCount).toBe(4);
        expect(inProgressCount).toBe(2);
        expect(inReviewCount).toBe(1);
        expect(doneCount).toBe(3);
    });

    it('tasks have correct priority distribution', async () => {
        const tasks = await prisma.task.findMany();

        const lowCount = tasks.filter(t => t.priority === 'LOW').length;
        const mediumCount = tasks.filter(t => t.priority === 'MEDIUM').length;
        const highCount = tasks.filter(t => t.priority === 'HIGH').length;
        const urgentCount = tasks.filter(t => t.priority === 'URGENT').length;

        expect(lowCount).toBe(1);
        expect(mediumCount).toBe(3);
        expect(highCount).toBe(4);
        expect(urgentCount).toBe(2);
    });
});
