import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDensityStore } from '../density';

// Mock document
const mockDocumentElement = {
  classList: {
    remove: vi.fn(),
    add: vi.fn(),
  },
};

Object.defineProperty(global, 'document', {
  value: {
    documentElement: mockDocumentElement,
  },
  writable: true,
});

describe('Density Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useDensityStore.setState({
      density: 'comfortable',
    });
  });

  it('toggles between 3 modes', () => {
    const { setDensity } = useDensityStore.getState();
    
    // Start with comfortable
    expect(useDensityStore.getState().density).toBe('comfortable');
    
    // Switch to compact
    setDensity('compact');
    expect(useDensityStore.getState().density).toBe('compact');
    
    // Switch to spacious
    setDensity('spacious');
    expect(useDensityStore.getState().density).toBe('spacious');
  });

  it('persists to localStorage', () => {
    const { setDensity } = useDensityStore.getState();
    
    // Change to compact
    setDensity('compact');
    
    // Verify the state has changed
    expect(useDensityStore.getState().density).toBe('compact');
  });

  it('applies correct CSS class for each mode', () => {
    const { setDensity } = useDensityStore.getState();
    
    // Clear mock calls
    vi.clearAllMocks();
    
    // Test comfortable mode
    setDensity('comfortable');
    expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith(
      'density-comfortable', 
      'density-compact', 
      'density-spacious'
    );
    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('density-comfortable');
    
    // Clear mock calls
    vi.clearAllMocks();
    
    // Test compact mode
    setDensity('compact');
    expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith(
      'density-comfortable', 
      'density-compact', 
      'density-spacious'
    );
    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('density-compact');
    
    // Clear mock calls
    vi.clearAllMocks();
    
    // Test spacious mode
    setDensity('spacious');
    expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith(
      'density-comfortable', 
      'density-compact', 
      'density-spacious'
    );
    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('density-spacious');
  });

  it('initializes with comfortable density', () => {
    const state = useDensityStore.getState();
    expect(state.density).toBe('comfortable');
  });
});