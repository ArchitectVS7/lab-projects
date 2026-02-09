import prisma from '../lib/prisma.js';
import { io } from '../lib/socket.js';
import { Priority } from '@prisma/client';

interface XPCalculation {
  baseXP: number;
  priorityMultiplier: number;
  complexityBonus: number;
  timeBonusFactor: number;
  totalXP: number;
}

interface LevelReward {
  type: 'feature' | 'cosmetic' | 'milestone' | 'generic';
  name: string;
  description: string;
}

interface TaskXPData {
  priority: Priority;
  description?: string | null;
  timeTracked?: number;
  dueDate?: Date | null;
  completedAt?: Date | null;
  attachmentCount?: number;
}

/**
 * Calculate XP for a completed task
 * Formula: XP = (BasePoints × PriorityMultiplier + ComplexityBonus) × TimeBonusFactor
 */
export async function calculateTaskXP(task: TaskXPData): Promise<XPCalculation> {
  const baseXP = 20;

  // Priority multiplier
  const priorityMultipliers: Record<Priority, number> = {
    LOW: 1.0,
    MEDIUM: 1.2,
    HIGH: 1.5,
    URGENT: 2.0,
  };
  const priorityMultiplier = priorityMultipliers[task.priority] || 1.0;

  // Complexity bonus
  let complexityBonus = 0;
  if (task.description && task.description.length > 100) complexityBonus += 10;
  if (task.timeTracked && task.timeTracked > 0) complexityBonus += 15;
  if (task.attachmentCount && task.attachmentCount > 0) complexityBonus += 10;

  // Time bonus factor (completed early = bonus, overdue = penalty)
  let timeBonusFactor = 1.0;
  if (task.dueDate && task.completedAt) {
    const daysEarly = Math.floor(
      (task.dueDate.getTime() - task.completedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysEarly > 0) {
      // Completed early: +10% per day, max 50%
      timeBonusFactor = 1 + Math.min(daysEarly * 0.1, 0.5);
    } else if (daysEarly < 0) {
      // Overdue: -10%, but minimum 50% of total XP
      timeBonusFactor = 0.9;
    }
  }

  // Calculate total XP (minimum 50% of base calculation)
  const baseCalculation = baseXP * priorityMultiplier + complexityBonus;
  const totalXP = Math.max(
    Math.floor(baseCalculation * timeBonusFactor),
    Math.floor(baseCalculation * 0.5)
  );

  return {
    baseXP,
    priorityMultiplier,
    complexityBonus,
    timeBonusFactor,
    totalXP,
  };
}

/**
 * Calculate what level a user should be at based on total XP
 * Formula: XP Required = 100 × (Level)^1.8 + 50 × Level
 */
export function calculateLevel(totalXP: number): number {
  let level = 1;
  let cumulativeXP = 0;

  while (cumulativeXP < totalXP && level < 50) {
    const xpForNextLevel = Math.floor(100 * Math.pow(level, 1.8) + 50 * level);
    cumulativeXP += xpForNextLevel;

    if (cumulativeXP <= totalXP) {
      level++;
    } else {
      break;
    }
  }

  return level;
}

/**
 * Get XP required for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  return Math.floor(100 * Math.pow(currentLevel, 1.8) + 50 * currentLevel);
}

/**
 * Get cumulative XP required to reach a specific level
 */
export function getCumulativeXP(targetLevel: number): number {
  let cumulativeXP = 0;
  for (let level = 1; level < targetLevel; level++) {
    cumulativeXP += getXPForNextLevel(level);
  }
  return cumulativeXP;
}

/**
 * Award XP to a user and check for level up
 */
export async function awardXP(
  userId: string,
  xp: number,
  source: string
): Promise<{ newLevel: number; leveledUp: boolean; newXP: number }> {
  // Get current user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newXP = (user.xp || 0) + xp;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > (user.level || 1);

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel
    }
  });

  // Log XP gain
  await prisma.xPLog.create({
    data: {
      userId,
      xpGained: xp,
      source,
      timestamp: new Date(),
    }
  });

  // Send real-time update via Socket.io
  io.to(`user:${userId}`).emit('xpGained', {
    xp,
    newTotal: newXP,
    newLevel,
    leveledUp,
    source,
  });

  // If leveled up, trigger celebration
  if (leveledUp) {
    const rewards = getLevelRewards(newLevel);
    io.to(`user:${userId}`).emit('levelUp', {
      newLevel,
      rewards,
    });
  }

  return { newLevel, leveledUp, newXP };
}

/**
 * Get rewards for reaching a specific level
 */
function getLevelRewards(level: number): LevelReward {
  const rewardMap: Record<number, LevelReward> = {
    2: { type: 'feature', name: 'Achievement Tab', description: 'Track your achievements!' },
    3: { type: 'cosmetic', name: 'Custom Themes', description: '3 new color schemes unlocked' },
    5: { type: 'feature', name: 'Skill Tree Preview', description: 'Unlock at level 10 or with Plus!' },
    10: { type: 'milestone', name: 'Free Tier Complete', description: 'Upgrade to Plus for levels 11-50!' },
    15: { type: 'feature', name: 'Advanced Filters', description: 'Create complex task queries' },
    20: { type: 'feature', name: 'Custom Fields', description: 'Add custom metadata to tasks' },
    30: { type: 'feature', name: 'API Access', description: 'Integrate TaskMan with other tools' },
    40: { type: 'feature', name: 'White-Label', description: 'Brand TaskMan as your own' },
    50: { type: 'milestone', name: 'Max Level!', description: 'You\'ve mastered TaskMan!' },
  };

  return rewardMap[level] || {
    type: 'generic',
    name: 'Level Up!',
    description: `You've reached level ${level}!`
  };
}

/**
 * Calculate retroactive XP for a user based on their completed tasks
 */
export async function calculateHistoricalXP(userId: string): Promise<number> {
  const completedTasks = await prisma.task.findMany({
    where: {
      OR: [
        { assigneeId: userId },
        { creatorId: userId }
      ],
      status: 'DONE'
    },
    select: {
      id: true,
      priority: true,
      description: true,
      dueDate: true,
      updatedAt: true,
      _count: {
        select: {
          attachments: true,
          timeEntries: true
        }
      }
    }
  });

  let totalXP = 0;

  for (const task of completedTasks) {
    // Calculate time tracked (sum of time entries)
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        taskId: task.id,
        userId
      },
      select: { duration: true }
    });
    const timeTracked = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

    const calc = await calculateTaskXP({
      priority: task.priority,
      description: task.description,
      timeTracked: timeTracked || undefined,
      dueDate: task.dueDate,
      completedAt: task.updatedAt,
      attachmentCount: task._count.attachments,
    });

    totalXP += calc.totalXP;
  }

  return totalXP;
}

/**
 * Apply retroactive XP to a user (one-time operation)
 */
export async function applyRetroactiveXP(userId: string): Promise<void> {
  const totalXP = await calculateHistoricalXP(userId);

  if (totalXP > 0) {
    const newLevel = calculateLevel(totalXP);

    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: totalXP,
        level: newLevel
      }
    });

    // Log the retroactive XP
    await prisma.xPLog.create({
      data: {
        userId,
        xpGained: totalXP,
        source: 'Retroactive XP calculation',
        timestamp: new Date(),
      }
    });
  }
}

/**
 * Get user's XP progress to next level
 */
export async function getUserXPProgress(userId: string): Promise<{
  currentXP: number;
  currentLevel: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpProgress: number;
  xpRemaining: number;
  progressPercentage: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const currentXP = user.xp || 0;
  const currentLevel = user.level || 1;

  // XP required to reach current level
  const xpForCurrentLevel = getCumulativeXP(currentLevel);

  // XP required to reach next level
  const xpForNextLevel = xpForCurrentLevel + getXPForNextLevel(currentLevel);

  // Progress within current level
  const xpProgress = currentXP - xpForCurrentLevel;
  const xpRemaining = xpForNextLevel - currentXP;
  const progressPercentage = Math.floor((xpProgress / getXPForNextLevel(currentLevel)) * 100);

  return {
    currentXP,
    currentLevel,
    xpForCurrentLevel,
    xpForNextLevel,
    xpProgress,
    xpRemaining,
    progressPercentage
  };
}
