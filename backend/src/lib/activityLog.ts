import prisma from './prisma.js';
import { getIO } from './socket.js';

const TRACKED_FIELDS = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate'] as const;

export async function logTaskCreated(taskId: string, userId: string) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        action: 'CREATED',
        taskId,
        userId,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('task:updated', { taskId });
      io.to(`task:${taskId}`).emit('activity:new', activity);
    }
  } catch (error) {
    console.error('Failed to log task creation:', error);
  }
}

export async function logTaskChanges({
  taskId,
  userId,
  oldTask,
  newTask,
}: {
  taskId: string;
  userId: string;
  oldTask: Record<string, unknown>;
  newTask: Record<string, unknown>;
}) {
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
      const createdLogs = await prisma.$transaction(
        logsData.map(log => prisma.activityLog.create({ data: log }))
      );

      const io = getIO();
      if (io) {
        io.to(`task:${taskId}`).emit('task:updated', { taskId });
        // Emit each log or a batch? useTaskSocket expects 'activity:new'.
        // Sending multiple might be noisy but correct.
        createdLogs.forEach(log => {
          io.to(`task:${taskId}`).emit('activity:new', log);
        });
      }
    }
  } catch (error) {
    console.error('Failed to log task changes:', error);
  }
}

export async function logTaskDeleted(taskId: string, userId: string, taskTitle: string) {
  try {
    await prisma.activityLog.create({
      data: {
        action: 'DELETED',
        taskId,
        userId,
        oldValue: taskTitle,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('task:deleted', { taskId }); // Custom event, though frontend might not listen to it yet
      io.to(`task:${taskId}`).emit('task:updated', { taskId });
    }
  } catch (error) {
    console.error('Failed to log task deletion:', error);
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

    const io = getIO();
    if (io) {
      io.to(`task:${taskId}`).emit('activity:new', activity);
      // Comments have their own events (comment:new) usually emitted by the route, 
      // but activity log should also trigger activity:new
    }
  } catch (error) {
    console.error('Failed to log comment action:', error);
  }
}
