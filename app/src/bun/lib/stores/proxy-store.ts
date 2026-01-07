// =============================================================================
// PROXY STORE
// =============================================================================
// SQLite-backed storage for proxy configurations.

import { db } from '../db'
import {
  Result,
  Errors,
  logger,
  newProxyConfigId,
  type ProxyConfigId,
  type ProxyConfig,
  type ProxyType
} from '../core'

const log = logger.child({ module: 'proxy-store' })

interface ProxyConfigRow {
  id: string
  nickname: string
  type: string
  hostname: string
  port: number
  username: string | null
  password: string | null
  is_active: number
  created_at: string
  updated_at: string
}

function rowToProxyConfig(row: ProxyConfigRow): ProxyConfig {
  return {
    id: row.id as ProxyConfigId,
    nickname: row.nickname,
    type: row.type as ProxyType,
    hostname: row.hostname,
    port: row.port,
    authentication: row.username && row.password
      ? { username: row.username, password: row.password }
      : undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const ProxyStore = {
  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a new proxy configuration
   */
  create(data: Omit<ProxyConfig, 'id' | 'createdAt' | 'updatedAt'>): Result<ProxyConfig> {
    try {
      const id = newProxyConfigId()
      const now = new Date().toISOString()

      // Validate
      if (!data.nickname || data.nickname.trim() === '') {
        return Result.err(Errors.validation.required('nickname'))
      }
      if (data.port < 1 || data.port > 65535) {
        return Result.err(Errors.validation.invalid('port', 'Port must be 1-65535'))
      }
      if (!['http', 'socks5'].includes(data.type)) {
        return Result.err(Errors.validation.invalid('type', "Type must be 'http' or 'socks5'"))
      }

      // Insert into database
      const stmt = db.app.prepare(`
        INSERT INTO proxy_configs
        (id, nickname, type, hostname, port, username, password, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        id,
        data.nickname,
        data.type,
        data.hostname,
        data.port,
        data.authentication?.username || null,
        data.authentication?.password || null,
        data.isActive ? 1 : 0,
        now,
        now
      )

      const config: ProxyConfig = {
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      }

      log.info('Proxy config created', { id, nickname: data.nickname })
      return Result.ok(config)
    } catch (error) {
      log.error('Failed to create proxy config', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT proxy_configs', error as Error))
    }
  },

  /**
   * Get a proxy configuration by ID
   */
  getById(id: ProxyConfigId): Result<ProxyConfig> {
    try {
      const stmt = db.app.prepare('SELECT * FROM proxy_configs WHERE id = ?')
      const row = stmt.get(id) as ProxyConfigRow | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('proxy', id))
      }

      return Result.ok(rowToProxyConfig(row))
    } catch (error) {
      log.error('Failed to get proxy config', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT FROM proxy_configs', error as Error))
    }
  },

  /**
   * List all proxy configurations
   */
  list(): Result<ProxyConfig[]> {
    try {
      const stmt = db.app.prepare('SELECT * FROM proxy_configs ORDER BY created_at DESC')
      const rows = stmt.all() as ProxyConfigRow[]

      return Result.ok(rows.map(rowToProxyConfig))
    } catch (error) {
      log.error('Failed to list proxy configs', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT FROM proxy_configs', error as Error))
    }
  },

  /**
   * Get the currently active proxy configuration
   */
  getActive(): Result<ProxyConfig | null> {
    try {
      const stmt = db.app.prepare('SELECT * FROM proxy_configs WHERE is_active = 1')
      const row = stmt.get() as ProxyConfigRow | undefined

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(rowToProxyConfig(row))
    } catch (error) {
      log.error('Failed to get active proxy config', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT FROM proxy_configs', error as Error))
    }
  },

  /**
   * Update a proxy configuration
   */
  update(
    id: ProxyConfigId,
    updates: Partial<Omit<ProxyConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ): Result<ProxyConfig> {
    try {
      const now = new Date().toISOString()

      // Build update query dynamically
      const fields: string[] = []
      const values: unknown[] = []

      if (updates.nickname !== undefined) {
        fields.push('nickname = ?')
        values.push(updates.nickname)
      }
      if (updates.type !== undefined) {
        fields.push('type = ?')
        values.push(updates.type)
      }
      if (updates.hostname !== undefined) {
        fields.push('hostname = ?')
        values.push(updates.hostname)
      }
      if (updates.port !== undefined) {
        fields.push('port = ?')
        values.push(updates.port)
      }
      if (updates.authentication !== undefined) {
        fields.push('username = ?')
        fields.push('password = ?')
        values.push(updates.authentication?.username || null)
        values.push(updates.authentication?.password || null)
      }
      if (updates.isActive !== undefined) {
        fields.push('is_active = ?')
        values.push(updates.isActive ? 1 : 0)
      }

      fields.push('updated_at = ?')
      values.push(now)
      values.push(id)

      const stmt = db.app.prepare(`
        UPDATE proxy_configs
        SET ${fields.join(', ')}
        WHERE id = ?
      `)

      stmt.run(...values)

      // Fetch updated config
      return ProxyStore.getById(id)
    } catch (error) {
      log.error('Failed to update proxy config', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE proxy_configs', error as Error))
    }
  },

  /**
   * Delete a proxy configuration
   */
  delete(id: ProxyConfigId): Result<void> {
    try {
      const stmt = db.app.prepare('DELETE FROM proxy_configs WHERE id = ?')
      stmt.run(id)

      log.info('Proxy config deleted', { id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to delete proxy config', error as Error)
      return Result.err(Errors.db.queryFailed('DELETE FROM proxy_configs', error as Error))
    }
  },

  /**
   * Set a proxy configuration as active (deactivates others)
   */
  setActive(id: ProxyConfigId): Result<ProxyConfig> {
    try {
      // The trigger in the migration should handle deactivating others
      return ProxyStore.update(id, { isActive: true })
    } catch (error) {
      log.error('Failed to set active proxy', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE proxy_configs', error as Error))
    }
  },

  /**
   * Deactivate all proxies
   */
  deactivateAll(): Result<void> {
    try {
      const stmt = db.app.prepare('UPDATE proxy_configs SET is_active = 0')
      stmt.run()

      log.info('All proxies deactivated')
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to deactivate all proxies', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE proxy_configs', error as Error))
    }
  }
}
