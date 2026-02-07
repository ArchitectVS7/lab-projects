import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, History } from 'lucide-react';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';
import TaskTimePanel from './TaskTimePanel';
import CommentList from './CommentList';
import ActivityTimeline from './ActivityTimeline';
import { useTaskSocket } from '../hooks/useTaskSocket';

export interface TaskFormData {
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
}

export default function TaskDetailModal({
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

  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  // Subscribe to real-time updates for this task
  useTaskSocket(task?.id ?? null);

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

  // For new tasks, show compact form only
  const isNewTask = !task;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        className={`glass-card dark:glass-card-dark rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col ${
          isNewTask ? 'w-full max-w-md' : 'w-full max-w-4xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {task ? 'Task Details' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-hidden ${isNewTask ? '' : 'flex'}`}>
          {/* Left column: Form */}
          <form
            onSubmit={handleSubmit}
            className={`p-4 space-y-4 overflow-y-auto ${isNewTask ? '' : 'w-1/2 border-r border-gray-200 dark:border-gray-700'}`}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Optional description"
              />
            </div>
            {isNewTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project *</label>
                <select
                  required
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a project</option>
                  {writableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
              <select
                value={form.assigneeId}
                disabled={!form.projectId}
                onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
              />
            </div>
            {task && <TaskTimePanel taskId={task.id} />}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !form.title.trim() || (isNewTask && !form.projectId)}
                className="px-4 py-2 text-sm text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-md disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : task ? 'Update' : 'Create'}
              </button>
            </div>
          </form>

          {/* Right column: Comments & Activity (only for existing tasks) */}
          {!isNewTask && task && (
            <div className="w-1/2 flex flex-col overflow-hidden">
              {/* Tab headers */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'comments'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <MessageSquare size={14} />
                  Comments
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <History size={14} />
                  Activity
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'comments' ? (
                  <CommentList taskId={task.id} members={selectedProject?.members || []} />
                ) : (
                  <ActivityTimeline taskId={task.id} />
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
