import { create } from 'zustand';

interface SocketState {
  connected: boolean;
  onlineUsers: string[];
  setConnected: (connected: boolean) => void;
  setOnlineUsers: (users: string[]) => void;
}

export const useSocketStore = create<SocketState>()((set) => ({
  connected: false,
  onlineUsers: [],
  setConnected: (connected) => set({ connected }),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
}));
