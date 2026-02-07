import prisma from './prisma.js';
import { getIO } from './socket.js';

type NotificationType = 'TASK_ASSIGNED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE' | 'PROJECT_INVITE' | 'TASK_COMMENT' | 'TASK_STATUS_CHANGED' | 'MENTION';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  projectId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        taskId: params.taskId,
        projectId: params.projectId,
      },
    });

    // Real-time delivery via WebSocket
    const io = getIO();
    if (io) {
      io.to(`user:${params.userId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications are non-critical
    return null;
  }
}

export async function notifyTaskAssignment(taskId: string, assigneeId: string, assignerName: string, taskTitle: string) {
  return createNotification({
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: 'New task assigned',
    message: `${assignerName} assigned you the task "${taskTitle}"`,
    taskId,
  });
}

export async function notifyTaskStatusChange(taskId: string, assigneeId: string, changerName: string, taskTitle: string, newStatus: string) {
  if (!assigneeId) return null; // No assignee to notify

  return createNotification({
    userId: assigneeId,
    type: 'TASK_STATUS_CHANGED',
    title: 'Task status updated',
    message: `${changerName} changed "${taskTitle}" status to ${newStatus}`,
    taskId,
  });
}

export async function notifyProjectInvite(projectId: string, userId: string, inviterName: string, projectName: string) {
  return createNotification({
    userId,
    type: 'PROJECT_INVITE',
    title: 'Added to project',
    message: `${inviterName} added you to project "${projectName}"`,
    projectId,
  });
}

// Check for tasks due soon (called by a cron job or manually)
export async function checkTasksDueSoon() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasksDueSoon = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: today,
        lte: tomorrow,
      },
      status: {
        not: 'DONE',
      },
      assigneeId: {
        not: null,
      },
    },
    include: {
      assignee: true,
      project: true,
    },
  });

  const notifications = await Promise.all(
    tasksDueSoon.map((task) => {
      if (!task.assignee) return null;
      return createNotification({
        userId: task.assignee.id,
        type: 'TASK_DUE_SOON',
        title: 'Task due soon',
        message: `Task "${task.title}" is due soon in project "${task.project.name}"`,
        taskId: task.id,
        projectId: task.projectId,
      });
    })
  );

  return notifications.filter(Boolean);
}

// Check for overdue tasks
export async function checkOverdueTasks() {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: {
        lt: now,
      },
      status: {
        not: 'DONE',
      },
      assigneeId: {
        not: null,
      },
    },
    include: {
      assignee: true,
      project: true,
    },
  });

  const notifications = await Promise.all(
    overdueTasks.map((task) => {
      if (!task.assignee) return null;
      return createNotification({
        userId: task.assignee.id,
        type: 'TASK_OVERDUE',
        title: 'Task overdue',
        message: `Task "${task.title}" is overdue in project "${task.project.name}"`,
        taskId: task.id,
        projectId: task.projectId,
      });
    })
  );

  return notifications.filter(Boolean);
}
