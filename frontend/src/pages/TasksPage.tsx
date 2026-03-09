import { useState, useEffect, useMemo } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, projectsApi, recurringTasksApi, exportApi, domainsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useCelebrationStore } from '../store/celebration';
import { Plus, Table, Columns3, Calendar as CalendarIcon, CalendarDays, Download, Zap, Loader2, X } from 'lucide-react';
import clsx from 'clsx';
import type { Task, TaskStatus, TaskPriority } from '../types';
import type { TaskFilters } from '../lib/api';
import TaskCompletionCelebration from '../components/TaskCompletionCelebration';
import RecurrencePickerModal, { RecurrenceConfig } from '../components/RecurrencePickerModal';
import { TableSkeleton, KanbanSkeleton } from '../components/Skeletons';
import { EmptyTasksState } from '../components/EmptyStates';
import CalendarView from '../components/CalendarView';
import WeekView from '../components/WeekView';
import TaskDetailModal from '../components/TaskDetailModal';
import type { TaskFormData } from '../components/TaskDetailModal';
import SmartTaskInput from '../components/SmartTaskInput';
import DomainPicker from '../components/DomainPicker';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { TaskTableView } from '../components/TaskTableView';
import { TaskKanbanView } from '../components/TaskKanbanView';
import { STATUSES, STATUS_LABELS } from '../lib/taskConstants';

// --- Main Page ---

export default function TasksPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const { addCelebration } = useCelebrationStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar' | 'week'>(
    () => (localStorage.getItem('task-view-mode') as 'table' | 'kanban' | 'calendar' | 'week') || 'table'
  );
  const [filters, setFilters] = useState<TaskFilters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [celebrateCompletion, setCelebrateCompletion] = useState(false);
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [taskForRecurrence, setTaskForRecurrence] = useState<Task | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);

  // Read URL parameters on mount
  useEffect(() => {
    const assigneeId = searchParams.get('assignee');
    const creatorId = searchParams.get('creator');
    const showBlocked = searchParams.get('blocked');
    const showBlocking = searchParams.get('blocking');

    const newFilters: TaskFilters = {};
    if (assigneeId) newFilters.assigneeId = assigneeId;
    if (creatorId) newFilters.creatorId = creatorId;
    if (showBlocked === 'true') newFilters.hasBlockers = true;
    if (showBlocking === 'true') newFilters.isBlocking = true;

    setFilters(newFilters);
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('task-view-mode', viewMode);
  }, [viewMode]);

  const {
    data: infiniteData,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['tasks', filters],
    queryFn: ({ pageParam }) => tasksApi.getCursorPaginated(filters, pageParam, 20),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const allTasks = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
    [infiniteData]
  );

  const tasks = useMemo(() => {
    if (selectedDomainIds.length === 0) return allTasks;
    return allTasks.filter((t) =>
      t.domains?.some((d) => selectedDomainIds.includes(d.domainId))
    );
  }, [allTasks, selectedDomainIds]);

  const totalTasks = infiniteData?.pages[0]?.pagination.total ?? 0;

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const { data: domains = [] } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setModalOpen(false);
    },
    onError: (err: Error) => {
      alert(`Failed to create task: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof tasksApi.update>[1] }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingTask(null);
      setModalOpen(false);
    },
    onError: (err: Error) => {
      alert(`Failed to update task: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeletingTask(null);
    },
    onError: (err: Error) => {
      alert(`Failed to delete task: ${err.message}`);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: TaskStatus }) =>
      tasksApi.bulkStatus(taskIds, status),
    onMutate: async ({ taskIds, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', filters] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', filters]);
      queryClient.setQueryData(['tasks', filters], (old: Task[] | undefined) => {
        return old?.map((t) => (taskIds.includes(t.id) ? { ...t, status } : t)) || [];
      });
      return { previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', filters], context.previousTasks);
      }
      alert(`Failed to update task status: ${err.message}`);
    },
  });

  const handleStatusChange = (id: string, status: TaskStatus) => {
    // Trigger confetti if task is being marked as DONE
    if (status === 'DONE') {
      setCelebrateCompletion(true);
      setTimeout(() => setCelebrateCompletion(false), 100);

      // Trigger task completion celebration
      // Find the task name from the current tasks list
      const task = tasks.find(t => t.id === id);
      if (task) {
        addCelebration('TASK', { taskName: task.title });
      }
    }
    // For single status changes, we can use the optimistic bulk update or standard update
    // Using bulk mutation for consistency with Kanban drop
    bulkStatusMutation.mutate({ taskIds: [id], status });
  };

  const handleSave = async (formData: TaskFormData) => {
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      assigneeId: formData.assigneeId || null,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
    };

    const applyDomainChanges = async (taskId: string) => {
      const existingIds = editingTask?.domains?.map((td) => td.domainId) ?? [];
      const toAdd = formData.domainIds.filter((id) => !existingIds.includes(id));
      const toRemove = existingIds.filter((id) => !formData.domainIds.includes(id));
      await Promise.all([
        ...toAdd.map((domainId) => domainsApi.assignTask(domainId, taskId)),
        ...toRemove.map((domainId) => domainsApi.removeTask(domainId, taskId)),
      ]);
    };

    if (editingTask) {
      updateMutation.mutate(
        { id: editingTask.id, data: payload },
        {
          onSuccess: async () => {
            await applyDomainChanges(editingTask.id);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          },
        }
      );
    } else {
      createMutation.mutate(
        { ...payload, projectId: formData.projectId },
        {
          onSuccess: async (newTask) => {
            if (formData.domainIds.length > 0) {
              await Promise.all(
                formData.domainIds.map((domainId) => domainsApi.assignTask(domainId, newTask.id))
              );
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }
          },
        }
      );
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!deletingTask) return;
    deleteMutation.mutate(deletingTask.id);
  };

  const createRecurringMutation = useMutation({
    mutationFn: (data: { taskId: string; config: RecurrenceConfig }) =>
      recurringTasksApi.create({
        baseTaskId: data.taskId,
        ...data.config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTasks'] });
      setRecurrenceModalOpen(false);
      setTaskForRecurrence(null);
      alert('Recurring task created successfully!');
    },
    onError: (err: Error) => {
      alert(`Failed to create recurring task: ${err.message}`);
    },
  });

  const handleRecurrenceSubmit = (config: RecurrenceConfig) => {
    if (!taskForRecurrence) return;
    createRecurringMutation.mutate({
      taskId: taskForRecurrence.id,
      config,
    });
  };

  const handleBulkStatus = (taskIds: string[], status: TaskStatus) => {
    bulkStatusMutation.mutate({ taskIds, status });
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      await exportApi.downloadTasks(format, filters.projectId);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return viewMode === 'kanban' ? <KanbanSkeleton /> : <TableSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Failed to load tasks: {(error as Error).message}</p>
      </div>
    );
  }

  const clearFilter = (key: keyof TaskFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);

    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (key === 'assigneeId') newParams.delete('assignee');
    if (key === 'creatorId') newParams.delete('creator');
    if (key === 'hasBlockers') newParams.delete('blocked');
    if (key === 'isBlocking') newParams.delete('blocking');
    setSearchParams(newParams);
  };

  const getUserNameById = (userId: string): string => {
    // Find user name from tasks
    const task = tasks.find(t => t.assignee?.id === userId || t.creator?.id === userId);
    return task?.assignee?.id === userId ? task.assignee.name : (task?.creator?.id === userId ? task.creator.name : 'Unknown');
  };

  const toggleDependencyFilter = (filterType: 'blocked' | 'blocking') => {
    const newFilters = { ...filters };
    const newParams = new URLSearchParams(searchParams);

    if (filterType === 'blocked') {
      if (newFilters.hasBlockers) {
        delete newFilters.hasBlockers;
        newParams.delete('blocked');
      } else {
        newFilters.hasBlockers = true;
        newParams.set('blocked', 'true');
      }
    } else {
      if (newFilters.isBlocking) {
        delete newFilters.isBlocking;
        newParams.delete('blocking');
      } else {
        newFilters.isBlocking = true;
        newParams.set('blocking', 'true');
      }
    }

    setFilters(newFilters);
    setSearchParams(newParams);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'table' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Table size={14} />
              Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Columns3 size={14} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <CalendarIcon size={14} />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'week' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <CalendarDays size={14} />
              Week
            </button>
          </div>
          {/* Export Menu */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
              >
                Export JSON
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowQuickAdd((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-md transition-colors ${showQuickAdd
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            title="Quick create with natural language"
          >
            <Zap size={14} />
            Quick Add
          </button>
          <button
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 items-end flex-wrap mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project</label>
          <select
            value={filters.projectId || ''}
            onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value || undefined }))}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as TaskStatus | undefined }))}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters((f) => ({ ...f, priority: (e.target.value || undefined) as TaskPriority | undefined }))}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Dependency Filters */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dependencies</label>
          <div className="flex gap-2">
            <button
              onClick={() => toggleDependencyFilter('blocked')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md border transition-colors',
                filters.hasBlockers
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              ⚠️ Blocked
            </button>
            <button
              onClick={() => toggleDependencyFilter('blocking')}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md border transition-colors',
                filters.isBlocking
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              🔗 Blocking
            </button>
          </div>
        </div>

        {/* Domain Filter */}
        {domains.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Life Area</label>
            <DomainPicker
              selected={selectedDomainIds}
              onChange={setSelectedDomainIds}
              domains={domains}
            />
          </div>
        )}

        {(filters.projectId || filters.status || filters.priority || filters.hasBlockers || filters.isBlocking || selectedDomainIds.length > 0) && (
          <button
            onClick={() => {
              setFilters({});
              setSearchParams(new URLSearchParams());
              setSelectedDomainIds([]);
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Active Filter Badges */}
      {(filters.assigneeId || filters.creatorId) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {filters.assigneeId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-light)] dark:bg-[var(--primary-dark)] text-[var(--primary-base)] rounded-md text-sm">
              <span>Assignee: {getUserNameById(filters.assigneeId)}</span>
              <button
                onClick={() => clearFilter('assigneeId')}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {filters.creatorId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm">
              <span>Creator: {getUserNameById(filters.creatorId)}</span>
              <button
                onClick={() => clearFilter('creatorId')}
                className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Bar */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <SmartTaskInput
              onCreated={() => setShowQuickAdd(false)}
              onCancel={() => setShowQuickAdd(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views */}
      {tasks.length === 0 && !filters.projectId && !filters.status && !filters.priority && !filters.assigneeId && !filters.creatorId && !filters.hasBlockers && !filters.isBlocking && selectedDomainIds.length === 0 ? (
        <EmptyTasksState onCreateTask={() => { setEditingTask(null); setModalOpen(true); }} />
      ) : viewMode === 'table' ? (
        <TaskTableView
          tasks={tasks}
          projects={projects}
          currentUserId={currentUser!.id}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={(task) => setDeletingTask(task)}
          onFilterByAssignee={(userId) => {
            setFilters((f) => ({ ...f, assigneeId: userId }));
            const newParams = new URLSearchParams(searchParams);
            newParams.set('assignee', userId);
            setSearchParams(newParams);
          }}
          onFilterByCreator={(userId) => {
            setFilters((f) => ({ ...f, creatorId: userId }));
            const newParams = new URLSearchParams(searchParams);
            newParams.set('creator', userId);
            setSearchParams(newParams);
          }}
        />
      ) : viewMode === 'kanban' ? (
        <TaskKanbanView
          tasks={tasks}
          projects={projects}
          currentUserId={currentUser!.id}
          onEdit={handleEdit}
          onBulkStatus={handleBulkStatus}
        />
      ) : viewMode === 'week' ? (
        <WeekView tasks={tasks} onTaskClick={handleEdit} />
      ) : (
        <CalendarView
          tasks={tasks.filter((t) => t.dueDate)}
          onTaskDateChange={(taskId, newDate) => {
            updateMutation.mutate({ id: taskId, data: { dueDate: newDate } });
          }}
          onTaskClick={handleEdit}
        />
      )}

      {/* Task Modal */}
      <AnimatePresence>
        {modalOpen && (
          <TaskDetailModal
            task={editingTask}
            projects={projects}
            domains={domains}
            currentUserId={currentUser!.id}
            onClose={() => { setModalOpen(false); setEditingTask(null); }}
            onSubmit={handleSave}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingTask && (
          <DeleteConfirmDialog
            taskTitle={deletingTask.title}
            onClose={() => setDeletingTask(null)}
            onConfirm={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Recurrence Picker Modal */}
      {recurrenceModalOpen && taskForRecurrence && (
        <RecurrencePickerModal
          onClose={() => {
            setRecurrenceModalOpen(false);
            setTaskForRecurrence(null);
          }}
          onSubmit={handleRecurrenceSubmit}
          isSubmitting={createRecurringMutation.isPending}
        />
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex items-center justify-center mt-6 gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {tasks.length} of {totalTasks}
          </span>
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md disabled:opacity-50 transition-colors"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
      {!hasNextPage && tasks.length > 0 && totalTasks > 20 && (
        <p className="text-center mt-6 text-sm text-gray-400 dark:text-gray-500">
          Showing all {totalTasks} tasks
        </p>
      )}

      {/* Confetti Celebration */}
      <TaskCompletionCelebration trigger={celebrateCompletion} />
    </div>
  );
}
