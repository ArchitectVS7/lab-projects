import { PrismaClient, TaskStatus, Priority, ProjectRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // Create 2 Users
  // ============================================
  const passwordHash = await bcrypt.hash('Password123', 12);

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash,
      name: 'Alice Johnson',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
  });
  console.log('✅ Created user: Alice Johnson (alice@example.com)');

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash,
      name: 'Bob Smith',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
  });
  console.log('✅ Created user: Bob Smith (bob@example.com)');

  // ============================================
  // Create 3 Projects
  // ============================================
  const webRedesign = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern UI/UX',
      color: '#6366f1',
      ownerId: alice.id,
    },
  });

  const mobileApp = await prisma.project.create({
    data: {
      name: 'Mobile App v2.0',
      description: 'Major update to our mobile application with new features',
      color: '#22c55e',
      ownerId: alice.id,
    },
  });

  const apiIntegration = await prisma.project.create({
    data: {
      name: 'API Integration',
      description: 'Third-party API integrations for payment and analytics',
      color: '#f97316',
      ownerId: bob.id,
    },
  });
  console.log('✅ Created 3 projects\n');

  // ============================================
  // Create Project Members
  // ============================================
  await prisma.projectMember.createMany({
    data: [
      // Website Redesign - Alice owns, Bob is member
      { projectId: webRedesign.id, userId: alice.id, role: ProjectRole.OWNER },
      { projectId: webRedesign.id, userId: bob.id, role: ProjectRole.MEMBER },
      // Mobile App - Alice owns, Bob is admin
      { projectId: mobileApp.id, userId: alice.id, role: ProjectRole.OWNER },
      { projectId: mobileApp.id, userId: bob.id, role: ProjectRole.ADMIN },
      // API Integration - Bob owns, Alice is member
      { projectId: apiIntegration.id, userId: bob.id, role: ProjectRole.OWNER },
      { projectId: apiIntegration.id, userId: alice.id, role: ProjectRole.MEMBER },
    ],
  });
  console.log('✅ Created project memberships');

  // ============================================
  // Create 10 Tasks
  // ============================================
  const now = new Date();
  const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.task.createMany({
    data: [
      // Website Redesign Tasks (4 tasks)
      {
        title: 'Design new homepage mockup',
        description: 'Create Figma mockups for the new homepage layout with hero section',
        projectId: webRedesign.id,
        assigneeId: alice.id,
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        dueDate: addDays(-2),
      },
      {
        title: 'Implement responsive navigation',
        description: 'Build mobile-first navigation with hamburger menu and dropdowns',
        projectId: webRedesign.id,
        assigneeId: bob.id,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: addDays(3),
      },
      {
        title: 'Set up dark mode theme',
        description: 'Implement dark mode using CSS variables and localStorage',
        projectId: webRedesign.id,
        assigneeId: alice.id,
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: addDays(7),
      },
      {
        title: 'Optimize images and assets',
        description: 'Compress images, set up lazy loading, and configure CDN',
        projectId: webRedesign.id,
        assigneeId: null,
        status: TaskStatus.TODO,
        priority: Priority.LOW,
        dueDate: addDays(14),
      },

      // Mobile App Tasks (3 tasks)
      {
        title: 'Update authentication flow',
        description: 'Add biometric login and improve onboarding screens',
        projectId: mobileApp.id,
        assigneeId: bob.id,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        dueDate: addDays(2),
      },
      {
        title: 'Implement push notifications',
        description: 'Set up Firebase Cloud Messaging for task reminders',
        projectId: mobileApp.id,
        assigneeId: alice.id,
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: addDays(10),
      },
      {
        title: 'Add offline mode support',
        description: 'Implement local database sync with conflict resolution',
        projectId: mobileApp.id,
        assigneeId: bob.id,
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: addDays(21),
      },

      // API Integration Tasks (3 tasks)
      {
        title: 'Integrate Stripe payments',
        description: 'Set up Stripe checkout, webhooks, and subscription handling',
        projectId: apiIntegration.id,
        assigneeId: bob.id,
        status: TaskStatus.IN_REVIEW,
        priority: Priority.URGENT,
        dueDate: addDays(1),
      },
      {
        title: 'Add Google Analytics tracking',
        description: 'Implement GA4 with custom events and conversion tracking',
        projectId: apiIntegration.id,
        assigneeId: alice.id,
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: addDays(5),
      },
      {
        title: 'Build rate limiting middleware',
        description: 'Implement Redis-based rate limiting for API endpoints',
        projectId: apiIntegration.id,
        assigneeId: bob.id,
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: addDays(4),
      },
    ],
  });
  console.log('✅ Created 10 tasks\n');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seeding complete!\n');
  console.log('📧 Test Accounts:');
  console.log('   Email: alice@example.com');
  console.log('   Email: bob@example.com');
  console.log('   Password: Password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
