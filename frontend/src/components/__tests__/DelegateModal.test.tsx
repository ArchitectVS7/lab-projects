import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DelegateModal from '../DelegateModal';

// Mock the API module
vi.mock('../../lib/api', () => ({
  agentsApi: {
    delegate: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
}));

import { agentsApi } from '../../lib/api';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderModal(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  const queryClient = makeQueryClient();
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <DelegateModal
          taskId="task-123"
          taskTitle="Fix the login bug"
          isOpen={props.isOpen ?? true}
          onClose={onClose}
        />
      </QueryClientProvider>
    ),
  };
}

describe('DelegateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 6 agent cards with icon and name', () => {
    renderModal();

    // Agent names
    expect(screen.getByText('Research')).toBeInTheDocument();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Outreach')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();

    // Agent icons (emoji)
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('✍️')).toBeInTheDocument();
    expect(screen.getByText('📱')).toBeInTheDocument();
    expect(screen.getByText('💻')).toBeInTheDocument();
    expect(screen.getByText('📧')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('delegate button is disabled when no agent selected', () => {
    renderModal();
    const btn = screen.getByRole('button', { name: /select an agent/i });
    expect(btn).toBeDisabled();
  });

  it('delegate button is enabled after selecting an agent', () => {
    renderModal();

    // Click the Research agent card
    fireEvent.click(screen.getByText('Research'));

    const btn = screen.getByRole('button', { name: /delegate to research/i });
    expect(btn).not.toBeDisabled();
  });

  it('selecting an agent updates button label', () => {
    renderModal();

    fireEvent.click(screen.getByText('Code'));
    expect(screen.getByRole('button', { name: /delegate to code/i })).toBeInTheDocument();
  });

  it('submits with correct data on click', async () => {
    vi.mocked(agentsApi.delegate).mockResolvedValueOnce({
      id: 'del-1',
      taskId: 'task-123',
      userId: 'user-1',
      agentType: 'RESEARCH',
      status: 'QUEUED',
      instructions: null,
      result: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    });

    renderModal();

    fireEvent.click(screen.getByText('Research'));
    fireEvent.click(screen.getByRole('button', { name: /delegate to research/i }));

    await waitFor(() => {
      expect(agentsApi.delegate).toHaveBeenCalled();
    });

    // Check first argument of first call
    const firstCallArg = vi.mocked(agentsApi.delegate).mock.calls[0]![0];
    expect(firstCallArg).toEqual({
      taskId: 'task-123',
      agentType: 'RESEARCH',
    });
  });

  it('submits with instructions when provided', async () => {
    vi.mocked(agentsApi.delegate).mockResolvedValueOnce({
      id: 'del-2',
      taskId: 'task-123',
      userId: 'user-1',
      agentType: 'CODE',
      status: 'QUEUED',
      instructions: 'Review the PR',
      result: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    });

    renderModal();

    fireEvent.click(screen.getByText('Code'));
    const textarea = screen.getByPlaceholderText(/provide any specific guidance/i);
    fireEvent.change(textarea, { target: { value: 'Review the PR' } });
    fireEvent.click(screen.getByRole('button', { name: /delegate to code/i }));

    await waitFor(() => {
      expect(agentsApi.delegate).toHaveBeenCalled();
    });

    // Check first argument of first call
    const firstCallArg = vi.mocked(agentsApi.delegate).mock.calls[0]![0];
    expect(firstCallArg).toEqual({
      taskId: 'task-123',
      agentType: 'CODE',
      instructions: 'Review the PR',
    });
  });

  it('calls onClose when X button is clicked', () => {
    const { onClose } = renderModal();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Delegate Task')).not.toBeInTheDocument();
  });
});
