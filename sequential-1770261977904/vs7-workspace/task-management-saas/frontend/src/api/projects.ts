import { api } from './client';

export interface ProjectMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  members: ProjectMember[];
  _count: {
    tasks: number;
  };
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
}

export const projectsApi = {
  list: () => api.get<Project[]>('/api/projects'),

  get: (id: string) => api.get<Project>(`/api/projects/${id}`),

  create: (data: CreateProjectInput) => api.post<Project>('/api/projects', data),

  update: (id: string, data: UpdateProjectInput) =>
    api.put<Project>(`/api/projects/${id}`, data),

  delete: (id: string) => api.delete(`/api/projects/${id}`),

  addMember: (projectId: string, userId: string, role?: string) =>
    api.post(`/api/projects/${projectId}/members`, { userId, role }),

  removeMember: (projectId: string, userId: string) =>
    api.delete(`/api/projects/${projectId}/members/${userId}`),
};
