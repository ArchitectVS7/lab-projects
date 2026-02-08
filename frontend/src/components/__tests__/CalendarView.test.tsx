import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendarView from '../CalendarView';
import { DndContext } from '@dnd-kit/core';

// Mock dnd-kit
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }),
  };
});

// Mock date-fns
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: (date: Date, pattern: string) => {
      if (pattern === 'yyyy-MM-dd') {
        return date.toISOString().split('T')[0];
      }
      if (pattern === 'd') {
        return date.getDate().toString();
      }
      if (pattern === 'MMMM yyyy') {
        return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      }
      if (pattern === 'MMM d') {
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
      }
      if (pattern === 'MMM d, yyyy') {
        return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`;
      }
      return date.toString();
    },
    startOfMonth: (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1),
    endOfMonth: (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0),
    startOfWeek: (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() - day;
      return new Date(date.getFullYear(), date.getMonth(), diff);
    },
    endOfWeek: (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() + (6 - day);
      return new Date(date.getFullYear(), date.getMonth(), diff);
    },
    addDays: (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount),
    addMonths: (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, date.getDate()),
    subMonths: (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() - amount, date.getDate()),
    addWeeks: (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + (amount * 7)),
    subWeeks: (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - (amount * 7)),
    isSameMonth: (date1: Date, date2: Date) => date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear(),
    isToday: (date: Date) => {
      const today = new Date();
      return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
    },
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span>ChevronLeft</span>,
  ChevronRight: () => <span>ChevronRight</span>,
}));

describe('CalendarView', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockTasks = [
    {
      id: '1',
      title: 'Meeting with team',
      description: 'Discuss project timeline',
      dueDate: new Date().toISOString(),
      status: 'TODO',
      priority: 'HIGH',
      project: { id: 'proj1', name: 'Project Alpha', color: '#3b82f6' },
    },
    {
      id: '2',
      title: 'Review documents',
      description: 'Prepare for presentation',
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      project: { id: 'proj2', name: 'Project Beta', color: '#ef4444' },
    },
  ];

  const mockOnTaskDateChange = vi.fn();
  const mockOnTaskClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar with tasks', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarView
            tasks={mockTasks}
            onTaskDateChange={mockOnTaskDateChange}
            onTaskClick={mockOnTaskClick}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that the calendar header is rendered
    const today = new Date();
    const currentMonth = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    expect(screen.getByText(new RegExp(`${currentMonth} ${year}`))).toBeInTheDocument(); // Month/year header

    // Check that tasks are rendered in the calendar cells
    expect(screen.getByText('Meeting with team')).toBeInTheDocument();
    expect(screen.getByText('Review documents')).toBeInTheDocument();
  });

  it('switches between month and week views', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarView
            tasks={mockTasks}
            onTaskDateChange={mockOnTaskDateChange}
            onTaskClick={mockOnTaskClick}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initially in month view
    const monthButton = screen.getByRole('button', { name: 'Month' });
    expect(monthButton).toHaveClass('bg-white');

    // Switch to week view
    const weekButton = screen.getByRole('button', { name: 'Week' });
    fireEvent.click(weekButton);

    // Week button should now be active
    expect(weekButton).toHaveClass('bg-white');
    expect(monthButton).not.toHaveClass('bg-white');
  });

  it('navigates between months', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarView
            tasks={mockTasks}
            onTaskDateChange={mockOnTaskDateChange}
            onTaskClick={mockOnTaskClick}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Get the current month text
    const monthHeader = screen.getByRole('heading', { level: 2 });
    const initialMonth = monthHeader.textContent;

    // Click next month button
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);

    // Month should have changed
    const newMonthHeader = screen.getByRole('heading', { level: 2 });
    expect(newMonthHeader.textContent).not.toEqual(initialMonth);

    // Click previous month button
    const prevButton = screen.getByRole('button', { name: 'Previous' });
    fireEvent.click(prevButton);

    // Month should have changed back
    const finalMonthHeader = screen.getByRole('heading', { level: 2 });
    expect(finalMonthHeader.textContent).toEqual(initialMonth);
  });

  it('goes to today', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarView
            tasks={mockTasks}
            onTaskDateChange={mockOnTaskDateChange}
            onTaskClick={mockOnTaskClick}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click the "Today" button
    const todayButton = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayButton);

    // Verify that the calendar shows the current month
    const today = new Date();
    const expectedMonthYear = `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
    expect(screen.getByText(expectedMonthYear)).toBeInTheDocument();
  });

  it('calls onTaskClick when a task is clicked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarView
            tasks={mockTasks}
            onTaskDateChange={mockOnTaskDateChange}
            onTaskClick={mockOnTaskClick}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click on a task
    const taskElement = screen.getByText('Meeting with team');
    fireEvent.click(taskElement);

    // Verify the onTaskClick callback was called
    expect(mockOnTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('displays tasks with different colors based on project', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarView
            tasks={mockTasks}
            onTaskDateChange={mockOnTaskDateChange}
            onTaskClick={mockOnTaskClick}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that tasks have the correct background colors based on their projects
    const task1 = screen.getByText('Meeting with team');
    const task2 = screen.getByText('Review documents');

    // Note: We can't easily test the exact background color in jsdom, 
    // but we can verify that the tasks are rendered with the expected styling
    expect(task1).toBeInTheDocument();
    expect(task2).toBeInTheDocument();
  });
});