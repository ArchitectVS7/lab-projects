import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  getActiveQuests,
  checkAndCompleteQuests,
} from '../services/questService.js';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /api/quests:
 *   get:
 *     summary: Get active quests for the authenticated user
 *     description: >
 *       Returns all non-expired quests with live progress computed from
 *       the task database. Daily and weekly quests are generated on first
 *       access if they do not yet exist for the current period.
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of active quests with progress
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const quests = await getActiveQuests(req.userId!);
    res.json(quests);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/quests/check:
 *   post:
 *     summary: Check quest progress and award XP for completed quests
 *     description: >
 *       Evaluates all active quests against current task data. Any quest
 *       whose target has been reached is marked complete and XP is awarded.
 *       Call this after task completion or time-entry actions.
 *     tags: [Quests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: IDs of quests newly completed in this check
 */
router.post('/check', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const completedIds = await checkAndCompleteQuests(req.userId!);
    res.json({ completedQuestIds: completedIds });
  } catch (error) {
    next(error);
  }
});

export default router;
