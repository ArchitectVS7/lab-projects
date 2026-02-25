import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { agentsApi } from '../lib/api';
import type { AgentType } from '../types';

const AGENTS = [
  { type: 'RESEARCH' as AgentType, icon: '🔍', name: 'Research', description: 'Deep-dive research and information gathering' },
  { type: 'WRITING' as AgentType, icon: '✍️', name: 'Writing', description: 'Draft content, reports, and documentation' },
  { type: 'SOCIAL_MEDIA' as AgentType, icon: '📱', name: 'Social Media', description: 'Create and schedule social posts' },
  { type: 'CODE' as AgentType, icon: '💻', name: 'Code', description: 'Write, review, and debug code' },
  { type: 'OUTREACH' as AgentType, icon: '📧', name: 'Outreach', description: 'Draft emails and outreach messages' },
  { type: 'ANALYTICS' as AgentType, icon: '📊', name: 'Analytics', description: 'Analyze data and generate insights' },
];

interface DelegateModalProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DelegateModal({ taskId, taskTitle, isOpen, onClose }: DelegateModalProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [instructions, setInstructions] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: agentsApi.delegate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleDelegate = () => {
    if (!selectedAgent) return;
    mutation.mutate({
      taskId,
      agentType: selectedAgent,
      ...(instructions ? { instructions } : {}),
    });
  };

  const selectedAgentInfo = AGENTS.find((a) => a.type === selectedAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delegate Task</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-sm mt-0.5">{taskTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-4 flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {AGENTS.map((agent) => (
            <button
              key={agent.type}
              onClick={() => setSelectedAgent(agent.type)}
              className={[
                'flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all',
                selectedAgent === agent.type
                  ? 'border-[var(--primary-base)] bg-[var(--primary-light)] dark:bg-[var(--primary-dark)] ring-2 ring-[var(--primary-base)]'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
              ].join(' ')}
            >
              <span className="text-2xl mb-1">{agent.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{agent.description}</span>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Additional Instructions (optional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Provide any specific guidance for the agent..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
            {instructions.length}/5000
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelegate}
            disabled={!selectedAgent || mutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-[var(--primary-base)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {mutation.isPending
              ? 'Delegating...'
              : selectedAgentInfo
              ? `Delegate to ${selectedAgentInfo.name}`
              : 'Select an Agent'}
          </button>
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-500 mt-2 text-center">
            {mutation.error instanceof Error ? mutation.error.message : 'Delegation failed'}
          </p>
        )}
      </div>
    </div>
  );
}
