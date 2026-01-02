// =============================================================================
// RATE LIMITER
// =============================================================================
// Token bucket rate limiter for API calls.
// Uses sliding window with timestamp filtering (25 calls per 2.5s window).

import { EventEmitter } from 'events';
import type { RateLimiterConfig, RateLimiterState } from '../../../mainview/types/image-gen';

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 25,
  windowMs: 2500,
  minDelayMs: 50,
};

// -----------------------------------------------------------------------------
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class RateLimiter extends EventEmitter {
  private config: RateLimiterConfig;
  private callTimestamps: number[] = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // CORE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Check if a call can be made immediately.
   * Uses sliding window - filters out timestamps older than windowMs.
   */
  canMakeCall(): boolean {
    this.pruneOldTimestamps();
    return this.callTimestamps.length < this.config.maxTokens;
  }

  /**
   * Record a call (consume a token).
   * Should be called immediately before making the API request.
   */
  recordCall(): void {
    this.callTimestamps.push(Date.now());
    this.emit('call-recorded', this.getState());
  }

  /**
   * Get milliseconds until next available slot.
   * Returns 0 if a call can be made immediately.
   * Adds a small buffer (100ms) to avoid edge cases.
   */
  getNextAvailableTime(): number {
    if (this.canMakeCall()) {
      return 0;
    }

    // Get the oldest timestamp still in the window
    this.pruneOldTimestamps();

    if (this.callTimestamps.length === 0) {
      return 0;
    }

    const oldestTimestamp = this.callTimestamps[0];
    const elapsed = Date.now() - oldestTimestamp;
    const waitTime = this.config.windowMs - elapsed + 100; // 100ms buffer

    return Math.max(0, waitTime);
  }

  /**
   * Wait until a call can be made.
   * Returns immediately if a slot is available.
   */
  async waitForSlot(): Promise<void> {
    const waitTime = this.getNextAvailableTime();

    if (waitTime > 0) {
      this.emit('waiting', { waitTime, state: this.getState() });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Get current state for UI/monitoring.
   */
  getState(): RateLimiterState & { available: number; max: number; nextAvailableIn: number } {
    this.pruneOldTimestamps();

    return {
      tokens: this.config.maxTokens - this.callTimestamps.length,
      lastRefill: this.callTimestamps.length > 0
        ? this.callTimestamps[this.callTimestamps.length - 1]
        : Date.now(),
      callTimestamps: [...this.callTimestamps],
      available: this.config.maxTokens - this.callTimestamps.length,
      max: this.config.maxTokens,
      nextAvailableIn: this.getNextAvailableTime(),
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Update configuration at runtime.
   */
  updateConfig(updates: Partial<RateLimiterConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', { oldConfig, newConfig: this.config });
  }

  /**
   * Reset to default configuration.
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.callTimestamps = [];
    this.emit('reset');
  }

  /**
   * Clear all recorded calls (useful for testing or manual reset).
   */
  clear(): void {
    this.callTimestamps = [];
    this.emit('cleared');
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Remove timestamps older than the window.
   */
  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > cutoff);
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimiterConfig>): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(config);
  } else if (config) {
    rateLimiterInstance.updateConfig(config);
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.clear();
  }
  rateLimiterInstance = null;
}
