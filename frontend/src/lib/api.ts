import { useAuthStore } from '../store/auth';
import type { User, Task, Project, ProjectMember, TaskStatus, TaskPriority, RecurringTask, RecurrenceFrequency, TimeEntry, Comment, ActivityLog, Tag, TaskTag, CustomFieldDefinition, CustomFieldType, CustomFieldValue, Attachment, CreatorMetricsData, DependencyList, DependencyGraph, CriticalPath, ApiKey, WebhookConfig, WebhookLog } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Paths where 401 is expected and should NOT trigger global redirect
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/me'];

// --- Core fetch wrapper ---

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Include Authorization header as fallback for mobile browsers that may not
  // send cross-origin cookies reliably (iOS Safari ITP, SameSite issues)
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    useAuthStore.getState().clearUser();
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
    request<{ message: string; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ message: string; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  refresh: () =>
    request<{ message: string; token: string }>('/api/auth/refresh', { method: 'POST' }),

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

// --- Pagination ---

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  total: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: CursorPaginationMeta;
}

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
  hasBlockers?: boolean; // Filter tasks with dependencies blocking them
  isBlocking?: boolean; // Filter tasks that are blocking other tasks
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

  getPaginated: (filters?: TaskFilters, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    return request<PaginatedResponse<Task>>(`/api/tasks?${params}`);
  },

  getCursorPaginated: (filters?: TaskFilters, cursor?: string, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit), cursor: cursor || '' });
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    return request<CursorPaginatedResponse<Task>>(`/api/tasks?${params}`);
  },

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

  getPaginated: (page = 1, limit = 20) =>
    request<PaginatedResponse<Project>>(`/api/projects?page=${page}&limit=${limit}`),

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
  getCreatorMetrics: (projectId: string) =>
    request<CreatorMetricsData>(`/api/analytics/creator-metrics?projectId=${projectId}`),
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

// --- Time Entries API ---

export interface TimeEntryFilters {
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TimeEntryStats {
  totalSeconds: number;
  entryCount: number;
  byTask: { taskId: string; title: string; seconds: number }[];
  byDay: { date: string; seconds: number }[];
}

export const timeEntriesApi = {
  getAll: (filters?: TimeEntryFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    const qs = params.toString();
    return request<TimeEntry[]>(`/api/time-entries${qs ? `?${qs}` : ''}`);
  },

  getOne: (id: string) =>
    request<TimeEntry>(`/api/time-entries/${id}`),

  getActive: () =>
    request<TimeEntry | null>('/api/time-entries/active'),

  getStats: (filters?: { taskId?: string; projectId?: string; dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    const qs = params.toString();
    return request<TimeEntryStats>(`/api/time-entries/stats${qs ? `?${qs}` : ''}`);
  },

  create: (data: {
    taskId: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    description?: string;
  }) =>
    request<TimeEntry>('/api/time-entries', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: {
    startTime?: string;
    endTime?: string;
    duration?: number;
    description?: string;
  }) =>
    request<TimeEntry>(`/api/time-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/time-entries/${id}`, { method: 'DELETE' }),

  start: (data: { taskId: string; description?: string }) =>
    request<TimeEntry>('/api/time-entries/start', { method: 'POST', body: JSON.stringify(data) }),

  stop: (id: string) =>
    request<TimeEntry>(`/api/time-entries/${id}/stop`, { method: 'POST' }),
};

// --- Comments API ---

export const commentsApi = {
  getByTask: (taskId: string) =>
    request<Comment[]>(`/api/tasks/${taskId}/comments`),

  create: (taskId: string, data: { content: string; parentId?: string }) =>
    request<Comment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { content: string }) =>
    request<Comment>(`/api/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/comments/${id}`, { method: 'DELETE' }),
};

// --- Notifications API ---

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
  projectId?: string;
}

export const notificationsApi = {
  getAll: (unreadOnly?: boolean) => {
    const qs = unreadOnly ? '?unreadOnly=true' : '';
    return request<NotificationItem[]>(`/api/notifications${qs}`);
  },

  getCursorPaginated: (cursor?: string, limit = 20, unreadOnly?: boolean) => {
    const params = new URLSearchParams({ limit: String(limit), cursor: cursor || '' });
    if (unreadOnly) params.set('unreadOnly', 'true');
    return request<CursorPaginatedResponse<NotificationItem>>(`/api/notifications?${params}`);
  },

  getUnreadCount: () =>
    request<{ count: number }>('/api/notifications/unread-count'),

  markRead: (notificationIds: string[]) =>
    request<{ message: string }>('/api/notifications/mark-read', {
      method: 'PATCH',
      body: JSON.stringify({ notificationIds }),
    }),

  markAllRead: () =>
    request<{ message: string }>('/api/notifications/mark-all-read', {
      method: 'PATCH',
    }),

  delete: (id: string) =>
    request<void>(`/api/notifications/${id}`, { method: 'DELETE' }),
};

// --- Activity Logs API ---

export const activityLogsApi = {
  getByTask: (taskId: string, limit?: number) => {
    const qs = limit ? `?limit=${limit}` : '';
    return request<ActivityLog[]>(`/api/tasks/${taskId}/activity${qs}`);
  },

  getCursorPaginated: (taskId: string, cursor?: string, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit), cursor: cursor || '' });
    return request<CursorPaginatedResponse<ActivityLog>>(`/api/tasks/${taskId}/activity?${params}`);
  },
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

// --- Tags API ---

export const tagsApi = {
  getByProject: (projectId: string) =>
    request<Tag[]>(`/api/tags?projectId=${projectId}`),

  create: (data: { name: string; color?: string; projectId: string }) =>
    request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; color?: string }) =>
    request<Tag>(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/tags/${id}`, { method: 'DELETE' }),

  addToTask: (taskId: string, tagId: string) =>
    request<TaskTag>(`/api/tags/task/${taskId}`, { method: 'POST', body: JSON.stringify({ tagId }) }),

  removeFromTask: (taskId: string, tagId: string) =>
    request<void>(`/api/tags/task/${taskId}/${tagId}`, { method: 'DELETE' }),
};

// --- Custom Fields API ---

export const customFieldsApi = {
  getByProject: (projectId: string) =>
    request<CustomFieldDefinition[]>(`/api/custom-fields?projectId=${projectId}`),

  create: (data: { name: string; type: CustomFieldType; options?: string; required?: boolean; projectId: string }) =>
    request<CustomFieldDefinition>('/api/custom-fields', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { name?: string; type?: CustomFieldType; options?: string; required?: boolean }) =>
    request<CustomFieldDefinition>(`/api/custom-fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/custom-fields/${id}`, { method: 'DELETE' }),

  getTaskValues: (taskId: string) =>
    request<CustomFieldValue[]>(`/api/custom-fields/task/${taskId}`),

  setTaskValues: (taskId: string, fields: { fieldId: string; value: string }[]) =>
    request<CustomFieldValue[]>(`/api/custom-fields/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    }),
};

// --- Attachments API ---

export const attachmentsApi = {
  getByTask: (taskId: string) =>
    request<Attachment[]>(`/api/attachments/task/${taskId}`),

  upload: async (taskId: string, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_BASE}/api/attachments/task/${taskId}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Note: do NOT set Content-Type header - browser sets it with boundary for multipart
    });

    if (res.status === 401) {
      useAuthStore.getState().clearUser();
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    return res.json();
  },

  download: (id: string) => {
    // Direct browser navigation for file download
    window.open(`${API_BASE}/api/attachments/${id}/download`, '_blank');
  },

  delete: (id: string) =>
    request<void>(`/api/attachments/${id}`, { method: 'DELETE' }),
};

// --- Dependencies API ---

export const dependenciesApi = {
  add: (taskId: string, dependsOnId: string) =>
    request<unknown>(`/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ blockingTaskId: dependsOnId }),
    }),

  list: (taskId: string) =>
    request<DependencyList>(`/api/tasks/${taskId}/dependencies`),

  remove: (taskId: string, depId: string) =>
    request<void>(`/api/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' }),

  getCriticalPath: (projectId: string) =>
    request<CriticalPath>(`/api/projects/${projectId}/critical-path`),

  getProjectGraph: (projectId: string) =>
    request<DependencyGraph>(`/api/projects/${projectId}/dependencies`),
};

// --- API Keys API ---

export const apiKeysApi = {
  create: (data: { name: string }) =>
    request<ApiKey>('/api/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () =>
    request<ApiKey[]>('/api/auth/api-keys'),

  revoke: (id: string) =>
    request<void>(`/api/auth/api-keys/${id}`, { method: 'DELETE' }),
};

// --- Webhooks API ---

export const webhooksApi = {
  create: (data: { url: string; events: string[] }) =>
    request<WebhookConfig>('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: () =>
    request<WebhookConfig[]>('/api/webhooks'),

  update: (id: string, data: { url?: string; events?: string[]; active?: boolean }) =>
    request<WebhookConfig>(`/api/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/webhooks/${id}`, { method: 'DELETE' }),

  getLogs: (id: string) =>
    request<WebhookLog[]>(`/api/webhooks/${id}/logs`),
};
