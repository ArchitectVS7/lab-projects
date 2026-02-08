
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { Task, TaskStatus } from '../types';
import { STATUS_LABELS } from './TaskCard';

export const STATUS_COLUMN_COLORS: Record<TaskStatus, string> = {
    TODO: 'bg-gray-100 dark:bg-gray-800',
    IN_PROGRESS: 'bg-blue-50 dark:bg-blue-900/20',
    IN_REVIEW: 'bg-yellow-50 dark:bg-yellow-900/20',
    DONE: 'bg-green-50 dark:bg-green-900/20',
};

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    children: React.ReactNode;
}

export default function KanbanColumn({ status, tasks, children }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    // Use STATUS_COLORS for the badge background, but ensure text is white for contrast if needed, 
    // or just use the pre-defined styles from TaskCard which seem to be full pill styles.
    // Actually TasksPage used STATUS_BG which was:
    /*
    const STATUS_BG: Record<TaskStatus, string> = {
      TODO: 'bg-gray-400',
      IN_PROGRESS: 'bg-blue-500',
      IN_REVIEW: 'bg-yellow-500',
      DONE: 'bg-green-500',
    };
    */
    const badgeColors: Record<TaskStatus, string> = {
        TODO: 'bg-gray-400',
        IN_PROGRESS: 'bg-blue-500',
        IN_REVIEW: 'bg-yellow-500',
        DONE: 'bg-green-500',
    };

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                'flex-1 min-w-[260px] p-3 rounded-lg transition-colors',
                isOver ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-600' : STATUS_COLUMN_COLORS[status]
            )}
            data-testid={`kanban-column-${status}`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className={clsx('text-xs font-semibold px-2 py-1 rounded text-white', badgeColors[status])}>
                    {STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{tasks.length}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">{children}</div>
        </div>
    );
}
