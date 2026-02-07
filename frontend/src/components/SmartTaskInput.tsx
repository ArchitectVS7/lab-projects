import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Calendar,
  Flag,
  FolderKanban,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { parseNaturalLanguage, type ParsedTask } from '../lib/nlpParser';
import { tasksApi, projectsApi } from '../lib/api';
import type { Project } from '../types';

interface SmartTaskInputProps {
  onCreated?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  initialText?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
  HIGH: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
  MEDIUM: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
  LOW: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700',
};

export default function SmartTaskInput({
  onCreated,
  onCancel,
  autoFocus = true,
  initialText = '',
}: SmartTaskInputProps) {
  const [input, setInput] = useState(initialText);
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (!value.trim()) {
      setParsed(null);
    }
  };

  // Parse input on change (debounced)
  useEffect(() => {
    if (!input.trim()) return;
    const timer = setTimeout(() => {
      setParsed(parseNaturalLanguage(input));
    }, 150);
    return () => clearTimeout(timer);
  }, [input]);

  // Auto-match project from hint during render to avoid useEffect cascading renders
  const [prevHint, setPrevHint] = useState<string | undefined>(() => parsed?.projectHint || undefined);
  if (parsed?.projectHint !== prevHint) {
    setPrevHint(parsed?.projectHint as string | undefined);
    if (parsed?.projectHint && projects.length > 0) {
      const hint = parsed.projectHint.toLowerCase();
      const match = projects.find(
        (p: Project) =>
          p.name.toLowerCase() === hint ||
          p.name.toLowerCase().includes(hint)
      );
      if (match) setSelectedProjectId(match.id);
    }
  }

  // Auto-focus
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setInput('');
      setParsed(null);
      setError('');
      onCreated?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (!parsed?.title?.trim()) return;
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }

    setError('');
    createMutation.mutate({
      title: parsed.title,
      projectId: selectedProjectId,
      priority: parsed.priority || 'MEDIUM',
      status: 'TODO',
      dueDate: parsed.dueDate ? parsed.dueDate.toISOString() : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  return (
    <div className="w-full">
      {/* Input field */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <Zap size={16} className="text-amber-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder='Try: "Review PR by Friday high priority #frontend"'
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
      </div>

      {/* Parsed preview */}
      <AnimatePresence>
        {parsed && input.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
              {/* Parsed title */}
              <div className="flex items-center gap-2 text-sm">
                <Check size={14} className="text-green-500 flex-shrink-0" />
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {parsed.title}
                </span>
              </div>

              {/* Parsed tokens */}
              <div className="flex flex-wrap gap-2">
                {parsed.dueDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <Calendar size={11} />
                    {parsed.dueDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {parsed.priority && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[parsed.priority]}`}
                  >
                    <Flag size={11} />
                    {parsed.priority}
                  </span>
                )}
                {parsed.projectHint && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <FolderKanban size={11} />
                    #{parsed.projectHint}
                  </span>
                )}
              </div>

              {/* Project selector (if not auto-matched) */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select project...</option>
                  {projects.map((p: Project) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !parsed.title?.trim() || !selectedProjectId}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded disabled:opacity-50 flex items-center gap-1"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Zap size={12} />
                  )}
                  Create
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={12} />
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help text */}
      {!input.trim() && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          Type naturally: dates, priorities (urgent/high/low/p0-p3), and #project are auto-detected
        </p>
      )}
    </div>
  );
}
