# Weather Client

TypeScript API client for the Weather service.

## Installation

```bash
npm install weather-client
```

## Usage

```typescript
import { WeatherClient, WeatherError, NetworkError } from 'weather-client';

const client = new WeatherClient({
  apiKey: 'your-api-key',
  // optional:
  // baseUrl: 'https://api.weather.example/v1',
  // timeoutMs: 10000,
});

// Get current weather
try {
  const weather = await client.getWeather('London');
  console.log(`${weather.city}: ${weather.temperature}°C, ${weather.condition.description}`);
} catch (error) {
  if (error instanceof WeatherError) {
    console.error(`API error ${error.status}: ${error.message}`);
  }
}

// Get 7-day forecast
try {
  const forecast = await client.getForecast('Paris', 7);
  forecast.days.forEach(day => {
    console.log(`${day.date}: ${day.tempMin}°C - ${day.tempMax}°C`);
  });
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network failed:', error.message);
  }
}
```

## Error Handling

| Error Type | When |
|------------|------|
| `ValidationError` | Invalid input (empty city, days out of range) |
| `WeatherError` | API returned an error (city not found, rate limit, etc.) |
| `NetworkError` | Network failure or timeout |

```typescript
import { WeatherError, NetworkError, ValidationError } from 'weather-client';

try {
  const weather = await client.getWeather(city);
} catch (error) {
  if (error instanceof ValidationError) {
    // Bad input - don't retry
  } else if (error instanceof WeatherError) {
    // API error - check error.status and error.code
    if (error.status === 429) {
      // Rate limited - back off and retry
    }
  } else if (error instanceof NetworkError) {
    // Network issue - maybe retry
  }
}
```

## API

### `new WeatherClient(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your API key |
| `baseUrl` | `string` | `https://api.weather.example/v1` | Base URL |
| `timeoutMs` | `number` | `10000` | Request timeout |
| `maxRetries` | `number` | `3` | Max retries for 5xx errors |
| `initialBackoffMs` | `number` | `1000` | Initial backoff (doubles each retry) |
| `rateLimitRequests` | `number` | `10` | Max requests per window |
| `rateLimitWindowMs` | `number` | `60000` | Rate limit window (1 min) |

## Retry Behavior

On 5xx server errors, the client automatically retries with exponential backoff:

| Attempt | Wait before |
|---------|-------------|
| 1st retry | 1 second |
| 2nd retry | 2 seconds |
| 3rd retry | 4 seconds |

4xx errors (client errors) are **not** retried.

## Rate Limiting

By default, the client limits to 10 requests per minute. If you exceed the limit, requests are queued and processed when slots become available.

```typescript
const client = new WeatherClient({
  apiKey: 'your-key',
  rateLimitRequests: 20,      // 20 requests
  rateLimitWindowMs: 60000,   // per minute
});

// Check current usage
console.log(client.rateLimitUsage);
// { current: 5, queued: 0 }
```

Requests never fail due to rate limiting — they wait in a queue until a slot opens.

### `client.getWeather(city: string): Promise<CurrentWeather>`

Returns current weather for a city.

### `client.getForecast(city: string, days: number): Promise<Forecast>`

Returns forecast for 1-14 days.
