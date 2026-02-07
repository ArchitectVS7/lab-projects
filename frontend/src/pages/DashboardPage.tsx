import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { tasksApi, projectsApi } from '../lib/api';
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import InsightsWidget from '../components/InsightsWidget';
import { DashboardSkeleton } from '../components/Skeletons';
import EmptyState from '../components/EmptyState';
import clsx from 'clsx';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
  IN_REVIEW: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300',
  DONE: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300',
  URGENT: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300',
};

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="h-1 bg-[var(--primary-base)] rounded-t-lg -mx-4 -mt-4 mb-4" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <div className={clsx('p-3 rounded-full', color)}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const navigate = useNavigate();

  const handleAssigneeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.assignee) {
      navigate(`/tasks?assignee=${task.assignee.id}`);
    }
  };

  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.creator) {
      navigate(`/tasks?creator=${task.creator.id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{task.title}</h3>
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
          <span className="text-xs text-gray-500 dark:text-gray-400">{task.project.name}</span>
        </div>
      </div>
      {/* Creator and assignee info */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex-wrap">
        {(task._count?.dependsOn ?? 0) > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300">
            <span className="text-xs font-medium">⚠️ {task._count!.dependsOn} blocker{task._count!.dependsOn > 1 ? 's' : ''}</span>
          </div>
        )}
        {(task._count?.dependedOnBy ?? 0) > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-300">
            <span className="text-xs font-medium">🔗 Blocks {task._count!.dependedOnBy}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {task.assignee && (
          <button
            onClick={handleAssigneeClick}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
            title={`Filter tasks assigned to ${task.assignee.name}`}
          >
            <div className="w-5 h-5 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center text-xs font-semibold">
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">{task.assignee.name}</span>
          </button>
        )}
        {task.creator && (
          <>
            <span className="text-xs text-gray-400">→</span>
            <button
              onClick={handleCreatorClick}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
              title={`Filter tasks created by ${task.creator.name}`}
            >
              <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 flex items-center justify-center text-xs font-semibold">
                {task.creator.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{task.creator.name}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{project.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{project._count?.tasks || 0} tasks</p>
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
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      {/* Insights Widget */}
      <div className="mb-8">
        <InsightsWidget />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Tasks" value={stats.total} icon={ListTodo} color="bg-[var(--primary-base)]" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="bg-green-500" />
        <StatCard title="In Progress" value={stats.inProgress} icon={Clock} color="bg-blue-500" />
        <StatCard title="Urgent" value={stats.urgent} icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Tasks</h2>
            <Link to="/tasks" className="text-sm text-[var(--primary-base)] hover:opacity-80 transition-opacity">View all →</Link>
          </div>
          {recentTasks.length > 0 ? (
            <div className="grid gap-3">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <EmptyState
                type="tasks"
                title="No tasks yet"
                description="Create your first task to start tracking your work."
                actionLabel="Go to Tasks"
                actionTo="/tasks"
              />
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-[var(--primary-base)] hover:opacity-80 transition-opacity">View all →</Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            ) : (
              <EmptyState
                type="projects"
                title="No projects yet"
                description="Create a project to organize your tasks."
                actionLabel="Create Project"
                actionTo="/projects"
                className="py-8"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
