// =============================================================================
// DATABASE CONNECTION
// =============================================================================
// SQLite connection management with WAL mode and singleton pattern.

import { Database } from 'bun:sqlite'
import { paths, config, logger, AppError, Errors } from '../core'

export type DatabaseName = 'chat' | 'code' | 'imagegen' | 'app' | 'memory'

interface ConnectionOptions {
  walMode?: boolean
  busyTimeout?: number
  foreignKeys?: boolean
}

class DatabaseConnection {
  private static instances: Map<DatabaseName, Database> = new Map()
  private static initialized = false

  /**
   * Get database connection (singleton per database)
   */
  static get(name: DatabaseName): Database {
    if (!this.initialized) {
      throw new AppError({
        code: 'DB_CONNECTION_FAILED',
        message: 'Database connections not initialized. Call DatabaseConnection.initialize() first.'
      })
    }

    const existing = this.instances.get(name)
    if (existing) {
      return existing
    }

    throw new AppError({
      code: 'DB_CONNECTION_FAILED',
      message: `Database ${name} not found in connection pool`
    })
  }

  /**
   * Initialize all database connections
   */
  static async initialize(options: ConnectionOptions = {}): Promise<void> {
    if (this.initialized) {
      logger.warn('Database connections already initialized')
      return
    }

    const {
      walMode = config.dbWalMode,
      busyTimeout = config.dbBusyTimeout,
      foreignKeys = true
    } = options

    const databases: Array<{ name: DatabaseName; path: string }> = [
      { name: 'chat', path: paths.db.chat },
      { name: 'code', path: paths.db.code },
      { name: 'imagegen', path: paths.db.imagegen },
      { name: 'app', path: paths.db.app },
      { name: 'memory', path: paths.db.memory }
    ]

    for (const { name, path } of databases) {
      try {
        const db = new Database(path, { create: true })

        // Configure pragmas
        if (walMode) {
          db.exec('PRAGMA journal_mode = WAL')
        }
        db.exec(`PRAGMA busy_timeout = ${busyTimeout}`)
        if (foreignKeys) {
          db.exec('PRAGMA foreign_keys = ON')
        }
        db.exec('PRAGMA synchronous = NORMAL')

        this.instances.set(name, db)
        logger.info('Database connection opened', { name, path, walMode })
      } catch (error) {
        throw Errors.db.connectionFailed(error instanceof Error ? error : undefined)
      }
    }

    this.initialized = true
    logger.info('All database connections initialized')
  }

  /**
   * Initialize a single database (for testing or selective init)
   */
  static async initializeOne(name: DatabaseName, options: ConnectionOptions = {}): Promise<void> {
    if (this.instances.has(name)) {
      logger.warn('Database already initialized', { name })
      return
    }

    const {
      walMode = config.dbWalMode,
      busyTimeout = config.dbBusyTimeout,
      foreignKeys = true
    } = options

    const pathMap: Record<DatabaseName, string> = {
      chat: paths.db.chat,
      code: paths.db.code,
      imagegen: paths.db.imagegen,
      app: paths.db.app,
      memory: paths.db.memory
    }

    const path = pathMap[name]

    try {
      const db = new Database(path, { create: true })

      if (walMode) {
        db.exec('PRAGMA journal_mode = WAL')
      }
      db.exec(`PRAGMA busy_timeout = ${busyTimeout}`)
      if (foreignKeys) {
        db.exec('PRAGMA foreign_keys = ON')
      }
      db.exec('PRAGMA synchronous = NORMAL')

      this.instances.set(name, db)
      this.initialized = true
      logger.info('Database connection opened', { name, path, walMode })
    } catch (error) {
      throw Errors.db.connectionFailed(error instanceof Error ? error : undefined)
    }
  }

  /**
   * Close all database connections
   */
  static close(): void {
    for (const [name, db] of this.instances) {
      try {
        db.close()
        logger.info('Database connection closed', { name })
      } catch (error) {
        logger.error('Failed to close database', error instanceof Error ? error : undefined, { name })
      }
    }
    this.instances.clear()
    this.initialized = false
  }

  /**
   * Close a specific database connection
   */
  static closeOne(name: DatabaseName): void {
    const db = this.instances.get(name)
    if (db) {
      try {
        db.close()
        this.instances.delete(name)
        logger.info('Database connection closed', { name })
      } catch (error) {
        logger.error('Failed to close database', error instanceof Error ? error : undefined, { name })
      }
    }
  }

  /**
   * Get all database names
   */
  static getDatabaseNames(): DatabaseName[] {
    return ['chat', 'code', 'imagegen', 'app', 'memory']
  }

  /**
   * Check if connections are initialized
   */
  static isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Check if a specific database is initialized
   */
  static hasDatabase(name: DatabaseName): boolean {
    return this.instances.has(name)
  }
}

export { DatabaseConnection }

// Convenience exports - lazy getters
export const db = {
  get chat() { return DatabaseConnection.get('chat') },
  get code() { return DatabaseConnection.get('code') },
  get imagegen() { return DatabaseConnection.get('imagegen') },
  get app() { return DatabaseConnection.get('app') },
  get memory() { return DatabaseConnection.get('memory') }
}
