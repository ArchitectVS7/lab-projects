import { describe, it, expect, beforeEach } from 'vitest';
import { useShortcutsModalStore } from '../shortcutsModal';

beforeEach(() => {
  useShortcutsModalStore.setState({ isOpen: false });
});

describe('ShortcutsModalStore — initial state', () => {
  it('starts closed', () => {
    expect(useShortcutsModalStore.getState().isOpen).toBe(false);
  });
});

describe('ShortcutsModalStore — open', () => {
  it('sets isOpen to true', () => {
    useShortcutsModalStore.getState().open();
    expect(useShortcutsModalStore.getState().isOpen).toBe(true);
  });

  it('is idempotent when already open', () => {
    useShortcutsModalStore.getState().open();
    useShortcutsModalStore.getState().open();
    expect(useShortcutsModalStore.getState().isOpen).toBe(true);
  });
});

describe('ShortcutsModalStore — close', () => {
  it('sets isOpen to false', () => {
    useShortcutsModalStore.getState().open();
    useShortcutsModalStore.getState().close();
    expect(useShortcutsModalStore.getState().isOpen).toBe(false);
  });

  it('is idempotent when already closed', () => {
    useShortcutsModalStore.getState().close();
    useShortcutsModalStore.getState().close();
    expect(useShortcutsModalStore.getState().isOpen).toBe(false);
  });
});

describe('ShortcutsModalStore — toggle', () => {
  it('opens when closed', () => {
    useShortcutsModalStore.getState().toggle();
    expect(useShortcutsModalStore.getState().isOpen).toBe(true);
  });

  it('closes when open', () => {
    useShortcutsModalStore.getState().open();
    useShortcutsModalStore.getState().toggle();
    expect(useShortcutsModalStore.getState().isOpen).toBe(false);
  });

  it('toggles back and forth', () => {
    useShortcutsModalStore.getState().toggle(); // → open
    useShortcutsModalStore.getState().toggle(); // → closed
    useShortcutsModalStore.getState().toggle(); // → open
    expect(useShortcutsModalStore.getState().isOpen).toBe(true);
  });
});
