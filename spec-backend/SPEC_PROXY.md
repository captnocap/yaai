# Proxy Configuration & Routing — Specification

> Version: 1.0.0
> Last Updated: 2026-01-04

Centralized network request routing through configurable HTTP/SOCKS5 proxy servers with health monitoring and real-time status indication in the UI.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Proxy Configuration Data Model](#2-proxy-configuration-data-model)
3. [Database Schema](#3-database-schema)
4. [Centralized Request Handler](#4-centralized-request-handler)
5. [Health Check System](#5-health-check-system)
6. [WebSocket Handlers](#6-websocket-handlers)
7. [Frontend Components](#7-frontend-components)
8. [Error Handling & Status States](#8-error-handling--status-states)
9. [Implementation Notes](#9-implementation-notes)

---

## 1. Architecture Overview

### 1.1 The "Door" Model

All external network requests are treated as flowing through a single "door":

```
┌─────────────────────────────────────────────┐
│           Frontend Application              │
│  (WebSocket messages only, no direct       │
│   external requests)                       │
└──────────┬──────────────────────────────────┘
           │ WebSocket (port 3001)
           ▼
┌──────────────────────────────────────────────┐
│          Backend Server (Bun)                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  The "Door" (Centralized Handler)      │  │
│  │  - All external requests funnel here   │  │
│  │  - All responses come back via here    │  │
│  │  - Proxy toggled ON/OFF at this point  │  │
│  └─────────────┬──────────────────────────┘  │
│               │                               │
│               ├─ (Proxy OFF) ─┐              │
│               │               │ Direct       │
│               │               ▼ Request      │
│               │        External API          │
│               │               ▲              │
│               │               │ Response     │
│               │               │              │
│               ├─ (Proxy ON) ──┐              │
│               │               │ Via Proxy    │
│               │               ▼              │
│               │        SOCKS5/HTTP Proxy     │
│               │               ▲              │
│               │               │ Data         │
│               │               │              │
│               ▼               │              │
│        [Response lands here, is              │
│         validated, streamed to               │
│         frontend via WebSocket]              │
└──────────────────────────────────────────────┘
```

**Key principle**: Once a request goes out (proxy or direct), it must come back the same way. If proxy is toggled OFF while a proxied request is in-flight, that response is lost.

### 1.2 Request Flow

```
1. Frontend sends WebSocket request (e.g., ai:chat-stream)
2. Backend receives request via WebSocket handler
3. Backend calls centralized requestHandler()
4. requestHandler checks: Is proxy enabled?
5. If yes: Wraps fetch with socks agent, sends through proxy
6. If no: Sends direct fetch
7. Response comes back (or times out)
8. Response validated and streamed to frontend via WebSocket
9. Frontend displays response
```

### 1.3 Proxy Toggle Behavior

- **Proxy ON**: All subsequent requests use the active proxy config
- **Proxy OFF**: All subsequent requests go direct
- **In-flight request**: Once sent (proxy or direct), cannot switch mid-flight
- **Config switch**: Turning on proxy B while proxy A is active = proxy A turns off, proxy B turns on
- **Failed proxy**: If proxy is required but unavailable, request fails (no fallback to direct)

---

## 2. Proxy Configuration Data Model

### 2.1 Proxy Config Type

```typescript
// lib/core/types.ts (add to existing types)

export type ProxyType = 'http' | 'socks5'

export type ProxyConfigId = Brand<string, 'ProxyConfigId'>

export interface ProxyConfig {
  id: ProxyConfigId
  nickname: string           // User-friendly name
  type: ProxyType            // 'http' or 'socks5'
  hostname: string           // IP or domain
  port: number               // 1-65535
  authentication?: {
    username: string
    password: string
  }
  isActive: boolean           // Only one can be true
  createdAt: string          // ISO 8601
  updatedAt: string          // ISO 8601
}

export interface ProxyStatus {
  isEnabled: boolean              // Is any proxy active?
  activeConfig?: ProxyConfig      // Current active config (if enabled)
  healthStatus: 'healthy' | 'degraded' | 'failed'
  lastHealthCheck: string         // ISO 8601
  outboundIp?: string             // Detected IP (from icanhazip.com)
  userIp?: string                 // User's real IP (detected once at startup)
  healthCheckMessage?: string     // Error message if degraded/failed
}
```

### 2.2 Error Codes for Proxy

Add to `ErrorCode` type in `lib/core/errors.ts`:

```typescript
// Proxy errors (7xxx)
| 'PROXY_CONFIG_INVALID'         // 7001
| 'PROXY_CONNECTION_FAILED'      // 7002
| 'PROXY_AUTH_FAILED'            // 7003
| 'PROXY_DISABLED_MID_FLIGHT'    // 7004
| 'PROXY_HEALTH_CHECK_FAILED'    // 7005
| 'PROXY_EXPOSED_USER_IP'        // 7006
```

Add error factories:

```typescript
// In Errors object in lib/core/errors.ts

proxy: {
  configInvalid: (reason: string) => new AppError({
    code: 'PROXY_CONFIG_INVALID',
    message: `Invalid proxy configuration: ${reason}`,
    context: { reason }
  }),

  connectionFailed: (config: ProxyConfig, cause?: Error) => new AppError({
    code: 'PROXY_CONNECTION_FAILED',
    message: `Failed to connect to proxy ${config.nickname}`,
    cause,
    context: { proxy: config.nickname, type: config.type },
    recoverable: true
  }),

  authFailed: (config: ProxyConfig) => new AppError({
    code: 'PROXY_AUTH_FAILED',
    message: `Proxy authentication failed for ${config.nickname}`,
    context: { proxy: config.nickname },
    recoverable: true
  }),

  disabledMidFlight: () => new AppError({
    code: 'PROXY_DISABLED_MID_FLIGHT',
    message: 'Proxy was disabled while request was in flight',
    recoverable: true
  }),

  exposedUserIp: () => new AppError({
    code: 'PROXY_EXPOSED_USER_IP',
    message: 'Proxy health check detected user IP being exposed',
    context: {},
    recoverable: true
  })
}
```

---

## 3. Database Schema

### 3.1 Proxy Configs Table

Add migration file: `app/src/bun/migrations/app/003_create_proxy_configs.sql`

```sql
CREATE TABLE IF NOT EXISTS proxy_configs (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('http', 'socks5')),
  hostname TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  username TEXT,
  password TEXT,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_proxy_active
  ON proxy_configs(is_active) WHERE is_active = 1;

-- Ensure only one active proxy
CREATE TRIGGER proxy_activate
  BEFORE UPDATE OF is_active ON proxy_configs
  WHEN NEW.is_active = 1
  BEGIN
    UPDATE proxy_configs SET is_active = 0 WHERE is_active = 1 AND id != NEW.id;
  END;
```

### 3.2 Proxy Health History Table (Optional)

For tracking health check results over time:

```sql
CREATE TABLE IF NOT EXISTS proxy_health_checks (
  id TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'failed')),
  outbound_ip TEXT,
  user_ip TEXT,
  error_message TEXT,
  checked_at TEXT NOT NULL,
  FOREIGN KEY (proxy_id) REFERENCES proxy_configs(id) ON DELETE CASCADE
);

CREATE INDEX idx_proxy_health_recent
  ON proxy_health_checks(proxy_id, checked_at DESC);
```

---

## 4. Centralized Request Handler

### 4.1 HTTP Client Module

Create: `app/src/bun/lib/core/http-client.ts`

```typescript
import { AppError, Errors, Result, logger } from './index'
import type { ProxyConfig } from './types'

export interface HttpClientOptions {
  timeout?: number            // ms, default 30000
  retries?: number            // default 3
  retryDelay?: number          // ms, default 1000
  requireProxy?: boolean        // If true and proxy OFF, fail
}

export interface HttpResponse<T = unknown> {
  status: number
  headers: Record<string, string>
  body: T
  text: () => Promise<string>
  json: () => Promise<unknown>
  arrayBuffer: () => Promise<ArrayBuffer>
}

class HttpClient {
  private proxyConfig: ProxyConfig | null = null
  private proxyEnabled: boolean = false
  private userIp?: string

  constructor() {
    // Detect user IP on startup
    this.detectUserIp()
  }

  private async detectUserIp(): Promise<void> {
    try {
      const response = await this.fetchDirect('https://icanhazip.com')
      this.userIp = (await response.text()).trim()
      logger.info('User IP detected', { ip: this.userIp })
    } catch (error) {
      logger.warn('Failed to detect user IP', error as Error)
    }
  }

  /**
   * Set active proxy configuration
   * Fails if proxy is invalid
   */
  async setActiveProxy(config: ProxyConfig): Promise<Result<void>> {
    // Validate proxy config
    const validation = this.validateProxyConfig(config)
    if (!validation.ok) {
      return validation
    }

    // Try to establish connection to proxy
    const testResult = await this.testProxyConnection(config)
    if (!testResult.ok) {
      return testResult
    }

    this.proxyConfig = config
    this.proxyEnabled = true
    logger.info('Proxy activated', { nickname: config.nickname, type: config.type })
    return Result.ok(undefined)
  }

  /**
   * Disable active proxy (return to direct requests)
   */
  disableProxy(): void {
    if (this.proxyEnabled) {
      logger.info('Proxy disabled', { nickname: this.proxyConfig?.nickname })
    }
    this.proxyEnabled = false
    this.proxyConfig = null
  }

  /**
   * Check if proxy is currently enabled and valid
   */
  isProxyEnabled(): boolean {
    return this.proxyEnabled && this.proxyConfig !== null
  }

  /**
   * Get current proxy status
   */
  getProxyStatus(): ProxyStatus {
    // Implemented in ProxyStore
    return {}
  }

  /**
   * Core fetch method - ALL external requests go through here
   */
  async fetch<T = unknown>(
    url: string,
    options: RequestInit & HttpClientOptions = {}
  ): Promise<Result<HttpResponse<T>>> {
    const { timeout = 30000, retries = 3, retryDelay = 1000, ...fetchOptions } = options

    // Check if proxy is required
    if (options.requireProxy && !this.proxyEnabled) {
      return Result.err(Errors.proxy.disabledMidFlight())
    }

    // Attempt request with retries
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await (this.proxyEnabled
          ? this.fetchViaProxy(url, { ...fetchOptions, signal: controller.signal })
          : this.fetchDirect(url, { ...fetchOptions, signal: controller.signal }))

        clearTimeout(timeoutId)

        // Check if this is a valid response
        if (!response.ok && response.status >= 500 && attempt < retries - 1) {
          // Retry on server errors
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
          continue
        }

        return Result.ok({
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.json(),
          text: () => response.text(),
          json: () => response.json(),
          arrayBuffer: () => response.arrayBuffer()
        } as HttpResponse<T>)
      } catch (error) {
        if (attempt === retries - 1) {
          const appError = this.mapFetchError(error, url)
          return Result.err(appError)
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }

    return Result.err(Errors.proxy.connectionFailed(this.proxyConfig!))
  }

  /**
   * Fetch directly (no proxy)
   */
  private async fetchDirect(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    return fetch(url, options)
  }

  /**
   * Fetch via proxy using socks package
   */
  private async fetchViaProxy(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    if (!this.proxyConfig) {
      throw Errors.proxy.disabledMidFlight()
    }

    // Create socks agent based on proxy type
    const { SocksClient } = await import('socks')
    const agent = new SocksClient({
      proxy: {
        host: this.proxyConfig.hostname,
        port: this.proxyConfig.port,
        type: this.proxyConfig.type === 'socks5' ? 5 : 4,
        userId: this.proxyConfig.authentication?.username,
        password: this.proxyConfig.authentication?.password
      }
    })

    // Bun doesn't support SOCKS5 directly; alternative approach:
    // - Use a local HTTP proxy that speaks SOCKS5
    // - Or use tunneling library that wraps fetch

    // For now, assuming 'socks' package provides agent-style wrapping:
    return fetch(url, { ...options, agent })
  }

  /**
   * Validate proxy configuration
   */
  private validateProxyConfig(config: ProxyConfig): Result<void> {
    if (!config.hostname || config.hostname.trim() === '') {
      return Result.err(Errors.proxy.configInvalid('hostname is required'))
    }
    if (config.port < 1 || config.port > 65535) {
      return Result.err(Errors.proxy.configInvalid(`port must be 1-65535, got ${config.port}`))
    }
    if (!['http', 'socks5'].includes(config.type)) {
      return Result.err(Errors.proxy.configInvalid(`type must be 'http' or 'socks5'`))
    }
    return Result.ok(undefined)
  }

  /**
   * Test proxy connection
   */
  private async testProxyConnection(config: ProxyConfig): Promise<Result<void>> {
    try {
      // Try to fetch through proxy to icanhazip.com (timeout after 5s)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      await fetch('https://icanhazip.com', { signal: controller.signal })
      clearTimeout(timeout)

      return Result.ok(undefined)
    } catch (error) {
      if (error instanceof Error && error.message.includes('auth')) {
        return Result.err(Errors.proxy.authFailed(config))
      }
      return Result.err(Errors.proxy.connectionFailed(config, error as Error))
    }
  }

  /**
   * Map fetch errors to AppError
   */
  private mapFetchError(error: unknown, url: string): AppError {
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        return Errors.proxy.connectionFailed(this.proxyConfig!)
      }
      if (error.message.includes('timeout') || error.name === 'AbortError') {
        return new AppError({
          code: 'AI_REQUEST_FAILED',
          message: `Request to ${url} timed out`,
          cause: error
        })
      }
      return new AppError({
        code: 'AI_REQUEST_FAILED',
        message: `Network request failed: ${error.message}`,
        cause: error
      })
    }
    return new AppError({
      code: 'AI_REQUEST_FAILED',
      message: `Unknown error during network request to ${url}`
    })
  }
}

// Singleton instance
export const httpClient = new HttpClient()
```

### 4.2 Integration with AI Providers

All AI provider implementations must use `httpClient` instead of direct `fetch()`:

**In `lib/ai/anthropic.ts` (and openai.ts, google.ts)**:

```typescript
import { httpClient } from '../core/http-client'

async function streamAnthropicMessage(
  messages: Message[],
  options: StreamOptions
): Promise<Result<Stream<StreamChunk>>> {
  const fetchResult = await httpClient.fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      requireProxy: true  // Fail if proxy is required but disabled
    }
  )

  if (!fetchResult.ok) {
    return Result.err(fetchResult.error)
  }

  // Handle streaming response...
}
```

---

## 5. Health Check System

### 5.1 Health Check Service

Create: `app/src/bun/lib/core/proxy-health-check.ts`

```typescript
import { httpClient } from './http-client'
import { logger } from './logger'
import { AppError, Errors } from './errors'
import type { ProxyConfig, ProxyStatus } from './types'

export class ProxyHealthChecker {
  private checkIntervalMs = 30000  // 30 seconds
  private checkTimer?: NodeJS.Timer

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    this.checkTimer = setInterval(() => {
      this.performHealthCheck()
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
      // Get IP address
      const response = await httpClient.fetch('https://icanhazip.com', {
        timeout: 5000,
        retries: 1
      })

      if (!response.ok) {
        return {
          isEnabled: !!config,
          activeConfig: config,
          healthStatus: 'failed',
          lastHealthCheck: new Date().toISOString(),
          healthCheckMessage: 'Health check endpoint unreachable'
        }
      }

      const outboundIp = (await response.text()).trim()
      const userIp = await this.detectUserIp()

      // Check if we're exposing user IP
      if (userIp && outboundIp === userIp && config) {
        logger.warn('Proxy health check: user IP exposed', {
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
      logger.error('Proxy health check failed', error as Error)

      return {
        isEnabled: !!config,
        activeConfig: config,
        healthStatus: 'failed',
        lastHealthCheck: new Date().toISOString(),
        healthCheckMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async detectUserIp(): Promise<string | undefined> {
    try {
      // Try without proxy to get real IP
      const response = await httpClient.fetch('https://icanhazip.com', {
        timeout: 3000,
        retries: 1
      })
      if (response.ok) {
        return (await response.text()).trim()
      }
    } catch {
      // Ignore errors
    }
    return undefined
  }
}

export const proxyHealthChecker = new ProxyHealthChecker()
```

### 5.2 Integration with AppStore

The `AppStore` should manage proxy configurations and delegate to health checker.

---

## 6. WebSocket Handlers

### 6.1 Proxy Handler Channels

Create: `app/src/bun/lib/ws/handlers/proxy.ts`

```typescript
import { Result, AppError, logger } from '../../core'
import { httpClient } from '../../core/http-client'
import { proxyHealthChecker } from '../../core/proxy-health-check'
import { AppStore } from '../../stores/app-store'
import type { ProxyConfig, ProxyStatus } from '../../core/types'
import type { WSRequest, WSResponse } from '../protocol'

const appStore = new AppStore()

export const proxyHandlers = {
  /**
   * proxy:list - Get all saved proxy configurations
   */
  'proxy:list': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const configs = await appStore.listProxyConfigs()
      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:list',
        payload: configs,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:list',
        error: { code: 'HANDLER_ERROR', message: (error as Error).message },
        timestamp: Date.now()
      }
    }
  },

  /**
   * proxy:create - Create and save a new proxy configuration
   */
  'proxy:create': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { nickname, type, hostname, port, username, password } = req.payload as any

      const result = await appStore.createProxyConfig({
        nickname,
        type,
        hostname,
        port,
        authentication: username && password ? { username, password } : undefined
      })

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'proxy:create',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:create',
        payload: result.value,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:create',
        error: { code: 'HANDLER_ERROR', message: (error as Error).message },
        timestamp: Date.now()
      }
    }
  },

  /**
   * proxy:delete - Delete a proxy configuration
   */
  'proxy:delete': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { id } = req.payload as { id: string }
      const result = await appStore.deleteProxyConfig(id as any)

      if (!result.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'proxy:delete',
          error: { code: result.error.code, message: result.error.message },
          timestamp: Date.now()
        }
      }

      // If we deleted the active proxy, disable it
      httpClient.disableProxy()

      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:delete',
        payload: true,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:delete',
        error: { code: 'HANDLER_ERROR', message: (error as Error).message },
        timestamp: Date.now()
      }
    }
  },

  /**
   * proxy:toggle - Enable/disable a proxy configuration
   */
  'proxy:toggle': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { id, enable } = req.payload as { id: string; enable: boolean }

      if (!enable) {
        httpClient.disableProxy()
        logger.info('Proxy disabled via WebSocket')
        const status = await proxyHealthChecker.performHealthCheck()
        return {
          type: 'response',
          id: req.id,
          channel: 'proxy:toggle',
          payload: status,
          timestamp: Date.now()
        }
      }

      // Get the config
      const configResult = await appStore.getProxyConfig(id as any)
      if (!configResult.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'proxy:toggle',
          error: { code: configResult.error.code, message: configResult.error.message },
          timestamp: Date.now()
        }
      }

      // Try to activate
      const activateResult = await httpClient.setActiveProxy(configResult.value)
      if (!activateResult.ok) {
        return {
          type: 'response',
          id: req.id,
          channel: 'proxy:toggle',
          error: { code: activateResult.error.code, message: activateResult.error.message },
          timestamp: Date.now()
        }
      }

      // Mark as active in database
      await appStore.setActiveProxyConfig(id as any)

      // Run immediate health check
      const status = await proxyHealthChecker.performHealthCheck(configResult.value)

      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:toggle',
        payload: status,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:toggle',
        error: { code: 'HANDLER_ERROR', message: (error as Error).message },
        timestamp: Date.now()
      }
    }
  },

  /**
   * proxy:status - Get current proxy status
   */
  'proxy:status': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const activeConfig = await appStore.getActiveProxyConfig()
      const status = await proxyHealthChecker.performHealthCheck(
        activeConfig.ok ? activeConfig.value : undefined
      )

      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:status',
        payload: status,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        type: 'response',
        id: req.id,
        channel: 'proxy:status',
        error: { code: 'HANDLER_ERROR', message: (error as Error).message },
        timestamp: Date.now()
      }
    }
  }
}
```

### 6.2 Channel Registry Addition

Add to SPEC_WEBSOCKET.md channel table:

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `proxy:list` | Request | `{}` | `ProxyConfig[]` | List all proxy configs |
| `proxy:create` | Request | `{ nickname, type, hostname, port, username?, password? }` | `ProxyConfig` | Create new proxy config |
| `proxy:delete` | Request | `{ id }` | `boolean` | Delete proxy config |
| `proxy:toggle` | Request | `{ id, enable }` | `ProxyStatus` | Enable/disable proxy |
| `proxy:status` | Request | `{}` | `ProxyStatus` | Get current proxy status |

---

## 7. Frontend Components

### 7.1 Proxy Indicator (Toolbar Dot)

**Component**: `src/mainview/components/toolbar/ProxyIndicator.tsx`

```typescript
import React, { useEffect, useState } from 'react'
import { commBridge } from '../../lib/comm-bridge'
import type { ProxyStatus } from '@shared/types'

interface ProxyIndicatorProps {
  onClick?: () => void
}

export const ProxyIndicator: React.FC<ProxyIndicatorProps> = ({ onClick }) => {
  const [status, setStatus] = useState<ProxyStatus | null>(null)
  const [hoveredIp, setHoveredIp] = useState<string>()

  useEffect(() => {
    // Poll proxy status every 30s
    const fetchStatus = async () => {
      const result = await commBridge.proxyStatus()
      if (result.ok) {
        setStatus(result.value)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (!status?.isEnabled) return 'transparent'
    if (status.healthStatus === 'healthy') return 'green'
    if (status.healthStatus === 'degraded') return 'yellow'
    return 'red'
  }

  return (
    <div className="proxy-indicator">
      <button
        className="proxy-dot"
        style={{ backgroundColor: getStatusColor() }}
        onClick={onClick}
        title={`Proxy: ${status?.isEnabled ? 'ON' : 'OFF'}`}
      />
      {status?.isEnabled && (
        <div className="proxy-tooltip" onMouseEnter={() => setHoveredIp(status.outboundIp)}>
          {status.outboundIp || 'Checking...'}
        </div>
      )}
    </div>
  )
}
```

### 7.2 Proxy Configuration Popover

**Component**: `src/mainview/components/toolbar/ProxyPopover.tsx`

```typescript
import React, { useEffect, useState } from 'react'
import { commBridge } from '../../lib/comm-bridge'
import type { ProxyConfig, ProxyStatus } from '@shared/types'

export const ProxyPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [configs, setConfigs] = useState<ProxyConfig[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadConfigs = async () => {
      const result = await commBridge.proxyList()
      if (result.ok) {
        setConfigs(result.value)
        const active = result.value.find(c => c.isActive)
        setActiveId(active?.id)
      }
    }
    loadConfigs()
  }, [])

  const handleToggle = async (id: string, enable: boolean) => {
    setIsLoading(true)
    const result = await commBridge.proxyToggle(id, enable)
    if (result.ok) {
      setActiveId(enable ? id : undefined)
    }
    setIsLoading(false)
  }

  return (
    <div className="proxy-popover">
      <div className="proxy-popover-header">Proxy Configurations</div>
      {configs.map(config => (
        <div key={config.id} className="proxy-config-item">
          <label>
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={e => handleToggle(config.id, e.target.checked)}
              disabled={isLoading}
            />
            {config.nickname}
          </label>
          <span className="proxy-config-type">{config.type}</span>
          <span className="proxy-config-addr">
            {config.hostname}:{config.port}
          </span>
        </div>
      ))}
    </div>
  )
}
```

### 7.3 Proxy Settings Panel

**Component**: `src/mainview/components/settings/ProxySettings.tsx`

Add section to existing settings panel for:
- List of saved proxy configs
- Create new proxy config form (nickname, type, hostname, port, auth)
- Edit existing config
- Delete config
- Test connection button

---

## 8. Error Handling & Status States

### 8.1 Status States

- **OFF (transparent dot)**: No proxy configured or active
- **GREEN (green dot)**: Proxy active and healthy
- **YELLOW (yellow dot)**: Proxy active but degraded (e.g., leaking user IP)
- **RED (red dot)**: Proxy active but failed to connect

### 8.2 Error Recovery

- **Proxy connection fails**: Error returned to user, request fails (no fallback)
- **Health check shows IP leak**: Warn user, set status to degraded (don't disable)
- **Proxy disabled mid-flight**: In-flight request is lost, frontend retries
- **Invalid config**: Validation at save time, prevented from activation

---

## 9. Implementation Notes

### 9.1 Bun SOCKS5 Support Challenge

**Note**: Bun's native `fetch` doesn't support SOCKS5 proxies. Solutions:

1. **Option A**: Use `socks` npm package with custom transport
   - Pros: Works with most fetch implementations
   - Cons: May require bundling or compatibility layer

2. **Option B**: Use local HTTP proxy (e.g., Privoxy, squid)
   - User configures local proxy that bridges to SOCKS5
   - Pros: Works with standard HTTP proxy handling
   - Cons: Requires user to run additional process

3. **Option C**: Implement SOCKS5 client directly
   - Use `@types/node` for socket operations
   - Pros: Full control, no external process
   - Cons: Complex implementation

**Recommended**: Option A with fallback to Option B if npm package integration fails.

### 9.2 AppStore Integration

The `AppStore` (or new `ProxyStore`) must implement:
- CRUD operations for proxy configs
- Query for active proxy config
- Transaction-safe updates (only one active at a time)

### 9.3 Security Notes

- **Passwords**: Encrypt in database using Bun's crypto module
- **Credentials in logs**: Never log sensitive auth data
- **MITM risk**: Health check to icanhazip.com uses HTTPS only
- **IP detection**: User IP detected once at startup, cached

### 9.4 Performance Considerations

- Health checks run every 30 seconds (configurable)
- Failed proxy requests don't retry to direct (hard fail)
- Proxy connection test timeout: 5 seconds
- Request timeout: 30 seconds (configurable per request)

### 9.5 Future Enhancements

- Proxy rotation (cycle through multiple proxies)
- Request-level proxy override
- Proxy statistics and bandwidth tracking
- Scheduled proxy disabling

---

*End of Proxy Configuration & Routing specification.*
