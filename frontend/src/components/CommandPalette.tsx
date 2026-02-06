import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPaletteStore } from '../store/commandPalette';
import { tasksApi } from '../lib/api';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  User,
  Plus,
  Search,
  X
} from 'lucide-react';
import type { Task } from '../types';

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const navigationCommands: Command[] = [
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
  ];

  const taskCommands: Command[] = [
    {
      id: 'task-new',
      label: 'Create New Task',
      icon: Plus,
      action: () => { navigate('/tasks?new=true'); close(); },
      group: 'tasks',
    },
  ];

  const projectCommands: Command[] = [
    {
      id: 'project-new',
      label: 'Create New Project',
      icon: Plus,
      action: () => { navigate('/projects?new=true'); close(); },
      group: 'projects',
    },
  ];

  const allCommands = [...navigationCommands, ...taskCommands, ...projectCommands];

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
  const allItems = [
    ...filteredCommands,
    ...searchResults.map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      icon: CheckSquare,
      action: () => { navigate(`/tasks?taskId=${task.id}`); close(); },
      group: 'tasks' as const,
    })),
  ];

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20"
      onClick={close}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
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
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.group === 'navigation' && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">Navigate</span>
                )}
                {item.group === 'tasks' && item.id.startsWith('task-') && item.id !== 'task-new' && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">Task</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
