import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InsightsWidget from '../InsightsWidget';

// Mock the API
vi.mock('../../lib/api', () => ({
  insightsApi: {
    get: vi.fn(),
  },
}));

import { insightsApi } from '../../lib/api';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('InsightsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render insights widget with data', async () => {
    const mockInsights = {
      completionRate: 75,
      velocityTrend: 'up' as const,
      mostProductiveTime: '10:00 AM - 12:00 PM',
      insight: 'You complete tasks 30% faster in the morning!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    render(<InsightsWidget />, { wrapper: createWrapper() });

    // Wait for data to load
    const heading = await screen.findByText(/Your Productivity Insight/i);
    expect(heading).toBeInTheDocument();
  });

  it('should display completion rate', async () => {
    const mockInsights = {
      completionRate: 85,
      velocityTrend: 'up' as const,
      mostProductiveTime: '2:00 PM - 4:00 PM',
      insight: 'Great work this week!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    render(<InsightsWidget />, { wrapper: createWrapper() });

    const completionRate = await screen.findByText(/85%/);
    expect(completionRate).toBeInTheDocument();
  });

  it('should display AI insight message', async () => {
    const mockInsights = {
      completionRate: 70,
      velocityTrend: 'stable' as const,
      mostProductiveTime: '9:00 AM - 11:00 AM',
      insight: 'You complete tasks 30% faster in the morning!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    render(<InsightsWidget />, { wrapper: createWrapper() });

    const insight = await screen.findByText(
      /You complete tasks 30% faster in the morning!/i
    );
    expect(insight).toBeInTheDocument();
  });

  it('should display velocity trend', async () => {
    const mockInsights = {
      completionRate: 70,
      velocityTrend: 'up' as const,
      mostProductiveTime: '9:00 AM - 11:00 AM',
      insight: 'Your productivity is trending upward!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    render(<InsightsWidget />, { wrapper: createWrapper() });

    // Should show up arrow or "up" indicator
    const velocityElement = await screen.findByText(/Velocity/i);
    expect(velocityElement).toBeInTheDocument();
  });

  it('should display most productive time', async () => {
    const mockInsights = {
      completionRate: 80,
      velocityTrend: 'up' as const,
      mostProductiveTime: '10:00 AM - 12:00 PM',
      insight: 'Keep up the great work!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    render(<InsightsWidget />, { wrapper: createWrapper() });

    const productiveTime = await screen.findByText(/10:00 AM - 12:00 PM/);
    expect(productiveTime).toBeInTheDocument();
  });

  it('should return null when no data', async () => {
    vi.mocked(insightsApi.get).mockResolvedValue(null);

    const { container } = render(<InsightsWidget />, { wrapper: createWrapper() });

    // Wait a bit for query to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(container.firstChild).toBeNull();
  });

  it('should handle loading state gracefully', () => {
    vi.mocked(insightsApi.get).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<InsightsWidget />, { wrapper: createWrapper() });

    // Should not crash during loading
    expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(insightsApi.get).mockRejectedValue(new Error('API Error'));

    const { container } = render(<InsightsWidget />, { wrapper: createWrapper() });

    // Wait for error state
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should return null on error (not crash)
    expect(container.firstChild).toBeNull();
  });

  it('should use primary color for styling', async () => {
    const mockInsights = {
      completionRate: 75,
      velocityTrend: 'up' as const,
      mostProductiveTime: '10:00 AM - 12:00 PM',
      insight: 'You complete tasks 30% faster in the morning!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    const { container } = render(<InsightsWidget />, { wrapper: createWrapper() });

    // Wait for data to load
    await screen.findByText(/Your Productivity Insight/i);

    // Check if widget container uses primary color border
    const widget = container.querySelector('div[style*="borderColor"]');
    expect(widget).toBeInTheDocument();
    expect(widget?.getAttribute('style')).toContain('var(--primary-base)');
  });

  it('should display lightbulb icon with primary color', async () => {
    const mockInsights = {
      completionRate: 75,
      velocityTrend: 'up' as const,
      mostProductiveTime: '10:00 AM - 12:00 PM',
      insight: 'Great insights!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    const { container } = render(<InsightsWidget />, { wrapper: createWrapper() });

    await screen.findByText(/Your Productivity Insight/i);

    // Lightbulb icon should have inline style with primary color
    const lightbulbIcon = container.querySelector('svg[style*="color"]');
    expect(lightbulbIcon).toBeInTheDocument();
  });

  it('should show emoji in heading', async () => {
    const mockInsights = {
      completionRate: 75,
      velocityTrend: 'up' as const,
      mostProductiveTime: '10:00 AM - 12:00 PM',
      insight: 'Keep it up!',
    };

    vi.mocked(insightsApi.get).mockResolvedValue(mockInsights);

    render(<InsightsWidget />, { wrapper: createWrapper() });

    const heading = await screen.findByText(/💡 Your Productivity Insight/i);
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('💡');
  });
});
