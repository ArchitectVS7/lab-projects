import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// GET /api/analytics/creator-metrics?projectId=xxx
// Returns per-creator task metrics for a project. OWNER/ADMIN only.
router.get('/creator-metrics', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        const projectId = req.query.projectId as string | undefined;

        if (!projectId) {
            throw new AppError('projectId query parameter is required', 400);
        }
        if (!uuidRegex.test(projectId)) {
            throw new AppError('Invalid projectId format', 400);
        }

        // Verify user has OWNER or ADMIN role in this project
        const membership = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            throw new AppError('Only project owners and admins can view creator metrics', 403);
        }

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Fetch all tasks for this project with creator and assignee info
        const tasks = await prisma.task.findMany({
            where: { projectId },
            select: {
                id: true,
                status: true,
                creatorId: true,
                assigneeId: true,
                createdAt: true,
                updatedAt: true,
                creator: { select: { id: true, name: true, avatarUrl: true } },
            },
        });

        // Fetch all project members for the leaderboard
        const members = await prisma.projectMember.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
            },
        });

        // Build per-creator metrics
        const creatorMap = new Map<string, {
            user: { id: string; name: string; avatarUrl: string | null };
            tasksCreated: number;
            selfAssigned: number;
            delegated: number;
            completedThisWeek: number;
            completedLastWeek: number;
            openTasks: number;
            staleTasks: number; // tasks not updated in >7 days that aren't DONE
        }>();

        // Initialize entries for all project members
        for (const m of members) {
            creatorMap.set(m.userId, {
                user: m.user,
                tasksCreated: 0,
                selfAssigned: 0,
                delegated: 0,
                completedThisWeek: 0,
                completedLastWeek: 0,
                openTasks: 0,
                staleTasks: 0,
            });
        }

        for (const task of tasks) {
            let entry = creatorMap.get(task.creatorId);
            if (!entry) {
                // Creator is no longer a member but still has tasks
                entry = {
                    user: task.creator,
                    tasksCreated: 0,
                    selfAssigned: 0,
                    delegated: 0,
                    completedThisWeek: 0,
                    completedLastWeek: 0,
                    openTasks: 0,
                    staleTasks: 0,
                };
                creatorMap.set(task.creatorId, entry);
            }

            entry.tasksCreated++;

            if (task.assigneeId === task.creatorId) {
                entry.selfAssigned++;
            } else if (task.assigneeId) {
                entry.delegated++;
            }

            if (task.status === 'DONE') {
                if (task.updatedAt >= oneWeekAgo) {
                    entry.completedThisWeek++;
                } else if (task.updatedAt >= twoWeeksAgo) {
                    entry.completedLastWeek++;
                }
            } else {
                entry.openTasks++;
                if (task.updatedAt < oneWeekAgo) {
                    entry.staleTasks++;
                }
            }
        }

        // Build leaderboard sorted by tasksCreated desc
        const creators = Array.from(creatorMap.values())
            .map((entry) => {
                const delegationRatio = entry.tasksCreated > 0
                    ? Math.round((entry.delegated / entry.tasksCreated) * 100)
                    : 0;

                const velocityChange = entry.completedLastWeek === 0
                    ? (entry.completedThisWeek > 0 ? 100 : 0)
                    : Math.round(((entry.completedThisWeek - entry.completedLastWeek) / entry.completedLastWeek) * 100);

                let badge: 'delegator' | 'doer' | 'balanced' | 'new';
                if (entry.tasksCreated === 0) {
                    badge = 'new';
                } else if (delegationRatio >= 60) {
                    badge = 'delegator';
                } else if (delegationRatio <= 20) {
                    badge = 'doer';
                } else {
                    badge = 'balanced';
                }

                return {
                    user: entry.user,
                    tasksCreated: entry.tasksCreated,
                    selfAssigned: entry.selfAssigned,
                    delegated: entry.delegated,
                    delegationRatio,
                    completedThisWeek: entry.completedThisWeek,
                    completedLastWeek: entry.completedLastWeek,
                    velocityChange,
                    openTasks: entry.openTasks,
                    staleTasks: entry.staleTasks,
                    badge,
                };
            })
            .sort((a, b) => b.tasksCreated - a.tasksCreated);

        // Project-level summary
        const totalTasks = tasks.length;
        const totalDone = tasks.filter((t) => t.status === 'DONE').length;
        const totalOpen = totalTasks - totalDone;
        const totalStale = tasks.filter((t) => t.status !== 'DONE' && t.updatedAt < oneWeekAgo).length;

        // Bottleneck identification: creators with high open tasks and high stale tasks
        const bottlenecks = creators
            .filter((c) => c.staleTasks > 0)
            .sort((a, b) => b.staleTasks - a.staleTasks)
            .slice(0, 5)
            .map((c) => ({
                user: c.user,
                staleTasks: c.staleTasks,
                openTasks: c.openTasks,
            }));

        res.json({
            projectId,
            summary: {
                totalTasks,
                totalDone,
                totalOpen,
                totalStale,
                memberCount: members.length,
            },
            creators,
            bottlenecks,
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
