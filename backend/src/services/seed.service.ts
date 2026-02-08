import { TaskStatus, Priority } from '@prisma/client';
import prisma from '../lib/prisma.js';

export class SeedService {
    async clearData() {
        // Delete in order to respect foreign keys
        await prisma.$transaction([
            prisma.userAchievement.deleteMany(),
            prisma.achievement.deleteMany(),
            prisma.notification.deleteMany(),
            prisma.activityLog.deleteMany(),
            prisma.comment.deleteMany(),
            prisma.timeEntry.deleteMany(),
            prisma.taskDependency.deleteMany(),
            prisma.taskTag.deleteMany(),
            prisma.tag.deleteMany(),
            prisma.attachment.deleteMany(),
            prisma.customFieldValue.deleteMany(),
            prisma.customFieldDefinition.deleteMany(),
            prisma.recurringTask.deleteMany(),
            prisma.task.deleteMany(),
            prisma.projectMember.deleteMany(),
            prisma.project.deleteMany(),
            // We generally want to keep users, or at least the current user, but for full reset:
            // prisma.user.deleteMany(), 
        ]);
    }

    async seedData(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Check if seed data already exists for this user
        const existingProject = await prisma.project.findFirst({
            where: { ownerId: userId, name: 'Welcome Project' },
        });
        if (existingProject) {
            return { message: 'Seed data already exists', alreadySeeded: true };
        }

        // 1. Create Achievements
        const achievements = [
            { code: 'FIRST_TASK', name: 'First Steps', description: 'Create your first task', icon: 'check-circle' },
            { code: 'FIRST_PROJECT', name: 'Project Manager', description: 'Create your first project', icon: 'folder-plus' },
            { code: 'TASK_MASTER', name: 'Task Master', description: 'Complete 10 tasks', icon: 'trophy' },
            { code: 'COLLABORATOR', name: 'Team Player', description: 'Add a member to a project', icon: 'users' },
        ];

        for (const ach of achievements) {
            await prisma.achievement.upsert({
                where: { code: ach.code },
                update: {},
                create: ach,
            });
        }

        // 2. Create Sample Project
        const project = await prisma.project.create({
            data: {
                name: 'Welcome Project',
                description: 'A sample project to get you started',
                color: '#6366f1',
                ownerId: userId,
                members: {
                    create: { userId: userId, role: 'OWNER' },
                },
            },
        });

        // 3. Create Sample Tasks
        const tasks = [
            {
                title: 'Explore the dashboard',
                description: 'Take a look around the application features',
                status: TaskStatus.DONE,
                priority: Priority.LOW,
                projectId: project.id,
                creatorId: userId,
                assigneeId: userId,
            },
            {
                title: 'Create a new project',
                description: 'Try creating your own project from the Projects page',
                status: TaskStatus.TODO,
                priority: Priority.HIGH,
                projectId: project.id,
                creatorId: userId,
                assigneeId: userId,
            },
            {
                title: 'Invite a collaborator',
                description: 'Go to Project Settings and invite a team member',
                status: TaskStatus.TODO,
                priority: Priority.MEDIUM,
                projectId: project.id,
                creatorId: userId,
                assigneeId: userId,
            },
        ];

        for (const t of tasks) {
            await prisma.task.create({ data: t });
        }

        return { message: 'Seed data created successfully' };
    }
}

export const seedService = new SeedService();
