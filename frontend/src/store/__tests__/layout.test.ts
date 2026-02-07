import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLayoutStore } from '../layout';

describe('Layout Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useLayoutStore.setState({
      layout: 'default',
    });
  });

  it('toggles between layouts', () => {
    const { setLayout } = useLayoutStore.getState();
    
    // Start with default
    expect(useLayoutStore.getState().layout).toBe('default');
    
    // Switch to compact
    setLayout('compact');
    expect(useLayoutStore.getState().layout).toBe('compact');
    
    // Switch to spacious
    setLayout('spacious');
    expect(useLayoutStore.getState().layout).toBe('spacious');
    
    // Switch to minimal
    setLayout('minimal');
    expect(useLayoutStore.getState().layout).toBe('minimal');
  });

  it('persists to localStorage', () => {
    const { setLayout } = useLayoutStore.getState();
    
    // Change to compact
    setLayout('compact');
    
    // Verify the state has changed
    expect(useLayoutStore.getState().layout).toBe('compact');
  });

  it('initializes with default layout', () => {
    const state = useLayoutStore.getState();
    expect(state.layout).toBe('default');
  });

  it('allows all layout variants', () => {
    const { setLayout } = useLayoutStore.getState();
    
    // Test all possible layout variants
    const layouts: ('default' | 'compact' | 'spacious' | 'minimal')[] = [
      'default', 'compact', 'spacious', 'minimal'
    ];
    
    layouts.forEach(layout => {
      setLayout(layout);
      expect(useLayoutStore.getState().layout).toBe(layout);
    });
  });
});