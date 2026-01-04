// =============================================================================
// PROXY HEALTH CHECKER
// =============================================================================
// Periodic health checks for proxy configurations.
// Monitors: connectivity, IP leaks, latency.

import { httpClient } from './http-client'
import { createLogger } from './logger'
import { Errors } from './errors'
import type { ProxyConfig, ProxyStatus } from './types'

const logger = createLogger('proxy-health-check')

const HEALTH_CHECK_URL = 'https://icanhazip.com'
const HEALTH_CHECK_TIMEOUT = 5000  // 5 seconds
const DEFAULT_CHECK_INTERVAL = 30000  // 30 seconds

export class ProxyHealthChecker {
  private checkIntervalMs: number
  private checkTimer?: NodeJS.Timer
  private userIp?: string

  constructor(intervalMs: number = DEFAULT_CHECK_INTERVAL) {
    this.checkIntervalMs = intervalMs
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.checkTimer) {
      logger.warn('Health checks already running')
      return
    }

    // Run first check immediately
    this.performHealthCheck().catch(err => {
      logger.error('Initial health check failed', err as Error)
    })

    // Then run periodically
    this.checkTimer = setInterval(() => {
      this.performHealthCheck().catch(err => {
        logger.error('Periodic health check failed', err as Error)
      })
    }, this.checkIntervalMs)

    logger.info('Proxy health checks started', { intervalMs: this.checkIntervalMs })
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = undefined
      logger.info('Proxy health checks stopped')
    }
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(config?: ProxyConfig): Promise<ProxyStatus> {
    try {
      // Get current outbound IP
      const ipResult = await httpClient.fetch(HEALTH_CHECK_URL, {
        timeout: HEALTH_CHECK_TIMEOUT,
        retries: 1
      })

      if (!ipResult.ok) {
        const error = ipResult.error
        logger.warn('Health check failed', {
          config: config?.nickname,
          error: error.message
        })

        return {
          isEnabled: !!config,
          activeConfig: config,
          healthStatus: 'failed',
          lastHealthCheck: new Date().toISOString(),
          healthCheckMessage: error.message
        }
      }

      const outboundIp = (await ipResult.value.text()).trim()

      // Detect user IP (real IP without proxy)
      const userIp = await this.detectUserIp()

      // Check for IP leak
      if (config && userIp && outboundIp === userIp) {
        logger.warn('Proxy health check: IP leak detected', {
          proxy: config.nickname,
          ip: outboundIp
        })

        return {
          isEnabled: true,
          activeConfig: config,
          healthStatus: 'degraded',
          lastHealthCheck: new Date().toISOString(),
          outboundIp,
          userIp,
          healthCheckMessage: 'Proxy is exposing your real IP address'
        }
      }

      return {
        isEnabled: !!config,
        activeConfig: config,
        healthStatus: 'healthy',
        lastHealthCheck: new Date().toISOString(),
        outboundIp,
        userIp
      }
    } catch (error) {
      logger.error('Proxy health check threw error', error as Error)

      return {
        isEnabled: !!config,
        activeConfig: config,
        healthStatus: 'failed',
        lastHealthCheck: new Date().toISOString(),
        healthCheckMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Detect user's real IP (without proxy interference)
   * Cached after first detection
   */
  private async detectUserIp(): Promise<string | undefined> {
    if (this.userIp) {
      return this.userIp
    }

    try {
      // Temporarily disable proxy to get real IP
      const wasEnabled = httpClient.isProxyEnabled()
      if (wasEnabled) {
        httpClient.disableProxy()
      }

      const result = await httpClient.fetch(HEALTH_CHECK_URL, {
        timeout: 3000,
        retries: 1
      })

      if (result.ok) {
        this.userIp = (await result.value.text()).trim()
        logger.debug('User IP detected', { ip: this.userIp })
      }

      // Restore proxy state
      // Note: This is a bit hacky. In a real implementation,
      // we'd pass the proxy config back to enableProxy()
      if (wasEnabled) {
        const config = httpClient.getProxyConfig()
        if (config) {
          httpClient.enableProxy(config)
        }
      }

      return this.userIp
    } catch (error) {
      logger.warn('Failed to detect user IP', error as Error)
      return undefined
    }
  }
}

// Singleton instance
export const proxyHealthChecker = new ProxyHealthChecker()
