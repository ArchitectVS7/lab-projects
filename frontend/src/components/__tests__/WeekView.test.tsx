import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeekView from '../WeekView';
import type { Task } from '../../types';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left">ChevronLeft</span>,
  ChevronRight: () => <span data-testid="chevron-right">ChevronRight</span>,
}));

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: Math.random().toString(),
    title: 'Test Task',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    recurringTaskId: null,
    isRecurring: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: 'p1',
    assigneeId: null,
    creatorId: 'u1',
    project: { id: 'p1', name: 'Test', color: '#6366f1' },
    assignee: null,
    creator: { id: 'u1', name: 'Test User' },
    ...overrides,
  };
}

// Get today's date as an ISO string in local noon time to avoid timezone boundary issues
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T12:00:00.000Z`;

describe('WeekView', () => {
  it('renders 7 day columns', () => {
    render(<WeekView tasks={[]} />);

    // DAY_NAMES: Sun Mon Tue Wed Thu Fri Sat — all 7 should appear
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("highlights today's column with accent border class", () => {
    const { container } = render(<WeekView tasks={[]} />);

    // The today column has a specific border class
    const todayColumn = container.querySelector('.border-\\[var\\(--primary-base\\)\\]');
    expect(todayColumn).not.toBeNull();
  });

  it('shows task on the correct day', () => {
    const task = makeTask({ title: 'My Due Task', dueDate: todayStr });
    render(<WeekView tasks={[task]} />);

    expect(screen.getByText('My Due Task')).toBeInTheDocument();
  });

  it('applies line-through class to DONE tasks', () => {
    const task = makeTask({ title: 'Done Task', dueDate: todayStr, status: 'DONE' });
    render(<WeekView tasks={[task]} />);

    const taskEl = screen.getByText('Done Task');
    expect(taskEl).toHaveClass('line-through');
  });

  it('shows "Back to today" button when navigating to prev week', () => {
    render(<WeekView tasks={[]} />);

    // "Back to today" should not be visible initially (offset is 0)
    expect(screen.queryByText('Back to today')).not.toBeInTheDocument();

    // Click the previous week button
    const prevButton = screen.getByLabelText('Previous week');
    fireEvent.click(prevButton);

    // Now "Back to today" should appear
    expect(screen.getByText('Back to today')).toBeInTheDocument();
  });

  it('shows correct count in the summary bar', () => {
    // Create 3 tasks for this week (today's date)
    const task1 = makeTask({ id: 'a', title: 'Task A', dueDate: todayStr });
    const task2 = makeTask({ id: 'b', title: 'Task B', dueDate: todayStr });
    const task3 = makeTask({ id: 'c', title: 'Task C', dueDate: todayStr });

    render(<WeekView tasks={[task1, task2, task3]} />);

    expect(screen.getByText(/3 due this week/)).toBeInTheDocument();
  });

  it('calls onTaskClick when a task is clicked', () => {
    const mockClick = vi.fn();
    const task = makeTask({ title: 'Clickable Task', dueDate: todayStr });
    render(<WeekView tasks={[task]} onTaskClick={mockClick} />);

    const taskEl = screen.getByText('Clickable Task');
    fireEvent.click(taskEl.closest('div')!);

    expect(mockClick).toHaveBeenCalledWith(task);
  });
});
