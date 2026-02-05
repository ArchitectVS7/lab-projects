import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { projectsApi, Project } from '../lib/api';
import { api } from '../api/client';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  createdAt: string;
}

const statusColors = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
};

const priorityColors = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<(Project & { tasks?: Task[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;

    api.get<Project & { tasks: Task[] }>(`/api/projects/${projectId}`)
      .then((data) => setProject(data))
      .catch((err) => setError(err.message || 'Failed to load project'))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const handleDeleteProject = async () => {
    if (!project || !confirm(`Are you sure you want to delete "${project.name}"? This will delete all tasks.`)) return;

    try {
      await projectsApi.delete(project.id);
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4">
          <div className="text-center py-12 text-gray-500">Loading project...</div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error || 'Project not found'}</p>
            <Link to="/projects" className="text-indigo-600 hover:text-indigo-700">
              Back to Projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tasks = project.tasks || [];
  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Link to="/projects" className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: project.color }} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && <p className="text-gray-600">{project.description}</p>}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteProject}
              className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
            >
              Delete Project
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const).map((status) => (
            <div key={status} className="bg-white rounded-xl border">
              <div className="px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-500">{tasksByStatus[status].length}</span>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[200px]">
                {tasksByStatus[status].length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No tasks</p>
                ) : (
                  tasksByStatus[status].map((task) => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200">
                      <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-400">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
