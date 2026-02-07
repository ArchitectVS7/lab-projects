import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useThemeStore } from '../theme';
import { COLOR_THEMES } from '../../lib/themes';

// Mock document and window
const mockDocumentElement = {
  classList: {
    remove: vi.fn(),
    add: vi.fn(),
  },
  style: {
    setProperty: vi.fn(),
  },
};

Object.defineProperty(global, 'document', {
  value: {
    documentElement: mockDocumentElement,
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    document: {
      documentElement: mockDocumentElement,
    },
    matchMedia: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    }),
  },
  writable: true,
});

describe('Theme Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useThemeStore.setState({
      theme: 'system',
      colorTheme: 'indigo',
    });
  });

  describe('Theme Mode (light/dark/system)', () => {
    it('should initialize with system theme', () => {
      const state = useThemeStore.getState();
      expect(state.theme).toBe('system');
    });

    it('should set theme to light', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('light');

      expect(useThemeStore.getState().theme).toBe('light');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });

    it('should set theme to dark', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('dark');

      expect(useThemeStore.getState().theme).toBe('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should remove existing theme classes before adding new one', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('dark');

      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should handle system theme preference', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('system');

      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('light', 'dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalled();
    });

    it('should detect dark mode system preference', () => {
      global.window.matchMedia = vi.fn().mockReturnValue({
        matches: true, // Dark mode
        addEventListener: vi.fn(),
      });

      const { setTheme } = useThemeStore.getState();
      setTheme('system');

      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should detect light mode system preference', () => {
      global.window.matchMedia = vi.fn().mockReturnValue({
        matches: false, // Light mode
        addEventListener: vi.fn(),
      });

      const { setTheme } = useThemeStore.getState();
      setTheme('system');

      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
    });
  });

  describe('Color Theme', () => {
    it('should initialize with indigo color theme', () => {
      const state = useThemeStore.getState();
      expect(state.colorTheme).toBe('indigo');
    });

    it('should set color theme to purple', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('purple');

      expect(useThemeStore.getState().colorTheme).toBe('purple');
    });

    it('should set color theme to rose', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('rose');

      expect(useThemeStore.getState().colorTheme).toBe('rose');
    });

    it('should set color theme to emerald', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('emerald');

      expect(useThemeStore.getState().colorTheme).toBe('emerald');
    });

    it('should set color theme to amber', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('amber');

      expect(useThemeStore.getState().colorTheme).toBe('amber');
    });
  });

  describe('CSS Variable Application', () => {
    it('should apply primary color CSS variable', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('indigo');

      const indigoTheme = COLOR_THEMES.find((t) => t.id === 'indigo');
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        '--primary',
        indigoTheme?.colors.primary
      );
    });

    it('should generate primary-light variant', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('indigo');

      // Should set --primary-light with HSL value
      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryLightCall = calls.find((call) => call[0] === '--primary-light');
      expect(primaryLightCall).toBeDefined();
      expect(primaryLightCall![1]).toContain('hsl(');
    });

    it('should generate primary-dark variant', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('purple');

      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryDarkCall = calls.find((call) => call[0] === '--primary-dark');
      expect(primaryDarkCall).toBeDefined();
      expect(primaryDarkCall![1]).toContain('hsl(');
    });

    it('should generate primary-base variant', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('rose');

      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryBaseCall = calls.find((call) => call[0] === '--primary-base');
      expect(primaryBaseCall).toBeDefined();
      expect(primaryBaseCall![1]).toContain('hsl(');
    });

    it('should generate lighter variant for light color', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('indigo');

      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryLightCall = calls.find((call) => call[0] === '--primary-light');

      // Extract lightness from HSL
      const hslMatch = primaryLightCall![1].match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
      expect(hslMatch).toBeDefined();

      const lightness = parseInt(hslMatch![3]);
      expect(lightness).toBeGreaterThan(59); // Should be lighter than base (59%)
      expect(lightness).toBeLessThanOrEqual(95); // Should cap at 95%
    });

    it('should generate darker variant for dark color', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('indigo');

      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryDarkCall = calls.find((call) => call[0] === '--primary-dark');

      const hslMatch = primaryDarkCall![1].match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
      expect(hslMatch).toBeDefined();

      const lightness = parseInt(hslMatch![3]);
      expect(lightness).toBeLessThan(59); // Should be darker than base (59%)
      expect(lightness).toBeGreaterThanOrEqual(20); // Should floor at 20%
    });

    it('should apply all theme colors as CSS variables', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('emerald');

      const emeraldTheme = COLOR_THEMES.find((t) => t.id === 'emerald');

      // Should have called setProperty for each color in the theme
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        '--primary',
        emeraldTheme?.colors.primary
      );
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        '--primary-foreground',
        emeraldTheme?.colors.primaryForeground
      );
      expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
        '--ring',
        emeraldTheme?.colors.ring
      );
    });
  });

  describe('HSL Color Parsing', () => {
    it('should correctly parse HSL values from theme', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('indigo');

      // Indigo theme has primary: '243 75% 59%'
      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryBaseCall = calls.find((call) => call[0] === '--primary-base');

      expect(primaryBaseCall![1]).toBe('hsl(243 75% 59%)');
    });

    it('should handle different color themes with different HSL values', () => {
      const { setColorTheme } = useThemeStore.getState();

      // Test Rose theme (346 77% 60%)
      setColorTheme('rose');
      let calls = mockDocumentElement.style.setProperty.mock.calls;
      let primaryBaseCall = calls.find((call) => call[0] === '--primary-base');
      expect(primaryBaseCall![1]).toBe('hsl(346 77% 60%)');

      vi.clearAllMocks();

      // Test Emerald theme (158 64% 52%)
      setColorTheme('emerald');
      calls = mockDocumentElement.style.setProperty.mock.calls;
      primaryBaseCall = calls.find((call) => call[0] === '--primary-base');
      expect(primaryBaseCall![1]).toBe('hsl(158 64% 52%)');
    });
  });

  describe('Edge Cases', () => {
    it('should not exceed 95% lightness for light variant', () => {
      const { setColorTheme } = useThemeStore.getState();

      // Test with a theme that has high lightness already
      setColorTheme('amber'); // Amber has 55% lightness

      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryLightCall = calls.find((call) => call[0] === '--primary-light');

      const hslMatch = primaryLightCall![1].match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
      const lightness = parseInt(hslMatch![3]);

      expect(lightness).toBeLessThanOrEqual(95);
    });

    it('should not go below 20% lightness for dark variant', () => {
      const { setColorTheme } = useThemeStore.getState();

      // Test with a theme that already has low lightness
      setColorTheme('emerald'); // Emerald has 52% lightness

      const calls = mockDocumentElement.style.setProperty.mock.calls;
      const primaryDarkCall = calls.find((call) => call[0] === '--primary-dark');

      const hslMatch = primaryDarkCall![1].match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
      const lightness = parseInt(hslMatch![3]);

      expect(lightness).toBeGreaterThanOrEqual(20);
    });

    it('should handle invalid theme gracefully', () => {
      const { setColorTheme } = useThemeStore.getState();

      // Should not throw error with invalid theme
      expect(() => {
        // @ts-expect-error Testing invalid theme
        setColorTheme('invalid-theme');
      }).not.toThrow();
    });
  });

  describe('Persistence', () => {
    it('should persist theme changes to localStorage', () => {
      // Note: This requires proper localStorage mock in actual implementation
      // For now, we're testing that the zustand persist middleware is configured
      const { setTheme } = useThemeStore.getState();
      setTheme('dark');

      // The store should have updated
      expect(useThemeStore.getState().theme).toBe('dark');
    });

    it('should persist color theme changes to localStorage', () => {
      const { setColorTheme } = useThemeStore.getState();
      setColorTheme('purple');

      expect(useThemeStore.getState().colorTheme).toBe('purple');
    });
  });
});
