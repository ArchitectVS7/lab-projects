import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProgressOverview from '../ProgressOverview';
import { tasksApi, domainsApi } from '../../lib/api';
import type { Task, Domain } from '../../types';

vi.mock('../../lib/api', () => ({
  tasksApi: { getAll: vi.fn() },
  domainsApi: { getAll: vi.fn() },
}));

// Helper to build a minimal Task object
function makeTask(overrides: Partial<Task> & { id: string; status: Task['status'] }): Task {
  return {
    id: overrides.id,
    title: overrides.title ?? `Task ${overrides.id}`,
    description: null,
    status: overrides.status,
    priority: 'MEDIUM',
    dueDate: null,
    recurringTaskId: null,
    isRecurring: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: 'project-1',
    assigneeId: null,
    creatorId: 'user-1',
    project: { id: 'project-1', name: 'Test Project', color: '#3b82f6' },
    assignee: null,
    creator: { id: 'user-1', name: 'Test User' },
    domains: overrides.domains,
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('ProgressOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton while loading', () => {
    vi.mocked(tasksApi.getAll).mockReturnValue(new Promise(() => {}));
    vi.mocked(domainsApi.getAll).mockReturnValue(new Promise(() => {}));

    render(<ProgressOverview />, { wrapper: makeWrapper() });

    // The skeleton uses animate-pulse class
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });

  it('shows empty state when no tasks', async () => {
    vi.mocked(tasksApi.getAll).mockResolvedValue([]);
    vi.mocked(domainsApi.getAll).mockResolvedValue([]);

    render(<ProgressOverview />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Create tasks to see progress')).toBeInTheDocument();
  });

  it('shows correct overall percentage for 4 of 10 tasks done', async () => {
    const tasks: Task[] = [
      ...Array.from({ length: 4 }, (_, i) => makeTask({ id: `done-${i}`, status: 'DONE' })),
      ...Array.from({ length: 6 }, (_, i) => makeTask({ id: `todo-${i}`, status: 'TODO' })),
    ];
    vi.mocked(tasksApi.getAll).mockResolvedValue(tasks);
    vi.mocked(domainsApi.getAll).mockResolvedValue([]);

    render(<ProgressOverview />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  it('shows "X of Y tasks done" summary text', async () => {
    const tasks: Task[] = [
      ...Array.from({ length: 4 }, (_, i) => makeTask({ id: `done-${i}`, status: 'DONE' })),
      ...Array.from({ length: 6 }, (_, i) => makeTask({ id: `todo-${i}`, status: 'TODO' })),
    ];
    vi.mocked(tasksApi.getAll).mockResolvedValue(tasks);
    vi.mocked(domainsApi.getAll).mockResolvedValue([]);

    render(<ProgressOverview />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('4 of 10 tasks done')).toBeInTheDocument();
    });
  });

  it('shows per-domain progress bars with domain names', async () => {
    const domain: Domain = {
      id: 'domain-1',
      name: 'Coding',
      color: '#3b82f6',
      icon: '💻',
      userId: 'user-1',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    };

    const tasks: Task[] = [
      makeTask({
        id: 'task-1',
        status: 'DONE',
        domains: [{ taskId: 'task-1', domainId: 'domain-1', domain }],
      }),
      makeTask({
        id: 'task-2',
        status: 'TODO',
        domains: [{ taskId: 'task-2', domainId: 'domain-1', domain }],
      }),
    ];

    vi.mocked(tasksApi.getAll).mockResolvedValue(tasks);
    vi.mocked(domainsApi.getAll).mockResolvedValue([domain]);

    render(<ProgressOverview />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Coding')).toBeInTheDocument();
    });
    expect(screen.getByText('By Life Area')).toBeInTheDocument();
  });

  it('shows green progress arc when 100% complete', async () => {
    const tasks: Task[] = Array.from({ length: 5 }, (_, i) =>
      makeTask({ id: `done-${i}`, status: 'DONE' })
    );
    vi.mocked(tasksApi.getAll).mockResolvedValue(tasks);
    vi.mocked(domainsApi.getAll).mockResolvedValue([]);

    render(<ProgressOverview />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    // The progress arc circle should have data-complete="true" when 100%
    const progressArc = document.querySelector('circle[data-complete="true"]');
    expect(progressArc).not.toBeNull();
    expect(progressArc?.getAttribute('stroke')).toBe('#22c55e');
  });
});
