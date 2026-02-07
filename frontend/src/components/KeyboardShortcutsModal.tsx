import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShortcutsModalStore } from '../store/shortcutsModal';
import { X, Keyboard } from 'lucide-react';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl';

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: [modKey, 'K'], description: 'Open command palette' },
      { keys: ['Esc'], description: 'Close modal / panel' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: [modKey, 'K', '→', 'Dashboard'], description: 'Go to Dashboard' },
      { keys: [modKey, 'K', '→', 'Tasks'], description: 'Go to Tasks' },
      { keys: [modKey, 'K', '→', 'Projects'], description: 'Go to Projects' },
      { keys: [modKey, 'K', '→', 'Profile'], description: 'Go to Profile' },
      { keys: [modKey, 'K', '→', 'Focus'], description: 'Enter Focus Mode' },
    ],
  },
  {
    title: 'Command Palette',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate items' },
      { keys: ['Enter'], description: 'Select item' },
      { keys: ['Esc'], description: 'Close palette' },
    ],
  },
  {
    title: 'Tasks',
    shortcuts: [
      { keys: [modKey, 'K', '→', 'New Task'], description: 'Create new task via palette' },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal() {
  const { isOpen, close } = useShortcutsModalStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-card dark:glass-card-dark rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Keyboard size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                          {shortcut.keys.map((key, j) => (
                            <span key={j} className="flex items-center gap-1">
                              {j > 0 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {key === '→' ? '' : '+'}
                                </span>
                              )}
                              {key === '→' ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">then</span>
                              ) : (
                                <Kbd>{key}</Kbd>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Press <Kbd>?</Kbd> anytime to show this guide
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
