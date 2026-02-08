
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaskCard from '../TaskCard';
import type { Task } from '../../types';

// Mock performance animations hook
vi.mock('../../hooks/usePerformanceAnimations', () => ({
    usePerformanceAnimations: () => ({
        getTaskCardHover: () => ({
            whileHover: { scale: 1.02 },
            transition: { duration: 0.2 }
        })
    })
}));

const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO',
    priority: 'HIGH',
    project: { id: 'p1', name: 'Project 1', color: '#ff0000' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { dependsOn: 0, dependedOnBy: 0 }
};

describe('TaskCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders task title and priority', () => {
        render(
            <MemoryRouter>
                <TaskCard task={mockTask} />
            </MemoryRouter>
        );
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    it('renders project name', () => {
        render(
            <MemoryRouter>
                <TaskCard task={mockTask} />
            </MemoryRouter>
        );
        expect(screen.getByText('Project 1')).toBeInTheDocument();
    });

    it('shows edit button when canEdit is true', () => {
        const onEdit = vi.fn();
        render(
            <MemoryRouter>
                <TaskCard task={mockTask} canEdit={true} onEdit={onEdit} />
            </MemoryRouter>
        );

        // Find edit button by title "Edit"
        const editBtn = screen.getByTitle('Edit');
        fireEvent.click(editBtn);
        expect(onEdit).toHaveBeenCalledWith(mockTask);
    });

    it('does not show edit button when canEdit is false', () => {
        render(
            <MemoryRouter>
                <TaskCard task={mockTask} canEdit={false} />
            </MemoryRouter>
        );
        expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    it('displays dependencies indicators', () => {
        const blockedTask = {
            ...mockTask,
            _count: { dependsOn: 2, dependedOnBy: 0 }
        };
        render(
            <MemoryRouter>
                <TaskCard task={blockedTask} />
            </MemoryRouter>
        );
        expect(screen.getByText(/2 blockers/)).toBeInTheDocument();
    });

    it('displays recurring indicator', () => {
        const recurringTask = {
            ...mockTask,
            isRecurring: true
        };
        render(
            <MemoryRouter>
                <TaskCard task={recurringTask} showRecurrence={true} />
            </MemoryRouter>
        );
        expect(screen.getByText('Repeats')).toBeInTheDocument();
    });
});
