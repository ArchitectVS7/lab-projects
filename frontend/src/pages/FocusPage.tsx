import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from '../components/TaskCard';
import { tasksApi } from '../lib/api';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '../types';
import TaskCompletionCelebration from '../components/TaskCompletionCelebration';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// FocusTaskCard removed (replaced by shared TaskCard)

export default function FocusPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
  });

  // Handle Escape key to return to dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.update(taskId, { status: 'DONE' as TaskStatus }),
    onMutate: (taskId) => setCompletingId(taskId),
    onSuccess: () => {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 100);
    },
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

  const focusProgress = focusTasks.length > 0
    ? ((focusTasks.length - (focusTasks.filter((t) => t.id !== completingId).length)) / focusTasks.length) * 100
    : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    }}>
      {/* Progress bar */}
      {focusTasks.length > 0 && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="h-1 origin-left"
          style={{
            background: 'var(--primary-base)',
            width: `${focusProgress}%`
          }}
        />
      )}

      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-sm bg-black/20">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            <span className="font-semibold text-green-400">{completedToday}</span> completed today
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Focus heading */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-white mb-3">
              🎯 Focus Session
            </h1>
            <p className="text-gray-300 text-lg">
              {focusTasks.length > 0
                ? `Your top ${focusTasks.length} ${focusTasks.length === 1 ? 'priority' : 'priorities'}`
                : 'All clear for now'}
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white"
              />
            </div>
          ) : focusTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <CheckCircle2 size={64} className="mx-auto text-green-400 mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">
                🎉 All priorities complete!
              </h2>
              <p className="text-gray-300 mb-6 text-lg">
                You crushed your focus session. Take a break!
              </p>
              <button
                onClick={() => navigate('/tasks')}
                className="px-6 py-2 text-sm font-medium text-white bg-white/20 border border-white/30 rounded-lg hover:bg-white/30 transition-colors"
              >
                View all tasks
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {focusTasks
                  .filter((t) => t.id !== completingId)
                  .map((task) => (

                    <div key={task.id} className="layout-animation">
                      <TaskCard
                        task={task}
                        showStatus={false}
                        showAssignee={false}
                        showCreator={false}
                        canEdit={false}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => completeMutation.mutate(task.id)}
                          className="text-sm font-medium text-[var(--primary-base)] hover:opacity-80"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
      <TaskCompletionCelebration trigger={celebrate} />
    </div>
  );
}
