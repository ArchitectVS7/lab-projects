
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KanbanColumn from '../KanbanColumn';
import type { Task, TaskStatus } from '../../types';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
    useDroppable: ({ id }: { id: string }) => ({
        setNodeRef: vi.fn(),
        isOver: id === 'IN_PROGRESS', // Mock hover state for one column
    }),
}));

const mockTasks: Task[] = [
    { id: '1', title: 'Task 1', status: 'TODO', priority: 'LOW', project: { id: 'p1', name: 'P1', color: '#000' }, createdAt: '', updatedAt: '', _count: { dependsOn: 0, dependedOnBy: 0 } },
    { id: '2', title: 'Task 2', status: 'TODO', priority: 'HIGH', project: { id: 'p1', name: 'P1', color: '#000' }, createdAt: '', updatedAt: '', _count: { dependsOn: 0, dependedOnBy: 0 } },
];

describe('KanbanColumn', () => {
    it('renders column title and task count', () => {
        render(
            <KanbanColumn status="TODO" tasks={mockTasks}>
                <div>Task Cards</div>
            </KanbanColumn>
        );
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders children', () => {
        render(
            <KanbanColumn status="TODO" tasks={mockTasks}>
                <div data-testid="child">Task Cards</div>
            </KanbanColumn>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('applies hover styles when isOver is true (mocked for IN_PROGRESS)', () => {
        const { container } = render(
            <KanbanColumn status="IN_PROGRESS" tasks={[]}>
                <div>Empty</div>
            </KanbanColumn>
        );
        // basic check for call success, style check might depend on implementation details of class merging
        // expecting ring-2 class
        expect(container.firstChild).toHaveClass('ring-2');
    });

    it('applies default styles when isOver is false', () => {
        const { container } = render(
            <KanbanColumn status="TODO" tasks={[]}>
                <div>Empty</div>
            </KanbanColumn>
        );
        expect(container.firstChild).not.toHaveClass('ring-2');
    });
});
