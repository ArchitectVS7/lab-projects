import { useState, useEffect, useMemo } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, useDroppable, useDraggable } from '@dnd-kit/core';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, projectsApi, recurringTasksApi, exportApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Plus, Table, Columns3, Calendar as CalendarIcon, Pencil, Trash2, Repeat, Download, Zap, Loader2, Shield, ShieldAlert, X } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';
import type { TaskFilters } from '../lib/api';
import TaskCompletionCelebration from '../components/TaskCompletionCelebration';
import RecurrencePickerModal, { RecurrenceConfig } from '../components/RecurrencePickerModal';
import { TableSkeleton, KanbanSkeleton } from '../components/Skeletons';
import { EmptyTasksState } from '../components/EmptyStates';
import CalendarView from '../components/CalendarView';
import TaskDetailModal from '../components/TaskDetailModal';
import type { TaskFormData } from '../components/TaskDetailModal';
import { modalOverlay, modalContent, taskCardHover } from '../lib/animations';
import SmartTaskInput from '../components/SmartTaskInput';

// --- Constants ---

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const STATUS_BG: Record<TaskStatus, string> = {
  TODO: 'bg-gray-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
};

const STATUS_COLUMN_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 dark:bg-gray-800',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-900/20',
  IN_REVIEW: 'bg-yellow-50 dark:bg-yellow-900/20',
  DONE: 'bg-green-50 dark:bg-green-900/20',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300',
  URGENT: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300',
};

function canEditTask(task: Task, currentUserId: string, projects: Project[]): boolean {
  const project = projects.find(p => p.id === task.projectId);
  const membership = project?.members?.find(m => m.userId === currentUserId);
  if (!membership) return false;
  if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
  return membership.role === 'MEMBER' && task.creatorId === currentUserId;
}

// TaskFormData imported from TaskDetailModal

// --- Delete Confirmation ---

function DeleteConfirmDialog({
  taskTitle,
  onClose,
  onConfirm,
  isDeleting,
}: {
  taskTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      {...modalOverlay}
    >
      <motion.div
        className="glass-card dark:glass-card-dark rounded-lg shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        {...modalContent}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete Task</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to delete <span className="font-medium">"{taskTitle}"</span>?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="px-4 py-2 text-sm text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 rounded-md disabled:opacity-50">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Table View ---

function TableView({
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
            <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Due</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <motion.tr
              key={task.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
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

// --- Kanban Components ---

function KanbanColumn({ status, tasks, children }: { status: TaskStatus; tasks: Task[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex-1 min-w-[260px] p-3 rounded-lg transition-colors',
        isOver ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-600' : STATUS_COLUMN_COLORS[status]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={clsx('text-xs font-semibold px-2 py-1 rounded text-white', STATUS_BG[status])}>
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{tasks.length}</span>
      </div>
      <div className="space-y-2 min-h-[80px]">{children}</div>
    </div>
  );
}

function DraggableTaskCard({ task, onEdit, canEdit }: { task: Task; onEdit: (task: Task) => void; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      {...taskCardHover}
      className={clsx(
        'bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">{task.title}</p>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-gray-300 dark:text-gray-600 hover:text-[var(--primary-base)] flex-shrink-0 mt-0.5 transition-colors"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
        {task.isRecurring && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center gap-0.5" title="Recurring task">
            <Repeat size={9} />
            Recurring
          </span>
        )}
        {(task._count?.dependsOn ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 flex items-center gap-0.5" title="Blocked">
            <ShieldAlert size={9} />
            Blocked
          </span>
        )}
        {(task._count?.dependedOnBy ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center gap-0.5" title="Blocking others">
            <Shield size={9} />
            Blocking
          </span>
        )}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{task.project.name}</span>
        </div>
        {task.dueDate && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
            <CalendarIcon size={9} />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
        {task.assignee && (
          <span className="ml-auto w-5 h-5 rounded-full bg-[var(--primary-light)] dark:bg-[var(--primary-dark)] flex items-center justify-center text-[10px] font-medium text-[var(--primary-base)]">
            {task.assignee.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-xl border-2 opacity-90 w-[260px]" style={{ borderColor: 'var(--primary-base)' }}>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
        {(task._count?.dependsOn ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 flex items-center gap-0.5">
            <ShieldAlert size={9} />
            Blocked
          </span>
        )}
        {(task._count?.dependedOnBy ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center gap-0.5">
            <Shield size={9} />
            Blocking
          </span>
        )}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{task.project.name}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanView({
  tasks,
  projects,
  currentUserId,
  onEdit,
  onBulkStatus,
}: {
  tasks: Task[];
  projects: Project[];
  currentUserId: string;
  onEdit: (task: Task) => void;
  onBulkStatus: (taskIds: string[], status: TaskStatus) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const draggedTask = tasks.find((t) => t.id === event.active.id);
    setActiveTask(draggedTask || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (task && STATUSES.includes(newStatus as TaskStatus) && newStatus !== task.status) {
      onBulkStatus([taskId], newStatus as TaskStatus);
    }
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <KanbanColumn key={status} status={status} tasks={columnTasks}>
              {columnTasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  canEdit={canEditTask(task, currentUserId, projects)}
                />
              ))}
              {columnTasks.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No tasks</p>
              )}
            </KanbanColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Main Page ---

export default function TasksPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>(
    () => (localStorage.getItem('task-view-mode') as 'table' | 'kanban' | 'calendar') || 'table'
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

  const tasks = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
    [infiniteData]
  );
  const totalTasks = infiniteData?.pages[0]?.pagination.total ?? 0;

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
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
    }
    // For single status changes, we can use the optimistic bulk update or standard update
    // Using bulk mutation for consistency with Kanban drop
    bulkStatusMutation.mutate({ taskIds: [id], status });
  };

  const handleSave = (formData: TaskFormData) => {
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      assigneeId: formData.assigneeId || null,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: payload });
    } else {
      createMutation.mutate({ ...payload, projectId: formData.projectId });
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

        {(filters.projectId || filters.status || filters.priority || filters.hasBlockers || filters.isBlocking) && (
          <button
            onClick={() => {
              setFilters({});
              setSearchParams(new URLSearchParams());
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
      {tasks.length === 0 && !filters.projectId && !filters.status && !filters.priority && !filters.assigneeId && !filters.creatorId && !filters.hasBlockers && !filters.isBlocking ? (
        <EmptyTasksState onCreateTask={() => { setEditingTask(null); setModalOpen(true); }} />
      ) : viewMode === 'table' ? (
        <TableView
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
        <KanbanView
          tasks={tasks}
          projects={projects}
          currentUserId={currentUser!.id}
          onEdit={handleEdit}
          onBulkStatus={handleBulkStatus}
        />
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
