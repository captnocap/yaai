// =============================================================================
// DATABASE MODULE
// =============================================================================
// Re-exports database functionality.

export { DatabaseConnection, db, type DatabaseName } from './connection'
export { runMigrations, runMigrationsFor, getMigrationStatus } from './migrations'
