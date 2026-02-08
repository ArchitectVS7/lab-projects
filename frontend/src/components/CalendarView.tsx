import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import clsx from 'clsx';
import type { Task } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  onTaskDateChange: (taskId: string, newDate: string) => void;
  onTaskClick?: (task: Task) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Droppable Calendar Cell ---
function CalendarCell({
  date,
  currentMonth,
  tasks,
  onTaskClick,
  viewMode,
}: {
  date: Date;
  currentMonth: Date;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  viewMode: 'month' | 'week';
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const sameMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'border border-gray-200 dark:border-gray-700 p-1',
        viewMode === 'month' ? 'min-h-[90px]' : 'min-h-[140px]',
        isOver && 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-300 dark:ring-indigo-600',
        today && 'bg-indigo-50/50 dark:bg-indigo-900/20',
        !sameMonth && 'opacity-40'
      )}
    >
      <div className={clsx(
        'text-xs font-medium mb-1',
        today ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500 dark:text-gray-400'
      )}>
        {format(date, 'd')}
      </div>
      <div className="space-y-0.5 overflow-hidden">
        {tasks.slice(0, viewMode === 'month' ? 3 : 6).map((task) => (
          <DraggableTaskChip key={task.id} task={task} onTaskClick={onTaskClick} />
        ))}
        {tasks.length > (viewMode === 'month' ? 3 : 6) && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">
            +{tasks.length - (viewMode === 'month' ? 3 : 6)} more
          </p>
        )}
      </div>
    </div>
  );
}

// --- Draggable Task Chip ---
function DraggableTaskChip({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick?: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const mergedStyle = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    backgroundColor: task.project?.color || '#6366f1',
  };

  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onTaskClick?.(task);
      }}
      className={clsx(
        'text-[10px] px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing text-white font-medium',
        isDragging && 'opacity-50 shadow-lg'
      )}
      title={task.title}
    >
      {task.title}
    </div>
  );
}

// --- Task Chip Overlay (shown while dragging) ---
function TaskChipOverlay({ task }: { task: Task }) {
  return (
    <div
      className="text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium opacity-90 shadow-xl max-w-[160px]"
      style={{ backgroundColor: task.project?.color || '#6366f1' }}
    >
      {task.title}
    </div>
  );
}

// --- Main Calendar View ---
export default function CalendarView({ tasks, onTaskDateChange, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Build task map by date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const dateKey = task.dueDate.split('T')[0];
      const existing = map.get(dateKey);
      if (existing) {
        existing.push(task);
      } else {
        map.set(dateKey, [task]);
      }
    }
    return map;
  }, [tasks]);

  // Calculate visible dates
  const dates = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calStart = startOfWeek(monthStart);
      const calEnd = endOfWeek(monthEnd);
      const days: Date[] = [];
      let day = calStart;
      while (day <= calEnd) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    } else {
      const weekStart = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    setCurrentDate((d) => (viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1)));
  };

  const handleNext = () => {
    setCurrentDate((d) => (viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setDraggedTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newDate = over.id as string;
    // Validate it looks like a date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const currentDate = task.dueDate?.split('T')[0];
      if (currentDate !== newDate) {
        onTaskDateChange(taskId, new Date(newDate + 'T12:00:00').toISOString());
      }
    }
  };

  const headerText =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`;

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous"
            onClick={handlePrev}
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[200px] text-center">
            {headerText}
          </h2>
          <button
            aria-label="Next"
            onClick={handleNext}
            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={handleToday}
            className="ml-2 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
          >
            Today
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('month')}
            className={clsx(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              viewMode === 'month'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={clsx(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              viewMode === 'week'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Date Cells */}
          <div className="grid grid-cols-7">
            {dates.map((date) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const dayTasks = tasksByDate.get(dateKey) || [];
              return (
                <CalendarCell
                  key={dateKey}
                  date={date}
                  currentMonth={currentDate}
                  tasks={dayTasks}
                  onTaskClick={onTaskClick}
                  viewMode={viewMode}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {draggedTask ? <TaskChipOverlay task={draggedTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
