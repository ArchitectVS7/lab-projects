import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearUser: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
      // Only persist the user profile — never the token.
      // The backend sets an HttpOnly cookie on login, so the token in memory
      // is a fallback for mobile browsers (ITP/SameSite). Storing it in
      // localStorage would expose it to XSS attacks.
      partialize: (state) => ({ user: state.user }),
    }
  )
);
