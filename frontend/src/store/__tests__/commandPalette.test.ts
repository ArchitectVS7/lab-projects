import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandPaletteStore } from '../commandPalette';

beforeEach(() => {
  useCommandPaletteStore.setState({ isOpen: false });
});

describe('CommandPaletteStore — initial state', () => {
  it('starts closed', () => {
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });
});

describe('CommandPaletteStore — open', () => {
  it('sets isOpen to true', () => {
    useCommandPaletteStore.getState().open();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('is idempotent when already open', () => {
    useCommandPaletteStore.getState().open();
    useCommandPaletteStore.getState().open();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });
});

describe('CommandPaletteStore — close', () => {
  it('sets isOpen to false', () => {
    useCommandPaletteStore.getState().open();
    useCommandPaletteStore.getState().close();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it('is idempotent when already closed', () => {
    useCommandPaletteStore.getState().close();
    useCommandPaletteStore.getState().close();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });
});

describe('CommandPaletteStore — toggle', () => {
  it('opens when closed', () => {
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });

  it('closes when open', () => {
    useCommandPaletteStore.getState().open();
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().isOpen).toBe(false);
  });

  it('toggles back and forth', () => {
    useCommandPaletteStore.getState().toggle(); // → open
    useCommandPaletteStore.getState().toggle(); // → closed
    useCommandPaletteStore.getState().toggle(); // → open
    expect(useCommandPaletteStore.getState().isOpen).toBe(true);
  });
});
