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

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  projectId: z.string().uuid(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// GET /api/tags?projectId=xxx
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) throw new AppError('projectId query parameter is required', 400);
    validateUUID(projectId, 'project ID');

    const membership = await getProjectMembership(req.userId!, projectId);
    if (!membership) throw new AppError('Not a member of this project', 403);

    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) { next(error); }
});

// POST /api/tags
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createTagSchema.parse(req.body);
    const membership = await getProjectMembership(req.userId!, data.projectId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only OWNER or ADMIN can create tags', 403);
    }

    const tag = await prisma.tag.create({
      data: { name: data.name, color: data.color || '#6366f1', projectId: data.projectId },
    });
    res.status(201).json(tag);
  } catch (error) { next(error); }
});

// PUT /api/tags/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'tag ID');
    const data = updateTagSchema.parse(req.body);

    const tag = await prisma.tag.findUnique({ where: { id: req.params.id } });
    if (!tag) throw new AppError('Tag not found', 404);

    const membership = await getProjectMembership(req.userId!, tag.projectId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only OWNER or ADMIN can update tags', 403);
    }

    const updated = await prisma.tag.update({
      where: { id: req.params.id },
      data: { ...(data.name !== undefined && { name: data.name }), ...(data.color !== undefined && { color: data.color }) },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'tag ID');
    const tag = await prisma.tag.findUnique({ where: { id: req.params.id } });
    if (!tag) throw new AppError('Tag not found', 404);

    const membership = await getProjectMembership(req.userId!, tag.projectId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only OWNER or ADMIN can delete tags', 403);
    }

    await prisma.tag.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

// POST /api/tags/task/:taskId - Add tag to task
router.post('/task/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');
    const { tagId } = z.object({ tagId: z.string().uuid() }).parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership || membership.role === 'VIEWER') {
      throw new AppError('Cannot modify this task', 403);
    }

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.projectId !== task.projectId) {
      throw new AppError('Tag not found in this project', 404);
    }

    const taskTag = await prisma.taskTag.create({
      data: { taskId: req.params.taskId, tagId },
      include: { tag: true },
    });
    res.status(201).json(taskTag);
  } catch (error) { next(error); }
});

// DELETE /api/tags/task/:taskId/:tagId - Remove tag from task
router.delete('/task/:taskId/:tagId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');
    validateUUID(req.params.tagId, 'tag ID');

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership || membership.role === 'VIEWER') {
      throw new AppError('Cannot modify this task', 403);
    }

    await prisma.taskTag.delete({
      where: { taskId_tagId: { taskId: req.params.taskId, tagId: req.params.tagId } },
    });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
