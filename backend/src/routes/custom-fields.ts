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

const createFieldSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['TEXT', 'NUMBER', 'DATE', 'DROPDOWN']),
  options: z.string().optional(), // JSON array string for DROPDOWN
  required: z.boolean().optional(),
  projectId: z.string().uuid(),
});

const updateFieldSchema = createFieldSchema.omit({ projectId: true }).partial();

const setFieldValuesSchema = z.object({
  fields: z.array(z.object({
    fieldId: z.string().uuid(),
    value: z.string(),
  })),
});

// GET /api/custom-fields?projectId=xxx
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) throw new AppError('projectId is required', 400);
    validateUUID(projectId, 'project ID');

    const membership = await getProjectMembership(req.userId!, projectId);
    if (!membership) throw new AppError('Not a member of this project', 403);

    const fields = await prisma.customFieldDefinition.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(fields);
  } catch (error) { next(error); }
});

// POST /api/custom-fields
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createFieldSchema.parse(req.body);
    const membership = await getProjectMembership(req.userId!, data.projectId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only OWNER or ADMIN can create custom fields', 403);
    }

    if (data.type === 'DROPDOWN' && !data.options) {
      throw new AppError('Options are required for DROPDOWN type', 400);
    }

    const field = await prisma.customFieldDefinition.create({
      data: {
        name: data.name,
        type: data.type,
        options: data.options,
        required: data.required ?? false,
        projectId: data.projectId,
      },
    });
    res.status(201).json(field);
  } catch (error) { next(error); }
});

// PUT /api/custom-fields/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'field ID');
    const data = updateFieldSchema.parse(req.body);

    const field = await prisma.customFieldDefinition.findUnique({ where: { id: req.params.id } });
    if (!field) throw new AppError('Custom field not found', 404);

    const membership = await getProjectMembership(req.userId!, field.projectId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only OWNER or ADMIN can update custom fields', 403);
    }

    const updated = await prisma.customFieldDefinition.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.required !== undefined && { required: data.required }),
      },
    });
    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /api/custom-fields/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'field ID');
    const field = await prisma.customFieldDefinition.findUnique({ where: { id: req.params.id } });
    if (!field) throw new AppError('Custom field not found', 404);

    const membership = await getProjectMembership(req.userId!, field.projectId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new AppError('Only OWNER or ADMIN can delete custom fields', 403);
    }

    await prisma.customFieldDefinition.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

// GET /api/custom-fields/task/:taskId - Get field values for a task
router.get('/task/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership) throw new AppError('Not a member of this project', 403);

    const values = await prisma.customFieldValue.findMany({
      where: { taskId: req.params.taskId },
      include: { field: true },
    });
    res.json(values);
  } catch (error) { next(error); }
});

// PUT /api/custom-fields/task/:taskId - Set field values for a task
router.put('/task/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');
    const { fields } = setFieldValuesSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership || membership.role === 'VIEWER') {
      throw new AppError('Cannot modify this task', 403);
    }

    // Validate all fields belong to the project
    for (const { fieldId } of fields) {
      const fieldDef = await prisma.customFieldDefinition.findUnique({ where: { id: fieldId } });
      if (!fieldDef || fieldDef.projectId !== task.projectId) {
        throw new AppError(`Field ${fieldId} not found in this project`, 404);
      }
    }

    // Upsert all values
    const results = await Promise.all(
      fields.map(({ fieldId, value }) =>
        prisma.customFieldValue.upsert({
          where: { taskId_fieldId: { taskId: req.params.taskId, fieldId } },
          create: { taskId: req.params.taskId, fieldId, value },
          update: { value },
          include: { field: true },
        })
      )
    );
    res.json(results);
  } catch (error) { next(error); }
});

export default router;
