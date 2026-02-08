import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tasksApi, projectsApi } from '../lib/api';
import { Clock } from 'lucide-react';
import InsightsWidget from '../components/InsightsWidget';
import { DashboardSkeleton } from '../components/Skeletons';
import EmptyState from '../components/EmptyState';
import { useAuthStore } from '../store/auth';
import clsx from 'clsx';
import type { Project } from '../types';


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


// TaskCard replaced by shared component
import TaskCard from '../components/TaskCard';

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
  const { user } = useAuthStore();
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
  const myContributions = tasks.filter(t => t.creatorId === user?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

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

        {/* Your Contributions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Contributions</h2>
            <Link to={`/tasks?creator=${user?.id}`} className="text-sm text-[var(--primary-base)] hover:opacity-80 transition-opacity">View all →</Link>
          </div>
          {myContributions.length > 0 ? (
            <div className="grid gap-3">
              {myContributions.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <EmptyState
                type="tasks"
                title="No contributions yet"
                description="Tasks you create will appear here."
                actionLabel="Create Task"
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
