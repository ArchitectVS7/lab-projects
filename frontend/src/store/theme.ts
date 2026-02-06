import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COLOR_THEMES, ColorThemeId } from '../lib/themes';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  colorTheme: ColorThemeId;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'indigo',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setColorTheme: (colorTheme) => {
        set({ colorTheme });
        applyColorTheme(colorTheme);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyColorTheme(state.colorTheme);
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

function applyColorTheme(themeId: ColorThemeId) {
  const theme = COLOR_THEMES.find((t) => t.id === themeId);
  if (!theme) return;

  const root = window.document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables (e.g., primaryForeground -> --primary-foreground)
    const cssVar = `--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
    root.style.setProperty(cssVar, value);
  });
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      applyTheme('system');
    }
  });
}
