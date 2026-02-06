import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutVariant = 'default' | 'compact' | 'spacious' | 'minimal';

interface LayoutState {
    layout: LayoutVariant;
    setLayout: (layout: LayoutVariant) => void;
}

export const useLayoutStore = create<LayoutState>()(
    persist(
        (set) => ({
            layout: 'default',
            setLayout: (layout) => set({ layout }),
        }),
        {
            name: 'layout-storage',
        }
    )
);
