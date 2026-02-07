import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Timer, Trash2, Plus } from 'lucide-react';
import { timeEntriesApi } from '../lib/api';
import { useTimerStore } from '../store/timer';
import { useToastStore } from '../store/toast';
import clsx from 'clsx';
import type { TimeEntry } from '../types';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function TaskTimePanel({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { activeEntry, setActiveEntry, clearActiveEntry, startPomodoro } = useTimerStore();
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ date: '', startTime: '', endTime: '', description: '' });

  const isTimerForThisTask = activeEntry?.taskId === taskId;

  const { data: entries = [] } = useQuery({
    queryKey: ['time-entries', { taskId }],
    queryFn: () => timeEntriesApi.getAll({ taskId }),
  });

  const startMutation = useMutation({
    mutationFn: timeEntriesApi.start,
    onSuccess: (entry) => {
      setActiveEntry(entry);
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      addToast('Timer started', 'success');
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => timeEntriesApi.stop(id),
    onSuccess: () => {
      clearActiveEntry();
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      addToast('Timer stopped', 'success');
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  });

  const createMutation = useMutation({
    mutationFn: timeEntriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      setShowManualForm(false);
      setManualForm({ date: '', startTime: '', endTime: '', description: '' });
      addToast('Time entry added', 'success');
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: timeEntriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      addToast('Time entry deleted', 'success');
    },
    onError: (err: Error) => addToast(err.message, 'error'),
  });

  const handleStartTimer = () => {
    startMutation.mutate({ taskId });
  };

  const handleStartPomodoro = () => {
    startMutation.mutate({ taskId, description: 'Pomodoro session' }, {
      onSuccess: (entry) => {
        setActiveEntry(entry);
        startPomodoro();
      },
    });
  };

  const handleStopTimer = () => {
    if (activeEntry) stopMutation.mutate(activeEntry.id);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = new Date(`${manualForm.date}T${manualForm.startTime}`).toISOString();
    const endTime = new Date(`${manualForm.date}T${manualForm.endTime}`).toISOString();
    createMutation.mutate({
      taskId,
      startTime,
      endTime,
      description: manualForm.description || undefined,
    });
  };

  const totalSeconds = entries
    .filter((e: TimeEntry) => e.duration)
    .reduce((sum: number, e: TimeEntry) => sum + (e.duration || 0), 0);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Time Tracking</h3>
        {totalSeconds > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Total: {formatDuration(totalSeconds)}
          </span>
        )}
      </div>

      {/* Timer Controls */}
      <div className="flex gap-2 mb-3">
        {isTimerForThisTask ? (
          <button
            onClick={handleStopTimer}
            disabled={stopMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md disabled:opacity-50"
          >
            <Square size={12} fill="currentColor" />
            Stop Timer
          </button>
        ) : (
          <>
            <button
              onClick={handleStartTimer}
              disabled={startMutation.isPending || !!activeEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-md disabled:opacity-50"
              title={activeEntry ? 'Stop current timer first' : undefined}
            >
              <Play size={12} fill="currentColor" />
              Start Timer
            </button>
            <button
              onClick={handleStartPomodoro}
              disabled={startMutation.isPending || !!activeEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md disabled:opacity-50"
              title={activeEntry ? 'Stop current timer first' : undefined}
            >
              <Timer size={12} />
              Pomodoro
            </button>
          </>
        )}
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md ml-auto"
        >
          <Plus size={12} />
          Manual
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManualForm && (
        <form onSubmit={handleManualSubmit} className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Date</label>
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Start</label>
              <input
                type="time"
                required
                value={manualForm.startTime}
                onChange={(e) => setManualForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">End</label>
              <input
                type="time"
                required
                value={manualForm.endTime}
                onChange={(e) => setManualForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            maxLength={500}
            value={manualForm.description}
            onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-3 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Entry History */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {entries.map((entry: TimeEntry) => (
            <div
              key={entry.id}
              className={clsx(
                'flex items-center justify-between px-2 py-1.5 rounded text-xs',
                'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {entry.duration ? formatDuration(entry.duration) : 'Running...'}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">
                    {new Date(entry.startTime).toLocaleDateString()}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-gray-500 dark:text-gray-400 truncate">{entry.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(entry.id)}
                disabled={deleteMutation.isPending}
                className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                title="Delete entry"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
