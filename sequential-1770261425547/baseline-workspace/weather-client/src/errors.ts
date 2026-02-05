import { WeatherApiError } from './types';

export class WeatherError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: WeatherApiError) {
    super(error.message);
    this.name = 'WeatherError';
    this.code = error.code;
    this.status = error.status;
  }
}

export class NetworkError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}
