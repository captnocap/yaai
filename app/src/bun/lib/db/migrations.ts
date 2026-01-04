// =============================================================================
// MIGRATIONS
// =============================================================================
// Database migration runner for SQLite.

import { Database } from 'bun:sqlite'
import { join } from 'path'
import { readdir } from 'fs/promises'
import { DatabaseConnection, type DatabaseName } from './connection'
import { logger, AppError } from '../core'

interface MigrationRecord {
  version: number
  name: string
  applied_at: string
}

// Migrations directory relative to this file
const MIGRATIONS_DIR = join(import.meta.dir, '../../migrations')

/**
 * Ensure migrations table exists
 */
function ensureMigrationsTable(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

/**
 * Get applied migrations
 */
function getAppliedMigrations(database: Database): MigrationRecord[] {
  ensureMigrationsTable(database)
  return database
    .prepare('SELECT version, name, applied_at FROM _migrations ORDER BY version')
    .all() as MigrationRecord[]
}

/**
 * Get pending migration files
 */
async function getPendingMigrations(
  dbName: DatabaseName,
  appliedVersions: Set<number>
): Promise<Array<{ version: number; name: string; path: string }>> {
  const migrationDir = join(MIGRATIONS_DIR, dbName)
  const files: Array<{ version: number; name: string; path: string }> = []

  try {
    const glob = new Bun.Glob('*.sql')
    for await (const file of glob.scan(migrationDir)) {
      const match = file.match(/^(\d+)_(.+)\.sql$/)
      if (match) {
        const version = parseInt(match[1], 10)
        if (!appliedVersions.has(version)) {
          files.push({
            version,
            name: match[2],
            path: join(migrationDir, file)
          })
        }
      }
    }
  } catch (error) {
    // Directory might not exist yet - that's ok, no migrations to run
    logger.debug('Migration directory not found or empty', { dbName, migrationDir })
    return []
  }

  return files.sort((a, b) => a.version - b.version)
}

/**
 * Parse SQL file to extract Up migration
 */
async function parseMigration(filePath: string): Promise<string> {
  const content = await Bun.file(filePath).text()

  // Extract content between "-- Up" and "-- Down" (or end of file)
  const upMatch = content.match(/--\s*Up\s*\n([\s\S]*?)(?=--\s*Down|$)/i)
  if (upMatch) {
    return upMatch[1].trim()
  }

  // If no markers, use entire file
  return content.trim()
}

/**
 * Apply a single migration
 */
function applyMigration(
  database: Database,
  version: number,
  name: string,
  sql: string
): void {
  const transaction = database.transaction(() => {
    // Execute migration SQL
    database.exec(sql)

    // Record migration
    database
      .prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)')
      .run(version, name)
  })

  transaction()
}

/**
 * Run migrations for a specific database
 */
async function runMigrationsForDb(dbName: DatabaseName): Promise<number> {
  const database = DatabaseConnection.get(dbName)
  const applied = getAppliedMigrations(database)
  const appliedVersions = new Set(applied.map(m => m.version))

  const pending = await getPendingMigrations(dbName, appliedVersions)

  if (pending.length === 0) {
    logger.debug('No pending migrations', { database: dbName })
    return 0
  }

  for (const migration of pending) {
    logger.info('Applying migration', {
      database: dbName,
      version: migration.version,
      name: migration.name
    })

    try {
      const sql = await parseMigration(migration.path)
      applyMigration(database, migration.version, migration.name, sql)

      logger.info('Migration applied', {
        database: dbName,
        version: migration.version
      })
    } catch (error) {
      throw new AppError({
        code: 'DB_MIGRATION_FAILED',
        message: `Migration ${migration.version}_${migration.name} failed for ${dbName}`,
        cause: error instanceof Error ? error : undefined,
        context: { database: dbName, version: migration.version }
      })
    }
  }

  return pending.length
}

/**
 * Run all pending migrations for all databases
 */
export async function runMigrations(): Promise<void> {
  const databases = DatabaseConnection.getDatabaseNames()
  let totalApplied = 0

  for (const dbName of databases) {
    if (DatabaseConnection.hasDatabase(dbName)) {
      const count = await runMigrationsForDb(dbName)
      totalApplied += count
    }
  }

  if (totalApplied > 0) {
    logger.info('Migrations complete', { totalApplied })
  }
}

/**
 * Run migrations for a specific database only
 */
export async function runMigrationsFor(dbName: DatabaseName): Promise<number> {
  return runMigrationsForDb(dbName)
}

/**
 * Get migration status for all databases
 */
export async function getMigrationStatus(): Promise<Record<DatabaseName, MigrationRecord[]>> {
  const status: Partial<Record<DatabaseName, MigrationRecord[]>> = {}

  for (const dbName of DatabaseConnection.getDatabaseNames()) {
    if (DatabaseConnection.hasDatabase(dbName)) {
      const database = DatabaseConnection.get(dbName)
      status[dbName] = getAppliedMigrations(database)
    }
  }

  return status as Record<DatabaseName, MigrationRecord[]>
}
