import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus, Trash2, Edit2, Copy, Check, ChevronRight, AlertCircle } from 'lucide-react';
import { webhooksApi } from '../lib/api';
import type { WebhookConfig, WebhookLog } from '../types';

const WEBHOOK_EVENTS = [
  'task.created',
  'task.updated',
  'task.completed',
  'task.deleted',
  'project.created',
  'project.updated',
  'comment.added',
];

function WebhookLogDrawer({ webhookId, onClose }: { webhookId: string; onClose: () => void }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['webhook-logs', webhookId],
    queryFn: () => webhooksApi.getLogs(webhookId),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delivery Logs</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Close</button>
        </div>
        <div className="p-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No deliveries yet.</p>
          ) : (
            logs.map((log: WebhookLog) => (
              <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{log.event}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    log.statusCode && log.statusCode < 300
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {log.statusCode || 'Error'}
                  </span>
                </div>
                {log.error && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{log.error}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooksApi.list,
  });

  const createMutation = useMutation({
    mutationFn: webhooksApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setCreatedSecret(data.secret || null);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { url?: string; events?: string[]; active?: boolean } }) =>
      webhooksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: webhooksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setDeleteConfirm(null);
    },
  });

  const resetForm = () => {
    setShowCreate(false);
    setEditId(null);
    setFormUrl('');
    setFormEvents([]);
    setFormActive(true);
  };

  const startEdit = (wh: WebhookConfig) => {
    setEditId(wh.id);
    setFormUrl(wh.url);
    setFormEvents([...wh.events]);
    setFormActive(wh.active);
    setShowCreate(false);
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = () => {
    if (editId) {
      updateMutation.mutate({ id: editId, data: { url: formUrl, events: formEvents, active: formActive } });
    } else {
      createMutation.mutate({ url: formUrl, events: formEvents });
    }
  };

  const handleCopy = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhooks</h1>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          <Plus size={16} />
          Add Webhook
        </button>
      </div>

      {/* Secret display */}
      {createdSecret && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Webhook created. Copy the signing secret now -- it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border rounded text-sm font-mono break-all">
              {createdSecret}
            </code>
            <button onClick={handleCopy} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setCreatedSecret(null)} className="text-sm text-green-700 dark:text-green-300 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Create/Edit form */}
      {(showCreate || editId) && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{editId ? 'Edit Webhook' : 'New Webhook'}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
            <input
              type="url"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    formEvents.includes(event)
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700'
                      : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          {editId && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
              Active
            </label>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={!formUrl.trim() || formEvents.length === 0}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {editId ? 'Update' : 'Create'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhooks table */}
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Globe size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No webhooks</p>
          <p className="text-sm mt-1">Add a webhook to receive real-time notifications about events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: WebhookConfig) => (
            <div key={wh.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${wh.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{wh.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((e) => (
                      <span key={e} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                  {wh.failureCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle size={12} />
                      {wh.failureCount} consecutive failure{wh.failureCount > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => setLogsWebhookId(wh.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="View logs">
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={() => startEdit(wh)} className="text-gray-400 hover:text-indigo-500" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  {deleteConfirm === wh.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteMutation.mutate(wh.id)} className="text-xs text-red-600 font-medium">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(wh.id)} className="text-gray-400 hover:text-red-500" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs drawer */}
      {logsWebhookId && <WebhookLogDrawer webhookId={logsWebhookId} onClose={() => setLogsWebhookId(null)} />}
    </div>
  );
}
