import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { ColorPicker } from '../components/ColorPicker';
import { projectsApi, Project, CreateProjectInput } from '../lib/api';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    color: '#6366f1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getAll();
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', color: '#6366f1' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingProject) {
        const res = await projectsApi.update(editingProject.id, formData);
        setProjects(projects.map(p => p.id === editingProject.id ? res.data : p));
      } else {
        const res = await projectsApi.create(formData);
        setProjects([res.data, ...projects]);
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return;

    try {
      await projectsApi.delete(project.id);
      setProjects(projects.filter(p => p.id !== project.id));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your projects and tasks</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
            <p className="mt-2 text-gray-500">Get started by creating your first project.</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-2" style={{ backgroundColor: project.color }} />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <Link to={`/projects/${project.id}`} className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{project.description}</p>
                      )}
                    </Link>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {project._count?.tasks || 0} tasks
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(project)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingProject ? 'Edit Project' : 'New Project'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Project name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <ColorPicker
                color={formData.color || '#6366f1'}
                onChange={(color) => setFormData({ ...formData, color })}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : editingProject ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
