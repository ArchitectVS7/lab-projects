import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { authApi } from '../lib/api';
import { LayoutDashboard, CheckSquare, FolderKanban, LogOut, User } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
];

export default function Layout() {
  const location = useLocation();
  const { user, clearUser } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* server unreachable is fine */ }
    clearUser();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">TaskApp</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">{user?.name}</span>
          </div>
          <div className="space-y-1">
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-1"
            >
              <User size={16} />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-1"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
