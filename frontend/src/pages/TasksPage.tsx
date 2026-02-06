import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, useDroppable, useDraggable } from '@dnd-kit/core';
import { tasksApi, projectsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Plus, Table, Columns3, X, Calendar, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';
import type { TaskFilters } from '../lib/api';

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
  TODO: 'bg-gray-100',
  IN_PROGRESS: 'bg-blue-50',
  IN_REVIEW: 'bg-yellow-50',
  DONE: 'bg-green-50',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

// --- Task Modal ---

interface TaskFormData {
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

function TaskModal({
  task,
  projects,
  currentUserId,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  task: Task | null;
  projects: Project[];
  currentUserId: string;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<TaskFormData>({
    title: '',
    description: '',
    projectId: '',
    assigneeId: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '',
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        projectId: task.projectId,
        assigneeId: task.assigneeId || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      });
    } else {
      setForm({ title: '', description: '', projectId: '', assigneeId: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' });
    }
  }, [task]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Only show projects where user has write access
  const writableProjects = projects.filter((p) => {
    const membership = p.members?.find((m) => m.userId === currentUserId);
    return membership && ['OWNER', 'ADMIN', 'MEMBER'].includes(membership.role);
  });

  // Assignee options from selected project's members
  const selectedProject = projects.find((p) => p.id === form.projectId);
  const assigneeOptions = selectedProject?.members || [];

  // Reset assignee if not in new project
  useEffect(() => {
    if (form.assigneeId && !assigneeOptions.find((m) => m.userId === form.assigneeId)) {
      setForm((f) => ({ ...f, assigneeId: '' }));
    }
  }, [form.projectId, assigneeOptions, form.assigneeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" required maxLength={200} value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Task title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} maxLength={2000} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Optional description" />
          </div>
          {!task && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
              <select required value={form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select a project</option>
                {writableProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select value={form.assigneeId} disabled={!form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-400">
              <option value="">Unassigned</option>
              {assigneeOptions.map((m) => (
                <option key={m.userId} value={m.userId}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
            <button type="submit" disabled={isSubmitting || !form.title.trim() || (!task && !form.projectId)}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
              {isSubmitting ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task</h3>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <span className="font-medium">"{taskTitle}"</span>?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Table View ---

function TableView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-center py-8 text-gray-400">No tasks match the current filters.</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium text-gray-600">Task</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Project</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Assignee</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Due</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{task.title}</div>
                {task.description && (
                  <div className="text-gray-500 text-xs line-clamp-1 mt-0.5">{task.description}</div>
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
                  <span className="text-gray-700 text-xs">{task.project.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {task.assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-medium text-indigo-700">
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-600">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">--</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '--'}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onEdit(task)} className="p-1 text-gray-400 hover:text-indigo-600" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(task)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
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
        isOver ? 'bg-indigo-50 ring-2 ring-indigo-300' : STATUS_COLUMN_COLORS[status]
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={clsx('text-xs font-semibold px-2 py-1 rounded text-white', STATUS_BG[status])}>
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-gray-400 font-medium">{tasks.length}</span>
      </div>
      <div className="space-y-2 min-h-[80px]">{children}</div>
    </div>
  );
}

function DraggableTaskCard({ task, onEdit }: { task: Task; onEdit: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        'bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{task.title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-gray-300 hover:text-indigo-600 flex-shrink-0 mt-0.5"
          title="Edit"
        >
          <Pencil size={12} />
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          <span className="text-[10px] text-gray-500">{task.project.name}</span>
        </div>
        {task.dueDate && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Calendar size={9} />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
        {task.assignee && (
          <span className="ml-auto w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-medium text-indigo-700">
            {task.assignee.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-white p-3 rounded-md shadow-xl border border-indigo-300 opacity-90 w-[260px]">
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          <span className="text-[10px] text-gray-500">{task.project.name}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanView({
  tasks,
  onEdit,
  onBulkStatus,
}: {
  tasks: Task[];
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
                <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} />
              ))}
              {columnTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
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

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(
    () => (localStorage.getItem('task-view-mode') as 'table' | 'kanban') || 'table'
  );
  const [filters, setFilters] = useState<TaskFilters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  useEffect(() => {
    localStorage.setItem('task-view-mode', viewMode);
  }, [viewMode]);

  const { data: tasks = [], isLoading, isError, error } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getAll(filters),
  });

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
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeletingTask(null);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ taskIds, status }: { taskIds: string[]; status: TaskStatus }) =>
      tasksApi.bulkStatus(taskIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleStatusChange = (id: string, status: TaskStatus) => {
    updateMutation.mutate({ id, data: { status } });
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

  const handleBulkStatus = (taskIds: string[], status: TaskStatus) => {
    bulkStatusMutation.mutate({ taskIds, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load tasks: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Table size={14} />
              Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Columns3 size={14} />
              Kanban
            </button>
          </div>
          <button
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 items-end flex-wrap mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
          <select
            value={filters.projectId || ''}
            onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value || undefined }))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as TaskStatus | undefined }))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters((f) => ({ ...f, priority: (e.target.value || undefined) as TaskPriority | undefined }))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        {(filters.projectId || filters.status || filters.priority) && (
          <button
            onClick={() => setFilters({})}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Views */}
      {viewMode === 'table' ? (
        <TableView
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={(task) => setDeletingTask(task)}
        />
      ) : (
        <KanbanView
          tasks={tasks}
          onEdit={handleEdit}
          onBulkStatus={handleBulkStatus}
        />
      )}

      {/* Task Modal */}
      {modalOpen && (
        <TaskModal
          task={editingTask}
          projects={projects}
          currentUserId={currentUser!.id}
          onClose={() => { setModalOpen(false); setEditingTask(null); }}
          onSubmit={handleSave}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deletingTask && (
        <DeleteConfirmDialog
          taskTitle={deletingTask.title}
          onClose={() => setDeletingTask(null)}
          onConfirm={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
