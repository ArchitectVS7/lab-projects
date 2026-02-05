import { Router, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient, ProjectRole } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ============================================
// GET /projects - List all user's projects
// ============================================
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
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

// ============================================
// GET /projects/:id - Get single project
// ============================================
router.get(
  '/:id',
  param('id').isUUID(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid project ID', 400);
      }

      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { ownerId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          tasks: {
            include: {
              assignee: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { tasks: true },
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
  }
);

// ============================================
// POST /projects - Create new project
// ============================================
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { name, description, color } = req.body;

      const project = await prisma.project.create({
        data: {
          name,
          description,
          color: color || '#6366f1',
          ownerId: req.userId!,
          members: {
            create: {
              userId: req.userId!,
              role: ProjectRole.OWNER,
            },
          },
        },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { tasks: true },
          },
        },
      });

      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// PUT /projects/:id - Update project
// ============================================
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      // Check if user is owner or admin
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: req.params.id,
            userId: req.userId!,
          },
        },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        throw new AppError('Not authorized to update this project', 403);
      }

      const { name, description, color } = req.body;

      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(color !== undefined && { color }),
        },
        include: {
          owner: {
            select: { id: true, name: true, avatarUrl: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { tasks: true },
          },
        },
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// DELETE /projects/:id - Delete project
// ============================================
router.delete(
  '/:id',
  param('id').isUUID(),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid project ID', 400);
      }

      // Only owner can delete
      const project = await prisma.project.findFirst({
        where: {
          id: req.params.id,
          ownerId: req.userId,
        },
      });

      if (!project) {
        throw new AppError('Project not found or you are not the owner', 404);
      }

      await prisma.project.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// POST /projects/:id/members - Add member
// ============================================
router.post(
  '/:id/members',
  [
    param('id').isUUID(),
    body('email').isEmail().withMessage('Valid email required'),
    body('role').optional().isIn(['ADMIN', 'MEMBER', 'VIEWER']),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      // Check if requester is owner or admin
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: req.params.id,
            userId: req.userId!,
          },
        },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        throw new AppError('Not authorized to add members', 403);
      }

      const { email, role } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError('User not found with that email', 404);
      }

      // Check if already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: req.params.id,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        throw new AppError('User is already a member of this project', 409);
      }

      const newMember = await prisma.projectMember.create({
        data: {
          projectId: req.params.id,
          userId: user.id,
          role: (role as ProjectRole) || ProjectRole.MEMBER,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      res.status(201).json(newMember);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// DELETE /projects/:id/members/:userId - Remove member
// ============================================
router.delete(
  '/:id/members/:userId',
  [param('id').isUUID(), param('userId').isUUID()],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid IDs', 400);
      }

      // Check if requester is owner or admin
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: req.params.id,
            userId: req.userId!,
          },
        },
      });

      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        throw new AppError('Not authorized to remove members', 403);
      }

      // Can't remove owner
      const targetMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: req.params.id,
            userId: req.params.userId,
          },
        },
      });

      if (!targetMember) {
        throw new AppError('Member not found', 404);
      }

      if (targetMember.role === 'OWNER') {
        throw new AppError('Cannot remove project owner', 400);
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: req.params.id,
            userId: req.params.userId,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
