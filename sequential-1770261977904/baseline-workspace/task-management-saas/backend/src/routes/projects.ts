import { Router, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Get all projects
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// Get single project with tasks
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
});

// Create project
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const { name, description, color } = req.body;

      const project = await prisma.project.create({
        data: {
          name,
          description,
          color,
          userId: req.userId!,
        },
      });

      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
);

// Update project
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400);
      }

      const existingProject = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          userId: req.userId,
        },
      });

      if (!existingProject) {
        throw new AppError('Project not found', 404);
      }

      const { name, description, color } = req.body;

      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(color !== undefined && { color }),
        },
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// Delete project
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existingProject = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
