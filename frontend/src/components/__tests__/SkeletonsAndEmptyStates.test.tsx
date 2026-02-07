import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  DashboardSkeleton,
  TableSkeleton,
  KanbanSkeleton,
  ProjectCardSkeleton
} from '../Skeletons';
import {
  EmptyTasksState,
  EmptyProjectsState,
  EmptyCalendarState,
  EmptyTimeEntriesState
} from '../EmptyStates';

describe('Skeleton Components', () => {
  it('renders DashboardSkeleton', () => {
    render(
      <MemoryRouter>
        <DashboardSkeleton />
      </MemoryRouter>
    );

    // Check that skeleton elements are present
    const skeletonDivs = screen.getAllByRole('generic'); // All divs in the skeleton
    expect(skeletonDivs.length).toBeGreaterThan(0);

    // Check for specific skeleton elements
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders TableSkeleton', () => {
    render(
      <MemoryRouter>
        <TableSkeleton />
      </MemoryRouter>
    );

    // Check for skeleton rows
    const skeletonRows = document.querySelectorAll('.animate-pulse');
    expect(skeletonRows.length).toBeGreaterThan(0);
  });

  it('renders KanbanSkeleton', () => {
    render(
      <MemoryRouter>
        <KanbanSkeleton />
      </MemoryRouter>
    );

    // Check for kanban column structure
    const columns = document.querySelectorAll('.min-w-\\[260px\\]'); // Escaped selector for min-w-[260px]
    expect(columns.length).toBe(4); // Should have 4 columns

    // Check for skeleton cards
    const skeletonCards = document.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('renders ProjectCardSkeleton', () => {
    render(
      <MemoryRouter>
        <ProjectCardSkeleton />
      </MemoryRouter>
    );

    // Check for project card structure
    const cardGrid = document.querySelector('.grid-cols-1'); // Targets the grid container
    expect(cardGrid).toBeInTheDocument();
    expect(cardGrid).toHaveClass('lg:grid-cols-3');

    // Check for skeleton cards
    const skeletonCards = document.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });
});

describe('Empty State Components', () => {
  it('renders EmptyTasksState with create task button', () => {
    const mockOnCreateTask = () => { };
    render(
      <MemoryRouter>
        <EmptyTasksState onCreateTask={mockOnCreateTask} />
      </MemoryRouter>
    );

    // Check for the empty state message
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first task to get started')).toBeInTheDocument();

    // Check for the create task button
    const createTaskButton = screen.getByRole('button', { name: 'Create Task' });
    expect(createTaskButton).toBeInTheDocument();
  });

  it('renders EmptyTasksState without create task button', () => {
    render(
      <MemoryRouter>
        <EmptyTasksState />
      </MemoryRouter>
    );

    // Check for the empty state message
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first task to get started')).toBeInTheDocument();

    // Button should not be present when onCreateTask is not provided
    expect(screen.queryByRole('button', { name: 'Create Task' })).not.toBeInTheDocument();
  });

  it('renders EmptyProjectsState with create project button', () => {
    const mockOnCreateProject = () => { };
    render(
      <MemoryRouter>
        <EmptyProjectsState onCreateProject={mockOnCreateProject} />
      </MemoryRouter>
    );

    // Check for the empty state message
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create a project to organize your work')).toBeInTheDocument();

    // Check for the create project button
    const createProjectButton = screen.getByRole('button', { name: 'Create Project' });
    expect(createProjectButton).toBeInTheDocument();
  });

  it('renders EmptyCalendarState', () => {
    render(
      <MemoryRouter>
        <EmptyCalendarState />
      </MemoryRouter>
    );

    // Check for the empty state message
    expect(screen.getByText('No tasks with due dates')).toBeInTheDocument();
    expect(screen.getByText('Add due dates to your tasks to see them on the calendar')).toBeInTheDocument();
  });

  it('renders EmptyTimeEntriesState with start timer button', () => {
    const mockOnStartTimer = () => { };
    render(
      <MemoryRouter>
        <EmptyTimeEntriesState onStartTimer={mockOnStartTimer} />
      </MemoryRouter>
    );

    // Check for the empty state message
    expect(screen.getByText('No time tracked yet')).toBeInTheDocument();
    expect(screen.getByText('Start a timer or add a manual entry')).toBeInTheDocument();

    // Check for the start timer button
    const startTimerButton = screen.getByRole('button', { name: 'Start Timer' });
    expect(startTimerButton).toBeInTheDocument();
  });

  it('renders EmptyTimeEntriesState without start timer button', () => {
    render(
      <MemoryRouter>
        <EmptyTimeEntriesState />
      </MemoryRouter>
    );

    // Check for the empty state message
    expect(screen.getByText('No time tracked yet')).toBeInTheDocument();
    expect(screen.getByText('Start a timer or add a manual entry')).toBeInTheDocument();

    // Button should not be present when onStartTimer is not provided
    expect(screen.queryByRole('button', { name: 'Start Timer' })).not.toBeInTheDocument();
  });

  it('calls onCreateTask when create task button is clicked', () => {
    const mockOnCreateTask = vi.fn();
    render(
      <MemoryRouter>
        <EmptyTasksState onCreateTask={mockOnCreateTask} />
      </MemoryRouter>
    );

    // Click the create task button
    const createTaskButton = screen.getByRole('button', { name: 'Create Task' });
    createTaskButton.click();

    // Verify the callback was called
    expect(mockOnCreateTask).toHaveBeenCalledTimes(1);
  });

  it('calls onCreateProject when create project button is clicked', () => {
    const mockOnCreateProject = vi.fn();
    render(
      <MemoryRouter>
        <EmptyProjectsState onCreateProject={mockOnCreateProject} />
      </MemoryRouter>
    );

    // Click the create project button
    const createProjectButton = screen.getByRole('button', { name: 'Create Project' });
    createProjectButton.click();

    // Verify the callback was called
    expect(mockOnCreateProject).toHaveBeenCalledTimes(1);
  });

  it('calls onStartTimer when start timer button is clicked', () => {
    const mockOnStartTimer = vi.fn();
    render(
      <MemoryRouter>
        <EmptyTimeEntriesState onStartTimer={mockOnStartTimer} />
      </MemoryRouter>
    );

    // Click the start timer button
    const startTimerButton = screen.getByRole('button', { name: 'Start Timer' });
    startTimerButton.click();

    // Verify the callback was called
    expect(mockOnStartTimer).toHaveBeenCalledTimes(1);
  });
});