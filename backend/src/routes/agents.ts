import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { dispatchWebhooks } from '../lib/webhookDispatcher.js';
import { getIO } from '../lib/socket.js';

const router = Router();

const delegateSchema = z.object({
  taskId: z.string().uuid(),
  agentType: z.enum(['RESEARCH', 'WRITING', 'SOCIAL_MEDIA', 'CODE', 'OUTREACH', 'ANALYTICS']),
  instructions: z.string().max(5000).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
  result: z.string().max(10000).optional(),
});

const VALID_AGENT_TYPES = ['RESEARCH', 'WRITING', 'SOCIAL_MEDIA', 'CODE', 'OUTREACH', 'ANALYTICS'] as const;

// POST /api/agents/delegate — Create delegation
router.post('/delegate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = delegateSchema.parse(req.body);

    // Verify task exists and user owns/has access to it
    const task = await prisma.task.findUnique({ where: { id: data.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const isCreatorOrAssignee =
      task.creatorId === req.userId || task.assigneeId === req.userId;

    if (!isCreatorOrAssignee) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: req.userId! } },
      });
      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        throw new AppError('You do not have access to this task', 403);
      }
    }

    const delegation = await prisma.agentDelegation.create({
      data: {
        taskId: data.taskId,
        userId: req.userId!,
        agentType: data.agentType,
        instructions: data.instructions,
      },
    });

    // Fire webhook (fire-and-forget)
    void dispatchWebhooks('task.delegated', { delegation, taskId: data.taskId }, req.userId!);

    // Emit socket event
    getIO()?.to(`user:${req.userId}`).emit('agent:status', {
      id: delegation.id,
      status: 'QUEUED',
      agentType: delegation.agentType,
    });

    res.status(201).json(delegation);
  } catch (error) { next(error); }
});

// GET /api/agents/queue — All delegations for current user
router.get('/queue', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const delegations = await prisma.agentDelegation.findMany({
      where: { userId: req.userId! },
      include: {
        task: { select: { id: true, title: true, projectId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(delegations);
  } catch (error) { next(error); }
});

// GET /api/agents/queue/:agentType — Filtered by agent type
router.get('/queue/:agentType', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { agentType } = req.params;
    if (!VALID_AGENT_TYPES.includes(agentType as typeof VALID_AGENT_TYPES[number])) {
      throw new AppError('Invalid agent type', 400);
    }

    const delegations = await prisma.agentDelegation.findMany({
      where: {
        userId: req.userId!,
        agentType: agentType as typeof VALID_AGENT_TYPES[number],
      },
      include: {
        task: { select: { id: true, title: true, projectId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(delegations);
  } catch (error) { next(error); }
});

// PUT /api/agents/:id/status — Update status (API key auth required)
router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const delegation = await prisma.agentDelegation.findUnique({ where: { id } });
    if (!delegation) throw new AppError('Delegation not found', 404);

    const data = updateStatusSchema.parse(req.body);

    const updateData: {
      status: typeof data.status;
      result?: string;
      startedAt?: Date;
      completedAt?: Date;
    } = { status: data.status };

    if (data.result !== undefined) {
      updateData.result = data.result;
    }
    if (data.status === 'IN_PROGRESS' && !delegation.startedAt) {
      updateData.startedAt = new Date();
    }
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.agentDelegation.update({
      where: { id },
      data: updateData,
    });

    // Emit socket to owner's room
    getIO()?.to(`user:${delegation.userId}`).emit('agent:status', {
      id,
      status: data.status,
      agentType: delegation.agentType,
    });

    // Fire webhook if completed
    if (data.status === 'COMPLETED') {
      void dispatchWebhooks('task.agent_completed', { delegation: updated }, delegation.userId);
    }

    res.json(updated);
  } catch (error) { next(error); }
});

// DELETE /api/agents/:id — Remove delegation
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const delegation = await prisma.agentDelegation.findUnique({ where: { id } });
    if (!delegation) throw new AppError('Delegation not found', 404);
    if (delegation.userId !== req.userId) {
      throw new AppError('You do not have permission to delete this delegation', 403);
    }

    await prisma.agentDelegation.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
