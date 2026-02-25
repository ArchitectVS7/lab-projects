import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckinPage from '../CheckinPage';

// Mock the API modules
vi.mock('../../lib/api', () => ({
  checkinsApi: {
    create: vi.fn(),
    getToday: vi.fn(),
    getAll: vi.fn(),
    getStreak: vi.fn(),
  },
  domainsApi: {
    getAll: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ClipboardList: () => <span data-testid="icon-clipboard" />,
  Zap: () => <span data-testid="icon-zap" />,
  Flame: () => <span data-testid="icon-flame" />,
}));

import { checkinsApi, domainsApi } from '../../lib/api';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderPage() {
  const queryClient = makeQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <CheckinPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('CheckinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock returns
    vi.mocked(checkinsApi.getToday).mockRejectedValue(new Error('No check-in for today'));
    vi.mocked(checkinsApi.getStreak).mockResolvedValue({ streak: 0, lastCheckin: null });
    vi.mocked(checkinsApi.getAll).mockResolvedValue({ checkins: [], total: 0 });
    vi.mocked(domainsApi.getAll).mockResolvedValue([]);
    vi.mocked(checkinsApi.create).mockResolvedValue({
      id: 'test-id',
      userId: 'user-1',
      date: new Date().toISOString(),
      priorities: '1. Test',
      energyLevel: 5,
      blockers: null,
      focusDomains: [],
      createdAt: new Date().toISOString(),
    });
  });

  it('renders "Daily Check-in" heading', async () => {
    renderPage();
    expect(screen.getByText('Daily Check-in')).toBeInTheDocument();
  });

  it('renders energy picker with 10 buttons', async () => {
    renderPage();
    const buttons = screen.getAllByRole('button').filter((btn) => {
      const text = btn.textContent?.trim();
      return text !== undefined && /^([1-9]|10)$/.test(text);
    });
    expect(buttons).toHaveLength(10);
  });

  it('clicking energy button 7 highlights it', async () => {
    renderPage();
    const energyButtons = screen.getAllByRole('button').filter((btn) => {
      const text = btn.textContent?.trim();
      return text !== undefined && /^([1-9]|10)$/.test(text);
    });

    const btn7 = energyButtons.find((b) => b.textContent?.trim() === '7');
    expect(btn7).toBeDefined();
    fireEvent.click(btn7!);

    await waitFor(() => {
      expect(btn7!.className).toContain('bg-[var(--primary-base)]');
    });
  });

  it('calls checkinsApi.create with correct data on save', async () => {
    renderPage();

    // Fill in priorities (find by label text)
    const textarea = screen.getByLabelText("Today's Priorities");
    fireEvent.change(textarea, { target: { value: '1. Write tests' } });

    // Click energy level 6
    const energyButtons = screen.getAllByRole('button').filter((btn) => {
      const text = btn.textContent?.trim();
      return text !== undefined && /^([1-9]|10)$/.test(text);
    });
    const btn6 = energyButtons.find((b) => b.textContent?.trim() === '6');
    fireEvent.click(btn6!);

    // Wait for save button to be enabled (priorities state updated)
    await waitFor(() => {
      const saveButton = screen.getByText('Save Check-in');
      expect(saveButton).not.toBeDisabled();
    });

    // Click save
    const saveButton = screen.getByText('Save Check-in');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(checkinsApi.create).toHaveBeenCalled();
      const callArg = vi.mocked(checkinsApi.create).mock.calls[0]?.[0];
      expect(callArg?.priorities).toBe('1. Write tests');
      expect(callArg?.energyLevel).toBe(6);
      expect(callArg?.focusDomains).toEqual([]);
    });
  });

  it('shows streak badge when streak data is available', async () => {
    vi.mocked(checkinsApi.getStreak).mockResolvedValue({ streak: 5, lastCheckin: '2026-02-24' });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/5 days? streak/)).toBeInTheDocument();
    });
  });

  it('shows domain chips when domains are loaded', async () => {
    vi.mocked(domainsApi.getAll).mockResolvedValue([
      { id: 'domain-1', userId: 'user-1', name: 'Work', color: '#6366f1', icon: '💼', sortOrder: 0, createdAt: new Date().toISOString() },
      { id: 'domain-2', userId: 'user-1', name: 'Health', color: '#22c55e', icon: '🏃', sortOrder: 1, createdAt: new Date().toISOString() },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
    });
  });
});
