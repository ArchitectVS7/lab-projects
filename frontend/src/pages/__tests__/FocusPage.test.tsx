import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FocusPage from '../FocusPage';
import { tasksApi } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  tasksApi: {
    getAll: vi.fn(),
  },
}));

// Mock hooks
vi.mock('../../hooks/usePerformanceAnimations', () => ({
  usePerformanceAnimations: () => ({
    performanceMode: 'default',
    getTaskCardHover: () => ({}),
  }),
}));

// Mock TaskCompletionCelebration
vi.mock('../../components/TaskCompletionCelebration', () => ({
  default: () => <div data-testid="celebration" />,
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  Clock: () => <span data-testid="icon-clock" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  Flame: () => <span data-testid="icon-flame" />,
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => (
        <div data-motion {...props}>
          {children}
        </div>
      ),
      button: ({ children, whileHover, whileTap, ...props }: any) => (
        <button data-motion {...props}>
          {children}
        </button>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});


// Mock TaskCard
vi.mock('../../components/TaskCard', () => {
  return {
    __esModule: true,
    default: ({ task, onEdit }: any) => (
      <div data-testid="task-card">
        <span>{task.title}</span>
        <button onClick={() => onEdit && onEdit(task)}>Edit</button>
      </div>
    ),
  };
});

describe('FocusPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top 3 tasks', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'TODO',
        priority: 'HIGH',
        project: { id: 'proj1', name: 'Project 1', color: '#ff0000' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        dueDate: '2023-01-10',
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        project: { id: 'proj1', name: 'Project 1', color: '#ff0000' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        dueDate: '2023-01-15',
      },
      {
        id: '3',
        title: 'Task 3',
        description: 'Description 3',
        status: 'TODO',
        priority: 'MEDIUM',
        project: { id: 'proj2', name: 'Project 2', color: '#00ff00' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        dueDate: '2023-01-20',
      },
      {
        id: '4',
        title: 'Task 4',
        description: 'Description 4',
        status: 'TODO',
        priority: 'LOW',
        project: { id: 'proj2', name: 'Project 2', color: '#00ff00' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        dueDate: '2023-01-25',
      },
    ];

    (tasksApi.getAll as vi.MockedFunction<any>).mockResolvedValue(mockTasks);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FocusPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for the tasks to load
    await waitFor(() => {
      expect(screen.getAllByTestId('task-card')).toHaveLength(3);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    // Verify that only the top 3 tasks are displayed
    expect(screen.queryByText('Task 4')).not.toBeInTheDocument();
  });

  it('shows completion counter', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Completed Task',
        description: 'Description 1',
        status: 'DONE',
        priority: 'HIGH',
        project: { id: 'proj1', name: 'Project 1', color: '#ff0000' },
        createdAt: '2023-01-01',
        updatedAt: new Date().toISOString(), // Today's date
        dueDate: '2023-01-10',
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'TODO',
        priority: 'URGENT',
        project: { id: 'proj1', name: 'Project 1', color: '#ff0000' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        dueDate: '2023-01-15',
      },
    ];

    (tasksApi.getAll as vi.MockedFunction<any>).mockResolvedValue(mockTasks);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FocusPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for the page to load
    await waitFor(() => {
      const completedCounts = screen.getAllByText(/completed today/);
      expect(completedCounts.length).toBeGreaterThan(0);
    });
  });

  it('handles empty state', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Completed Task',
        description: 'Description 1',
        status: 'DONE',
        priority: 'HIGH',
        project: { id: 'proj1', name: 'Project 1', color: '#ff0000' },
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01', // Not today
        dueDate: '2023-01-10',
      },
    ];

    (tasksApi.getAll as vi.MockedFunction<any>).mockResolvedValue(mockTasks);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FocusPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for the page to load
    await waitFor(() => {
      const emptyStateTexts = screen.getAllByText(/All clear for now/);
      expect(emptyStateTexts.length).toBeGreaterThan(0);
    });
  });
});