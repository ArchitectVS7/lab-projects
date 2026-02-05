import { useQuery } from '@tanstack/react-query';
import { tasksApi, projectsApi } from '../lib/api';
import { CheckCircle, Clock, AlertCircle, Folder } from 'lucide-react';

export default function DashboardPage() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
  });

  const taskList = tasks?.data || [];
  const projectList = projects?.data || [];

  const stats = {
    total: taskList.length,
    completed: taskList.filter((t: any) => t.status === 'DONE').length,
    inProgress: taskList.filter((t: any) => t.status === 'IN_PROGRESS').length,
    urgent: taskList.filter((t: any) => t.priority === 'URGENT').length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Total Tasks"
          value={stats.total}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Completed"
          value={stats.completed}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="In Progress"
          value={stats.inProgress}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          icon={<AlertCircle className="w-6 h-6" />}
          label="Urgent"
          value={stats.urgent}
          color="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h2>
          {taskList.length === 0 ? (
            <p className="text-gray-500 text-sm">No tasks yet. Create your first task!</p>
          ) : (
            <div className="space-y-3">
              {taskList.slice(0, 5).map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      task.status === 'DONE'
                        ? 'bg-green-500'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-yellow-500'
                        : 'bg-gray-300'
                    }`}
                  />
                  <span className="flex-1 text-sm text-gray-700">{task.title}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'URGENT'
                        ? 'bg-red-100 text-red-600'
                        : task.priority === 'HIGH'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects</h2>
          {projectList.length === 0 ? (
            <p className="text-gray-500 text-sm">No projects yet. Create your first project!</p>
          ) : (
            <div className="space-y-3">
              {projectList.slice(0, 5).map((project: any) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    <Folder className="w-4 h-4" style={{ color: project.color }} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-700">{project.name}</span>
                  <span className="text-xs text-gray-500">{project._count?.tasks || 0} tasks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
