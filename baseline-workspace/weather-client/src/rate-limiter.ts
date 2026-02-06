export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly timestamps: number[] = [];
  private queue: Array<() => void> = [];
  private processing = false;

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Wait until a request slot is available
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process queued requests when slots become available
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const waitTime = this.getWaitTime();

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }

      // Clean up old timestamps
      this.pruneTimestamps();

      // Record this request and release from queue
      this.timestamps.push(Date.now());
      const resolve = this.queue.shift();
      resolve?.();
    }

    this.processing = false;
  }

  /**
   * Calculate how long to wait before next request is allowed
   */
  private getWaitTime(): number {
    this.pruneTimestamps();

    if (this.timestamps.length < this.maxRequests) {
      return 0;
    }

    // Find the oldest timestamp in our window
    const oldestInWindow = this.timestamps[0];
    const waitUntil = oldestInWindow + this.windowMs;
    const waitTime = waitUntil - Date.now();

    return Math.max(0, waitTime);
  }

  /**
   * Remove timestamps outside the current window
   */
  private pruneTimestamps(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter status
   */
  getStatus(): { requestsInWindow: number; queueLength: number } {
    this.pruneTimestamps();
    return {
      requestsInWindow: this.timestamps.length,
      queueLength: this.queue.length,
    };
  }
}
