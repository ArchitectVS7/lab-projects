import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DensityMode = 'comfortable' | 'compact' | 'spacious';

interface DensityState {
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
}

export const useDensityStore = create<DensityState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      setDensity: (density) => {
        set({ density });
        applyDensity(density);
      },
    }),
    {
      name: 'density-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyDensity(state.density);
        }
      },
    }
  )
);

function applyDensity(density: DensityMode) {
  const root = document.documentElement;
  root.classList.remove('density-comfortable', 'density-compact', 'density-spacious');
  root.classList.add(`density-${density}`);
}
