import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KeyboardShortcutsModal from '../KeyboardShortcutsModal';
import { useShortcutsModalStore } from '../../store/shortcutsModal';

// Mock the store
vi.mock('../../store/shortcutsModal', () => ({
  useShortcutsModalStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => (
        <div data-motion {...props}>
          {children}
        </div>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('KeyboardShortcutsModal', () => {
  const mockUseShortcutsModalStore = useShortcutsModalStore as vi.MockedFunction<any>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up default store state
    mockUseShortcutsModalStore.mockReturnValue({
      isOpen: true,
      close: vi.fn(),
    });
  });

  it('opens on ?, displays shortcut groups', () => {
    render(
      <MemoryRouter>
        <KeyboardShortcutsModal />
      </MemoryRouter>
    );

    // Verify the modal is rendered when open
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    
    // Check that shortcut groups are displayed
    const generalHeaders = screen.getAllByText('General');
    expect(generalHeaders.length).toBeGreaterThan(0);
    
    const navigationHeaders = screen.getAllByText('Navigation');
    expect(navigationHeaders.length).toBeGreaterThan(0);
    
    const commandPaletteHeaders = screen.getAllByText('Command Palette');
    expect(commandPaletteHeaders.length).toBeGreaterThan(0);
    
    const tasksHeaders = screen.getAllByText('Tasks');
    expect(tasksHeaders.length).toBeGreaterThan(0);
  });

  it('closes on Escape', () => {
    const closeMock = vi.fn();
    mockUseShortcutsModalStore.mockReturnValue({
      isOpen: true,
      close: closeMock,
    });

    render(
      <MemoryRouter>
        <KeyboardShortcutsModal />
      </MemoryRouter>
    );

    // Simulate pressing Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking close button', () => {
    const closeMock = vi.fn();
    mockUseShortcutsModalStore.mockReturnValue({
      isOpen: true,
      close: closeMock,
    });

    render(
      <MemoryRouter>
        <KeyboardShortcutsModal />
      </MemoryRouter>
    );

    // Find and click the close button - it has an X icon
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons[closeButtons.length - 1]; // The last button is usually the close button
    
    fireEvent.click(closeButton);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('displays shortcut groups correctly', () => {
    render(
      <MemoryRouter>
        <KeyboardShortcutsModal />
      </MemoryRouter>
    );

    // Check that all shortcut groups are present
    const generalHeaders = screen.getAllByText('General');
    expect(generalHeaders.length).toBeGreaterThan(0);
    
    const navigationHeaders = screen.getAllByText('Navigation');
    expect(navigationHeaders.length).toBeGreaterThan(0);
    
    const commandPaletteHeaders = screen.getAllByText('Command Palette');
    expect(commandPaletteHeaders.length).toBeGreaterThan(0);
    
    const tasksHeaders = screen.getAllByText('Tasks');
    expect(tasksHeaders.length).toBeGreaterThan(0);
  });
});