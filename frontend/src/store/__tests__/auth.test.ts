import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth';

describe('Auth Store', () => {
  beforeEach(() => {
    // Clear localStorage and reset store state between tests
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null });
  });

  it('initializes with null user and null token', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('setUser updates the user in state', () => {
    const mockUser = {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.getState().setUser(mockUser as any);
    expect(useAuthStore.getState().user?.email).toBe('alice@example.com');
  });

  it('setToken updates token in memory but does NOT persist it to localStorage', () => {
    useAuthStore.getState().setToken('super-secret-jwt');

    // Token must be available in memory for in-session Bearer fallback
    expect(useAuthStore.getState().token).toBe('super-secret-jwt');

    // But the persisted localStorage value must NOT contain the token
    const raw = localStorage.getItem('auth-storage');
    if (raw !== null) {
      const parsed = JSON.parse(raw) as { state?: { token?: unknown } };
      expect(parsed?.state?.token).toBeUndefined();
    }
    // If localStorage key does not exist at all, the test still passes — the
    // token is definitely not stored.
  });

  it('clearUser resets both user and token', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.getState().setUser({ id: 'u1', email: 'x@x.com', name: 'X' } as any);
    useAuthStore.getState().setToken('tok');

    useAuthStore.getState().clearUser();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('only persists user (not token) to localStorage after login-like sequence', () => {
    const mockUser = {
      id: 'user-2',
      email: 'bob@example.com',
      name: 'Bob',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };

    // Simulate what a login handler would do
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.getState().setUser(mockUser as any);
    useAuthStore.getState().setToken('eyJhbGciOiJIUzI1NiJ9.payload.signature');

    const raw = localStorage.getItem('auth-storage');
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!) as { state?: Record<string, unknown> };
    // User profile should be persisted
    expect(parsed?.state?.user).toBeDefined();
    // Token must NOT appear in the persisted state
    expect(parsed?.state?.token).toBeUndefined();
  });
});
