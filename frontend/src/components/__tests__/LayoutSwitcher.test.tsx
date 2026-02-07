import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LayoutSwitcher from '../LayoutSwitcher';
import { useLayoutStore } from '../../store/layout';

// Mock the layout store
vi.mock('../../store/layout', () => ({
  useLayoutStore: vi.fn(),
  LayoutVariant: {
    compact: 'compact',
    default: 'default',
    spacious: 'spacious',
    minimal: 'minimal',
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <span>LayoutDashboard</span>,
  Minimize2: () => <span>Minimize2</span>,
  Maximize2: () => <span>Maximize2</span>,
  Monitor: () => <span>Monitor</span>,
}));

describe('LayoutSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all layout options', () => {
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'default',
      setLayout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // Check that all four layout options are rendered
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Spacious')).toBeInTheDocument();
    expect(screen.getByText('Minimal')).toBeInTheDocument();
  });

  it('highlights the currently selected layout', () => {
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'spacious',
      setLayout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // The spacious option should be highlighted as selected
    const spaciousButton = screen.getByText('Spacious').closest('button');
    expect(spaciousButton).toHaveClass('border-primary');
    expect(spaciousButton).toHaveClass('bg-primary/10');
    expect(spaciousButton).toHaveClass('text-primary');

    // The other buttons should not be highlighted
    const defaultButton = screen.getByText('Standard').closest('button');
    expect(defaultButton).not.toHaveClass('border-primary');
    expect(defaultButton).not.toHaveClass('bg-primary/10');
    expect(defaultButton).not.toHaveClass('text-primary');
  });

  it('changes layout when a different option is clicked', () => {
    const setLayoutMock = vi.fn();
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'default',
      setLayout: setLayoutMock,
    });

    render(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // Click on the "Compact" option
    const compactButton = screen.getByText('Compact');
    fireEvent.click(compactButton);

    // Verify that setLayout was called with 'compact'
    expect(setLayoutMock).toHaveBeenCalledWith('compact');

    // Click on the "Minimal" option
    const minimalButton = screen.getByText('Minimal');
    fireEvent.click(minimalButton);

    // Verify that setLayout was called with 'minimal'
    expect(setLayoutMock).toHaveBeenCalledWith('minimal');
  });

  it('updates UI when layout changes', () => {
    const setLayoutMock = vi.fn();
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'compact',
      setLayout: setLayoutMock,
    });

    const { rerender } = render(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // Initially, compact should be selected
    let compactButton = screen.getByText('Compact').closest('button');
    expect(compactButton).toHaveClass('border-primary');

    // Update the mock to return a different layout
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'minimal',
      setLayout: setLayoutMock,
    });

    // Rerender the component
    rerender(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // Now, minimal should be selected
    const minimalButton = screen.getByText('Minimal').closest('button');
    expect(minimalButton).toHaveClass('border-primary');
    
    // Compact should not be selected anymore
    compactButton = screen.getByText('Compact').closest('button');
    expect(compactButton).not.toHaveClass('border-primary');
  });

  it('uses correct icons for each layout option', () => {
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'default',
      setLayout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // Check that the correct icons are present
    expect(screen.getByText('Minimize2')).toBeInTheDocument(); // Compact
    expect(screen.getByText('LayoutDashboard')).toBeInTheDocument(); // Default
    expect(screen.getByText('Maximize2')).toBeInTheDocument(); // Spacious
    expect(screen.getByText('Monitor')).toBeInTheDocument(); // Minimal
  });

  it('has proper accessibility attributes', () => {
    (useLayoutStore as vi.Mock).mockReturnValue({
      layout: 'default',
      setLayout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LayoutSwitcher />
      </MemoryRouter>
    );

    // Check that each button is properly labeled
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);

    // Each button should have a proper accessible name
    expect(screen.getByRole('button', { name: /Compact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Standard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Spacious/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Minimal/i })).toBeInTheDocument();
  });
});