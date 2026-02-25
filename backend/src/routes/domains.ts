import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) throw new AppError(`Invalid ${label} format`, 400);
}

const DEFAULT_DOMAINS = [
  { name: 'Coding', icon: '💻', color: '#3b82f6' },
  { name: 'Marketing', icon: '📣', color: '#eab308' },
  { name: 'Book Writing', icon: '📖', color: '#8b5cf6' },
  { name: 'Rock Band', icon: '🎸', color: '#ec4899' },
  { name: 'Health & Hobbies', icon: '🏃', color: '#22c55e' },
];

const createDomainSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().optional(),
});

const updateDomainSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/domains — list user's domains, auto-seed if empty
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    let domains = await prisma.domain.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });

    // Auto-seed defaults if user has no domains
    if (domains.length === 0) {
      await prisma.domain.createMany({
        data: DEFAULT_DOMAINS.map((d, i) => ({
          userId,
          name: d.name,
          icon: d.icon,
          color: d.color,
          sortOrder: i,
        })),
        skipDuplicates: true,
      });

      domains = await prisma.domain.findMany({
        where: { userId },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { tasks: true } } },
      });
    }

    res.json(domains);
  } catch (error) { next(error); }
});

// POST /api/domains — create a domain
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const data = createDomainSchema.parse(req.body);

    const domain = await prisma.domain.create({
      data: {
        userId,
        name: data.name,
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
      include: { _count: { select: { tasks: true } } },
    });

    res.status(201).json(domain);
  } catch (error) { next(error); }
});

// PUT /api/domains/:id — update a domain
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'domain ID');
    const userId = req.userId!;
    const data = updateDomainSchema.parse(req.body);

    const existing = await prisma.domain.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Domain not found', 404);
    if (existing.userId !== userId) throw new AppError('Forbidden', 403);

    const domain = await prisma.domain.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
      include: { _count: { select: { tasks: true } } },
    });

    res.json(domain);
  } catch (error) { next(error); }
});

// DELETE /api/domains/:id — delete a domain
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'domain ID');
    const userId = req.userId!;

    const existing = await prisma.domain.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Domain not found', 404);
    if (existing.userId !== userId) throw new AppError('Forbidden', 403);

    await prisma.domain.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

// POST /api/domains/:id/tasks/:taskId — assign task to domain
router.post('/:id/tasks/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'domain ID');
    validateUUID(req.params.taskId, 'task ID');
    const userId = req.userId!;

    const domain = await prisma.domain.findUnique({ where: { id: req.params.id } });
    if (!domain) throw new AppError('Domain not found', 404);
    if (domain.userId !== userId) throw new AppError('Forbidden', 403);

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);
    if (task.creatorId !== userId) {
      // Allow if user is a project member with sufficient role
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId } },
      });
      if (!membership) throw new AppError('Forbidden', 403);
    }

    const taskDomain = await prisma.taskDomain.create({
      data: { taskId: req.params.taskId, domainId: req.params.id },
      include: { domain: true },
    });

    res.status(201).json(taskDomain);
  } catch (error) { next(error); }
});

// DELETE /api/domains/:id/tasks/:taskId — remove task from domain
router.delete('/:id/tasks/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'domain ID');
    validateUUID(req.params.taskId, 'task ID');
    const userId = req.userId!;

    const domain = await prisma.domain.findUnique({ where: { id: req.params.id } });
    if (!domain) throw new AppError('Domain not found', 404);
    if (domain.userId !== userId) throw new AppError('Forbidden', 403);

    await prisma.taskDomain.delete({
      where: { taskId_domainId: { taskId: req.params.taskId, domainId: req.params.id } },
    });

    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
