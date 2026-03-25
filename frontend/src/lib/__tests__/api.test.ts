import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock auth store before importing api so request() uses the mock
vi.mock('../../store/auth', () => ({
  useAuthStore: {
    getState: vi.fn(),
  },
}));

import { useAuthStore } from '../../store/auth';
import {
  authApi,
  tasksApi,
  projectsApi,
  notificationsApi,
  checkinsApi,
  commentsApi,
  webhooksApi,
  activityLogsApi,
} from '../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGetState = useAuthStore.getState as ReturnType<typeof vi.fn>;
const mockClearUser = vi.fn();

function setToken(token: string | null) {
  mockGetState.mockReturnValue({ token, clearUser: mockClearUser });
}

function makeResponse(status: number, data?: unknown): Response {
  return {
    ok:     status >= 200 && status < 300,
    status,
    json:   () => Promise.resolve(data ?? {}),
    blob:   () => Promise.resolve(new Blob()),
  } as unknown as Response;
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockGetState.mockReset();
  mockClearUser.mockReset();
  setToken(null);  // default: no token
  fetchSpy = vi.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
});

// ─── request — headers ────────────────────────────────────────────────────────

describe('request — headers', () => {
  it('always sets Content-Type: application/json', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { user: {} }));
    await authApi.me();
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sets Authorization Bearer header when token is present', async () => {
    setToken('my-jwt-token');
    fetchSpy.mockResolvedValue(makeResponse(200, { user: {} }));
    await authApi.me();
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-jwt-token');
  });

  it('omits Authorization header when token is null', async () => {
    setToken(null);
    fetchSpy.mockResolvedValue(makeResponse(200, { user: {} }));
    await authApi.me();
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('always sends credentials: include', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { user: {} }));
    await authApi.me();
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(opts.credentials).toBe('include');
  });
});

// ─── request — 401 handling ───────────────────────────────────────────────────

describe('request — 401 handling', () => {
  it('calls clearUser and throws "Unauthorized" on 401 for a protected path', async () => {
    fetchSpy.mockResolvedValue(makeResponse(401));
    await expect(tasksApi.getAll()).rejects.toThrow('Unauthorized');
    expect(mockClearUser).toHaveBeenCalled();
  });

  it('does NOT call clearUser on 401 for /api/auth/login', async () => {
    fetchSpy.mockResolvedValue(makeResponse(401, { error: 'Bad credentials' }));
    await expect(authApi.login({ email: 'x@x.com', password: 'wrong' })).rejects.toThrow();
    expect(mockClearUser).not.toHaveBeenCalled();
  });

  it('does NOT call clearUser on 401 for /api/auth/register', async () => {
    fetchSpy.mockResolvedValue(makeResponse(401, {}));
    await expect(
      authApi.register({ email: 'x@x.com', password: 'p', name: 'X' }),
    ).rejects.toThrow();
    expect(mockClearUser).not.toHaveBeenCalled();
  });

  it('does NOT call clearUser on 401 for /api/auth/me', async () => {
    fetchSpy.mockResolvedValue(makeResponse(401, {}));
    await expect(authApi.me()).rejects.toThrow();
    expect(mockClearUser).not.toHaveBeenCalled();
  });
});

// ─── request — non-ok error handling ─────────────────────────────────────────

describe('request — non-ok error handling', () => {
  it('throws the body.error message on non-ok response', async () => {
    fetchSpy.mockResolvedValue(makeResponse(400, { error: 'Validation failed' }));
    await expect(tasksApi.getAll()).rejects.toThrow('Validation failed');
  });

  it('throws "HTTP <status>" when body has no error field', async () => {
    fetchSpy.mockResolvedValue(makeResponse(500, {}));
    await expect(tasksApi.getAll()).rejects.toThrow('HTTP 500');
  });

  it('throws "Request failed" when response body is not JSON', async () => {
    fetchSpy.mockResolvedValue({
      ok:     false,
      status: 503,
      json:   () => Promise.reject(new Error('not json')),
    } as unknown as Response);
    await expect(tasksApi.getAll()).rejects.toThrow('Request failed');
  });
});

// ─── request — 204 No Content ─────────────────────────────────────────────────

describe('request — 204 No Content', () => {
  it('returns undefined for 204 responses', async () => {
    fetchSpy.mockResolvedValue(makeResponse(204));
    const result = await tasksApi.delete('task-1');
    expect(result).toBeUndefined();
  });
});

// ─── request — success path ───────────────────────────────────────────────────

describe('request — success path', () => {
  it('returns parsed JSON on a 200 response', async () => {
    const payload = { id: 't1', title: 'My Task' };
    fetchSpy.mockResolvedValue(makeResponse(200, payload));
    const result = await tasksApi.getOne('t1');
    expect(result).toEqual(payload);
  });
});

// ─── authApi — URL and method ─────────────────────────────────────────────────

describe('authApi', () => {
  it('login sends POST to /api/auth/login with body', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { user: {}, token: 't' }));
    await authApi.login({ email: 'a@b.com', password: 'pw' });
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/login');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toEqual({ email: 'a@b.com', password: 'pw' });
  });

  it('logout sends POST to /api/auth/logout', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { message: 'ok' }));
    await authApi.logout();
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/logout');
    expect(opts.method).toBe('POST');
  });

  it('me sends GET to /api/auth/me', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { user: {} }));
    await authApi.me();
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/auth/me');
    expect(opts.method).toBeUndefined(); // GET (default)
  });
});

// ─── tasksApi — URL construction ─────────────────────────────────────────────

describe('tasksApi', () => {
  it('getAll with no filters sends GET to /api/tasks', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await tasksApi.getAll();
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks');
    expect(url).not.toContain('?');
  });

  it('getAll with filters appends query params', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await tasksApi.getAll({ status: 'TODO', priority: 'HIGH' });
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('status=TODO');
    expect(url).toContain('priority=HIGH');
  });

  it('getAll skips falsy filter values', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await tasksApi.getAll({ status: undefined, priority: 'LOW' });
    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain('status=');
    expect(url).toContain('priority=LOW');
  });

  it('create sends POST with JSON body', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, {}));
    await tasksApi.create({ title: 'New Task', projectId: 'p1' });
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string).title).toBe('New Task');
  });

  it('update sends PUT to /api/tasks/:id', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, {}));
    await tasksApi.update('t42', { title: 'Updated' });
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks/t42');
    expect(opts.method).toBe('PUT');
  });

  it('bulkStatus sends PATCH to /api/tasks/bulk-status', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { updated: 2 }));
    await tasksApi.bulkStatus(['t1', 't2'], 'DONE');
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks/bulk-status');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string)).toEqual({ taskIds: ['t1', 't2'], status: 'DONE' });
  });
});

// ─── projectsApi ──────────────────────────────────────────────────────────────

describe('projectsApi', () => {
  it('getAll sends GET to /api/projects', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await projectsApi.getAll();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/api/projects');
  });

  it('addMember sends POST with member data', async () => {
    fetchSpy.mockResolvedValue(makeResponse(201, {}));
    await projectsApi.addMember('p1', { email: 'new@user.com', role: 'MEMBER' });
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/projects/p1/members');
    expect(opts.method).toBe('POST');
  });

  it('removeMember sends DELETE to /api/projects/:id/members/:userId', async () => {
    fetchSpy.mockResolvedValue(makeResponse(204));
    await projectsApi.removeMember('p1', 'u1');
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/projects/p1/members/u1');
    expect(opts.method).toBe('DELETE');
  });
});

// ─── notificationsApi ────────────────────────────────────────────────────────

describe('notificationsApi', () => {
  it('getAll without unreadOnly has no query string', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await notificationsApi.getAll();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).not.toContain('unreadOnly');
  });

  it('getAll with unreadOnly=true adds ?unreadOnly=true', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await notificationsApi.getAll(true);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('unreadOnly=true');
  });

  it('markRead sends PATCH with notificationIds array', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { message: 'ok' }));
    await notificationsApi.markRead(['n1', 'n2']);
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string).notificationIds).toEqual(['n1', 'n2']);
  });
});

// ─── commentsApi ─────────────────────────────────────────────────────────────

describe('commentsApi', () => {
  it('getByTask sends GET to /api/tasks/:taskId/comments', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await commentsApi.getByTask('t1');
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/api/tasks/t1/comments');
  });

  it('create sends POST to /api/tasks/:taskId/comments', async () => {
    fetchSpy.mockResolvedValue(makeResponse(201, {}));
    await commentsApi.create('t1', { content: 'Hello' });
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/tasks/t1/comments');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string).content).toBe('Hello');
  });
});

// ─── checkinsApi ─────────────────────────────────────────────────────────────

describe('checkinsApi', () => {
  it('getToday sends GET to /api/checkins/today', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, {}));
    await checkinsApi.getToday();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/api/checkins/today');
  });

  it('getAll with no params sends GET with no query string', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { checkins: [], total: 0 }));
    await checkinsApi.getAll();
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/api/checkins');
    expect(url).not.toContain('?');
  });

  it('getAll with params includes them in the query string', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, { checkins: [], total: 0 }));
    await checkinsApi.getAll({ startDate: '2026-01-01', limit: 10 });
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('startDate=2026-01-01');
    expect(url).toContain('limit=10');
  });
});

// ─── activityLogsApi ─────────────────────────────────────────────────────────

describe('activityLogsApi', () => {
  it('getByTask without limit has no query string', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await activityLogsApi.getByTask('t1');
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('/api/tasks/t1/activity');
    expect(url).not.toContain('?limit');
  });

  it('getByTask with limit appends ?limit=N', async () => {
    fetchSpy.mockResolvedValue(makeResponse(200, []));
    await activityLogsApi.getByTask('t1', 5);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain('?limit=5');
  });
});

// ─── webhooksApi ─────────────────────────────────────────────────────────────

describe('webhooksApi', () => {
  it('create sends POST with url and events', async () => {
    fetchSpy.mockResolvedValue(makeResponse(201, {}));
    await webhooksApi.create({ url: 'https://example.com/hook', events: ['task.created'] });
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.url).toBe('https://example.com/hook');
    expect(body.events).toContain('task.created');
  });

  it('delete sends DELETE to /api/webhooks/:id', async () => {
    fetchSpy.mockResolvedValue(makeResponse(204));
    await webhooksApi.delete('wh-1');
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/webhooks/wh-1');
    expect(opts.method).toBe('DELETE');
  });
});
