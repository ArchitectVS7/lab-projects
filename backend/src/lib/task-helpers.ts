import prisma from './prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const userSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

export const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
  assignee: {
    select: userSelect,
  },
  creator: {
    select: userSelect,
  },
  tags: {
    include: {
      tag: true,
    },
  },
  domains: {
    include: { domain: true },
  },
  agentDelegations: {
    select: { id: true, agentType: true, status: true },
  },
  _count: {
    select: {
      dependsOn: true,
      dependedOnBy: true,
    },
  },
} as const;

export async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export function canModifyTask(
  membership: { role: string } | null,
  task: { creatorId: string },
  userId: string
): boolean {
  if (!membership) return false;
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  if (membership.role === 'MEMBER' && task.creatorId === userId) return true;
  return false;
}

export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }
}
