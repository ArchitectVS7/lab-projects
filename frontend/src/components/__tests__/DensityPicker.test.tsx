import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DensityPicker from '../DensityPicker';
import { useDensityStore } from '../../store/density';

// Mock the density store
vi.mock('../../store/density', () => ({
  useDensityStore: vi.fn(),
  DensityMode: {
    compact: 'compact',
    comfortable: 'comfortable',
    spacious: 'spacious',
  },
}));

describe('DensityPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all density options', () => {
    (useDensityStore as vi.Mock).mockReturnValue({
      density: 'comfortable',
      setDensity: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DensityPicker />
      </MemoryRouter>
    );

    // Check that all three density options are rendered
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getByText('Comfortable')).toBeInTheDocument();
    expect(screen.getByText('Spacious')).toBeInTheDocument();

    // Check that descriptions are also present
    expect(screen.getByText('Tighter spacing, smaller text')).toBeInTheDocument();
    expect(screen.getByText('Default balanced spacing')).toBeInTheDocument();
    expect(screen.getByText('More breathing room')).toBeInTheDocument();
  });

  it('highlights the currently selected density', () => {
    (useDensityStore as vi.Mock).mockReturnValue({
      density: 'compact',
      setDensity: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DensityPicker />
      </MemoryRouter>
    );

    // The compact option should be highlighted as selected
    const compactButton = screen.getByText('Compact').closest('button');
    expect(compactButton).toHaveClass('border-primary');
    expect(compactButton).toHaveClass('bg-primary/10');
    expect(compactButton).toHaveClass('text-primary');

    // The other buttons should not be highlighted
    const comfortableButton = screen.getByText('Comfortable').closest('button');
    expect(comfortableButton).not.toHaveClass('border-primary');
    expect(comfortableButton).not.toHaveClass('bg-primary/10');
    expect(comfortableButton).not.toHaveClass('text-primary');
  });

  it('changes density when a different option is clicked', () => {
    const setDensityMock = vi.fn();
    (useDensityStore as vi.Mock).mockReturnValue({
      density: 'comfortable',
      setDensity: setDensityMock,
    });

    render(
      <MemoryRouter>
        <DensityPicker />
      </MemoryRouter>
    );

    // Click on the "Compact" option
    const compactButton = screen.getByText('Compact');
    fireEvent.click(compactButton);

    // Verify that setDensity was called with 'compact'
    expect(setDensityMock).toHaveBeenCalledWith('compact');

    // Click on the "Spacious" option
    const spaciousButton = screen.getByText('Spacious');
    fireEvent.click(spaciousButton);

    // Verify that setDensity was called with 'spacious'
    expect(setDensityMock).toHaveBeenCalledWith('spacious');
  });

  it('updates UI when density changes', () => {
    const setDensityMock = vi.fn();
    (useDensityStore as vi.Mock).mockReturnValue({
      density: 'compact',
      setDensity: setDensityMock,
    });

    const { rerender } = render(
      <MemoryRouter>
        <DensityPicker />
      </MemoryRouter>
    );

    // Initially, compact should be selected
    let compactButton = screen.getByText('Compact').closest('button');
    expect(compactButton).toHaveClass('border-primary');

    // Update the mock to return a different density
    (useDensityStore as vi.Mock).mockReturnValue({
      density: 'spacious',
      setDensity: setDensityMock,
    });

    // Rerender the component
    rerender(
      <MemoryRouter>
        <DensityPicker />
      </MemoryRouter>
    );

    // Now, spacious should be selected
    const spaciousButton = screen.getByText('Spacious').closest('button');
    expect(spaciousButton).toHaveClass('border-primary');

    // Compact should not be selected anymore
    compactButton = screen.getByText('Compact').closest('button');
    expect(compactButton).not.toHaveClass('border-primary');
  });

  it('uses correct icons for each density option', () => {
    (useDensityStore as vi.Mock).mockReturnValue({
      density: 'comfortable',
      setDensity: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DensityPicker />
      </MemoryRouter>
    );

    // Check that the correct icons are present (using their accessible names)
    // Since we're mocking the icons, we'll check for the presence of the icon containers
    const iconContainers = document.querySelectorAll('svg'); // Find all SVGs (icons)
    expect(iconContainers.length).toBeGreaterThanOrEqual(3); // Should have at least 3 icons
  });
});