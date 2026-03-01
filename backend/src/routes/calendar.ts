import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import ical, { ICalCalendarMethod } from 'ical-generator';

const router = Router();

// --- Helpers ---

const PRIORITY_MAP: Record<string, number> = {
  URGENT: 1,
  HIGH: 3,
  MEDIUM: 5,
  LOW: 9,
};

/** Build the public base URL for calendar feed links.
 *  Priority: CALENDAR_PUBLIC_URL env var > request host (with X-Forwarded-Proto support)
 */
function publicBaseUrl(req: Request): string {
  if (process.env.CALENDAR_PUBLIC_URL) {
    return process.env.CALENDAR_PUBLIC_URL.replace(/\/$/, '');
  }
  // Trust X-Forwarded-Proto so Railway/Vercel HTTPS is reflected correctly
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() ?? req.protocol;
  return `${proto}://${req.get('host')}`;
}

// --- Token management (JWT-authenticated) ---

// POST /api/calendar/token — Generate or regenerate calendar feed token
router.post('/token', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    // Read current state for optimistic concurrency check (prevents race conditions
    // where two concurrent requests both generate a token simultaneously).
    const currentUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { calendarTokenCreatedAt: true },
    });

    // Store the hash — the plaintext is never persisted, only returned once here.
    const updated = await prisma.user.updateMany({
      where: {
        id: req.userId,
        calendarTokenCreatedAt: currentUser?.calendarTokenCreatedAt ?? null,
      },
      data: {
        calendarToken: tokenHash,
        calendarTokenCreatedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      // Another concurrent request already updated the token — ask the caller to retry.
      throw new AppError('Token generation conflict, please retry', 409);
    }

    const feedUrl = `${publicBaseUrl(req)}/api/calendar/feed.ics?token=${plainToken}`;
    res.status(201).json({ token: plainToken, feedUrl });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/calendar/token — Revoke calendar feed token
router.delete('/token', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        calendarToken: null,
        calendarTokenCreatedAt: null,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/calendar/token/status — Check token status
// Note: the feed URL cannot be reconstructed from storage because only the hash is stored.
// Clients that need the feed URL must regenerate the token via POST /token.
router.get('/token/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { calendarToken: true, calendarTokenCreatedAt: true },
    });

    if (!user?.calendarToken) {
      res.json({ hasToken: false, feedUrl: null, createdAt: null });
      return;
    }

    res.json({
      hasToken: true,
      feedUrl: null,
      createdAt: user.calendarTokenCreatedAt,
    });
  } catch (error) {
    next(error);
  }
});

// --- Feed endpoint (token-authenticated via query string) ---

// GET /api/calendar/feed.ics?token=...&includeDone=true
router.get('/feed.ics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    // Hash the incoming token before querying — only hashes are stored in the DB.
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { calendarToken: tokenHash },
      select: { id: true, name: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const includeDone = req.query.includeDone === 'true';

    // Get all projects where user is a member
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    // Fetch tasks with due dates
    const where: Record<string, unknown> = {
      projectId: { in: projectIds },
      dueDate: { not: null },
    };

    if (!includeDone) {
      where.status = { not: 'DONE' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Build iCal calendar
    const calendar = ical({
      name: `${user.name}'s TaskMan`,
      method: ICalCalendarMethod.PUBLISH,
      prodId: { company: 'TaskMan', product: 'TaskMan Calendar Feed' },
    });

    for (const task of tasks) {
      const dueDate = task.dueDate!;
      const descriptionParts: string[] = [];
      if (task.description) descriptionParts.push(task.description);
      descriptionParts.push(`Project: ${task.project.name}`);
      descriptionParts.push(`Priority: ${task.priority}`);
      descriptionParts.push(`Status: ${task.status}`);

      calendar.createEvent({
        id: `task-${task.id}@taskman`,
        summary: task.title,
        description: descriptionParts.join('\n'),
        start: dueDate,
        allDay: true,
        priority: PRIORITY_MAP[task.priority] ?? 5,
      });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.setHeader('Content-Disposition', 'inline; filename="feed.ics"');
    res.send(calendar.toString());
  } catch (error) {
    next(error);
  }
});

export default router;
