import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { calculateCheckinStreak } from '../lib/streakUtils.js';

const router = Router();
router.use(authenticate);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) throw new AppError(`Invalid ${label} format`, 400);
}

const createCheckinSchema = z.object({
  priorities: z.string().min(1).max(2000),
  energyLevel: z.number().int().min(1).max(10),
  blockers: z.string().max(2000).optional(),
  focusDomains: z.array(z.string()).optional().default([]),
});

// POST /api/checkins — Upsert today's check-in
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const data = createCheckinSchema.parse(req.body);
    const date = new Date(new Date().toISOString().slice(0, 10));

    const checkin = await prisma.dailyCheckin.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        priorities: data.priorities,
        energyLevel: data.energyLevel,
        blockers: data.blockers ?? null,
        focusDomains: data.focusDomains,
      },
      update: {
        priorities: data.priorities,
        energyLevel: data.energyLevel,
        blockers: data.blockers ?? null,
        focusDomains: data.focusDomains,
      },
    });

    res.json(checkin);
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins/today — Today's check-in or 404
// IMPORTANT: registered before /:id to avoid route conflict
router.get('/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const date = new Date(new Date().toISOString().slice(0, 10));

    const checkin = await prisma.dailyCheckin.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (!checkin) throw new AppError('No check-in for today', 404);
    res.json(checkin);
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins/streak — Consecutive day count
router.get('/streak', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const checkins = await prisma.dailyCheckin.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const dates = checkins.map((c) => c.date.toISOString().slice(0, 10));
    const streak = calculateCheckinStreak(dates);
    const lastCheckin = dates.length > 0 ? dates[0] ?? null : null;
    res.json({ streak, lastCheckin });
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins — List with optional date range + pagination
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);

    const where: {
      userId: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [checkins, total] = await Promise.all([
      prisma.dailyCheckin.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.dailyCheckin.count({ where }),
    ]);

    res.json({ checkins, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/checkins/:id — Get single check-in (ownership check)
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'check-in ID');
    const checkin = await prisma.dailyCheckin.findUnique({ where: { id: req.params.id } });
    if (!checkin) throw new AppError('Check-in not found', 404);
    if (checkin.userId !== req.userId) throw new AppError('Not authorized', 403);
    res.json(checkin);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/checkins/:id — Delete (ownership check)
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'check-in ID');
    const checkin = await prisma.dailyCheckin.findUnique({ where: { id: req.params.id } });
    if (!checkin) throw new AppError('Check-in not found', 404);
    if (checkin.userId !== req.userId) throw new AppError('Not authorized', 403);
    await prisma.dailyCheckin.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
