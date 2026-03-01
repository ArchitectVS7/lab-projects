import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// --- Zod Schemas ---

const createTimeEntrySchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  duration: z.number().int().min(1).optional(),
  description: z.string().max(500).optional(),
});

const updateTimeEntrySchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  duration: z.number().int().min(1).optional(),
  description: z.string().max(500).optional(),
});

const startTimerSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  description: z.string().max(500).optional(),
});

// --- Helpers ---

async function verifyProjectMembership(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.projectId, userId } },
  });

  if (!membership) {
    throw new AppError('Task not found', 404);
  }

  return task;
}

async function verifyEntryOwner(entryId: string, userId: string) {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    throw new AppError('Time entry not found', 404);
  }

  if (entry.userId !== userId) {
    throw new AppError('You do not have permission to access this time entry', 403);
  }

  return entry;
}

function calculateDurationSeconds(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 1000);
}

// --- Routes ---

// GET / - List user's time entries with optional filters
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { taskId, dateFrom, dateTo } = req.query;

    // Base filter: only return entries for tasks in projects the user is a member of
    const where: Prisma.TimeEntryWhereInput = {
      userId,
      task: {
        project: {
          members: { some: { userId } },
        },
      },
    };

    if (taskId && typeof taskId === 'string') {
      // When filtering by taskId, verify the user has access to that task's project
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, projectId: true },
      });

      if (!task) throw new AppError('Task not found', 404);

      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      });

      if (!membership) throw new AppError('Task not found', 404);

      where.taskId = taskId;
    }

    if (dateFrom || dateTo) {
      const startTimeFilter: Prisma.DateTimeFilter = {};
      if (dateFrom && typeof dateFrom === 'string') {
        startTimeFilter.gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        startTimeFilter.lte = new Date(dateTo);
      }
      where.startTime = startTimeFilter;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// GET /active - Get user's currently running timer
router.get('/active', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const activeEntry = await prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    if (!activeEntry) {
      return res.json(null);
    }

    res.json(activeEntry);
  } catch (err) {
    next(err);
  }
});

// GET /stats - Aggregate time data with filters
router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { taskId, projectId, dateFrom, dateTo } = req.query;

    // Base filter: only return entries for tasks in projects the user is a member of
    const taskFilter: Prisma.TaskWhereInput = {
      project: {
        members: { some: { userId } },
      },
    };

    if (projectId && typeof projectId === 'string') {
      taskFilter.projectId = projectId;
    }

    const where: Prisma.TimeEntryWhereInput = {
      userId,
      endTime: { not: null },
      duration: { not: null },
      task: taskFilter,
    };

    if (taskId && typeof taskId === 'string') {
      where.taskId = taskId;
    }

    if (dateFrom || dateTo) {
      const startTimeFilter: Record<string, Date> = {};
      if (dateFrom && typeof dateFrom === 'string') {
        startTimeFilter.gte = new Date(dateFrom);
      }
      if (dateTo && typeof dateTo === 'string') {
        startTimeFilter.lte = new Date(dateTo);
      }
      where.startTime = startTimeFilter;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: { select: { id: true, title: true } },
      },
    });

    let totalSeconds = 0;
    const byTaskMap = new Map<string, { taskId: string; title: string; seconds: number }>();
    const byDayMap = new Map<string, { date: string; seconds: number }>();

    for (const entry of entries) {
      const seconds = entry.duration!;
      totalSeconds += seconds;

      // Aggregate by task
      const existing = byTaskMap.get(entry.taskId);
      if (existing) {
        existing.seconds += seconds;
      } else {
        byTaskMap.set(entry.taskId, {
          taskId: entry.taskId,
          title: entry.task.title,
          seconds,
        });
      }

      // Aggregate by day
      const dateKey = entry.startTime.toISOString().split('T')[0];
      const dayEntry = byDayMap.get(dateKey);
      if (dayEntry) {
        dayEntry.seconds += seconds;
      } else {
        byDayMap.set(dateKey, { date: dateKey, seconds });
      }
    }

    res.json({
      totalSeconds,
      entryCount: entries.length,
      byTask: Array.from(byTaskMap.values()),
      byDay: Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Get single entry (owner only)
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const entry = await verifyEntryOwner(id, userId);

    const fullEntry = await prisma.timeEntry.findUnique({
      where: { id: entry.id },
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    res.json(fullEntry);
  } catch (err) {
    next(err);
  }
});

// POST / - Manual time entry creation
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const parsed = createTimeEntrySchema.parse(req.body);

    await verifyProjectMembership(userId, parsed.taskId);

    let { duration } = parsed;
    const startTime = new Date(parsed.startTime);
    const endTime = parsed.endTime ? new Date(parsed.endTime) : undefined;

    // Auto-calculate duration from endTime - startTime if endTime provided but duration not
    if (endTime && !duration) {
      duration = calculateDurationSeconds(startTime, endTime);
    }

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: parsed.taskId,
        userId,
        startTime,
        endTime: endTime || null,
        duration: duration || null,
        description: parsed.description || null,
      },
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update entry (owner only)
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const parsed = updateTimeEntrySchema.parse(req.body);

    const existing = await verifyEntryOwner(id, userId);

    const updateData: Record<string, unknown> = {};

    if (parsed.startTime !== undefined) {
      updateData.startTime = new Date(parsed.startTime);
    }
    if (parsed.endTime !== undefined) {
      updateData.endTime = new Date(parsed.endTime);
    }
    if (parsed.description !== undefined) {
      updateData.description = parsed.description;
    }
    if (parsed.duration !== undefined) {
      updateData.duration = parsed.duration;
    }

    // Recalculate duration if endTime changes and duration was not explicitly provided
    if (parsed.endTime !== undefined && parsed.duration === undefined) {
      const startTime = parsed.startTime ? new Date(parsed.startTime) : existing.startTime;
      const endTime = new Date(parsed.endTime);
      updateData.duration = calculateDurationSeconds(startTime, endTime);
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete entry (owner only)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    await verifyEntryOwner(id, userId);

    await prisma.timeEntry.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /start - Start timer
router.post('/start', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const parsed = startTimerSchema.parse(req.body);

    // Enforce one active timer per user
    const activeTimer = await prisma.timeEntry.findFirst({
      where: { userId, endTime: null },
    });

    if (activeTimer) {
      throw new AppError('You already have an active timer. Stop it before starting a new one.', 409);
    }

    await verifyProjectMembership(userId, parsed.taskId);

    const entry = await prisma.timeEntry.create({
      data: {
        taskId: parsed.taskId,
        userId,
        startTime: new Date(),
        endTime: null,
        duration: null,
        description: parsed.description || null,
      },
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// POST /:id/stop - Stop timer
router.post('/:id/stop', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const entry = await verifyEntryOwner(id, userId);

    if (entry.endTime !== null) {
      throw new AppError('This time entry has already been stopped', 400);
    }

    const endTime = new Date();
    const duration = calculateDurationSeconds(entry.startTime, endTime);

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        endTime,
        duration,
      },
      include: {
        task: { select: { id: true, title: true, status: true, projectId: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
