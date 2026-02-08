
import { useNavigate } from 'react-router-dom';
import { motion, type Transition } from 'framer-motion';
import { Clock, Repeat, Pencil } from 'lucide-react';
import { usePerformanceAnimations } from '../hooks/usePerformanceAnimations';
import clsx from 'clsx';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { format } from 'date-fns';

export const STATUS_LABELS: Record<TaskStatus, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    DONE: 'Done',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
    TODO: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300',
    DONE: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
    LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    MEDIUM: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
    HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300',
    URGENT: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300',
};

interface TaskCardProps {
    task: Task;
    showStatus?: boolean;
    showPriority?: boolean;
    showProject?: boolean;
    showDependencies?: boolean;
    showRecurrence?: boolean;
    showAssignee?: boolean;
    showCreator?: boolean;
    showDescription?: boolean;
    onEdit?: (task: Task) => void;
    canEdit?: boolean;
    isDraggable?: boolean;
}

export default function TaskCard({
    task,
    showStatus = true,
    showPriority = true,
    showProject = true,
    showDependencies = true,
    showRecurrence = true,
    showAssignee = true,
    showCreator = true,
    showDescription = false,
    onEdit,
    canEdit = false,
    isDraggable = false, // Handled by wrapper if true, essentially just affects hover styles here
}: TaskCardProps) {
    const navigate = useNavigate();
    const { getTaskCardHover } = usePerformanceAnimations();
    const taskCardHover = getTaskCardHover();

    const handleAssigneeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.assignee) {
            navigate(`/tasks?assignee=${task.assignee.id}`);
        }
    };

    const handleCreatorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (task.creator) {
            navigate(`/tasks?creator=${task.creator.id}`);
        }
    };

    return (
        <motion.div
            className={clsx(
                "bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow",
                isDraggable && "cursor-grab active:cursor-grabbing"
            )}
            whileHover={!isDraggable ? taskCardHover.whileHover : undefined}
            transition={!isDraggable ? (taskCardHover.transition as Transition) : undefined}
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">{task.title}</h3>
                {showPriority && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded font-medium shrink-0', PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                    </span>
                )}
                {canEdit && onEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                        className="text-gray-300 dark:text-gray-600 hover:text-[var(--primary-base)] flex-shrink-0 mt-0.5 transition-colors"
                        title="Edit"
                    >
                        <Pencil size={14} />
                    </button>
                )}
            </div>

            {(showDescription && task.description) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{task.description}</p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
                {showStatus && (
                    <span className={clsx('text-xs px-2 py-0.5 rounded', STATUS_COLORS[task.status])}>
                        {STATUS_LABELS[task.status]}
                    </span>
                )}
                {showProject && (
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{task.project.name}</span>
                    </div>
                )}
            </div>

            {/* Dependencies and recurring info */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex-wrap empty:hidden">
                {showDependencies && (task._count?.dependsOn ?? 0) > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300">
                        <span className="text-xs font-medium">⚠️ {task._count!.dependsOn} blocker{task._count!.dependsOn > 1 ? 's' : ''}</span>
                    </div>
                )}
                {showDependencies && (task._count?.dependedOnBy ?? 0) > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-300">
                        <span className="text-xs font-medium">🔗 Blocks {task._count!.dependedOnBy}</span>
                    </div>
                )}
                {showRecurrence && task.isRecurring && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded text-purple-700 dark:text-purple-300 font-medium text-xs" style={{ backgroundColor: 'color-mix(in srgb, #a855f7 20%, transparent)' }}>
                        <Repeat size={12} />
                        <span>Repeats</span>
                    </div>
                )}
                {task.dueDate && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                        <Clock size={12} />
                        {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
                {showAssignee && task.assignee && (
                    <button
                        onClick={handleAssigneeClick}
                        className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                        title={`Filter tasks assigned to ${task.assignee.name}`}
                    >
                        <div className="w-5 h-5 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center text-xs font-semibold">
                            {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{task.assignee.name}</span>
                    </button>
                )}
                {showCreator && task.creator && (
                    <>
                        {showAssignee && task.assignee && <span className="text-xs text-gray-400">→</span>}
                        <button
                            onClick={handleCreatorClick}
                            className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                            title={`Filter tasks created by ${task.creator.name}`}
                        >
                            <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 flex items-center justify-center text-xs font-semibold">
                                {task.creator.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{task.creator.name}</span>
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}
