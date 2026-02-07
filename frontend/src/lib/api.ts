import { useAuthStore } from '../store/auth';
import type { User, Task, Project, ProjectMember, TaskStatus, TaskPriority, RecurringTask, RecurrenceFrequency } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Paths where 401 is expected and should NOT trigger global redirect
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/me'];

// --- Core fetch wrapper ---

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    useAuthStore.getState().clearUser();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// --- Auth API ---

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    request<{ message: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ message: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  refresh: () =>
    request<{ message: string }>('/api/auth/refresh', { method: 'POST' }),

  updateProfile: (data: { name?: string; avatarUrl?: string | null }) =>
    request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// --- Tasks API ---

export interface TaskFilters {
  q?: string; // Search query for title/description
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  creatorId?: string;
  dueDateFrom?: string; // ISO date string
  dueDateTo?: string; // ISO date string
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const tasksApi = {
  getAll: (filters?: TaskFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    const qs = params.toString();
    return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },

  getOne: (id: string) =>
    request<Task>(`/api/tasks/${id}`),

  create: (data: {
    title: string;
    description?: string;
    projectId: string;
    assigneeId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'project' | 'assignee' | 'creator'>>) =>
    request<Task>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  bulkStatus: (taskIds: string[], status: TaskStatus) =>
    request<{ updated: number }>('/api/tasks/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ taskIds, status }),
    }),
};

// --- Projects API ---

export const projectsApi = {
  getAll: () =>
    request<Project[]>('/api/projects'),

  getOne: (id: string) =>
    request<Project>(`/api/projects/${id}`),

  create: (data: { name: string; description?: string; color?: string }) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Pick<Project, 'name' | 'description' | 'color'>>) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  addMember: (projectId: string, data: { email: string; role?: string }) =>
    request<ProjectMember>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeMember: (projectId: string, userId: string) =>
    request<void>(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),
};

// --- Analytics API ---

export interface AnalyticsData {
  velocity: {
    thisWeek: number;
    lastWeek: number;
    changePercent: number;
  };
  patterns: {
    mostProductiveDay: string;
    tasksAnalyzed: number;
  };
  insight: string;
}

export const analyticsApi = {
  getInsights: () => request<AnalyticsData>('/api/analytics/insights'),
};

// --- Recurring Tasks API ---

export const recurringTasksApi = {
  getAll: () =>
    request<RecurringTask[]>('/api/recurring-tasks'),

  getOne: (id: string) =>
    request<RecurringTask>(`/api/recurring-tasks/${id}`),

  create: (data: {
    baseTaskId: string;
    frequency: RecurrenceFrequency;
    interval: number;
    daysOfWeek?: string;
    dayOfMonth?: number;
    startDate: string;
    endDate?: string | null;
  }) =>
    request<RecurringTask>('/api/recurring-tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/recurring-tasks/${id}`, { method: 'DELETE' }),

  generateNext: (id: string) =>
    request<Task>(`/api/recurring-tasks/${id}/generate`, { method: 'POST' }),
};

// --- Export API ---

export const exportApi = {
  /**
   * Triggers a file download of tasks in the given format.
   * Uses a direct fetch + blob approach so the browser downloads the file.
   */
  downloadTasks: async (format: 'csv' | 'json' = 'csv', projectId?: string) => {
    const params = new URLSearchParams({ format });
    if (projectId) params.set('projectId', projectId);

    const res = await fetch(`${API_BASE}/api/export/tasks?${params}`, {
      credentials: 'include',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
