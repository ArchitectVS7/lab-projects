import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getUserXPProgress, applyRetroactiveXP } from '../services/xpService.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/xp/progress:
 *   get:
 *     summary: Get user's XP progress
 *     tags: [XP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: XP progress data
 */
router.get('/progress', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const progress = await getUserXPProgress(req.userId!);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/xp/retroactive:
 *   post:
 *     summary: Apply retroactive XP for completed tasks
 *     tags: [XP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retroactive XP applied successfully
 */
router.post('/retroactive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await applyRetroactiveXP(req.userId!);
    const progress = await getUserXPProgress(req.userId!);
    res.json({
      message: 'Retroactive XP applied successfully',
      progress,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
