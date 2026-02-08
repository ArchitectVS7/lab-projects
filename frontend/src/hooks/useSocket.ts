import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { useSocketStore } from '../store/socket';
import { useAuthStore } from '../store/auth';

export function useSocket() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { setConnected, setOnlineUsers } = useSocketStore();

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Also refetch projects in case a PROJECT_INVITE was received
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socket.on('presence:update', (data: { onlineUsers: string[] }) => {
      setOnlineUsers(data.onlineUsers);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notification:new');
      socket.off('presence:update');
      disconnectSocket();
      setConnected(false);
    };
  }, [user, queryClient, setConnected, setOnlineUsers]);
}
