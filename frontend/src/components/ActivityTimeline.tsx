import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Pencil, Trash2, MessageSquare, History } from 'lucide-react';
import { activityLogsApi } from '../lib/api';
import type { ActivityLog, ActivityAction } from '../types';

const ACTION_CONFIG: Record<ActivityAction, { icon: typeof Plus; color: string; label: string }> = {
  CREATED: { icon: Plus, color: 'text-green-500', label: 'created this task' },
  UPDATED: { icon: Pencil, color: 'text-blue-500', label: 'updated' },
  DELETED: { icon: Trash2, color: 'text-red-500', label: 'deleted this task' },
  COMMENT_ADDED: { icon: MessageSquare, color: 'text-indigo-500', label: 'added a comment' },
  COMMENT_EDITED: { icon: MessageSquare, color: 'text-yellow-500', label: 'edited a comment' },
  COMMENT_DELETED: { icon: MessageSquare, color: 'text-red-400', label: 'deleted a comment' },
};

const FIELD_LABELS: Record<string, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  assigneeId: 'assignee',
  dueDate: 'due date',
};

const STATUS_BADGES: Record<string, string> = {
  TODO: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
  IN_REVIEW: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300',
  DONE: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300',
};

const PRIORITY_BADGES: Record<string, string> = {
  LOW: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300',
  URGENT: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300',
};

function ValueBadge({ field, value }: { field: string; value: string | null }) {
  if (!value) return <span className="text-gray-400 italic">none</span>;

  if (field === 'status' && STATUS_BADGES[value]) {
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[value]}`}>
        {value.replace('_', ' ')}
      </span>
    );
  }

  if (field === 'priority' && PRIORITY_BADGES[value]) {
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGES[value]}`}>
        {value}
      </span>
    );
  }

  if (field === 'dueDate') {
    try {
      return <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(value).toLocaleDateString()}</span>;
    } catch {
      return <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>;
    }
  }

  // Truncate long values like description
  const displayVal = value.length > 60 ? value.substring(0, 60) + '...' : value;
  return <span className="text-sm text-gray-700 dark:text-gray-300">"{displayVal}"</span>;
}

function ActivityEntry({ log }: { log: ActivityLog }) {
  const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATED;
  const Icon = config.icon;

  let description: React.ReactNode;

  if (log.action === 'UPDATED' && log.field) {
    const fieldLabel = FIELD_LABELS[log.field] || log.field;
    description = (
      <span>
        changed {fieldLabel} from <ValueBadge field={log.field} value={log.oldValue} /> to{' '}
        <ValueBadge field={log.field} value={log.newValue} />
      </span>
    );
  } else {
    description = config.label;
  }

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`mt-0.5 ${config.color}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-medium text-gray-900 dark:text-gray-100">{log.user.name}</span>{' '}
          <span className="text-gray-500 dark:text-gray-400">{description}</span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

export default function ActivityTimeline({ taskId }: { taskId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs', taskId],
    queryFn: () => activityLogsApi.getByTask(taskId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-400 dark:text-gray-500">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700/50 overflow-y-auto">
      {logs.map((log) => (
        <ActivityEntry key={log.id} log={log} />
      ))}
    </div>
  );
}
