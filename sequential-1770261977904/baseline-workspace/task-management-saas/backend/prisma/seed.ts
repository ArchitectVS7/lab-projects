import { PrismaClient, TaskStatus, Priority, ProjectRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash,
      name: 'Alice Johnson',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash,
      name: 'Bob Smith',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
  });

  console.log('✅ Created 2 users');

  // Create Projects
  const webApp = await prisma.project.create({
    data: {
      name: 'Web Application Redesign',
      description: 'Complete overhaul of the main web application UI/UX',
      color: '#6366f1',
      ownerId: alice.id,
    },
  });

  const mobileApp = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Native iOS and Android app for task management',
      color: '#22c55e',
      ownerId: alice.id,
    },
  });

  const apiProject = await prisma.project.create({
    data: {
      name: 'API Integration',
      description: 'Third-party API integrations and webhook system',
      color: '#f97316',
      ownerId: bob.id,
    },
  });

  console.log('✅ Created 3 projects');

  // Create Project Members
  await prisma.projectMember.createMany({
    data: [
      // Web App - Alice is owner, Bob is member
      { projectId: webApp.id, userId: alice.id, role: ProjectRole.OWNER },
      { projectId: webApp.id, userId: bob.id, role: ProjectRole.MEMBER },
      // Mobile App - Alice is owner, Bob is admin
      { projectId: mobileApp.id, userId: alice.id, role: ProjectRole.OWNER },
      { projectId: mobileApp.id, userId: bob.id, role: ProjectRole.ADMIN },
      // API Project - Bob is owner, Alice is member
      { projectId: apiProject.id, userId: bob.id, role: ProjectRole.OWNER },
      { projectId: apiProject.id, userId: alice.id, role: ProjectRole.MEMBER },
    ],
  });

  console.log('✅ Created project memberships');

  // Create Tasks
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.task.createMany({
    data: [
      // Web App Tasks
      {
        title: 'Design new dashboard layout',
        description: 'Create wireframes and mockups for the new dashboard',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        projectId: webApp.id,
        assigneeId: alice.id,
        creatorId: alice.id,
        dueDate: now,
      },
      {
        title: 'Implement responsive navigation',
        description: 'Build mobile-first navigation component with hamburger menu',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        projectId: webApp.id,
        assigneeId: bob.id,
        creatorId: alice.id,
        dueDate: tomorrow,
      },
      {
        title: 'Set up dark mode theme',
        description: 'Implement dark mode toggle with CSS variables',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        projectId: webApp.id,
        assigneeId: alice.id,
        creatorId: bob.id,
        dueDate: nextWeek,
      },
      {
        title: 'Optimize bundle size',
        description: 'Analyze and reduce JavaScript bundle size by 30%',
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        projectId: webApp.id,
        assigneeId: null,
        creatorId: alice.id,
        dueDate: nextMonth,
      },
      // Mobile App Tasks
      {
        title: 'Set up React Native project',
        description: 'Initialize project with Expo and configure TypeScript',
        status: TaskStatus.DONE,
        priority: Priority.URGENT,
        projectId: mobileApp.id,
        assigneeId: bob.id,
        creatorId: alice.id,
        dueDate: now,
      },
      {
        title: 'Build authentication screens',
        description: 'Create login, register, and password reset screens',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        projectId: mobileApp.id,
        assigneeId: bob.id,
        creatorId: alice.id,
        dueDate: nextWeek,
      },
      {
        title: 'Implement push notifications',
        description: 'Set up Firebase Cloud Messaging for task reminders',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        projectId: mobileApp.id,
        assigneeId: alice.id,
        creatorId: bob.id,
        dueDate: nextMonth,
      },
      // API Project Tasks
      {
        title: 'Design webhook payload structure',
        description: 'Define JSON schema for webhook events',
        status: TaskStatus.IN_REVIEW,
        priority: Priority.HIGH,
        projectId: apiProject.id,
        assigneeId: bob.id,
        creatorId: bob.id,
        dueDate: tomorrow,
      },
      {
        title: 'Integrate Slack API',
        description: 'Add Slack notifications for task updates',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        projectId: apiProject.id,
        assigneeId: alice.id,
        creatorId: bob.id,
        dueDate: nextWeek,
      },
      {
        title: 'Build rate limiting middleware',
        description: 'Implement token bucket rate limiting for API endpoints',
        status: TaskStatus.TODO,
        priority: Priority.URGENT,
        projectId: apiProject.id,
        assigneeId: bob.id,
        creatorId: alice.id,
        dueDate: tomorrow,
      },
    ],
  });

  console.log('✅ Created 10 tasks');
  console.log('🎉 Seeding complete!');
  console.log('\n📧 Test accounts:');
  console.log('   alice@example.com / password123');
  console.log('   bob@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
