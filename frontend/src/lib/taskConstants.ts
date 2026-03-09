import type { Task, Project, TaskStatus, TaskPriority } from '../types';

export const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const STATUS_BG: Record<TaskStatus, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300',
  URGENT: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300',
};

export function canEditTask(task: Task, currentUserId: string, projects: Project[]): boolean {
  const project = projects.find(p => p.id === task.projectId);
  const membership = project?.members?.find(m => m.userId === currentUserId);
  if (!membership) return false;
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  return membership.role === 'MEMBER' && task.creatorId === currentUserId;
}
