import { Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { getIO } from './socket.js';

const TRACKED_FIELDS = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate'] as const;

const RETENTION_DAYS = 180;

function scheduleRetentionCleanup(taskId: string): void {
  prisma.activityLog.deleteMany({
    where: {
      taskId,
      createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000) },
    },
  }).catch((err) => console.error('[activityLog] Failed to cleanup old logs:', err));
}

export async function logTaskCreated(
  taskId: string,
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  try {
    const activity = await client.activityLog.create({
      data: {
        action: 'CREATED',
        taskId,
        userId,
      },
    });

    // Fire-and-forget retention cleanup outside transaction
    if (!tx) {
      scheduleRetentionCleanup(taskId);
    }

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('task:updated', { taskId });
      io.to(`task:${taskId}`).emit('activity:new', activity);
    }
  } catch (err) {
    console.error('Failed to log task creation:', err);
    if (tx) throw err;
  }
}

export async function logTaskChanges(
  {
    taskId,
    userId,
    oldTask,
    newTask,
  }: {
    taskId: string;
    userId: string;
    oldTask: Record<string, unknown>;
    newTask: Record<string, unknown>;
  },
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  try {
    const logsData: { action: 'UPDATED'; field: string; oldValue: string | null; newValue: string | null; taskId: string; userId: string }[] = [];

    for (const field of TRACKED_FIELDS) {
      const oldVal = oldTask[field];
      const newVal = newTask[field];

      // Normalize for comparison
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);

      if (oldStr !== newStr) {
        logsData.push({
          action: 'UPDATED',
          field,
          oldValue: oldStr,
          newValue: newStr,
          taskId,
          userId,
        });
      }
    }

    if (logsData.length > 0) {
      // When inside a tx, create sequentially (can't nest $transaction inside another tx)
      let createdLogs;
      if (tx) {
        createdLogs = await Promise.all(logsData.map(log => client.activityLog.create({ data: log })));
      } else {
        createdLogs = await prisma.$transaction(
          logsData.map(log => prisma.activityLog.create({ data: log }))
        );
      }

      // Fire-and-forget retention cleanup outside transaction
      if (!tx) {
        scheduleRetentionCleanup(taskId);
      }

      const io = getIO();
      if (io) {
        io.to(`task:${taskId}`).emit('task:updated', { taskId });
        createdLogs.forEach(log => {
          io.to(`task:${taskId}`).emit('activity:new', log);
        });
      }
    }
  } catch (err) {
    console.error('Failed to log task changes:', err);
    if (tx) throw err;
  }
}

export async function logTaskDeleted(
  taskId: string,
  userId: string,
  taskTitle: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  try {
    await client.activityLog.create({
      data: {
        action: 'DELETED',
        taskId,
        userId,
        oldValue: taskTitle,
      },
    });

    // No retention cleanup for deleted tasks — the task (and its logs) will be
    // cascade-deleted when the task record is removed.

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('task:deleted', { taskId });
      io.to(`task:${taskId}`).emit('task:updated', { taskId });
    }
  } catch (err) {
    console.error('Failed to log task deletion:', err);
    if (tx) throw err;
  }
}

export async function logDependencyAdded(taskId: string, userId: string, dependsOnTitle: string) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        action: 'DEPENDENCY_ADDED',
        taskId,
        userId,
        newValue: dependsOnTitle,
      },
    });

    scheduleRetentionCleanup(taskId);

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('task:updated', { taskId });
      io.to(`task:${taskId}`).emit('activity:new', activity);
    }
  } catch (error) {
    console.error('Failed to log dependency added:', error);
  }
}

export async function logDependencyRemoved(taskId: string, userId: string, dependsOnTitle: string) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        action: 'DEPENDENCY_REMOVED',
        taskId,
        userId,
        oldValue: dependsOnTitle,
      },
    });

    scheduleRetentionCleanup(taskId);

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('task:updated', { taskId });
      io.to(`task:${taskId}`).emit('activity:new', activity);
    }
  } catch (error) {
    console.error('Failed to log dependency removed:', error);
  }
}

export async function logCommentAction(
  action: 'COMMENT_ADDED' | 'COMMENT_EDITED' | 'COMMENT_DELETED',
  taskId: string,
  userId: string,
) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        action,
        taskId,
        userId,
      },
    });

    scheduleRetentionCleanup(taskId);

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('activity:new', activity);
    }
  } catch (error) {
    console.error('Failed to log comment action:', error);
  }
}
