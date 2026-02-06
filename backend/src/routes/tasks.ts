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
  projectId: z.string().uuid('Invalid project ID format'),
  assigneeId: z.string().uuid('Invalid assignee ID format').optional().nullable(),
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

const userSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

const taskInclude = {
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
  // OWNER and ADMIN can modify any task in the project
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  // MEMBER can only modify tasks they created
  if (membership.role === 'MEMBER' && task.creatorId === userId) return true;
  // VIEWER cannot modify tasks
  return false;
}

// --- UUID validation helper ---
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) {
    throw new AppError(`Invalid ${label} format`, 400);
  }
}

// --- Routes ---

// IMPORTANT: PATCH /bulk-status must be registered BEFORE GET /:id
// Otherwise Express will try to match 'bulk-status' as an :id parameter

// PATCH /api/tasks/bulk-status - Bulk status update
router.patch('/bulk-status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = bulkStatusSchema.parse(req.body);

    // Get all tasks and verify permissions for each
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: data.taskIds },
      },
      include: {
        project: {
          include: {
            members: true,
          },
        },
      },
    });

    // Optimization: Group tasks by project to avoid N+1 queries
    const projectIds = Array.from(new Set(tasks.map((t) => t.projectId)));
    const memberships = new Map<string, { role: string } | null>();

    for (const projectId of projectIds) {
      const membership = await getProjectMembership(req.userId!, projectId);
      memberships.set(projectId, membership);
    }

    for (const task of tasks) {
      const membership = memberships.get(task.projectId) || null;
      if (!canModifyTask(membership, task, req.userId!)) {
        throw new AppError('Unauthorized to modify one or more tasks', 403);
      }
    }

    // Since we throw on any error, all tasks in 'data.taskIds' are effectively authorized.
    // However, we should use the IDs that were actually found in the DB.
    const updatableTaskIds = tasks.map(t => t.id);

    // Update all authorized tasks
    const result = await prisma.task.updateMany({
      where: {
        id: { in: updatableTaskIds },
      },
      data: {
        status: data.status,
      },
    });

    res.json({ updated: result.count });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks - List tasks
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all projects where user is a member
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
      },
      select: { id: true },
    });

    const projectIds = userProjects.map(p => p.id);

    // Build filters
    const where: any = {
      projectId: { in: projectIds },
    };

    if (req.query.projectId) {
      where.projectId = req.query.projectId as string;
    }
    if (req.query.status) {
      where.status = req.query.status as string;
    }
    if (req.query.priority) {
      where.priority = req.query.priority as string;
    }
    if (req.query.assigneeId) {
      where.assigneeId = req.query.assigneeId as string;
    }
    if (req.query.creatorId) {
      where.creatorId = req.query.creatorId as string;
    }

    // Build orderBy with validation to prevent injection
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    // Validate sortBy to prevent injection
    // SECURITY: Only allow specific sort fields to prevent query injection.
    // If adding new filters/sorting in the future, always validate against allowlist.
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

// GET /api/tasks/:id - Get task detail
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

    // Verify user is member of task's project
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

    // First check if project exists
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Verify user is member of the project
    const membership = await getProjectMembership(req.userId!, data.projectId);
    if (!membership) {
      throw new AppError('You are not a member of this project', 403);
    }

    // VIEWER cannot create tasks
    if (membership.role === 'VIEWER') {
      throw new AppError('VIEWER role cannot create tasks', 403);
    }

    // If assigneeId provided, verify they are a project member
    if (data.assigneeId) {
      const assigneeMembership = await getProjectMembership(data.assigneeId, data.projectId);
      if (!assigneeMembership) {
        throw new AppError('Assignee must be a member of the project', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
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

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify user can modify this task
    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!canModifyTask(membership, task, req.userId!)) {
      throw new AppError('You cannot modify this task', 403);
    }

    // If changing assignee, verify new assignee is a project member
    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const assigneeMembership = await getProjectMembership(data.assigneeId, task.projectId);
      if (!assigneeMembership) {
        throw new AppError('Assignee must be a member of the project', 400);
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
      include: taskInclude,
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'task ID');

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: taskInclude,
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // Verify user can modify this task
    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!canModifyTask(membership, task, req.userId!)) {
      throw new AppError('You cannot delete this task', 403);
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
