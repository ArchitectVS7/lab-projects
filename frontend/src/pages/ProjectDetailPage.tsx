import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ArrowLeft, UserPlus, X, Trash2, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { Project, ProjectRole, TaskStatus, TaskPriority } from '../types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

const ROLE_BADGES: Record<ProjectRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-indigo-100 text-indigo-700',
  MEMBER: 'bg-gray-100 text-gray-700',
  VIEWER: 'bg-gray-50 text-gray-500',
};

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

function getUserRole(project: Project, userId: string): ProjectRole | null {
  const membership = project.members?.find((m) => m.userId === userId);
  return membership?.role ?? null;
}

function canManageMembers(role: ProjectRole | null): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [addMemberError, setAddMemberError] = useState('');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const { data: project, isLoading, isError, error } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getOne(id!),
    enabled: !!id,
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { email: string; role?: string }) => projectsApi.addMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      setAddMemberOpen(false);
      setMemberEmail('');
      setMemberRole('MEMBER');
      setAddMemberError('');
    },
    onError: (err: Error) => {
      setAddMemberError(err.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      setRemovingUserId(null);
    },
  });

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
        <p className="text-red-600">Failed to load project: {(error as Error).message}</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-indigo-600 hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found.</p>
        <Link to="/projects" className="text-indigo-600 hover:underline mt-2 inline-block">Back to Projects</Link>
      </div>
    );
  }

  const userRole = currentUser ? getUserRole(project, currentUser.id) : null;
  const isManager = canManageMembers(userRole);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError('');
    addMemberMutation.mutate({ email: memberEmail.trim(), role: memberRole });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>
        {project.description && (
          <p className="text-gray-500 mt-1 ml-7">{project.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Task Columns - 3/4 width */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tasks</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map((status) => {
              const columnTasks = project.tasks?.filter((t) => t.status === status) || [];
              return (
                <div key={status} className="flex-1 min-w-[220px]">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className={clsx('text-xs font-medium px-2 py-1 rounded', STATUS_COLORS[status])}>
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-gray-400">{columnTasks.length}</span>
                    </div>
                    <div className="space-y-2 min-h-[100px]">
                      {columnTasks.map((task) => (
                        <div key={task.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                          <p className="text-sm font-medium text-gray-900 mb-1">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority])}>
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Calendar size={10} />
                                {format(new Date(task.dueDate), 'MMM d')}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="ml-auto flex items-center gap-1">
                                <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-medium text-indigo-700">
                                  {task.assignee.name.charAt(0).toUpperCase()}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {columnTasks.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Members Panel - 1/4 width */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
            {isManager && (
              <button
                onClick={() => setAddMemberOpen(!addMemberOpen)}
                className="text-indigo-600 hover:text-indigo-700"
                title="Add member"
              >
                <UserPlus size={18} />
              </button>
            )}
          </div>

          {/* Add Member Form */}
          {addMemberOpen && isManager && (
            <form onSubmit={handleAddMember} className="bg-white border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="User email"
                required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VIEWER')}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              {addMemberError && (
                <p className="text-xs text-red-600">{addMemberError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="flex-1 px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMemberOpen(false);
                    setAddMemberError('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Member List */}
          <div className="space-y-2">
            {project.members?.map((member) => (
              <div key={member.userId} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700 flex-shrink-0">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{member.user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                </div>
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0', ROLE_BADGES[member.role])}>
                  {member.role}
                </span>
                {isManager && member.role !== 'OWNER' && (
                  <>
                    {removingUserId === member.userId ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          disabled={removeMemberMutation.isPending}
                          className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                        >
                          {removeMemberMutation.isPending ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setRemovingUserId(null)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRemovingUserId(member.userId)}
                        className="text-gray-300 hover:text-red-500 flex-shrink-0"
                        title="Remove member"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
