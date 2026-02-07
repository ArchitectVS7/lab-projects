import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';

export function useTaskSocket(taskId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!taskId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit('task:join', taskId);

    const handleCommentNew = () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    };

    const handleCommentUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    };

    const handleCommentDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
    };

    const handleTaskUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const handleActivityNew = () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs', taskId] });
    };

    socket.on('comment:new', handleCommentNew);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('activity:new', handleActivityNew);

    return () => {
      socket.emit('task:leave', taskId);
      socket.off('comment:new', handleCommentNew);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('activity:new', handleActivityNew);
    };
  }, [taskId, queryClient]);
}
