import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dependenciesApi } from '../lib/api';

export function useTaskDependenciesList(taskId: string) {
    return useQuery({
        queryKey: ['task-dependencies', taskId],
        queryFn: () => dependenciesApi.list(taskId),
    });
}

export function useTaskDependencies(taskId: string) {
    const queryClient = useQueryClient();

    const addDependency = useMutation({
        mutationFn: async (dependsOnId: string) => {
            return dependenciesApi.add(taskId, dependsOnId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    const removeDependency = useMutation({
        mutationFn: async (dependencyId: string) => {
            return dependenciesApi.remove(taskId, dependencyId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    return {
        addDependency,
        removeDependency,
    };
}
