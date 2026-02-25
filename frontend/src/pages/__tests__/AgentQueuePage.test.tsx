import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgentQueuePage from '../AgentQueuePage';
import type { AgentDelegation } from '../../types';

// Mock the API module
vi.mock('../../lib/api', () => ({
  agentsApi: {
    getQueue: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock socket lib
vi.mock('../../lib/socket', () => ({
  getSocket: () => null,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Zap: ({ size }: { size?: number }) => <span data-testid="icon-zap" data-size={size}>⚡</span>,
  Trash2: () => <span data-testid="icon-trash">🗑</span>,
}));

import { agentsApi } from '../../lib/api';

const mockDelegations: AgentDelegation[] = [
  {
    id: 'del-1',
    taskId: 'task-1',
    userId: 'user-1',
    agentType: 'RESEARCH',
    status: 'QUEUED',
    instructions: null,
    result: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-02-20').toISOString(),
    task: { id: 'task-1', title: 'Research Competitors', projectId: 'proj-1' },
  },
  {
    id: 'del-2',
    taskId: 'task-2',
    userId: 'user-1',
    agentType: 'CODE',
    status: 'IN_PROGRESS',
    instructions: 'Fix the bug',
    result: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    createdAt: new Date('2026-02-21').toISOString(),
    task: { id: 'task-2', title: 'Fix Login Bug', projectId: 'proj-1' },
  },
  {
    id: 'del-3',
    taskId: 'task-3',
    userId: 'user-1',
    agentType: 'WRITING',
    status: 'COMPLETED',
    instructions: null,
    result: 'Draft completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date('2026-02-22').toISOString(),
    task: { id: 'task-3', title: 'Write Blog Post', projectId: 'proj-1' },
  },
];

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = makeQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AgentQueuePage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('AgentQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(agentsApi.getQueue).mockResolvedValue(mockDelegations);
    vi.mocked(agentsApi.remove).mockResolvedValue(undefined);
  });

  it('renders "Agent Queue" heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Agent Queue')).toBeInTheDocument();
    });
  });

  it('shows 6 agent type cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Writing')).toBeInTheDocument();
      expect(screen.getByText('Social Media')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Outreach')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  it('shows delegations in table with task titles', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Research Competitors')).toBeInTheDocument();
      expect(screen.getByText('Fix Login Bug')).toBeInTheDocument();
      expect(screen.getByText('Write Blog Post')).toBeInTheDocument();
    });
  });

  it('status badges render with correct text', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('QUEUED')).toBeInTheDocument();
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });

  it('calls agentsApi.remove when trash button clicked', async () => {
    // Make getQueue resolve immediately on refetch too
    vi.mocked(agentsApi.getQueue).mockResolvedValue(mockDelegations);
    vi.mocked(agentsApi.remove).mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Research Competitors')).toBeInTheDocument();
    });

    const trashButtons = screen.getAllByTitle('Remove delegation');
    expect(trashButtons.length).toBeGreaterThan(0);
    fireEvent.click(trashButtons[0]!);

    // Just verify remove was called (don't wait for full refetch cycle)
    await waitFor(() => {
      expect(agentsApi.remove).toHaveBeenCalled();
    });

    const firstCallArg = vi.mocked(agentsApi.remove).mock.calls[0]![0];
    expect(firstCallArg).toBe('del-1');
  });

  it('shows empty state when no delegations', async () => {
    vi.mocked(agentsApi.getQueue).mockResolvedValueOnce([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no delegations yet/i)).toBeInTheDocument();
    });
  });
});
