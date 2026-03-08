/**
 * Quest Service
 *
 * Implements the quest system described in the PRD (Phase 2 — Gamification):
 *   - Daily quests: 2–3 generated at login, expire at midnight
 *   - Weekly quests: 1 larger goal, expire at end of Sunday
 *   - Challenge quests: one-time character-driven unlocks (CHALLENGE type)
 *
 * Progress is computed on-demand from the task database so the service
 * requires no event hooks into existing routes.
 */

import prisma from '../lib/prisma.js';
import { awardXP } from './xpService.js';

// ── Quest data shape (stored in questData JSON column) ──────────────────────

export interface QuestData {
  title: string;
  description: string;
  objective: 'tasks_completed' | 'high_priority_completed' | 'time_logged' | 'weekly_tasks';
  target: number;
  xpReward: number;
}

export interface QuestWithProgress {
  id: string;
  questType: string;
  questData: QuestData;
  completed: boolean;
  completedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  progress: number;
}

// ── Template banks ──────────────────────────────────────────────────────────

const DAILY_TEMPLATES: QuestData[] = [
  {
    title: 'Task Finisher',
    description: 'Complete 5 tasks today.',
    objective: 'tasks_completed',
    target: 5,
    xpReward: 50,
  },
  {
    title: 'Priority Push',
    description: 'Finish a high-priority or urgent task.',
    objective: 'high_priority_completed',
    target: 1,
    xpReward: 40,
  },
  {
    title: 'Time Tracker',
    description: 'Log time on at least 3 tasks today.',
    objective: 'time_logged',
    target: 3,
    xpReward: 35,
  },
];

const WEEKLY_TEMPLATES: QuestData[] = [
  {
    title: 'Weekly Warrior',
    description: 'Complete 30 tasks this week.',
    objective: 'weekly_tasks',
    target: 30,
    xpReward: 200,
  },
  {
    title: 'High Stakes Week',
    description: 'Complete 10 high-priority or urgent tasks this week.',
    objective: 'high_priority_completed',
    target: 10,
    xpReward: 175,
  },
];

// ── Date helpers ────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfThisWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfThisWeek(): Date {
  const d = startOfThisWeek();
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ── Progress computation ────────────────────────────────────────────────────

async function computeProgress(userId: string, quest: QuestData): Promise<number> {
  const { objective } = quest;

  if (objective === 'tasks_completed') {
    const count = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: 'DONE',
        updatedAt: { gte: startOfToday() },
      },
    });
    return count;
  }

  if (objective === 'high_priority_completed') {
    const count = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: 'DONE',
        priority: { in: ['HIGH', 'URGENT'] },
        updatedAt: { gte: startOfToday() },
      },
    });
    return count;
  }

  if (objective === 'time_logged') {
    // Count distinct tasks with a time entry logged today
    const entries = await prisma.timeEntry.findMany({
      where: {
        userId,
        startTime: { gte: startOfToday() },
      },
      select: { taskId: true },
      distinct: ['taskId'],
    });
    return entries.length;
  }

  if (objective === 'weekly_tasks') {
    const count = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: 'DONE',
        updatedAt: { gte: startOfThisWeek() },
      },
    });
    return count;
  }

  return 0;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Ensure the user has daily quests for today. Creates 2–3 from the template
 * bank if none exist yet. Returns without creating if already present.
 */
export async function ensureDailyQuests(userId: string): Promise<void> {
  const existingCount = await prisma.userQuest.count({
    where: {
      userId,
      questType: 'DAILY',
      createdAt: { gte: startOfToday() },
    },
  });

  if (existingCount > 0) return;

  // Shuffle templates and pick 2–3
  const shuffled = [...DAILY_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  await prisma.userQuest.createMany({
    data: selected.map((tpl) => ({
      userId,
      questType: 'DAILY',
      questData: tpl as object,
      expiresAt: endOfToday(),
    })),
  });
}

/**
 * Ensure the user has a weekly quest for this week. Creates one from the
 * template bank if none exist yet.
 */
export async function ensureWeeklyQuests(userId: string): Promise<void> {
  const existingCount = await prisma.userQuest.count({
    where: {
      userId,
      questType: 'WEEKLY',
      createdAt: { gte: startOfThisWeek() },
    },
  });

  if (existingCount > 0) return;

  // Pick a weekly template (rotate based on week number for variety)
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const template = WEEKLY_TEMPLATES[weekNum % WEEKLY_TEMPLATES.length];

  await prisma.userQuest.create({
    data: {
      userId,
      questType: 'WEEKLY',
      questData: template as object,
      expiresAt: endOfThisWeek(),
    },
  });
}

/**
 * Returns all active (non-expired) quests for a user with live progress.
 * Also generates today's daily and weekly quests if not yet created.
 */
export async function getActiveQuests(userId: string): Promise<QuestWithProgress[]> {
  await ensureDailyQuests(userId);
  await ensureWeeklyQuests(userId);

  const now = new Date();
  const quests = await prisma.userQuest.findMany({
    where: {
      userId,
      expiresAt: { gte: now },
    },
    orderBy: { createdAt: 'asc' },
  });

  return Promise.all(
    quests.map(async (q) => {
      const data = q.questData as QuestData;
      const progress = q.completed ? data.target : await computeProgress(userId, data);
      return {
        id: q.id,
        questType: q.questType,
        questData: data,
        completed: q.completed,
        completedAt: q.completedAt,
        expiresAt: q.expiresAt,
        createdAt: q.createdAt,
        progress,
      };
    })
  );
}

/**
 * Check all of a user's active quests for completion and award XP for any
 * that have reached their target but are not yet marked complete.
 * Call this after any action that could advance quest progress
 * (e.g., task completion, time entry).
 */
export async function checkAndCompleteQuests(userId: string): Promise<string[]> {
  const quests = await getActiveQuests(userId);
  const nowCompleted: string[] = [];

  for (const quest of quests) {
    if (quest.completed) continue;
    if (quest.progress < quest.questData.target) continue;

    // Mark complete
    await prisma.userQuest.update({
      where: { id: quest.id },
      data: { completed: true, completedAt: new Date() },
    });

    // Award XP
    await awardXP(userId, quest.questData.xpReward, `quest:${quest.id}`);
    nowCompleted.push(quest.id);
  }

  return nowCompleted;
}
