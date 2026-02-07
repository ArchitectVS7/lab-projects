import prisma from './prisma.js';

const TRACKED_FIELDS = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate'] as const;

export async function logTaskCreated(taskId: string, userId: string) {
  try {
    await prisma.activityLog.create({
      data: {
        action: 'CREATED',
        taskId,
        userId,
      },
    });
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
  oldTask: Record<string, any>;
  newTask: Record<string, any>;
}) {
  try {
    const logs: { action: 'UPDATED'; field: string; oldValue: string | null; newValue: string | null; taskId: string; userId: string }[] = [];

    for (const field of TRACKED_FIELDS) {
      const oldVal = oldTask[field];
      const newVal = newTask[field];

      // Normalize for comparison
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);

      if (oldStr !== newStr) {
        logs.push({
          action: 'UPDATED',
          field,
          oldValue: oldStr,
          newValue: newStr,
          taskId,
          userId,
        });
      }
    }

    if (logs.length > 0) {
      await prisma.activityLog.createMany({ data: logs });
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
  } catch (error) {
    console.error('Failed to log task deletion:', error);
  }
}

export async function logCommentAction(
  action: 'COMMENT_ADDED' | 'COMMENT_EDITED' | 'COMMENT_DELETED',
  taskId: string,
  userId: string,
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        taskId,
        userId,
      },
    });
  } catch (error) {
    console.error('Failed to log comment action:', error);
  }
}
