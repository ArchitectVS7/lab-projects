import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, History, Link2, Sparkles } from 'lucide-react';
import type { Task, Project, ProjectMember, TaskStatus, TaskPriority, Domain } from '../types';
import TaskTimePanel from './TaskTimePanel';
import CommentList from './CommentList';
import ActivityTimeline from './ActivityTimeline';
import { useTaskSocket } from '../hooks/useTaskSocket';
import DependencyPicker from './DependencyPicker';
import FileAttachments from './FileAttachments';
import DomainPicker from './DomainPicker';

export interface TaskFormData {
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  domainIds: string[];
}

export default function TaskDetailModal({
  task,
  projects,
  domains = [],
  currentUserId,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  task: Task | null;
  projects: Project[];
  domains?: Domain[];
  currentUserId: string;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<TaskFormData>(() => task ? {
    title: task.title,
    description: task.description || '',
    projectId: task.projectId,
    assigneeId: task.assigneeId || '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    domainIds: task.domains?.map((td) => td.domainId) ?? [],
  } : {
    title: '',
    description: '',
    projectId: '',
    assigneeId: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '',
    domainIds: [],
  });

  const [activeTab, setActiveTab] = useState<'comments' | 'attachments' | 'activity'>('comments');

  // Subscribe to real-time updates for this task
  useTaskSocket(task?.id ?? null);

  // Sync form with task prop during render for subsequent task changes
  const [prevTaskId, setPrevTaskId] = useState<string | undefined>(task?.id);
  if (task?.id !== prevTaskId) {
    setPrevTaskId(task?.id);
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        projectId: task.projectId,
        assigneeId: task.assigneeId || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        domainIds: task.domains?.map((td) => td.domainId) ?? [],
      });
    } else {
      setForm({ title: '', description: '', projectId: '', assigneeId: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', domainIds: [] });
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Only show projects where user has write access
  console.log('TaskDetailModal: projects', projects.length, 'currentUserId', currentUserId);
  const writableProjects = projects.filter((p) => {
    const membership = p.members?.find((m) => m.userId === currentUserId);
    if (!membership) console.log('TaskDetailModal: no membership for project', p.name, p.id);
    else console.log('TaskDetailModal: membership role', p.name, membership.role);
    return membership && ['OWNER', 'ADMIN', 'MEMBER'].includes(membership.role);
  });
  console.log('TaskDetailModal: writableProjects', writableProjects.length);
  const selectedProject = useMemo(() => projects.find((p) => p.id === form.projectId), [projects, form.projectId]);
  // Assignee options from selected project's members
  const assigneeOptions = useMemo(() => selectedProject?.members || [], [selectedProject]);

  // Sync assignee if it's no longer valid for the selected project
  if (form.assigneeId && !assigneeOptions.find((m: ProjectMember) => m.userId === form.assigneeId)) {
    setForm((f) => ({ ...f, assigneeId: '' }));
  }

  const [claudeCopied, setClaudeCopied] = useState(false);

  const handleOpenInClaude = () => {
    if (!task) return;
    const lines: string[] = [
      `Task: ${task.title}`,
      `Status: ${task.status.replace('_', ' ')}`,
      `Priority: ${task.priority}`,
    ];
    if (task.dueDate) lines.push(`Due: ${task.dueDate.split('T')[0]}`);
    if (task.description) lines.push(`\nDescription:\n${task.description}`);
    const context = lines.join('\n');
    navigator.clipboard.writeText(context).catch(() => {/* ignore clipboard errors */});
    setClaudeCopied(true);
    setTimeout(() => setClaudeCopied(false), 2500);
    window.open('https://claude.ai', '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  // For new tasks, show compact form only
  const isNewTask = !task;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <motion.div
        className={`glass-card dark:glass-card-dark rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col ${isNewTask ? 'w-full max-w-md' : 'w-full max-w-4xl'
          }`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
      >
        {/* Colored accent bar */}
        <div className="h-1.5 bg-[var(--primary-base)]" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {task ? 'Task Details' : 'New Task'}
          </h2>
          <div className="flex items-center gap-2">
            {task && (
              <button
                type="button"
                onClick={handleOpenInClaude}
                title="Copy task context and open Claude.ai"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Sparkles size={13} />
                {claudeCopied ? 'Copied!' : 'Ask Claude'}
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-transparent resize-none"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
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
                {assigneeOptions.map((m: ProjectMember) => (
                  <option key={m.userId} value={m.userId}>{m.user.name}</option>
                ))}
              </select>
            </div>
            {domains.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Life Areas</label>
                <DomainPicker
                  selected={form.domainIds}
                  onChange={(ids) => setForm((f) => ({ ...f, domainIds: ids }))}
                  domains={domains}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
              />
            </div>
            {task && <DependencyPicker task={task} projectId={task.projectId} />}
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
                className="px-4 py-2 text-sm text-white bg-[var(--primary-base)] hover:opacity-90 rounded-md disabled:opacity-50 transition-opacity"
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
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'comments'
                    ? 'border-[var(--primary-base)] text-[var(--primary-base)]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <MessageSquare size={14} />
                  Comments
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity'
                    ? 'border-[var(--primary-base)] text-[var(--primary-base)]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <History size={14} />
                  Activity
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attachments'
                    ? 'border-[var(--primary-base)] text-[var(--primary-base)]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <Link2 size={14} />
                  Files
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'comments' ? (
                  <CommentList taskId={task.id} members={selectedProject?.members || []} />
                ) : activeTab === 'attachments' ? (
                  <FileAttachments taskId={task.id} canEdit={true} />
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
