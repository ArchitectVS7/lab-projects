import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
  projectId?: string;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch('/api/notifications', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function fetchUnreadCount(): Promise<{ count: number }> {
  const res = await fetch('/api/notifications/unread-count', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch unread count');
  return res.json();
}

async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  const res = await fetch('/api/notifications/mark-read', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationIds }),
  });
  if (!res.ok) throw new Error('Failed to mark notifications as read');
}

async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch('/api/notifications/mark-all-read', {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
}

async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete notification');
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60000, // Poll every 60 seconds (WebSocket is primary)
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 60000, // Poll every 60 seconds (WebSocket is primary)
  });

  const unreadCount = unreadData?.count || 0;

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markReadMutation.mutate([notification.id]);
    }

    // Navigate to related resource if applicable
    if (notification.taskId) {
      window.location.href = '/tasks';
    } else if (notification.projectId) {
      window.location.href = `/projects/${notification.projectId}`;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[32rem] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            {unreadNotifications.length > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={clsx(
                      'p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors',
                      !notification.read && 'bg-indigo-50 dark:bg-indigo-900/20'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate([notification.id]);
                            }}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(notification.id);
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
