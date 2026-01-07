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
    if (!columns.has('image_endpoint')) {
      logger.info('Adding missing column: credentials.image_endpoint')
      db.app.exec('ALTER TABLE credentials ADD COLUMN image_endpoint TEXT')
    }
    if (!columns.has('image_models')) {
      logger.info('Adding missing column: credentials.image_models')
      db.app.exec("ALTER TABLE credentials ADD COLUMN image_models TEXT DEFAULT '[]'")
    }
    if (!columns.has('embedding_endpoint')) {
      logger.info('Adding missing column: credentials.embedding_endpoint')
      db.app.exec('ALTER TABLE credentials ADD COLUMN embedding_endpoint TEXT')
    }
    if (!columns.has('embedding_models')) {
      logger.info('Adding missing column: credentials.embedding_models')
      db.app.exec("ALTER TABLE credentials ADD COLUMN embedding_models TEXT DEFAULT '[]'")
    }
    if (!columns.has('video_endpoint')) {
      logger.info('Adding missing column: credentials.video_endpoint')
      db.app.exec('ALTER TABLE credentials ADD COLUMN video_endpoint TEXT')
    }
    if (!columns.has('video_models')) {
      logger.info('Adding missing column: credentials.video_models')
      db.app.exec("ALTER TABLE credentials ADD COLUMN video_models TEXT DEFAULT '[]'")
    }
    if (!columns.has('tts_endpoint')) {
      logger.info('Adding missing column: credentials.tts_endpoint')
      db.app.exec('ALTER TABLE credentials ADD COLUMN tts_endpoint TEXT')
    }
    if (!columns.has('tts_models')) {
      logger.info('Adding missing column: credentials.tts_models')
      db.app.exec("ALTER TABLE credentials ADD COLUMN tts_models TEXT DEFAULT '[]'")
    }
    if (!columns.has('tee_endpoint')) {
      logger.info('Adding missing column: credentials.tee_endpoint')
      db.app.exec('ALTER TABLE credentials ADD COLUMN tee_endpoint TEXT')
    }
    if (!columns.has('tee_models')) {
      logger.info('Adding missing column: credentials.tee_models')
      db.app.exec("ALTER TABLE credentials ADD COLUMN tee_models TEXT DEFAULT '[]'")
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
