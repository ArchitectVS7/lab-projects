import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// --- Zod Schemas ---

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()),
});

// --- Routes ---

// GET /api/notifications - Get notifications for current user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const hasCursorParam = 'cursor' in req.query;
    const cursorId = (req.query.cursor as string) || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: req.userId!,
    };

    if (unreadOnly) {
      where.read = false;
    }

    if (hasCursorParam) {
      // Cursor-based pagination
      // Secondary sort on id ensures deterministic ordering for stable cursor traversal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const findArgs: any = {
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: limit + 1,
      };

      if (cursorId) {
        findArgs.cursor = { id: cursorId };
        findArgs.skip = 1;
      }

      const [results, total] = await Promise.all([
        prisma.notification.findMany(findArgs),
        prisma.notification.count({ where }),
      ]);

      const hasMore = results.length > limit;
      const data = hasMore ? results.slice(0, limit) : results;
      const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

      res.json({
        data,
        pagination: {
          nextCursor: hasMore ? nextCursor : null,
          hasMore,
          limit,
          total,
        },
      });
    } else {
      // Raw array (backward-compatible) - limited to 50
      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json(notifications);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.userId!,
        read: false,
      },
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/mark-read - Mark notifications as read
router.patch('/mark-read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = markReadSchema.parse(req.body);

    // Verify all notifications belong to the user
    const notifications = await prisma.notification.findMany({
      where: {
        id: { in: data.notificationIds },
      },
    });

    const unauthorized = notifications.some(n => n.userId !== req.userId);
    if (unauthorized) {
      throw new AppError('Unauthorized to modify these notifications', 403);
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: data.notificationIds },
        userId: req.userId!,
      },
      data: {
        read: true,
      },
    });

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
router.patch('/mark-all-read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.userId!,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    if (notification.userId !== req.userId) {
      throw new AppError('Unauthorized', 403);
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
