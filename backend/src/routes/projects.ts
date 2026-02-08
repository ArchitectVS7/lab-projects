import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { dispatchWebhooks } from '../lib/webhookDispatcher.js';
import { notifyProjectInvite } from '../lib/notifications.js';

const router = Router();
router.use(authenticate);

// --- Zod Schemas ---

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (#RRGGBB)').optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const addMemberSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

// --- Helpers ---

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const;

const projectInclude = {
  owner: { select: userSelect },
  members: {
    include: {
      user: { select: userSelect },
    },
  },
  _count: { select: { tasks: true } },
} as const;

const projectDetailInclude = {
  owner: { select: userSelect },
  members: {
    include: {
      user: { select: userSelect },
    },
  },
  tasks: {
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { tasks: true } },
} as const;

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

// --- UUID validation helper ---
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }
}

// --- Routes ---

// GET /api/projects - List projects where user is owner or member
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectWhere = {
      OR: [
        { ownerId: req.userId },
        { members: { some: { userId: req.userId } } },
      ],
    };

    // Pagination: only when `page` query param is present (backward-compatible)
    const wantsPagination = req.query.page !== undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    if (wantsPagination) {
      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: projectWhere,
          include: projectInclude,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.project.count({ where: projectWhere }),
      ]);

      res.json({
        data: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: projectInclude,
        orderBy: { createdAt: 'desc' },
      });

      res.json(projects);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get project detail
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'project ID');

    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      include: projectDetailInclude,
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create project
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color || '#6366f1',
        ownerId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: 'OWNER',
          },
        },
      },
      include: projectInclude,
    });

    await dispatchWebhooks('project.created', project, req.userId!);

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'project ID');
    const data = updateProjectSchema.parse(req.body);

    const membership = await getProjectMembership(req.userId!, req.params.id);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only project owners and admins can update projects', 403);
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
      },
      include: projectInclude,
    });

    await dispatchWebhooks('project.updated', project, req.userId!);

    res.json(project);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Delete project (owner only)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'project ID');

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (project.ownerId !== req.userId) {
      throw new AppError('Only the project owner can delete a project', 403);
    }

    await prisma.project.delete({ where: { id: req.params.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:id/members - Add member
router.post('/:id/members', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'project ID');
    const data = addMemberSchema.parse(req.body);

    // Check requester is OWNER or ADMIN
    const membership = await getProjectMembership(req.userId!, req.params.id);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only project owners and admins can add members', 403);
    }

    // Find target user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: data.email.trim() },
    });
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Check not already a member
    const existingMembership = await getProjectMembership(targetUser.id, req.params.id);
    if (existingMembership) {
      throw new AppError('User is already a member of this project', 409);
    }

    // Fetch project name and inviter name for the notification
    const [project, inviter] = await Promise.all([
      prisma.project.findUnique({ where: { id: req.params.id }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } }),
    ]);

    const newMember = await prisma.projectMember.create({
      data: {
        projectId: req.params.id,
        userId: targetUser.id,
        role: data.role || 'MEMBER',
      },
      include: {
        user: { select: userSelect },
      },
    });

    // Notify the added user (non-blocking)
    notifyProjectInvite(
      req.params.id,
      targetUser.id,
      inviter?.name || 'A team member',
      project?.name || 'a project',
    ).catch(() => {});

    res.status(201).json(newMember);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'project ID');
    validateUUID(req.params.userId, 'user ID');

    // Check requester is OWNER or ADMIN
    const membership = await getProjectMembership(req.userId!, req.params.id);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only project owners and admins can remove members', 403);
    }

    // Cannot remove the project owner
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    if (project.ownerId === req.params.userId) {
      throw new AppError('Cannot remove the project owner', 400);
    }

    // Verify target is actually a member
    const targetMembership = await getProjectMembership(req.params.userId, req.params.id);
    if (!targetMembership) {
      throw new AppError('User is not a member of this project', 404);
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
});

export default router;
