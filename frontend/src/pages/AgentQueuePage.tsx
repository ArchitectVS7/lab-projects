import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Trash2 } from 'lucide-react';
import { agentsApi } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { AgentType } from '../types';
import { format } from 'date-fns';

const AGENTS: { type: AgentType; icon: string; name: string }[] = [
  { type: 'RESEARCH', icon: '🔍', name: 'Research' },
  { type: 'WRITING', icon: '✍️', name: 'Writing' },
  { type: 'SOCIAL_MEDIA', icon: '📱', name: 'Social Media' },
  { type: 'CODE', icon: '💻', name: 'Code' },
  { type: 'OUTREACH', icon: '📧', name: 'Outreach' },
  { type: 'ANALYTICS', icon: '📊', name: 'Analytics' },
];

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function AgentQueuePage() {
  const queryClient = useQueryClient();

  const { data: delegations = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getQueue,
  });

  const removeMutation = useMutation({
    mutationFn: agentsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  // Listen for real-time agent status updates via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAgentStatus = () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    };

    socket.on('agent:status', handleAgentStatus);
    return () => {
      socket.off('agent:status', handleAgentStatus);
    };
  }, [queryClient]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Zap size={24} className="text-purple-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Queue</h1>
      </div>

      {/* Agent summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {AGENTS.map((agent) => {
          const count = delegations.filter((d) => d.agentType === agent.type).length;
          return (
            <div
              key={agent.type}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3"
            >
              <span className="text-3xl">{agent.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delegations table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">All Delegations</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : delegations.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No delegations yet. Use the Zap button on any task card to delegate to an AI agent.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {delegations.map((delegation) => {
                  const agentInfo = AGENTS.find((a) => a.type === delegation.agentType);
                  return (
                    <tr key={delegation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                          {delegation.task?.title ?? delegation.taskId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5">
                          <span>{agentInfo?.icon}</span>
                          <span className="text-gray-700 dark:text-gray-300">{agentInfo?.name ?? delegation.agentType}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[delegation.status] ?? ''}`}>
                          {delegation.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {format(new Date(delegation.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => removeMutation.mutate(delegation.id)}
                          disabled={removeMutation.isPending}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Remove delegation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
