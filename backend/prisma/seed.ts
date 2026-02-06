import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Clear existing data in correct order (respects foreign keys)
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('Password123', 12);

    // Create users
    const alice = await prisma.user.create({
        data: { email: 'alice@example.com', passwordHash, name: 'Alice Johnson' },
    });
    const bob = await prisma.user.create({
        data: { email: 'bob@example.com', passwordHash, name: 'Bob Smith' },
    });

    // Create projects with members
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

    // Create tasks (10 total, distributed across projects)
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

    console.log('Seed complete: 2 users, 3 projects, 10 tasks');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
