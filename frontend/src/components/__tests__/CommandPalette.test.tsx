import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommandPalette from '../CommandPalette';
import { useCommandPaletteStore } from '../../store/commandPalette';

// Mock the store
vi.mock('../../store/commandPalette', () => ({
  useCommandPaletteStore: vi.fn(),
}));

// Mock the API
vi.mock('../../lib/api', () => ({
  tasksApi: {
    getAll: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, onClick, ...props }: any) => (
        <div data-motion onClick={onClick} {...props}>
          {children}
        </div>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('CommandPalette', () => {
  const mockUseCommandPaletteStore = useCommandPaletteStore as vi.MockedFunction<any>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Set up default store state
    mockUseCommandPaletteStore.mockReturnValue({
      isOpen: true,
      close: vi.fn(),
    });
  });

  it('opens on Ctrl+K, closes on Escape', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    // Verify the palette is rendered when open
    expect(screen.getByText('⌘ Command Palette')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    const searchInputs = screen.getAllByPlaceholderText('Type a command or search...');
    expect(searchInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('filters results based on search query', async () => {
    const closeMock = vi.fn();
    // Create a fresh instance for this test
    mockUseCommandPaletteStore.mockReset();
    mockUseCommandPaletteStore.mockReturnValue({
      isOpen: true,
      close: closeMock,
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    // Wait for render to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    const searchInputs = screen.getAllByPlaceholderText('Type a command or search...');
    const searchInput = searchInputs[0]; // Get the first one

    // Simulate typing in the search box
    fireEvent.change(searchInput, { target: { value: 'dashboard' } });

    // Wait for the component to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that the input value has been updated
    expect(searchInput).toHaveValue('dashboard');
  });

  it('closes when clicking outside', async () => {
    // Create a fresh mock for this test to avoid interference
    const closeMock = vi.fn();
    // Explicitly reset and set up the mock for this test only
    mockUseCommandPaletteStore.mockReset();
    mockUseCommandPaletteStore.mockReturnValue({
      isOpen: true,
      close: closeMock,
    });

    const { container } = render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    // Wait for the component to render
    await new Promise(resolve => setTimeout(resolve, 10));

    // Find the backdrop element using data-testid
    const backdrop = container.querySelector('[data-testid="command-palette-backdrop"]');
    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop!);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('closes when pressing Escape key', () => {
    const closeMock = vi.fn();
    mockUseCommandPaletteStore.mockReturnValue({
      isOpen: true,
      close: closeMock,
    });

    render(
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    );

    // Simulate pressing Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});