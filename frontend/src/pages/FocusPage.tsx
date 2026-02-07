import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksApi } from '../lib/api';
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Flame } from 'lucide-react';
import clsx from 'clsx';
import type { Task, TaskStatus, TaskPriority } from '../types';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: typeof Flame }> = {
  URGENT: { label: 'Urgent', color: 'text-red-500', icon: AlertTriangle },
  HIGH: { label: 'High', color: 'text-orange-500', icon: Flame },
  MEDIUM: { label: 'Medium', color: 'text-blue-500', icon: Clock },
  LOW: { label: 'Low', color: 'text-gray-400', icon: Clock },
};

function FocusTaskCard({
  task,
  index,
  onComplete,
  isCompleting,
}: {
  task: Task;
  index: number;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}) {
  const config = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {/* Priority + Project */}
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx('flex items-center gap-1.5', config.color)}>
              <PriorityIcon size={16} />
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">in</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{task.project.name}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {task.title}
          </h2>

          {/* Description */}
          {task.description && (
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed line-clamp-3">
              {task.description}
            </p>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div className="mt-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock size={14} />
              <span>Due {new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Complete button */}
        <button
          onClick={() => onComplete(task.id)}
          disabled={isCompleting}
          className={clsx(
            'flex-shrink-0 w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all',
            isCompleting
              ? 'border-green-400 bg-green-50 dark:bg-green-900/30'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 group'
          )}
          title="Mark as done"
        >
          <CheckCircle2
            size={28}
            className={clsx(
              'transition-colors',
              isCompleting
                ? 'text-green-500'
                : 'text-gray-300 dark:text-gray-600 group-hover:text-green-500'
            )}
          />
        </button>
      </div>
    </motion.div>
  );
}

export default function FocusPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.update(taskId, { status: 'DONE' as TaskStatus }),
    onMutate: (taskId) => setCompletingId(taskId),
    onSettled: () => {
      setTimeout(() => {
        setCompletingId(null);
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }, 600);
    },
  });

  // Filter to incomplete tasks, sort by priority, take top 3
  const focusTasks = allTasks
    .filter((t) => t.status !== 'DONE')
    .sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      // Secondary sort: earliest due date first
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    })
    .slice(0, 3);

  const completedToday = allTasks.filter((t) => {
    if (t.status !== 'DONE') return false;
    const updated = new Date(t.updatedAt);
    const today = new Date();
    return (
      updated.getDate() === today.getDate() &&
      updated.getMonth() === today.getMonth() &&
      updated.getFullYear() === today.getFullYear()
    );
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-green-600 dark:text-green-400">{completedToday}</span> completed today
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Focus heading */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Focus Mode
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {focusTasks.length > 0
                ? `Your top ${focusTasks.length} ${focusTasks.length === 1 ? 'task' : 'tasks'} right now`
                : 'All clear for now'}
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
            </div>
          ) : focusTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <CheckCircle2 size={64} className="mx-auto text-green-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                You're all caught up!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                No pending tasks. Enjoy the calm.
              </p>
              <button
                onClick={() => navigate('/tasks')}
                className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                View all tasks
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {focusTasks
                  .filter((t) => t.id !== completingId)
                  .map((task, i) => (
                    <FocusTaskCard
                      key={task.id}
                      task={task}
                      index={i}
                      onComplete={(id) => completeMutation.mutate(id)}
                      isCompleting={completingId === task.id}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
