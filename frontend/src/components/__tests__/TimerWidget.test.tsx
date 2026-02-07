import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TimerWidget from '../TimerWidget';
import { useTimerStore } from '../../store/timer';
import { timeEntriesApi } from '../../lib/api';
import { useToastStore } from '../../store/toast';

// Mock the timer store
vi.mock('../../store/timer', () => ({
  useTimerStore: vi.fn(),
}));

// Mock the toast store
vi.mock('../../store/toast', () => ({
  useToastStore: vi.fn(),
}));

// Mock the API
vi.mock('../../lib/api', () => ({
  timeEntriesApi: {
    stop: vi.fn(),
  },
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

// Mock the Web Audio API
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0 },
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 0 },
  })),
  destination: {},
  currentTime: 0,
};
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext),
});

describe('TimerWidget', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when no active entry', () => {
    (useTimerStore as vi.Mock).mockReturnValue({
      activeEntry: null,
      isPomodoro: false,
      pomodoroSeconds: 1500,
      clearActiveEntry: vi.fn(),
      tickPomodoro: vi.fn(),
      stopPomodoro: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimerWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByText(/Timer running/)).not.toBeInTheDocument();
  });

  it('renders when active entry exists', () => {
    const mockActiveEntry = {
      id: '1',
      startTime: new Date().toISOString(),
      description: 'Test task',
      task: { id: 'task1', title: 'Test Task' },
    };

    (useTimerStore as vi.Mock).mockReturnValue({
      activeEntry: mockActiveEntry,
      isPomodoro: false,
      pomodoroSeconds: 1500,
      clearActiveEntry: vi.fn(),
      tickPomodoro: vi.fn(),
      stopPomodoro: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimerWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('formats elapsed time correctly', () => {
    const mockActiveEntry = {
      id: '1',
      startTime: new Date(Date.now() - 3661000).toISOString(), // 1 hour, 1 minute, 1 second ago
      description: 'Test task',
      task: { id: 'task1', title: 'Test Task' },
    };

    (useTimerStore as vi.Mock).mockReturnValue({
      activeEntry: mockActiveEntry,
      isPomodoro: false,
      pomodoroSeconds: 1500,
      clearActiveEntry: vi.fn(),
      tickPomodoro: vi.fn(),
      stopPomodoro: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimerWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // The timer should show the elapsed time
    expect(screen.getByText(/^01:01:01/)).toBeInTheDocument();
  });

  it('expands and collapses when toggle button is clicked', () => {
    const mockActiveEntry = {
      id: '1',
      startTime: new Date().toISOString(),
      description: 'Test task',
      task: { id: 'task1', title: 'Test Task' },
    };

    (useTimerStore as vi.Mock).mockReturnValue({
      activeEntry: mockActiveEntry,
      isPomodoro: false,
      pomodoroSeconds: 1500,
      clearActiveEntry: vi.fn(),
      tickPomodoro: vi.fn(),
      stopPomodoro: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimerWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initially expanded content should not be visible
    expect(screen.queryByText(/Started/)).not.toBeInTheDocument();

    // Click the expand button - find it by its aria-label or by its icon
    const expandButtons = screen.getAllByRole('button');
    // The expand/collapse button is the second button (after the stop button)
    const expandButton = expandButtons[expandButtons.length - 1];
    fireEvent.click(expandButton);

    // Expanded content should now be visible
    expect(screen.getByText(/Started/)).toBeInTheDocument();

    // Click the collapse button
    fireEvent.click(expandButton);

    // Expanded content should be hidden again
    expect(screen.queryByText(/Started/)).not.toBeInTheDocument();
  });

  it('calls stop API when stop button is clicked', async () => {
    const mockActiveEntry = {
      id: '1',
      startTime: new Date().toISOString(),
      description: 'Test task',
      task: { id: 'task1', title: 'Test Task' },
    };

    const clearActiveEntryMock = vi.fn();
    const addToastMock = vi.fn();

    (useTimerStore as vi.Mock).mockReturnValue({
      activeEntry: mockActiveEntry,
      isPomodoro: false,
      pomodoroSeconds: 1500,
      clearActiveEntry: clearActiveEntryMock,
      tickPomodoro: vi.fn(),
      stopPomodoro: vi.fn(),
    });

    (useToastStore as vi.Mock).mockImplementation((selector) => {
      const state = {
        addToast: addToastMock,
      };
      return selector ? selector(state) : state;
    });

    (timeEntriesApi.stop as vi.Mock).mockResolvedValue({});

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TimerWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Click the stop button - get all buttons and find the one with the stop title
    const allButtons = screen.getAllByRole('button');
    const stopButton = allButtons.find(btn => btn.title === 'Stop timer');
    if (stopButton) {
      fireEvent.click(stopButton);
    }

    // Wait for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify the API was called
    expect(timeEntriesApi.stop).toHaveBeenCalledWith('1');
    expect(clearActiveEntryMock).toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('Timer stopped', 'success');
  });
});