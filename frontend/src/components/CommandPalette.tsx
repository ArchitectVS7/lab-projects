import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPaletteStore } from '../store/commandPalette';
import { tasksApi } from '../lib/api';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  User,
  Plus,
  Search,
  X,
  Zap,
  type LucideIcon
} from 'lucide-react';
import type { Task } from '../types';
import SmartTaskInput from './SmartTaskInput';

interface Command {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  group: 'navigation' | 'tasks' | 'projects';
}

export default function CommandPalette() {
  const { isOpen, close } = useCommandPaletteStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [quickCreateMode, setQuickCreateMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigationCommands: Command[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      action: () => { navigate('/'); close(); },
      group: 'navigation',
    },
    {
      id: 'nav-tasks',
      label: 'Go to Tasks',
      icon: CheckSquare,
      action: () => { navigate('/tasks'); close(); },
      group: 'navigation',
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      icon: FolderKanban,
      action: () => { navigate('/projects'); close(); },
      group: 'navigation',
    },
    {
      id: 'nav-profile',
      label: 'Go to Profile',
      icon: User,
      action: () => { navigate('/profile'); close(); },
      group: 'navigation',
    },
  ], [navigate, close]);

  const taskCommands: Command[] = useMemo(() => [
    {
      id: 'task-new',
      label: 'Create New Task',
      icon: Plus,
      action: () => { navigate('/tasks?new=true'); close(); },
      group: 'tasks',
    },
    {
      id: 'task-quick-create',
      label: 'Quick Create (Natural Language)',
      icon: Zap,
      action: () => { setQuickCreateMode(true); setQuery(''); },
      group: 'tasks',
    },
  ], [navigate, close]);

  const projectCommands: Command[] = useMemo(() => [
    {
      id: 'project-new',
      label: 'Create New Project',
      icon: Plus,
      action: () => { navigate('/projects?new=true'); close(); },
      group: 'projects',
    },
  ], [navigate, close]);

  const allCommands = useMemo(() => [...navigationCommands, ...taskCommands, ...projectCommands], [navigationCommands, taskCommands, projectCommands]);

  // Filter commands based on query
  const filteredCommands = query
    ? allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase())
    )
    : allCommands;

  // Search tasks when query is present
  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTasks = async () => {
      setIsSearching(true);
      try {
        const results = await tasksApi.getAll({ q: query });
        setSearchResults(results.slice(0, 5)); // Limit to 5 results
      } catch (error) {
        console.error('Task search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchTasks, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Combine commands and search results
  const allItems = useMemo(() => [
    ...filteredCommands,
    ...searchResults.map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      icon: CheckSquare,
      action: () => { navigate(`/tasks?taskId=${task.id}`); close(); },
      group: 'tasks' as const,
    })),
  ], [filteredCommands, searchResults, navigate, close]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSearchResults([]);
      setSelectedIndex(0);
      setQuickCreateMode(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allItems, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="glass-card dark:glass-card-dark rounded-lg shadow-xl w-full max-w-2xl mx-4 border-2"
            style={{ borderColor: 'var(--primary-base)' }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">⌘ Command Palette</h3>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <Search size={20} className="text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none text-base"
              />
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {quickCreateMode ? (
                <div className="p-4">
                  <SmartTaskInput
                    autoFocus
                    onCreated={() => { close(); }}
                    onCancel={() => setQuickCreateMode(false)}
                  />
                </div>
              ) : (
                <>
                  {allItems.length === 0 && !isSearching && (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No results found
                    </div>
                  )}

                  {isSearching && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                      Searching...
                    </div>
                  )}

                  {allItems.map((item, index) => {
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected
                          ? 'bg-[var(--primary-light)] dark:bg-[var(--primary-dark)] text-[var(--primary-base)]'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        <Icon size={18} />
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        {item.group === 'navigation' && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Navigate</span>
                        )}
                        {item.group === 'tasks' && item.id.startsWith('task-') && item.id !== 'task-new' && item.id !== 'task-quick-create' && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Task</span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs shadow-sm">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs shadow-sm">Enter</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs shadow-sm">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
