export interface Weather {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  windSpeed: number;
  timestamp: string;
}

export interface ForecastDay {
  date: string;
  high: number;
  low: number;
  description: string;
  precipitation: number;
}

export interface Forecast {
  city: string;
  country: string;
  days: ForecastDay[];
}

export interface WeatherApiError {
  code: string;
  message: string;
  status: number;
}

export interface WeatherClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Max retry attempts for 5xx errors (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in ms, doubles each attempt (default: 1000) */
  retryDelayMs?: number;
  /** Max requests per time window (default: 10) */
  rateLimitRequests?: number;
  /** Rate limit window in ms (default: 60000 = 1 minute) */
  rateLimitWindowMs?: number;
}
