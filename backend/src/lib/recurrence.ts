import { RecurrenceFrequency, TaskStatus } from '@prisma/client';
import prisma from './prisma.js';

interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: string; // "0,1,2" for Sun,Mon,Tue
  dayOfMonth?: number;
}

/**
 * Calculate the next occurrence date based on recurrence configuration
 */
export function calculateNextOccurrence(
  lastDate: Date,
  config: RecurrenceConfig
): Date {
  const next = new Date(lastDate);

  switch (config.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + config.interval);
      break;

    case 'WEEKLY':
      if (config.daysOfWeek) {
        const targetDays = config.daysOfWeek.split(',').map(Number);
        const currentDay = next.getDay();

        // Find the next matching day
        let daysToAdd = 1;
        let foundNext = false;

        for (let i = 0; i < 7; i++) {
          const checkDay = (currentDay + daysToAdd) % 7;
          if (targetDays.includes(checkDay)) {
            foundNext = true;
            break;
          }
          daysToAdd++;
        }

        if (!foundNext) {
          // If no matching day this week, go to first matching day next week
          daysToAdd = 7;
        }

        next.setDate(next.getDate() + daysToAdd);
      } else {
        // Default: add interval weeks
        next.setDate(next.getDate() + (config.interval * 7));
      }
      break;

    case 'MONTHLY': {
      // Set day to 1 first to avoid overflow when changing month
      // (e.g., Jan 31 + 1 month would skip to Mar 3 without this)
      const targetMonth = next.getMonth() + config.interval;
      next.setDate(1);
      next.setMonth(targetMonth);
      const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      if (config.dayOfMonth) {
        next.setDate(Math.min(config.dayOfMonth, daysInMonth));
      } else {
        next.setDate(Math.min(lastDate.getDate(), daysInMonth));
      }
      break;
    }

    case 'CUSTOM':
      // Custom just adds interval days
      next.setDate(next.getDate() + config.interval);
      break;
  }

  return next;
}

/**
 * Generate the next task instance from a recurring task
 */
export async function generateNextTask(recurringTaskId: string) {
  const recurring = await prisma.recurringTask.findUnique({
    where: { id: recurringTaskId },
  });

  if (!recurring) {
    throw new Error('Recurring task not found');
  }

  // Check if we've passed the end date
  if (recurring.endDate && new Date() > recurring.endDate) {
    return null;
  }

  // Get the base task to copy properties from
  const baseTask = await prisma.task.findUnique({
    where: { id: recurring.baseTaskId },
  });

  if (!baseTask) {
    throw new Error('Base task not found');
  }

  // Calculate next due date
  const lastDate = recurring.lastGenerated || recurring.startDate;
  const nextDueDate = calculateNextOccurrence(lastDate, {
    frequency: recurring.frequency,
    interval: recurring.interval,
    daysOfWeek: recurring.daysOfWeek || undefined,
    dayOfMonth: recurring.dayOfMonth || undefined,
  });

  // Create new task instance
  const newTask = await prisma.task.create({
    data: {
      title: baseTask.title,
      description: baseTask.description,
      status: 'TODO' as TaskStatus,
      priority: baseTask.priority,
      dueDate: nextDueDate,
      projectId: recurring.projectId,
      assigneeId: baseTask.assigneeId,
      creatorId: recurring.creatorId,
      recurringTaskId: recurring.id,
      isRecurring: true,
    },
    include: {
      project: true,
      assignee: true,
      creator: true,
    },
  });

  // Update lastGenerated timestamp
  await prisma.recurringTask.update({
    where: { id: recurring.id },
    data: { lastGenerated: nextDueDate },
  });

  return newTask;
}

/**
 * Generate all due recurring tasks across the system
 * Called by the cron scheduler
 */
export async function generateAllDueRecurringTasks() {
  const now = new Date();

  // Find all recurring tasks that need generation
  const recurringTasks = await prisma.recurringTask.findMany({
    where: {
      AND: [
        {
          OR: [
            { lastGenerated: null },
            { lastGenerated: { lt: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gt: now } },
          ],
        },
      ],
    },
  });

  const results = {
    success: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  for (const recurring of recurringTasks) {
    try {
      // Calculate what the next occurrence should be
      const lastDate = recurring.lastGenerated || recurring.startDate;
      const nextDate = calculateNextOccurrence(lastDate, {
        frequency: recurring.frequency,
        interval: recurring.interval,
        daysOfWeek: recurring.daysOfWeek || undefined,
        dayOfMonth: recurring.dayOfMonth || undefined,
      });

      // Only generate if next date is now or in the past
      if (nextDate <= now) {
        await generateNextTask(recurring.id);
        results.success.push(recurring.id);
      }
    } catch (error) {
      results.failed.push({
        id: recurring.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
