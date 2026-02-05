// API wrapper that adapts the api modules to match the expected interface
import { authApi as baseAuthApi, User } from '../api/auth';
import { projectsApi as baseProjectsApi, Project, CreateProjectInput, UpdateProjectInput } from '../api/projects';

// Wrap responses in { data: ... } format for consistency with AuthContext
interface WrappedResponse<T> {
  data: T;
}

function wrapResponse<T>(promise: Promise<T>): Promise<WrappedResponse<T>> {
  return promise.then(data => ({ data }));
}

// Auth API with adapted method signatures
export const authApi = {
  login: ({ email, password }: { email: string; password: string }) =>
    wrapResponse(baseAuthApi.login(email, password)),

  register: ({ email, password, name }: { email: string; password: string; name: string }) =>
    wrapResponse(baseAuthApi.register(email, password, name)),

  logout: () => wrapResponse(baseAuthApi.logout()),

  getMe: () => wrapResponse(baseAuthApi.me()),

  refresh: () => wrapResponse(baseAuthApi.refresh()),
};

// Projects API with adapted method names
export const projectsApi = {
  getAll: () => wrapResponse(baseProjectsApi.list()),

  get: (id: string) => wrapResponse(baseProjectsApi.get(id)),

  create: (data: CreateProjectInput) => wrapResponse(baseProjectsApi.create(data)),

  update: (id: string, data: UpdateProjectInput) => wrapResponse(baseProjectsApi.update(id, data)),

  delete: (id: string) => wrapResponse(baseProjectsApi.delete(id)),

  addMember: (projectId: string, userId: string, role?: string) =>
    wrapResponse(baseProjectsApi.addMember(projectId, userId, role)),

  removeMember: (projectId: string, userId: string) =>
    wrapResponse(baseProjectsApi.removeMember(projectId, userId)),
};

// Re-export types
export type { User, Project, CreateProjectInput, UpdateProjectInput };
