import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task } from '../types';

interface WeekViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#6b7280',
};

function getWeekDays(offset: number): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + offset * 7);
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function getTasksForDay(day: Date, tasks: Task[]): Task[] {
  return tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return (
      due.getFullYear() === day.getFullYear() &&
      due.getMonth() === day.getMonth() &&
      due.getDate() === day.getDate()
    );
  });
}

function isToday(day: Date): boolean {
  const today = new Date();
  return (
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth() &&
    day.getDate() === today.getDate()
  );
}

export default function WeekView({ tasks, onTaskClick }: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = getWeekDays(weekOffset);

  const weekStart = weekDays[0];
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const weekTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= weekStart && due <= weekEnd;
  });

  const completedThisWeek = weekTasks.filter((t) => t.status === 'DONE').length;
  const addedThisWeek = weekTasks.length;
  const delegatedThisWeek = weekTasks.filter(
    (t) => t.agentDelegations && t.agentDelegations.length > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Header: navigation + week range */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {weekDays[6].toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-[var(--primary-base)] hover:underline"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2">
        <span>📋 {addedThisWeek} due this week</span>
        <span>✅ {completedThisWeek} completed</span>
        {delegatedThisWeek > 0 && <span>⚡ {delegatedThisWeek} delegated</span>}
      </div>

      {/* 7-column grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const dayTasks = getTasksForDay(day, tasks);
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`rounded-lg border p-2 min-h-[120px] ${
                today
                  ? 'border-[var(--primary-base)] bg-[var(--primary-light)]/10 dark:bg-[var(--primary-dark)]/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Day header */}
              <div
                className={`text-xs font-medium mb-2 ${
                  today
                    ? 'text-[var(--primary-base)]'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <div>{DAY_NAMES[i]}</div>
                <div
                  className={`text-sm font-bold ${
                    today
                      ? 'text-[var(--primary-base)]'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-1 text-xs p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    title={task.title}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          task.domains?.[0]?.domain.color ??
                          PRIORITY_COLORS[task.priority] ??
                          '#6b7280',
                      }}
                    />
                    <span
                      className={`truncate ${
                        task.status === 'DONE'
                          ? 'line-through text-gray-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
