import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requirePlan, PlanRequest } from '../middleware/planEnforcement.js';
import { ALLOWED_WEBHOOK_EVENTS } from '../lib/webhookDispatcher.js';

const router = Router();
router.use(authenticate);

// --- SSRF Protection ---

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^0\.0\.0\.0/,
];

function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    return PRIVATE_IP_PATTERNS.some(p => p.test(hostname));
  } catch {
    return true; // invalid URL = reject
  }
}

// --- Zod Schemas ---

const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL').max(2048, 'URL must be 2048 characters or less').refine(
    url => !isPrivateUrl(url),
    'Webhook URL must be a public URL'
  ),
  events: z.array(z.string()).min(1, 'At least one event is required').refine(
    (events) => events.every((e) => (ALLOWED_WEBHOOK_EVENTS as readonly string[]).includes(e)),
    { message: `Events must be one of: ${ALLOWED_WEBHOOK_EVENTS.join(', ')}` }
  ),
});

const updateWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL').max(2048, 'URL must be 2048 characters or less').refine(
    url => !isPrivateUrl(url),
    'Webhook URL must be a public URL'
  ).optional(),
  events: z.array(z.string()).min(1, 'At least one event is required').refine(
    (events) => events.every((e) => (ALLOWED_WEBHOOK_EVENTS as readonly string[]).includes(e)),
    { message: `Events must be one of: ${ALLOWED_WEBHOOK_EVENTS.join(', ')}` }
  ).optional(),
  active: z.boolean().optional(),
});

// --- Routes ---

// POST /api/webhooks - Create webhook
router.post('/', requirePlan('PRO', 'TEAM'), async (req: PlanRequest, res: Response, next: NextFunction) => {
  try {
    const data = createWebhookSchema.parse(req.body);
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        userId: req.userId!,
        url: data.url,
        events: data.events,
        secret,
      },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        failureCount: true,
        createdAt: true,
      },
    });

    // Return secret only on creation
    res.status(201).json({ ...webhook, secret });
  } catch (error) {
    next(error);
  }
});

// GET /api/webhooks - List user's webhooks
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        failureCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(webhooks);
  } catch (error) {
    next(error);
  }
});

// PUT /api/webhooks/:id - Update webhook
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateWebhookSchema.parse(req.body);

    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (webhook.userId !== req.userId) {
      throw new AppError('You can only update your own webhooks', 403);
    }

    const updated = await prisma.webhook.update({
      where: { id: req.params.id },
      data: {
        ...(data.url !== undefined && { url: data.url }),
        ...(data.events !== undefined && { events: data.events }),
        ...(data.active !== undefined && { active: data.active }),
      },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        failureCount: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/webhooks/:id - Delete webhook
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (webhook.userId !== req.userId) {
      throw new AppError('You can only delete your own webhooks', 403);
    }

    await prisma.webhook.delete({
      where: { id: req.params.id },
    });

    // Audit log: webhook deleted (url logged, secret never logged)
    console.info(JSON.stringify({
      audit: 'webhook.deleted',
      webhookId: webhook.id,
      url: webhook.url,
      events: webhook.events,
      actorId: req.userId,
      timestamp: new Date().toISOString(),
    }));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/webhooks/:id/logs - Get delivery logs
router.get('/:id/logs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: req.params.id },
    });

    if (!webhook) {
      throw new AppError('Webhook not found', 404);
    }

    if (webhook.userId !== req.userId) {
      throw new AppError('You can only view your own webhook logs', 403);
    }

    const logs = await prisma.webhookLog.findMany({
      where: { webhookId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
