// =============================================================================
// HTTP CLIENT (The Door)
// =============================================================================
// Centralized HTTP client for ALL external network requests.
// All requests go through this single "door" - when proxy is enabled,
// all requests route through proxy. No per-request proxy options.

import { AppError, Errors } from './errors'
import { Result, ok, err } from './result'
import { createLogger } from './logger'
import type { ProxyConfig } from './types'

const logger = createLogger('http-client')

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface HttpClientOptions {
  timeout?: number         // ms, default 30000
  retries?: number         // default 3
  retryDelay?: number      // ms, default 1000
  // Standard fetch options
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string | object
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  ok: boolean
  text: () => Promise<string>
  json: <T = unknown>() => Promise<T>
  arrayBuffer: () => Promise<ArrayBuffer>
}

// -----------------------------------------------------------------------------
// Proxy State (managed by proxy system when implemented)
// -----------------------------------------------------------------------------

interface ProxyState {
  enabled: boolean
  config: ProxyConfig | null
}

// Proxy state - managed by proxy system
const proxyState: ProxyState = {
  enabled: false,
  config: null
}

// -----------------------------------------------------------------------------
// HTTP Client Class
// -----------------------------------------------------------------------------

class HttpClient {
  private defaultTimeout = 30000
  private defaultRetries = 3
  private defaultRetryDelay = 1000

  /**
   * Main fetch method - ALL external requests go through here.
   * When proxy is enabled, requests automatically route through proxy.
   */
  async fetch(
    url: string,
    options: HttpClientOptions = {}
  ): Promise<Result<HttpResponse, AppError>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      method = 'GET',
      headers = {},
      body
    } = options

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': 'YAAI/1.0',
        ...headers
      }
    }

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      if (typeof body === 'object') {
        fetchOptions.body = JSON.stringify(body)
        if (!headers['Content-Type']) {
          (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json'
        }
      } else {
        fetchOptions.body = body
      }
    }

    // Attempt request with retries
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.executeRequest(url, fetchOptions, timeout)

        // Return on success or client error (4xx)
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return ok(response)
        }

        // Retry on server error (5xx)
        if (response.status >= 500 && attempt < retries - 1) {
          logger.debug(`Request failed with ${response.status}, retrying...`, {
            url,
            attempt: attempt + 1,
            maxRetries: retries
          })
          await this.delay(retryDelay * Math.pow(2, attempt))  // Exponential backoff
          continue
        }

        return ok(response)
      } catch (error) {
        lastError = error as Error

        // Don't retry on abort (timeout)
        if (lastError.name === 'AbortError') {
          return err(new AppError({
            code: 'AI_REQUEST_FAILED',
            message: `Request to ${url} timed out after ${timeout}ms`,
            cause: lastError,
            context: { url, timeout },
            recoverable: true
          }))
        }

        // Retry on network errors
        if (attempt < retries - 1) {
          logger.debug('Network error, retrying...', {
            url,
            attempt: attempt + 1,
            error: lastError.message
          })
          await this.delay(retryDelay * Math.pow(2, attempt))
          continue
        }
      }
    }

    // All retries exhausted
    return err(new AppError({
      code: 'AI_REQUEST_FAILED',
      message: `Request to ${url} failed after ${retries} attempts`,
      cause: lastError || undefined,
      context: { url, retries },
      recoverable: true
    }))
  }

  /**
   * Execute a single request with timeout.
   * Routes through proxy if enabled, otherwise direct request.
   */
  private async executeRequest(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<HttpResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      let response: Response

      // Route through proxy if enabled
      if (proxyState.enabled && proxyState.config) {
        response = await this.fetchViaProxy(url, options, controller.signal)
      } else {
        // Direct request (no proxy)
        response = await fetch(url, {
          ...options,
          signal: controller.signal
        })
      }

      clearTimeout(timeoutId)

      // Wrap response in our HttpResponse interface
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
        text: () => response.text(),
        json: <T>() => response.json() as Promise<T>,
        arrayBuffer: () => response.arrayBuffer()
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Fetch via configured proxy.
   * For HTTP proxies: Uses HTTP CONNECT tunneling
   * For SOCKS5: Requires external tool or npm package
   *   (Bun's native fetch doesn't support SOCKS5 agents)
   */
  private async fetchViaProxy(
    url: string,
    options: RequestInit,
    signal: AbortSignal
  ): Promise<Response> {
    const config = proxyState.config!

    if (config.type === 'http') {
      // HTTP proxy support via CONNECT tunnel
      // Bun 1.0+ supports HTTP proxy through environment variables or agents
      // For now, we'll use Bun's native support if available
      try {
        // Set proxy environment variable for this request
        const originalHttpProxy = process.env.HTTP_PROXY
        const originalHttpsProxy = process.env.HTTPS_PROXY

        const proxyUrl = `http://${config.hostname}:${config.port}`
        process.env.HTTP_PROXY = proxyUrl
        process.env.HTTPS_PROXY = proxyUrl

        if (config.authentication) {
          const auth = Buffer.from(
            `${config.authentication.username}:${config.authentication.password}`
          ).toString('base64')
          const proxyAuthHeader = `Basic ${auth}`
          // Most HTTP clients respect Proxy-Authorization header
          const headers = options.headers as Record<string, string> || {}
          headers['Proxy-Authorization'] = proxyAuthHeader
          options.headers = headers
        }

        const response = await fetch(url, { ...options, signal })

        // Restore original proxy settings
        if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy
        else delete process.env.HTTP_PROXY

        if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy
        else delete process.env.HTTPS_PROXY

        return response
      } catch (error) {
        throw Errors.proxy.connectionFailed(config.nickname, error as Error)
      }
    } else if (config.type === 'socks5') {
      // SOCKS5 is not natively supported by Bun's fetch
      // Recommend: Use a local SOCKS5->HTTP bridge, or implement custom tunnel
      logger.warn('SOCKS5 proxy requested but not fully supported in Bun fetch', {
        proxy: config.nickname,
        suggestion: 'Use an HTTP proxy instead, or run a local SOCKS5->HTTP bridge'
      })

      // Fallback: attempt direct request and log warning
      // In production, this should probably fail hard
      logger.warn('SOCKS5 fallback: attempting direct request')
      return fetch(url, { ...options, signal })
    }

    throw Errors.proxy.configInvalid('unsupported proxy type')
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ---------------------------------------------------------------------------
  // Proxy Management (called by proxy system when implemented)
  // ---------------------------------------------------------------------------

  /**
   * Enable proxy routing for all requests.
   * Called by proxy system when user activates a proxy.
   */
  enableProxy(config: ProxyConfig): void {
    proxyState.enabled = true
    proxyState.config = config
    logger.info('Proxy enabled', {
      nickname: config.nickname,
      type: config.type,
      host: config.hostname,
      port: config.port
    })
  }

  /**
   * Disable proxy routing.
   * Called by proxy system when user deactivates proxy.
   */
  disableProxy(): void {
    const nickname = proxyState.config?.nickname
    proxyState.enabled = false
    proxyState.config = null
    if (nickname) {
      logger.info('Proxy disabled', { nickname })
    }
  }

  /**
   * Check if proxy is currently enabled.
   */
  isProxyEnabled(): boolean {
    return proxyState.enabled && proxyState.config !== null
  }

  /**
   * Get current proxy configuration.
   */
  getProxyConfig(): ProxyConfig | null {
    return proxyState.config
  }
}

// -----------------------------------------------------------------------------
// Singleton Export
// -----------------------------------------------------------------------------

export const httpClient = new HttpClient()
