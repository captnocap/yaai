// =============================================================================
// CONCURRENCY LIMITER
// =============================================================================
// Controls maximum concurrent API requests.
// Emits events when slots become available for queue processing.

import { EventEmitter } from 'events';
import type { ConcurrencyConfig, ConcurrencyState } from '../../../mainview/types/image-gen';

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: ConcurrencyConfig = {
  maxConcurrent: 75,
};

// -----------------------------------------------------------------------------
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class ConcurrencyLimiter extends EventEmitter {
  private config: ConcurrencyConfig;
  private activeCount: number = 0;
  private waitingQueue: Array<() => void> = [];

  constructor(config: Partial<ConcurrencyConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // CORE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Check if a new request can start.
   */
  canStart(): boolean {
    return this.activeCount < this.config.maxConcurrent;
  }

  /**
   * Acquire a slot (increment active count).
   * Should be called when starting a request.
   */
  acquire(): void {
    this.activeCount++;
    this.emit('acquired', this.getState());
  }

  /**
   * Release a slot (decrement active count).
   * Should be called when a request completes (success or failure).
   * Notifies any waiting consumers that a slot is available.
   */
  release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.emit('released', this.getState());

    // Notify waiters if any
    if (this.waitingQueue.length > 0 && this.canStart()) {
      const resolve = this.waitingQueue.shift();
      if (resolve) {
        resolve();
      }
    }

    // Emit slot-available for dispatcher to process queue
    if (this.canStart()) {
      this.emit('slot-available', this.getState());
    }
  }

  /**
   * Wait for a slot to become available.
   * Resolves immediately if a slot is available.
   */
  async waitForSlot(): Promise<void> {
    if (this.canStart()) {
      return;
    }

    return new Promise<void>(resolve => {
      this.waitingQueue.push(resolve);
      this.emit('waiting', {
        waitingCount: this.waitingQueue.length,
        state: this.getState(),
      });
    });
  }

  /**
   * Try to acquire a slot, waiting if necessary.
   * Returns true if slot was acquired, false if cancelled.
   */
  async tryAcquire(signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted) {
      return false;
    }

    await this.waitForSlot();

    if (signal?.aborted) {
      return false;
    }

    this.acquire();
    return true;
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Get current state for UI/monitoring.
   */
  getState(): ConcurrencyState {
    return {
      active: this.activeCount,
      max: this.config.maxConcurrent,
      available: Math.max(0, this.config.maxConcurrent - this.activeCount),
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): ConcurrencyConfig {
    return { ...this.config };
  }

  /**
   * Get number of requests waiting for a slot.
   */
  getWaitingCount(): number {
    return this.waitingQueue.length;
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Update configuration at runtime.
   * If maxConcurrent is increased, notify waiters.
   */
  updateConfig(updates: Partial<ConcurrencyConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // If we increased capacity, notify waiters
    if (this.config.maxConcurrent > oldConfig.maxConcurrent) {
      while (this.canStart() && this.waitingQueue.length > 0) {
        const resolve = this.waitingQueue.shift();
        if (resolve) {
          resolve();
        }
      }
    }

    this.emit('config-updated', { oldConfig, newConfig: this.config });
  }

  /**
   * Reset to default configuration.
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.emit('reset');
  }

  /**
   * Force reset active count (use with caution).
   * Useful for recovery from stuck states.
   */
  forceReset(): void {
    this.activeCount = 0;

    // Resolve all waiters
    while (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift();
      if (resolve) {
        resolve();
      }
    }

    this.emit('force-reset', this.getState());
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let concurrencyLimiterInstance: ConcurrencyLimiter | null = null;

export function getConcurrencyLimiter(config?: Partial<ConcurrencyConfig>): ConcurrencyLimiter {
  if (!concurrencyLimiterInstance) {
    concurrencyLimiterInstance = new ConcurrencyLimiter(config);
  } else if (config) {
    concurrencyLimiterInstance.updateConfig(config);
  }
  return concurrencyLimiterInstance;
}

export function resetConcurrencyLimiter(): void {
  if (concurrencyLimiterInstance) {
    concurrencyLimiterInstance.forceReset();
  }
  concurrencyLimiterInstance = null;
}
