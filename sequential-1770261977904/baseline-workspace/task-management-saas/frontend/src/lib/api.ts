import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post('/api/auth/register', { email, password, name }),
};

// Tasks API
export const tasksApi = {
  getAll: (params?: { status?: string; priority?: string; projectId?: string }) =>
    api.get('/api/tasks', { params }),
  getOne: (id: string) => api.get(`/api/tasks/${id}`),
  create: (data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: string;
  }) => api.post('/api/tasks', data),
  update: (id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    projectId: string;
  }>) => api.put(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/api/tasks/${id}`),
};

// Projects API
export const projectsApi = {
  getAll: () => api.get('/api/projects'),
  getOne: (id: string) => api.get(`/api/projects/${id}`),
  create: (data: { name: string; description?: string; color?: string }) =>
    api.post('/api/projects', data),
  update: (id: string, data: Partial<{ name: string; description: string; color: string }>) =>
    api.put(`/api/projects/${id}`, data),
  delete: (id: string) => api.delete(`/api/projects/${id}`),
};
