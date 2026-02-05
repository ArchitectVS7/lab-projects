import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

// All routes require authentication
router.use(authenticate);

// Helper to check project membership
async function checkProjectAccess(userId: string, projectId: string) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });
  return membership;
}

// Get all tasks (optionally filtered by project)
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, status, priority, assigneeId, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Get all projects user has access to
    const userProjects = await prisma.projectMember.findMany({
      where: { userId: req.userId },
      select: { projectId: true },
    });
    const projectIds = userProjects.map((p) => p.projectId);

    const tasks = await prisma.task.findMany({
      where: {
        projectId: projectId ? String(projectId) : { in: projectIds },
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
        ...(assigneeId && { assigneeId: String(assigneeId) }),
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: {
        [sortBy as string]: order,
      },
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get single task
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check project access
    const access = await checkProjectAccess(req.userId!, task.projectId);
    if (!access) {
      throw new AppError('Not authorized to view this task', 403);
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create task
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createTaskSchema.parse(req.body);

    // Check project access
    const access = await checkProjectAccess(req.userId!, data.projectId);
    if (!access) {
      throw new AppError('Not authorized to create tasks in this project', 403);
    }

    // If assignee specified, verify they're a project member
    if (data.assigneeId) {
      const assigneeAccess = await checkProjectAccess(data.assigneeId, data.projectId);
      if (!assigneeAccess) {
        throw new AppError('Assignee is not a member of this project', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404);
    }

    // Check project access
    const access = await checkProjectAccess(req.userId!, existingTask.projectId);
    if (!access) {
      throw new AppError('Not authorized to update this task', 403);
    }

    // If changing assignee, verify they're a project member
    if (data.assigneeId) {
      const assigneeAccess = await checkProjectAccess(data.assigneeId, existingTask.projectId);
      if (!assigneeAccess) {
        throw new AppError('Assignee is not a member of this project', 400);
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Check project access (only owner/admin can delete)
    const access = await checkProjectAccess(req.userId!, task.projectId);
    if (!access || !['OWNER', 'ADMIN', 'MEMBER'].includes(access.role)) {
      throw new AppError('Not authorized to delete this task', 403);
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Bulk update task status (for drag & drop)
router.patch('/bulk-status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      taskIds: z.array(z.string().uuid()),
      status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
    });

    const { taskIds, status } = schema.parse(req.body);

    // Verify access to all tasks
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, projectId: true },
    });

    for (const task of tasks) {
      const access = await checkProjectAccess(req.userId!, task.projectId);
      if (!access) {
        throw new AppError(`Not authorized to update task ${task.id}`, 403);
      }
    }

    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status },
    });

    res.json({ updated: taskIds.length });
  } catch (error) {
    next(error);
  }
});

export default router;
