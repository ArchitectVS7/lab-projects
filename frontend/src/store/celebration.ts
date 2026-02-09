import { create } from 'zustand';

interface Celebration {
  type: 'TASK' | 'XP' | 'LEVEL_UP' | 'ACHIEVEMENT' | 'STREAK' | 'QUEST';
  data: any;
  id: string;
}

interface CelebrationState {
  queue: Celebration[];
  current: Celebration | null;
  addCelebration: (type: Celebration['type'], data: any) => void;
  nextCelebration: () => void;
  clearQueue: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  queue: [],
  current: null,

  addCelebration: (type, data) => {
    const id = `${type}_${Date.now()}_${Math.random()}`;
    const celebration: Celebration = { type, data, id };

    set((state) => ({
      queue: [...state.queue, celebration],
    }));

    // If no current celebration, start immediately
    if (!get().current) {
      get().nextCelebration();
    }
  },

  nextCelebration: () => {
    const { queue } = get();

    if (queue.length === 0) {
      set({ current: null });
      return;
    }

    const [next, ...remaining] = queue;
    set({ current: next, queue: remaining });
  },

  clearQueue: () => {
    set({ queue: [], current: null });
  },
}));
