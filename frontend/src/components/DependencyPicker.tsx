import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, AlertCircle, ChevronDown } from 'lucide-react';
import { dependenciesApi, tasksApi } from '../lib/api';
import type { Task } from '../types';
import DependencyList from './DependencyList';

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

      <DependencyList
        dependencies={deps || { dependsOn: [], blocks: [] }}
        onRemove={(id) => removeMutation.mutate(id)}
      />

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
