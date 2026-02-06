import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tasksApi, projectsApi } from '../lib/api';
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-600',
  IN_REVIEW: 'bg-yellow-100 text-yellow-600',
  DONE: 'bg-green-100 text-green-600',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={clsx('p-3 rounded-full', color)}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 line-clamp-1">{task.title}</h3>
        <span className={clsx('text-xs px-2 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={clsx('text-xs px-2 py-0.5 rounded', STATUS_COLORS[task.status])}>
          {STATUS_LABELS[task.status]}
        </span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          <span className="text-xs text-gray-500">{task.project.name}</span>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{project.name}</p>
        <p className="text-xs text-gray-500">{project._count?.tasks || 0} tasks</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const isLoading = tasksLoading || projectsLoading;

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'DONE').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    urgent: tasks.filter((t) => t.priority === 'URGENT').length,
  };

  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentProjects = [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Tasks" value={stats.total} icon={ListTodo} color="bg-indigo-500" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="bg-green-500" />
        <StatCard title="In Progress" value={stats.inProgress} icon={Clock} color="bg-blue-500" />
        <StatCard title="Urgent" value={stats.urgent} icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <Link to="/tasks" className="text-sm text-indigo-600 hover:text-indigo-700">View all →</Link>
          </div>
          {recentTasks.length > 0 ? (
            <div className="grid gap-3">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No tasks yet. Create your first task!</p>
              <Link to="/tasks" className="mt-2 inline-block text-indigo-600 hover:text-indigo-700">Go to Tasks →</Link>
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-indigo-600 hover:text-indigo-700">View all →</Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200">
            {recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500 text-sm">No projects yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
