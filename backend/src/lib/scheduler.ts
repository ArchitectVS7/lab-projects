import cron from 'node-cron';
import { generateAllDueRecurringTasks } from './recurrence.js';

/**
 * Start the cron scheduler for recurring tasks
 * Runs daily at 6:00 AM
 */
export function startScheduler() {
  // Schedule: "0 6 * * *" = Every day at 6:00 AM
  // For testing: "*/5 * * * *" = Every 5 minutes
  const schedule = process.env.NODE_ENV === 'test' ? '*/5 * * * *' : '0 6 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Scheduler] Running recurring task generation...');
    try {
      const results = await generateAllDueRecurringTasks();
      console.log(`[Scheduler] Generated ${results.success.length} tasks`);
      if (results.failed.length > 0) {
        console.error(`[Scheduler] Failed to generate ${results.failed.length} tasks:`, results.failed);
      }
    } catch (error) {
      console.error('[Scheduler] Error generating recurring tasks:', error);
    }
  });

  console.log(`[Scheduler] Started - running ${schedule}`);
}
