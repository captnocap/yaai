// =============================================================================
// PROXY WEBSOCKET HANDLERS
// =============================================================================
// WebSocket endpoints for proxy configuration management.

import { ProxyStore } from '../../stores'
import { httpClient, proxyHealthChecker, Errors, logger, type ProxyConfig } from '../../core'
import { getWSServer, type WSRequest, type WSResponse } from '../index'

const log = logger.child({ module: 'ws:proxy' })

export function registerProxyHandlers(wsServer: ReturnType<typeof getWSServer>): void {
  // ---------------------------------------------------------------------------
  // proxy:list - Get all saved proxy configurations
  // ---------------------------------------------------------------------------
  wsServer.onRequest('proxy:list', async () => {
    try {
      const result = ProxyStore.list()
      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: result.error.code,
            message: result.error.message
          }
        }
      }

      return {
        ok: true,
        data: result.value
      }
    } catch (error) {
      log.error('proxy:list failed', error as Error)
      return {
        ok: false,
        error: {
          code: 'HANDLER_ERROR',
          message: 'Failed to list proxy configurations'
        }
      }
    }
  })

  // ---------------------------------------------------------------------------
  // proxy:create - Create a new proxy configuration
  // ---------------------------------------------------------------------------
  wsServer.onRequest('proxy:create', async (payload) => {
    try {
      const { nickname, type, hostname, port, username, password } = payload as any

      // Validate input
      if (!nickname || !type || !hostname || !port) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Missing required fields: nickname, type, hostname, port'
          }
        }
      }

      const result = ProxyStore.create({
        nickname,
        type: type as any,
        hostname,
        port: parseInt(port, 10),
        authentication: username && password ? { username, password } : undefined,
        isActive: false
      })

      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: result.error.code,
            message: result.error.message
          }
        }
      }

      log.info('Proxy config created', { nickname })
      return {
        ok: true,
        data: result.value
      }
    } catch (error) {
      log.error('proxy:create failed', error as Error)
      return {
        ok: false,
        error: {
          code: 'HANDLER_ERROR',
          message: 'Failed to create proxy configuration'
        }
      }
    }
  })

  // ---------------------------------------------------------------------------
  // proxy:delete - Delete a proxy configuration
  // ---------------------------------------------------------------------------
  wsServer.onRequest('proxy:delete', async (payload) => {
    try {
      const { id } = payload as { id: string }

      if (!id) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Missing required field: id'
          }
        }
      }

      // If deleting the active proxy, disable it
      const activeResult = ProxyStore.getActive()
      if (activeResult.ok && activeResult.value?.id === id) {
        httpClient.disableProxy()
        log.info('Deleted active proxy, disabled proxy routing')
      }

      const result = ProxyStore.delete(id as any)

      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: result.error.code,
            message: result.error.message
          }
        }
      }

      return {
        ok: true,
        data: true
      }
    } catch (error) {
      log.error('proxy:delete failed', error as Error)
      return {
        ok: false,
        error: {
          code: 'HANDLER_ERROR',
          message: 'Failed to delete proxy configuration'
        }
      }
    }
  })

  // ---------------------------------------------------------------------------
  // proxy:toggle - Enable/disable a proxy configuration
  // ---------------------------------------------------------------------------
  wsServer.onRequest('proxy:toggle', async (payload) => {
    try {
      const { id, enable } = payload as { id: string; enable: boolean }

      if (!id) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Missing required field: id'
          }
        }
      }

      // Disable proxy
      if (!enable) {
        httpClient.disableProxy()
        await proxyHealthChecker.performHealthCheck()
        log.info('Proxy disabled via WebSocket')

        const status = await proxyHealthChecker.performHealthCheck()
        return {
          ok: true,
          data: status
        }
      }

      // Enable proxy
      const configResult = ProxyStore.getById(id as any)
      if (!configResult.ok) {
        return {
          ok: false,
          error: {
            code: configResult.error.code,
            message: configResult.error.message
          }
        }
      }

      const config = configResult.value

      // Activate in httpClient
      httpClient.enableProxy(config)

      // Mark as active in database
      const updateResult = ProxyStore.setActive(id as any)
      if (!updateResult.ok) {
        httpClient.disableProxy()
        return {
          ok: false,
          error: {
            code: updateResult.error.code,
            message: updateResult.error.message
          }
        }
      }

      // Run immediate health check
      const status = await proxyHealthChecker.performHealthCheck(config)

      log.info('Proxy enabled via WebSocket', { nickname: config.nickname })
      return {
        ok: true,
        data: status
      }
    } catch (error) {
      log.error('proxy:toggle failed', error as Error)
      httpClient.disableProxy()
      return {
        ok: false,
        error: {
          code: 'HANDLER_ERROR',
          message: 'Failed to toggle proxy'
        }
      }
    }
  })

  // ---------------------------------------------------------------------------
  // proxy:status - Get current proxy status
  // ---------------------------------------------------------------------------
  wsServer.onRequest('proxy:status', async () => {
    try {
      const activeResult = ProxyStore.getActive()
      const config = activeResult.ok ? activeResult.value : undefined

      const status = await proxyHealthChecker.performHealthCheck(config || undefined)

      return {
        ok: true,
        data: status
      }
    } catch (error) {
      log.error('proxy:status failed', error as Error)
      return {
        ok: false,
        error: {
          code: 'HANDLER_ERROR',
          message: 'Failed to get proxy status'
        }
      }
    }
  })

  log.info('Proxy handlers registered')
}
