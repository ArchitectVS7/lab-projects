import { api } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface AuthResponse {
  message: string;
  user: User;
}

interface MeResponse {
  user: User;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>('/api/auth/register', { email, password, name }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),

  logout: () => api.post<{ message: string }>('/api/auth/logout'),

  me: () => api.get<MeResponse>('/api/auth/me'),

  refresh: () => api.post<AuthResponse>('/api/auth/refresh'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>('/api/auth/password', {
      currentPassword,
      newPassword,
    }),
};
