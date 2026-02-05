import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all tasks
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, priority, projectId } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId,
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
        ...(projectId && { projectId: projectId as string }),
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// Get single task
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create task
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { title, description, status, priority, dueDate, projectId } = req.body;

      const task = await prisma.task.create({
        data: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          userId: req.userId!,
          projectId,
        },
        include: {
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

// Update task
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const existingTask = await prisma.task.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId,
        },
      });

      if (!existingTask) {
        throw new AppError('Task not found', 404);
      }

      const { title, description, status, priority, dueDate, projectId } = req.body;

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(projectId !== undefined && { projectId }),
        },
        include: {
          project: {
            select: { id: true, name: true, color: true },
          },
        },
      });

      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// Delete task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404);
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
