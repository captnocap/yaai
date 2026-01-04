// =============================================================================
// DATABASE MODULE
// =============================================================================
// Re-exports database functionality.

export { DatabaseConnection, db, type DatabaseName } from './connection'
export { runMigrations, runMigrationsFor, getMigrationStatus } from './migrations'

import { db } from './connection'
import { logger } from '../core'

/**
 * Repair app database schema by ensuring required columns exist.
 * This is a defensive measure for when migrations fail or are skipped.
 */
export function repairAppSchema(): void {
  try {
    // Check if credentials table exists
    const tableInfo = db.app.prepare("PRAGMA table_info(credentials)").all() as Array<{ name: string }>
    const columns = new Set(tableInfo.map(c => c.name))

    // Add missing columns
    if (!columns.has('name')) {
      logger.info('Adding missing column: credentials.name')
      db.app.exec('ALTER TABLE credentials ADD COLUMN name TEXT')
    }
    if (!columns.has('format')) {
      logger.info('Adding missing column: credentials.format')
      db.app.exec("ALTER TABLE credentials ADD COLUMN format TEXT NOT NULL DEFAULT 'openai'")
    }
    if (!columns.has('brand_color')) {
      logger.info('Adding missing column: credentials.brand_color')
      db.app.exec('ALTER TABLE credentials ADD COLUMN brand_color TEXT')
    }

    // Set defaults for built-in providers if needed
    db.app.exec(`
      UPDATE credentials SET name = 'Anthropic', format = 'anthropic' WHERE id = 'anthropic' AND (name IS NULL OR name = '');
      UPDATE credentials SET name = 'OpenAI', format = 'openai' WHERE id = 'openai' AND (name IS NULL OR name = '');
      UPDATE credentials SET name = 'Google', format = 'google' WHERE id = 'google' AND (name IS NULL OR name = '');
    `)

    logger.info('App schema repair complete')
  } catch (error) {
    logger.error('Failed to repair app schema', error instanceof Error ? error : undefined)
  }
}
