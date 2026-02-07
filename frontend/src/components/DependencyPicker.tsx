import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, X, AlertCircle, ChevronDown } from 'lucide-react';
import { dependenciesApi, tasksApi } from '../lib/api';
import type { Task, TaskStatus } from '../types';

const statusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export default function DependencyPicker({ task, projectId }: { task: Task; projectId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: deps } = useQuery({
    queryKey: ['dependencies', task.id],
    queryFn: () => dependenciesApi.list(task.id),
  });

  const { data: projectTasks } = useQuery({
    queryKey: ['tasks', { projectId }],
    queryFn: () => tasksApi.getAll({ projectId }),
    enabled: showAdd,
  });

  const addMutation = useMutation({
    mutationFn: (dependsOnId: string) => dependenciesApi.add(task.id, dependsOnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies', task.id] });
      setShowAdd(false);
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (depId: string) => dependenciesApi.remove(task.id, depId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependencies', task.id] });
    },
  });

  // Filter out self, already-added deps
  const existingDepIds = new Set(deps?.dependsOn.map((d) => d.task.id) || []);
  const availableTasks = (projectTasks || []).filter(
    (t) => t.id !== task.id && !existingDepIds.has(t.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Link2 size={14} />
          Dependencies
        </label>
      </div>

      {/* Blocked by (editable) */}
      {deps?.dependsOn && deps.dependsOn.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Blocked by</span>
          {deps.dependsOn.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[dep.task.status as TaskStatus]}`}>
                  {dep.task.status.replace('_', ' ')}
                </span>
                <span className="truncate text-gray-700 dark:text-gray-300">{dep.task.title}</span>
              </div>
              <button
                onClick={() => removeMutation.mutate(dep.id)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                title="Remove dependency"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Blocks (read-only) */}
      {deps?.blocks && deps.blocks.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Blocks</span>
          {deps.blocks.map((dep) => (
            <div key={dep.id} className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[dep.task.status as TaskStatus]}`}>
                {dep.task.status.replace('_', ' ')}
              </span>
              <span className="truncate text-gray-700 dark:text-gray-300">{dep.task.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* Add dependency */}
      {showAdd ? (
        <div className="space-y-2">
          <select
            onChange={(e) => {
              if (e.target.value) addMutation.mutate(e.target.value);
            }}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
            defaultValue=""
          >
            <option value="" disabled>Select a task...</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            onClick={() => { setShowAdd(false); setError(null); }}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          <ChevronDown size={12} />
          Add dependency
        </button>
      )}
    </div>
  );
}
