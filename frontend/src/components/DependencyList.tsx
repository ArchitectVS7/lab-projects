import { X } from 'lucide-react';
import type { DependencyList as DependencyListType, TaskStatus } from '../types';

const statusColors: Record<TaskStatus, string> = {
    TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    IN_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    DONE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

interface DependencyListProps {
    dependencies: DependencyListType;
    onRemove?: (dependencyId: string) => void;
}

export default function DependencyList({ dependencies, onRemove }: DependencyListProps) {
    const hasDependencies = (dependencies.dependsOn && dependencies.dependsOn.length > 0) ||
        (dependencies.blocks && dependencies.blocks.length > 0);

    if (!hasDependencies) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Blocked by (upstream dependencies) */}
            {dependencies.dependsOn && dependencies.dependsOn.length > 0 && (
                <div className="space-y-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Blocked by</span>
                    {dependencies.dependsOn.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[dep.task.status as TaskStatus]}`}>
                                    {dep.task.status.replace('_', ' ')}
                                </span>
                                <span className="truncate text-gray-700 dark:text-gray-300">{dep.task.title}</span>
                            </div>
                            {onRemove && (
                                <button
                                    onClick={() => onRemove(dep.id)}
                                    className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                                    title="Remove dependency"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Blocks (downstream dependents) */}
            {dependencies.blocks && dependencies.blocks.length > 0 && (
                <div className="space-y-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Blocks</span>
                    {dependencies.blocks.map((dep) => (
                        <div key={dep.id} className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors[dep.task.status as TaskStatus]}`}>
                                {dep.task.status.replace('_', ' ')}
                            </span>
                            <span className="truncate text-gray-700 dark:text-gray-300">{dep.task.title}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
