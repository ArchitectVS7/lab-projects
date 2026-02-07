import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useLayoutStore } from '../store/layout';

import { authApi } from '../lib/api';
import { LayoutDashboard, CheckSquare, FolderKanban, LogOut, User, Crosshair } from 'lucide-react';
import clsx from 'clsx';
import ToastContainer from './Toast';
import ThemeToggle from './ThemeToggle';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { useCommandPalette } from '../hooks/useCommandPalette';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/focus', label: 'Focus', icon: Crosshair },
];

export default function Layout() {
  const location = useLocation();
  const { user, clearUser } = useAuthStore();
  const { layout } = useLayoutStore();
  useCommandPalette();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* server unreachable is fine */ }
    clearUser();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarWidth = layout === 'minimal' ? 'w-16' : 'w-64';
  const mainPadding = layout === 'compact' ? 'p-3' : layout === 'spacious' ? 'p-10' : 'p-6';

  return (
    <div className={clsx("flex h-screen bg-gray-50 dark:bg-gray-900", layout === 'compact' && 'text-sm')}>
      <aside className={clsx(
        "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300",
        sidebarWidth
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-center items-center h-16">
          {layout === 'minimal' ? (
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">T</span>
          ) : (
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">TaskApp</h1>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              title={label}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors',
                isActive(to)
                  ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                layout === 'minimal' ? 'justify-center' : ''
              )}
            >
              <Icon size={layout === 'compact' ? 16 : 18} />
              {layout !== 'minimal' && label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className={clsx("flex flex-col gap-2", layout !== 'minimal' && "flex-row items-center")}>
            <ThemeToggle />
            <NotificationCenter />
          </div>

          {layout !== 'minimal' && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm font-medium text-indigo-700 dark:text-indigo-300">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{user?.name}</span>
            </div>
          )}

          <div className="space-y-1">
            <Link
              to="/profile"
              title="Profile"
              className={clsx(
                "flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1",
                layout === 'minimal' ? 'justify-center' : ''
              )}
            >
              <User size={16} />
              {layout !== 'minimal' && 'Profile'}
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className={clsx(
                "flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-1 w-full",
                layout === 'minimal' ? 'justify-center' : ''
              )}
            >
              <LogOut size={16} />
              {layout !== 'minimal' && 'Logout'}
            </button>
          </div>
        </div>
      </aside>
      <main className={clsx("flex-1 overflow-auto", mainPadding)}>
        <Outlet />
      </main>
      <ToastContainer />
      <CommandPalette />
      <KeyboardShortcutsModal />
    </div>
  );
}

