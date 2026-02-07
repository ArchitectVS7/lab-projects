import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COLOR_THEMES, ColorThemeId } from '../lib/themes';

type Theme = 'light' | 'dark' | 'system';
type HighContrastMode = 'normal' | 'high-contrast';
type PerformanceMode = 'balanced' | 'performance' | 'quality';
export type AnimationIntensity = 'normal' | 'reduced' | 'none';

interface ThemeState {
  theme: Theme;
  colorTheme: ColorThemeId;
  highContrast: HighContrastMode;
  performanceMode: PerformanceMode;
  animationIntensity: AnimationIntensity;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorThemeId) => void;
  setHighContrast: (mode: HighContrastMode) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setAnimationIntensity: (intensity: AnimationIntensity) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'indigo',
      highContrast: 'normal',
      performanceMode: 'balanced',
      animationIntensity: 'normal',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setColorTheme: (colorTheme) => {
        set({ colorTheme });
        applyColorTheme(colorTheme);
      },
      setHighContrast: (mode) => {
        set({ highContrast: mode });
        applyHighContrast(mode);
      },
      setPerformanceMode: (mode) => {
        set({ performanceMode: mode });
        applyPerformanceMode(mode);
      },
      setAnimationIntensity: (intensity) => {
        set({ animationIntensity: intensity });
        applyAnimationIntensity(intensity);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyColorTheme(state.colorTheme);
          applyHighContrast(state.highContrast);
          applyPerformanceMode(state.performanceMode);

          // If user hasn't explicitly set animationIntensity and OS prefers reduced motion, default to 'none'
          if (
            state.animationIntensity === 'normal' &&
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ) {
            state.setAnimationIntensity('none');
          } else {
            applyAnimationIntensity(state.animationIntensity);
          }
        }
      },
    }
  )
);

function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark', 'high-contrast');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }

  // Apply high contrast if enabled
  const store = useThemeStore.getState();
  if (store.highContrast === 'high-contrast') {
    root.classList.add('high-contrast');
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

  // Extract HSL values and generate color variants
  const primaryHSL = theme.colors.primary;
  const [h, s, l] = primaryHSL.split(' ');
  const lightness = parseInt(l);

  // Generate lighter variant (lighter by 15%)
  const lightVariant = `${h} ${s} ${Math.min(lightness + 15, 95)}%`;
  root.style.setProperty('--primary-light', `hsl(${lightVariant})`);

  // Generate darker variant (darker by 15%)
  const darkVariant = `${h} ${s} ${Math.max(lightness - 15, 20)}%`;
  root.style.setProperty('--primary-dark', `hsl(${darkVariant})`);

  // Set base as full HSL
  root.style.setProperty('--primary-base', `hsl(${primaryHSL})`);
}

function applyHighContrast(mode: HighContrastMode) {
  const root = window.document.documentElement;
  if (mode === 'high-contrast') {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
}

function applyPerformanceMode(mode: PerformanceMode) {
  const root = window.document.documentElement;
  root.classList.remove('performance-mode', 'quality-mode');

  if (mode === 'performance') {
    root.classList.add('performance-mode');
  } else if (mode === 'quality') {
    root.classList.add('quality-mode');
  }
}

function applyAnimationIntensity(intensity: AnimationIntensity) {
  const root = window.document.documentElement;
  root.classList.remove('anim-normal', 'anim-reduced', 'anim-none');
  root.classList.add(`anim-${intensity}`);
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useThemeStore.getState();
    if (store.theme === 'system') {
      applyTheme('system');
    }
  });

  // Listen for prefers-reduced-motion changes
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    const store = useThemeStore.getState();
    if (e.matches) {
      store.setAnimationIntensity('none');
    }
  });
}
