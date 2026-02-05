import {
  Weather,
  Forecast,
  WeatherClientConfig,
  WeatherApiError,
} from './types';
import { WeatherError, NetworkError, TimeoutError } from './errors';
import { RateLimiter } from './rate-limiter';

const DEFAULT_BASE_URL = 'https://api.weather.example/v1';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_RATE_LIMIT_REQUESTS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

export class WeatherClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly rateLimiter: RateLimiter;

  constructor(config: WeatherClientConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.rateLimiter = new RateLimiter({
      maxRequests: config.rateLimitRequests ?? DEFAULT_RATE_LIMIT_REQUESTS,
      windowMs: config.rateLimitWindowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
    });
  }

  /**
   * Get rate limiter status (requests in window, queue length)
   */
  getRateLimitStatus(): { requestsInWindow: number; queueLength: number } {
    return this.rateLimiter.getStatus();
  }

  /**
   * Get current weather for a city
   */
  async getWeather(city: string): Promise<Weather> {
    if (!city.trim()) {
      throw new Error('City name is required');
    }

    return this.request<Weather>('/weather', { city });
  }

  /**
   * Get weather forecast for a city
   * @param city - City name
   * @param days - Number of days (1-14)
   */
  async getForecast(city: string, days: number): Promise<Forecast> {
    if (!city.trim()) {
      throw new Error('City name is required');
    }

    if (days < 1 || days > 14) {
      throw new Error('Days must be between 1 and 14');
    }

    return this.request<Forecast>('/forecast', { city, days: String(days) });
  }

  /**
   * Make an authenticated request to the API with rate limiting and retry logic
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    // Wait for rate limit slot (queues if limit reached)
    await this.rateLimiter.acquire();

    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(url.toString());
      } catch (err) {
        lastError = err as Error;

        // Only retry on 5xx errors
        const shouldRetry =
          err instanceof WeatherError &&
          err.status >= 500 &&
          err.status < 600 &&
          attempt < this.maxRetries;

        if (!shouldRetry) {
          throw err;
        }

        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = this.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delayMs);
      }
    }

    throw lastError ?? new NetworkError('Request failed after retries');
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.parseError(response);
        throw new WeatherError(error);
      }

      return await response.json() as T;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof WeatherError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new TimeoutError(this.timeoutMs);
        }
        throw new NetworkError(`Failed to fetch: ${err.message}`, err);
      }

      throw new NetworkError('Unknown error occurred');
    }
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse error response from API
   */
  private async parseError(response: Response): Promise<WeatherApiError> {
    try {
      const body = await response.json();
      return {
        code: body.code ?? 'UNKNOWN_ERROR',
        message: body.message ?? response.statusText,
        status: response.status,
      };
    } catch {
      return {
        code: 'UNKNOWN_ERROR',
        message: response.statusText || 'Request failed',
        status: response.status,
      };
    }
  }
}
