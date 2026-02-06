import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get simple productivity insights
router.get('/insights', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // 1. Tasks completed in the last 7 days vs previous 7 days
        const completedThisWeek = await prisma.task.count({
            where: {
                assigneeId: userId,
                status: 'DONE',
                updatedAt: { gte: oneWeekAgo },
            },
        });

        const completedLastWeek = await prisma.task.count({
            where: {
                assigneeId: userId,
                status: 'DONE',
                updatedAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
            },
        });

        // 2. Most productive day of the week (all time)
        // Prisma grouping by date part isn't direct in generic SQL without raw query, 
        // but for MVP we can fetch recent completed tasks and aggregate in JS
        const recentTasks = await prisma.task.findMany({
            where: {
                assigneeId: userId,
                status: 'DONE',
                updatedAt: { gte: twoWeeksAgo }, // Look back 2 weeks for "productive day" pattern
            },
            select: { updatedAt: true },
        });

        const dayCounts = new Array(7).fill(0);
        recentTasks.forEach((task) => {
            const day = task.updatedAt.getDay(); // 0 = Sunday
            dayCounts[day]++;
        });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const maxCount = Math.max(...dayCounts);
        const mostProductiveDay = maxCount > 0 ? days[dayCounts.indexOf(maxCount)] : 'N/A';

        // 3. Average completion time (heuristic: currently just "velocity" as count)
        // True completion time requires 'startedAt' which we don't strictly track yet.

        const velocityChange = completedLastWeek === 0
            ? (completedThisWeek > 0 ? 100 : 0)
            : Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100);

        res.json({
            velocity: {
                thisWeek: completedThisWeek,
                lastWeek: completedLastWeek,
                changePercent: velocityChange,
            },
            patterns: {
                mostProductiveDay,
                tasksAnalyzed: recentTasks.length,
            },
            insight: generateInsight(completedThisWeek, velocityChange, mostProductiveDay),
        });
    } catch (error) {
        next(error);
    }
});

function generateInsight(count: number, change: number, bestDay: string): string {
    if (count === 0) return "Complete some tasks to unlock insights!";

    if (change >= 20) return `You're on fire! ${change}% more tasks completed than last week.`;
    if (change <= -20) return `A bit slower this week. Maybe focusing on complex tasks?`;

    if (bestDay !== 'N/A') return `You seem to be most productive on ${bestDay}s lately.`;

    return "Consistency is key. Keep up the steady work!";
}

export default router;
