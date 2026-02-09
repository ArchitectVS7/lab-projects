import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { useSocketStore } from '../store/socket';
import { useAuthStore } from '../store/auth';
import { useCelebrationStore } from '../store/celebration';

export function useSocket() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { setConnected, setOnlineUsers } = useSocketStore();
  const { addCelebration } = useCelebrationStore();

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

    // Gamification events
    socket.on('xpGained', (data: { xp: number; source: string; newTotal: number }) => {
      addCelebration('XP', { xp: data.xp, source: data.source });
      // Invalidate XP progress query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['xp-progress'] });
    });

    socket.on('levelUp', (data: { newLevel: number; rewards: any }) => {
      addCelebration('LEVEL_UP', { newLevel: data.newLevel, rewards: data.rewards });
      // Invalidate XP progress query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['xp-progress'] });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notification:new');
      socket.off('presence:update');
      socket.off('xpGained');
      socket.off('levelUp');
      disconnectSocket();
      setConnected(false);
    };
  }, [user, queryClient, setConnected, setOnlineUsers, addCelebration]);
}
