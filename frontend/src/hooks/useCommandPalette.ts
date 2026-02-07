import { useEffect } from 'react';
import { useCommandPaletteStore } from '../store/commandPalette';
import { useShortcutsModalStore } from '../store/shortcutsModal';

export function useCommandPalette() {
  const { toggle: togglePalette } = useCommandPaletteStore();
  const { toggle: toggleShortcuts } = useShortcutsModalStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }

      // '?' to open keyboard shortcuts (only when not typing in an input)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '?' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleShortcuts();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette, toggleShortcuts]);
}
