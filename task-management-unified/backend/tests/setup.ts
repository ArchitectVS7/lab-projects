import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean up database before each test suite
beforeAll(async () => {
  // Clear tables in dependency order
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

export { prisma };
