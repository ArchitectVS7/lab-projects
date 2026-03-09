import { motion } from 'framer-motion';
import { Repeat, ShieldAlert, Shield, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Task, Project, TaskStatus } from '../types';
import { STATUSES, STATUS_LABELS, STATUS_BG, PRIORITY_COLORS, canEditTask } from '../lib/taskConstants';

export function TaskTableView({
  tasks,
  projects,
  currentUserId,
  onStatusChange,
  onEdit,
  onDelete,
  onFilterByAssignee,
  onFilterByCreator,
}: {
  tasks: Task[];
  projects: Project[];
  currentUserId: string;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onFilterByAssignee?: (userId: string) => void;
  onFilterByCreator?: (userId: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-center py-8 text-gray-400 dark:text-gray-500">No tasks match the current filters.</p>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Task</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Project</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Assignee</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Creator</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Dependencies</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Recurrence</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Due</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <motion.tr
              key={task.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={clsx(
                'border-b border-gray-100 dark:border-gray-700 transition-colors',
                index % 2 === 0
                  ? 'bg-gray-50/50 dark:bg-gray-900/30'
                  : 'bg-white dark:bg-gray-800/50',
                'hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{task.title}</div>
                  {task.isRecurring && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300" title="Recurring task">
                      <Repeat size={10} />
                    </span>
                  )}
                  {(task._count?.dependsOn ?? 0) > 0 && (
                    <span className="text-red-500 dark:text-red-400" title={`Blocked by ${task._count!.dependsOn} tasks`}>
                      <ShieldAlert size={14} />
                    </span>
                  )}
                  {(task._count?.dependedOnBy ?? 0) > 0 && (
                    <span className="text-amber-500 dark:text-amber-400" title={`Blocking ${task._count!.dependedOnBy} tasks`}>
                      <Shield size={14} />
                    </span>
                  )}
                </div>
                {task.description && (
                  <div className="text-gray-500 dark:text-gray-400 text-xs line-clamp-1 mt-0.5">{task.description}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                  className={clsx('px-2 py-1 rounded text-xs font-medium text-white border-0 cursor-pointer', STATUS_BG[task.status])}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <span className={clsx('px-2 py-1 rounded text-xs font-medium', PRIORITY_COLORS[task.priority])}>
                  {task.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: task.project.color }} />
                  <span className="text-gray-700 dark:text-gray-300 text-xs">{task.project.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {task.assignee ? (
                  <button
                    onClick={() => onFilterByAssignee?.(task.assignee!.id)}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    title={`Filter tasks assigned to ${task.assignee.name}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--primary-base)] flex items-center justify-center text-[10px] font-medium text-white">
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{task.assignee.name}</span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">--</span>
                )}
              </td>
              <td className="px-4 py-3">
                {task.creator ? (
                  <button
                    onClick={() => onFilterByCreator?.(task.creator!.id)}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    title={`Filter tasks created by ${task.creator.name}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-900 dark:text-gray-100">
                      {task.creator.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{task.creator.name}</span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500">--</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {(task._count?.dependsOn ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-medium">
                      ⚠️ {task._count!.dependsOn}
                    </span>
                  )}
                  {(task._count?.dependedOnBy ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
                      🔗 {task._count!.dependedOnBy}
                    </span>
                  )}
                  {(task._count?.dependsOn ?? 0) === 0 && (task._count?.dependedOnBy ?? 0) === 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">--</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                {task.isRecurring && (
                  <span className="text-[10px] px-2 py-1 rounded font-medium text-purple-700 dark:text-purple-300" style={{ backgroundColor: 'color-mix(in srgb, #a855f7 20%, transparent)' }}>
                    🔄 Repeats
                  </span>
                )}
                {!task.isRecurring && <span className="text-xs text-gray-400 dark:text-gray-500">--</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '--'}
              </td>
              <td className="px-4 py-3 text-right">
                {canEditTask(task, currentUserId, projects) && (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-[var(--primary-base)]" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(task)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
