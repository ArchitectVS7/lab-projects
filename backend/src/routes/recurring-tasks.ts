import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateNextTask } from '../lib/recurrence.js';

const router = Router();
router.use(authenticate);

// --- Zod Schemas ---

const createRecurringTaskSchema = z.object({
  baseTaskId: z.string().uuid('Invalid base task ID'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']),
  interval: z.number().int().min(1).max(365).default(1),
  daysOfWeek: z.string().optional(), // "0,1,2" for Sun,Mon,Tue
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
});

// --- Helpers ---

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

function canCreateRecurringTask(membership: { role: string } | null): boolean {
  if (!membership) return false;
  return ['OWNER', 'ADMIN', 'MEMBER'].includes(membership.role);
}

function canDeleteRecurringTask(
  membership: { role: string } | null,
  recurringTask: { creatorId: string },
  userId: string
): boolean {
  if (!membership) return false;
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  if (membership.role === 'MEMBER' && recurringTask.creatorId === userId) return true;
  return false;
}

// --- Routes ---

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const parsed = createRecurringTaskSchema.parse(req.body);

    const baseTask = await prisma.task.findUnique({
      where: { id: parsed.baseTaskId },
      include: { project: true },
    });

    if (!baseTask) {
      throw new AppError('Base task not found', 404);
    }

    const membership = await getProjectMembership(userId, baseTask.projectId);
    if (!canCreateRecurringTask(membership)) {
      throw new AppError('You do not have permission to create recurring tasks in this project', 403);
    }

    const recurringTask = await prisma.recurringTask.create({
      data: {
        baseTaskId: parsed.baseTaskId,
        frequency: parsed.frequency,
        interval: parsed.interval,
        daysOfWeek: parsed.daysOfWeek,
        dayOfMonth: parsed.dayOfMonth,
        startDate: new Date(parsed.startDate),
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        projectId: baseTask.projectId,
        creatorId: userId,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.status(201).json(recurringTask);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = memberships.map((m) => m.projectId);

    const recurringTasks = await prisma.recurringTask.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true, color: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(recurringTasks);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const recurringTask = await prisma.recurringTask.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!recurringTask) {
      throw new AppError('Recurring task not found', 404);
    }

    const membership = await getProjectMembership(userId, recurringTask.projectId);
    if (!membership) {
      throw new AppError('You do not have access to this recurring task', 403);
    }

    res.json(recurringTask);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const recurringTask = await prisma.recurringTask.findUnique({
      where: { id },
    });

    if (!recurringTask) {
      throw new AppError('Recurring task not found', 404);
    }

    const membership = await getProjectMembership(userId, recurringTask.projectId);
    if (!canDeleteRecurringTask(membership, recurringTask, userId)) {
      throw new AppError('You do not have permission to delete this recurring task', 403);
    }

    await prisma.recurringTask.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/generate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const recurringTask = await prisma.recurringTask.findUnique({
      where: { id },
    });

    if (!recurringTask) {
      throw new AppError('Recurring task not found', 404);
    }

    const membership = await getProjectMembership(userId, recurringTask.projectId);
    if (!canCreateRecurringTask(membership)) {
      throw new AppError('You do not have permission to generate tasks for this recurring task', 403);
    }

    const newTask = await generateNextTask(id);

    if (!newTask) {
      throw new AppError('Recurring task has ended or cannot generate next occurrence', 400);
    }

    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

export default router;
