import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// --- Zod Schemas ---

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  projectId: z.string().uuid('Invalid project ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.omit({ projectId: true }).partial();

const bulkStatusSchema = z.object({
  taskIds: z.array(z.string().uuid()),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
});

// --- Helpers ---

const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  creator: { select: { id: true, name: true } },
} as const;

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

function canModifyTask(
  membership: { role: string } | null,
  task: { creatorId: string },
  userId: string
): boolean {
  if (!membership) return false;
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  if (membership.role === 'MEMBER' && task.creatorId === userId) return true;
  return false;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }
}

// --- Routes ---

// PATCH /api/tasks/bulk-status - Must be registered BEFORE /:id routes
router.patch('/bulk-status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = bulkStatusSchema.parse(req.body);

    const tasks = await prisma.task.findMany({
      where: { id: { in: data.taskIds } },
    });

    for (const task of tasks) {
      const membership = await getProjectMembership(req.userId!, task.projectId);
      if (!canModifyTask(membership, task, req.userId!)) {
        throw new AppError('Unauthorized to modify one or more tasks', 403);
      }
    }

    const result = await prisma.task.updateMany({
      where: { id: { in: data.taskIds } },
      data: { status: data.status },
    });

    res.json({ updated: result.count });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks - List tasks with filters
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all projects where user is a member
    const userProjects = await prisma.projectMember.findMany({
      where: { userId: req.userId },
      select: { projectId: true },
    });
    const projectIds = userProjects.map((pm) => pm.projectId);

    // Build query filters
    const where: Record<string, unknown> = {
      projectId: { in: projectIds },
    };

    if (req.query.projectId) {
      const pid = req.query.projectId as string;
      if (projectIds.includes(pid)) {
        where.projectId = pid;
      } else {
        // User doesn't have access to this project
        return res.json([]);
      }
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.assigneeId) where.assigneeId = req.query.assigneeId;
    if (req.query.creatorId) where.creatorId = req.query.creatorId;

    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    // Validate sortBy to prevent injection
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'status', 'priority', 'dueDate'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { [safeSortBy]: order },
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify user has access to this task's project
    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership) {
      throw new AppError('Task not found', 404);
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create task
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createTaskSchema.parse(req.body);

    // Check project membership (must be OWNER, ADMIN, or MEMBER -- not VIEWER)
    const membership = await getProjectMembership(req.userId!, data.projectId);
    if (!membership) {
      throw new AppError('Project not found', 404);
    }
    if (membership.role === 'VIEWER') {
      throw new AppError('Viewers cannot create tasks', 403);
    }

    // If assigneeId provided, verify assignee is a project member
    if (data.assigneeId) {
      const assigneeMembership = await getProjectMembership(data.assigneeId, data.projectId);
      if (!assigneeMembership) {
        throw new AppError('Assignee is not a member of this project', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId || null,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        creatorId: req.userId!,
      },
      include: taskInclude,
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');
    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!canModifyTask(membership, task, req.userId!)) {
      throw new AppError('Unauthorized to modify this task', 403);
    }

    // If assigneeId is being changed, verify new assignee is a project member
    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const assigneeMembership = await getProjectMembership(data.assigneeId, task.projectId);
      if (!assigneeMembership) {
        throw new AppError('Assignee is not a member of this project', 400);
      }
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
      include: taskInclude,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!canModifyTask(membership, task, req.userId!)) {
      throw new AppError('Unauthorized to delete this task', 403);
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
