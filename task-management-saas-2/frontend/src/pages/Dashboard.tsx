import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { projectsApi, Project } from '../lib/api';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    projectsApi.getAll()
      .then((res) => setProjects(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalTasks = projects.reduce((sum, p) => sum + (p._count?.tasks || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's an overview of your workspace.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{projects.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-semibold text-gray-900">{projects.length > 0 ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all
            </Link>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No projects yet</p>
                <Link
                  to="/projects"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    >
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">
                        {project._count?.tasks || 0} tasks
                      </p>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
