// =============================================================================
// VARIABLE CACHE
// =============================================================================
// TTL-based in-memory cache for variable expansion results.
// Used to cache expensive operations like REST API calls or wildcard selections.

import { createLogger } from '../core/logger'

const logger = createLogger('variable-cache')

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CacheEntry<T = string> {
  value: T
  expiresAt: number  // Unix timestamp in ms
  createdAt: number
}

export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

// -----------------------------------------------------------------------------
// Variable Cache Class
// -----------------------------------------------------------------------------

export class VariableCache {
  private cache = new Map<string, CacheEntry>()
  private hits = 0
  private misses = 0
  private cleanupInterval: NodeJS.Timer | null = null

  constructor(
    private defaultTtl: number = 60000,  // Default 60 seconds
    private cleanupIntervalMs: number = 30000  // Cleanup every 30 seconds
  ) {
    this.startCleanup()
  }

  /**
   * Get a cached value
   */
  get(key: string): string | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return undefined
    }

    this.hits++
    return entry.value
  }

  /**
   * Set a cached value with optional TTL
   */
  set(key: string, value: string, ttl?: number): void {
    const now = Date.now()
    const actualTtl = ttl ?? this.defaultTtl

    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt: now + actualTtl
    })

    logger.debug('Cache set', { key, ttl: actualTtl })
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Delete all keys matching a prefix
   */
  deleteByPrefix(prefix: string): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }
    logger.debug('Cache cleared by prefix', { prefix, count })
    return count
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    logger.info('Cache cleared', { previousSize: size })
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    }
  }

  /**
   * Get remaining TTL for a key (in ms)
   */
  getTtl(key: string): number | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    const remaining = entry.expiresAt - Date.now()
    return remaining > 0 ? remaining : 0
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      logger.debug('Cache cleanup', { expired: expiredCount, remaining: this.cache.size })
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.cleanupIntervalMs)

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Get or compute a value (cache-aside pattern)
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<string>,
    ttl?: number
  ): Promise<string> {
    // Check cache first
    const cached = this.get(key)
    if (cached !== undefined) {
      return cached
    }

    // Compute and cache
    const value = await compute()
    this.set(key, value, ttl)
    return value
  }
}

// -----------------------------------------------------------------------------
// Singleton Instance
// -----------------------------------------------------------------------------

// Default cache instance for variable expansion
export const variableCache = new VariableCache()

// -----------------------------------------------------------------------------
// Cache Key Helpers
// -----------------------------------------------------------------------------

/**
 * Generate cache key for a variable
 */
export function variableCacheKey(variableName: string): string {
  return `var:${variableName}`
}

/**
 * Generate cache key for a wildcard variable with session context
 */
export function wildcardCacheKey(variableName: string, sessionId?: string): string {
  return sessionId
    ? `wildcard:${variableName}:${sessionId}`
    : `wildcard:${variableName}`
}

/**
 * Generate cache key for REST API variable
 */
export function restApiCacheKey(variableName: string, urlHash?: string): string {
  return urlHash
    ? `rest:${variableName}:${urlHash}`
    : `rest:${variableName}`
}

/**
 * Hash a URL for cache key (simple hash)
 */
export function hashUrl(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash  // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
