import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { Task, Project, TaskStatus } from '../types';
import { STATUSES, canEditTask } from '../lib/taskConstants';
import TaskCard from './TaskCard';
import KanbanColumn from './KanbanColumn';

function DraggableTaskCard({ task, onEdit, canEdit }: { task: Task; onEdit: (task: Task) => void; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(isDragging && 'opacity-50 z-50')}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        canEdit={canEdit}
        isDraggable={true}
        showStatus={false}
      />
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="w-[280px] opacity-90 rotate-3 cursor-grabbing shadow-2xl">
      <TaskCard
        task={task}
        showStatus={false}
        isDraggable={true}
      />
    </div>
  );
}

export function TaskKanbanView({
  tasks,
  projects,
  currentUserId,
  onEdit,
  onBulkStatus,
}: {
  tasks: Task[];
  projects: Project[];
  currentUserId: string;
  onEdit: (task: Task) => void;
  onBulkStatus: (taskIds: string[], status: TaskStatus) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const draggedTask = tasks.find((t) => t.id === event.active.id);
    setActiveTask(draggedTask || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (task && STATUSES.includes(newStatus as TaskStatus) && newStatus !== task.status) {
      onBulkStatus([taskId], newStatus as TaskStatus);
    }
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <KanbanColumn key={status} status={status} tasks={columnTasks}>
              {columnTasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  canEdit={canEditTask(task, currentUserId, projects)}
                />
              ))}
              {columnTasks.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No tasks</p>
              )}
            </KanbanColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
