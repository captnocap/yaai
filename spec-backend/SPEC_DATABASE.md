# Database Architecture — Specification

> Version: 1.0.0
> Last Updated: 2026-01-02

SQLite architecture with separate databases per concern, migrations, and Bun-native implementation.

---

## Table of Contents

1. [Why Separate Databases](#1-why-separate-databases)
2. [Database Files](#2-database-files)
3. [Bun SQLite API](#3-bun-sqlite-api)
4. [Connection Management](#4-connection-management)
5. [Migration System](#5-migration-system)
6. [Query Patterns](#6-query-patterns)
7. [Full-Text Search](#7-full-text-search)
8. [Transactions](#8-transactions)
9. [Backup & Recovery](#9-backup--recovery)
10. [Performance](#10-performance)

---

## 1. Why Separate Databases

### 1.1 Rationale

**Fault Isolation**: If one database corrupts, others remain intact. A corrupted image-gen queue doesn't affect chat history.

**Backup Granularity**: Backup chat history independently of ephemeral queue state. Different backup frequencies for different data.

**Concurrent Access**: SQLite has database-level locking. Separate databases allow parallel writes to different concerns.

**Size Management**: Chat history can grow large. Keep it separate from settings that need fast access.

**Migration Independence**: Migrate chat schema without touching code sessions. Reduces migration complexity.

### 1.2 Trade-offs

**No Cross-DB Joins**: Can't join chats with sessions in SQL. Application-level joins required for cross-cutting queries.

**Multiple Connections**: Four database files means four connections. Minimal overhead with proper pooling.

**Consistency**: No cross-database transactions. Each database is internally consistent, but not atomically consistent across databases.

**Decision**: The isolation benefits outweigh the costs for this application's access patterns.

---

## 2. Database Files

### 2.1 File Locations

```
~/.yaai/db/
├── chat.sqlite        # Chats, messages, attachments, tool calls
├── code.sqlite        # Code sessions, transcripts, snapshots
├── imagegen.sqlite    # Queue, jobs, generated images, prompts
└── app.sqlite         # Settings, credentials, artifact registry
```

### 2.2 Database Responsibilities

| Database | Tables | Purpose |
|----------|--------|---------|
| `chat.sqlite` | chats, messages, attachments, tool_calls, branches | Conversation storage with FTS |
| `code.sqlite` | sessions, transcript_entries, snapshots | Claude Code integration |
| `imagegen.sqlite` | queue_entries, jobs, images, prompts, reference_groups | Image generation pipeline |
| `app.sqlite` | settings, credentials, artifacts, migrations | Application configuration |

---

## 3. Bun SQLite API

### 3.1 Core API Reference

```typescript
import { Database } from 'bun:sqlite'

// Open database
const db = new Database(path, { create: true })

// Enable WAL mode (do once after open)
db.exec('PRAGMA journal_mode = WAL')

// Prepare statement (cached, reusable)
const stmt = db.prepare('SELECT * FROM chats WHERE id = ?')

// Execute with parameters
const row = stmt.get(chatId)           // Single row
const rows = stmt.all(chatId)          // All rows
stmt.run(param1, param2)               // No return (INSERT/UPDATE/DELETE)

// Named parameters
const stmt2 = db.prepare('INSERT INTO chats (id, title) VALUES ($id, $title)')
stmt2.run({ $id: 'abc', $title: 'Hello' })

// Transaction
const insertMany = db.transaction((items) => {
  for (const item of items) {
    insertStmt.run(item)
  }
})
insertMany(items)  // All or nothing

// Close
db.close()
```

### 3.2 Key Differences from node-sqlite3

- **Synchronous API**: No callbacks, no promises for queries
- **Prepared Statements**: Compiled once, cached automatically
- **Named Parameters**: Use `$name`, `:name`, or `@name`
- **Transactions**: First-class transaction function
- **Types**: Automatic BigInt for large integers

---

## 4. Connection Management

### 4.1 Database Connection Class

```typescript
// lib/db/connection.ts

import { Database } from 'bun:sqlite'
import { paths, config, logger, AppError, Errors } from '../core'

export type DatabaseName = 'chat' | 'code' | 'imagegen' | 'app'

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
      { name: 'app', path: paths.db.app }
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
   * Get all database names
   */
  static getDatabaseNames(): DatabaseName[] {
    return ['chat', 'code', 'imagegen', 'app']
  }

  /**
   * Check if connections are initialized
   */
  static isInitialized(): boolean {
    return this.initialized
  }
}

export { DatabaseConnection }

// Convenience exports
export const db = {
  get chat() { return DatabaseConnection.get('chat') },
  get code() { return DatabaseConnection.get('code') },
  get imagegen() { return DatabaseConnection.get('imagegen') },
  get app() { return DatabaseConnection.get('app') }
}
```

### 4.2 Initialization at Startup

```typescript
// In main entry point (index.ts)

import { DatabaseConnection } from './lib/db/connection'
import { runMigrations } from './lib/db/migrations'
import { initializeDirectories } from './lib/core/paths'

async function bootstrap() {
  // 1. Ensure directories exist
  await initializeDirectories()

  // 2. Open database connections
  await DatabaseConnection.initialize()

  // 3. Run migrations
  await runMigrations()

  // 4. Start WebSocket server
  // ...
}

// Graceful shutdown
process.on('SIGINT', () => {
  DatabaseConnection.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  DatabaseConnection.close()
  process.exit(0)
})
```

---

## 5. Migration System

### 5.1 Migration File Structure

```
app/src/bun/migrations/
├── chat/
│   ├── 001_initial.sql
│   ├── 002_add_branches.sql
│   └── 003_add_fts.sql
├── code/
│   ├── 001_initial.sql
│   └── 002_add_snapshots.sql
├── imagegen/
│   ├── 001_initial.sql
│   └── 002_add_prompts.sql
└── app/
    ├── 001_initial.sql
    └── 002_add_artifacts.sql
```

### 5.2 Migration File Format

Each migration file is a SQL script with optional down migration.

```sql
-- migrations/chat/001_initial.sql

-- Up
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  prompt_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  token_count INTEGER,
  generation_time INTEGER,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  branch_id TEXT,
  parent_id TEXT,
  is_liked INTEGER DEFAULT 0
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_branch_id ON messages(branch_id);

-- Down
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;
```

### 5.3 Migration Runner

```typescript
// lib/db/migrations.ts

import { Database } from 'bun:sqlite'
import { join } from 'path'
import { db, DatabaseName, DatabaseConnection } from './connection'
import { logger, AppError } from '../core'

interface MigrationRecord {
  version: number
  name: string
  applied_at: string
}

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
  const glob = new Bun.Glob('*.sql')
  const files: Array<{ version: number; name: string; path: string }> = []

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
 * Run all migrations for all databases
 */
export async function runMigrations(): Promise<void> {
  const databases = DatabaseConnection.getDatabaseNames()
  let totalApplied = 0

  for (const dbName of databases) {
    const applied = await runMigrationsForDb(dbName)
    totalApplied += applied
  }

  logger.info('Migrations complete', { totalApplied })
}

/**
 * Get migration status for all databases
 */
export function getMigrationStatus(): Record<DatabaseName, MigrationRecord[]> {
  const databases = DatabaseConnection.getDatabaseNames()
  const status: Record<string, MigrationRecord[]> = {}

  for (const dbName of databases) {
    const database = DatabaseConnection.get(dbName)
    status[dbName] = getAppliedMigrations(database)
  }

  return status as Record<DatabaseName, MigrationRecord[]>
}
```

---

## 6. Query Patterns

### 6.1 Prepared Statement Cache

```typescript
// lib/db/queries.ts

import { Database, Statement } from 'bun:sqlite'

/**
 * Statement cache for a database
 * Bun auto-caches prepared statements, but this provides
 * a typed interface for common operations
 */
export class QueryBuilder<T> {
  private db: Database
  private statements: Map<string, Statement> = new Map()

  constructor(db: Database) {
    this.db = db
  }

  /**
   * Get or create a prepared statement
   */
  private prepare(sql: string): Statement {
    let stmt = this.statements.get(sql)
    if (!stmt) {
      stmt = this.db.prepare(sql)
      this.statements.set(sql, stmt)
    }
    return stmt
  }

  /**
   * Select single row
   */
  selectOne<R = T>(sql: string, params?: unknown): R | null {
    return this.prepare(sql).get(params) as R | null
  }

  /**
   * Select multiple rows
   */
  selectMany<R = T>(sql: string, params?: unknown): R[] {
    return this.prepare(sql).all(params) as R[]
  }

  /**
   * Insert and return last insert rowid
   */
  insert(sql: string, params?: unknown): number {
    this.prepare(sql).run(params)
    return this.db.query('SELECT last_insert_rowid() as id').get() as number
  }

  /**
   * Update/Delete and return changes count
   */
  execute(sql: string, params?: unknown): number {
    const result = this.prepare(sql).run(params)
    return result.changes
  }

  /**
   * Run raw SQL (for DDL, pragmas, etc.)
   */
  raw(sql: string): void {
    this.db.exec(sql)
  }
}
```

### 6.2 Common Query Helpers

```typescript
// Pagination helper
export function paginate<T>(
  query: QueryBuilder<T>,
  sql: string,
  countSql: string,
  params: Record<string, unknown>,
  pagination: { limit: number; offset: number }
): PaginatedResult<T> {
  const { limit, offset } = pagination

  const items = query.selectMany<T>(
    `${sql} LIMIT $limit OFFSET $offset`,
    { ...params, $limit: limit, $offset: offset }
  )

  const countResult = query.selectOne<{ count: number }>(countSql, params)
  const total = countResult?.count ?? 0

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total
  }
}

// Batch insert helper
export function batchInsert<T>(
  db: Database,
  sql: string,
  items: T[],
  batchSize = 100
): void {
  const stmt = db.prepare(sql)
  const insert = db.transaction((batch: T[]) => {
    for (const item of batch) {
      stmt.run(item as any)
    }
  })

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    insert(batch)
  }
}
```

---

## 7. Full-Text Search

### 7.1 FTS5 Setup

```sql
-- In chat migrations

-- Create FTS virtual table for messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  chat_id UNINDEXED,
  message_id UNINDEXED,
  content='messages',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, chat_id, message_id)
  VALUES (NEW.rowid, NEW.content, NEW.chat_id, NEW.id);
END;

CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, chat_id, message_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.chat_id, OLD.id);
END;

CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content, chat_id, message_id)
  VALUES ('delete', OLD.rowid, OLD.content, OLD.chat_id, OLD.id);
  INSERT INTO messages_fts(rowid, content, chat_id, message_id)
  VALUES (NEW.rowid, NEW.content, NEW.chat_id, NEW.id);
END;
```

### 7.2 FTS Query Examples

```typescript
// Search messages
function searchMessages(query: string, limit = 50): SearchResult[] {
  return db.chat
    .prepare(`
      SELECT
        m.id,
        m.chat_id,
        m.content,
        m.timestamp,
        c.title as chat_title,
        highlight(messages_fts, 0, '<mark>', '</mark>') as snippet
      FROM messages_fts
      JOIN messages m ON messages_fts.message_id = m.id
      JOIN chats c ON m.chat_id = c.id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `)
    .all(query, limit) as SearchResult[]
}

// Search with filters
function searchMessagesInChat(chatId: string, query: string): SearchResult[] {
  return db.chat
    .prepare(`
      SELECT
        message_id,
        highlight(messages_fts, 0, '<mark>', '</mark>') as snippet
      FROM messages_fts
      WHERE messages_fts MATCH ? AND chat_id = ?
      ORDER BY rank
    `)
    .all(query, chatId) as SearchResult[]
}
```

---

## 8. Transactions

### 8.1 Transaction Patterns

```typescript
// Simple transaction
const createChatWithMessage = db.chat.transaction((chat: Chat, message: Message) => {
  db.chat
    .prepare('INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(chat.id, chat.title, chat.createdAt, chat.updatedAt)

  db.chat
    .prepare('INSERT INTO messages (id, chat_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)')
    .run(message.id, chat.id, message.role, message.content, message.timestamp)
})

// Usage
createChatWithMessage(newChat, firstMessage)

// Nested transactions (savepoints)
const complexOperation = db.chat.transaction(() => {
  // Outer transaction
  insertSomething()

  const innerOp = db.chat.transaction(() => {
    // Inner transaction (savepoint)
    insertMore()
    if (someCondition) {
      throw new Error('Rollback inner only')
    }
  })

  try {
    innerOp()
  } catch {
    // Inner rolled back, outer continues
  }
})

// Deferred/Immediate/Exclusive
const exclusiveTx = db.chat.transaction(() => {
  // ...
}, { behavior: 'exclusive' })
```

### 8.2 Transaction Wrapper with Result

```typescript
import { Result, AppError } from '../core'

export function withTransaction<T>(
  database: Database,
  fn: () => T
): Result<T> {
  const tx = database.transaction(fn)
  try {
    const result = tx()
    return Result.ok(result)
  } catch (error) {
    return Result.err(new AppError({
      code: 'DB_TRANSACTION_FAILED',
      message: 'Transaction failed',
      cause: error instanceof Error ? error : undefined
    }))
  }
}

// Usage
const result = withTransaction(db.chat, () => {
  insertChat(chat)
  insertMessages(messages)
  return chat.id
})

if (result.ok) {
  console.log('Created chat:', result.value)
} else {
  console.error('Failed:', result.error.message)
}
```

---

## 9. Backup & Recovery

### 9.1 Backup Strategy

```typescript
// lib/db/backup.ts

import { Database } from 'bun:sqlite'
import { join } from 'path'
import { paths, logger } from '../core'
import { DatabaseConnection, DatabaseName } from './connection'

interface BackupOptions {
  compress?: boolean
  includeWal?: boolean
}

/**
 * Backup a database to a file
 */
export async function backupDatabase(
  dbName: DatabaseName,
  backupDir: string,
  options: BackupOptions = {}
): Promise<string> {
  const database = DatabaseConnection.get(dbName)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${dbName}_${timestamp}.sqlite`
  const backupPath = join(backupDir, filename)

  // Checkpoint WAL to main database
  if (options.includeWal !== false) {
    database.exec('PRAGMA wal_checkpoint(TRUNCATE)')
  }

  // Use SQLite backup API via VACUUM INTO
  database.exec(`VACUUM INTO '${backupPath}'`)

  logger.info('Database backed up', { dbName, path: backupPath })

  // Optionally compress
  if (options.compress) {
    const compressed = await Bun.gzipSync(await Bun.file(backupPath).arrayBuffer())
    await Bun.write(`${backupPath}.gz`, compressed)
    await Bun.file(backupPath).delete()
    return `${backupPath}.gz`
  }

  return backupPath
}

/**
 * Backup all databases
 */
export async function backupAll(backupDir: string): Promise<string[]> {
  const databases = DatabaseConnection.getDatabaseNames()
  const paths: string[] = []

  for (const dbName of databases) {
    const path = await backupDatabase(dbName, backupDir)
    paths.push(path)
  }

  return paths
}

/**
 * Restore database from backup
 */
export async function restoreDatabase(
  dbName: DatabaseName,
  backupPath: string
): Promise<void> {
  const targetPath = paths.db[dbName]

  // Close existing connection
  DatabaseConnection.get(dbName).close()

  // Handle compressed backups
  let sourcePath = backupPath
  if (backupPath.endsWith('.gz')) {
    const compressed = await Bun.file(backupPath).arrayBuffer()
    const decompressed = Bun.gunzipSync(new Uint8Array(compressed))
    sourcePath = paths.temp(`restore_${dbName}.sqlite`)
    await Bun.write(sourcePath, decompressed)
  }

  // Copy backup to target
  await Bun.write(targetPath, Bun.file(sourcePath))

  // Clean up temp file
  if (sourcePath !== backupPath) {
    await Bun.file(sourcePath).delete()
  }

  // Reinitialize connection
  await DatabaseConnection.initialize()

  logger.info('Database restored', { dbName, from: backupPath })
}
```

### 9.2 Integrity Check

```typescript
/**
 * Check database integrity
 */
export function checkIntegrity(dbName: DatabaseName): boolean {
  const database = DatabaseConnection.get(dbName)
  const result = database.query('PRAGMA integrity_check').get() as { integrity_check: string }
  return result.integrity_check === 'ok'
}

/**
 * Check all databases
 */
export function checkAllIntegrity(): Record<DatabaseName, boolean> {
  const databases = DatabaseConnection.getDatabaseNames()
  const results: Record<string, boolean> = {}

  for (const dbName of databases) {
    results[dbName] = checkIntegrity(dbName)
  }

  return results as Record<DatabaseName, boolean>
}
```

---

## 10. Performance

### 10.1 Pragma Recommendations

```sql
-- Applied on connection open

-- WAL mode for concurrent reads
PRAGMA journal_mode = WAL;

-- Normal sync is faster, still durable with WAL
PRAGMA synchronous = NORMAL;

-- Increase cache size (default 2MB, increase for large datasets)
PRAGMA cache_size = -64000;  -- 64MB

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Busy timeout (wait instead of fail on lock)
PRAGMA busy_timeout = 5000;

-- Memory-mapped I/O for read performance
PRAGMA mmap_size = 268435456;  -- 256MB
```

### 10.2 Index Strategy

```sql
-- Always index foreign keys
CREATE INDEX idx_messages_chat_id ON messages(chat_id);

-- Index frequently queried columns
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_chats_updated_at ON chats(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_messages_chat_timestamp ON messages(chat_id, timestamp);

-- Partial indexes for filtered queries
CREATE INDEX idx_jobs_pending ON jobs(created_at) WHERE status = 'pending';
```

### 10.3 Query Optimization Tips

```typescript
// Use EXPLAIN QUERY PLAN to analyze
const plan = db.chat.query('EXPLAIN QUERY PLAN SELECT * FROM messages WHERE chat_id = ?').all('123')

// Prefer COUNT(*) over COUNT(column)
// Wrong: SELECT COUNT(id) FROM messages
// Right: SELECT COUNT(*) FROM messages

// Use EXISTS for existence checks
// Wrong: SELECT COUNT(*) FROM messages WHERE chat_id = ?
// Right: SELECT EXISTS(SELECT 1 FROM messages WHERE chat_id = ?)

// Limit early for pagination
// Wrong: SELECT * FROM messages ORDER BY timestamp LIMIT 20 OFFSET 100
// Right: SELECT * FROM messages WHERE rowid > (SELECT rowid FROM messages ORDER BY timestamp LIMIT 1 OFFSET 99) ORDER BY timestamp LIMIT 20

// Use covering indexes
// If you SELECT id, title FROM chats WHERE updated_at > ?
// Create: CREATE INDEX idx_chats_updated_covering ON chats(updated_at, id, title)
```

---

## 11. Monitoring

### 11.1 Database Stats

```typescript
/**
 * Get database statistics
 */
export function getDatabaseStats(dbName: DatabaseName): DatabaseStats {
  const database = DatabaseConnection.get(dbName)

  const pageCount = database.query('PRAGMA page_count').get() as { page_count: number }
  const pageSize = database.query('PRAGMA page_size').get() as { page_size: number }
  const freelistCount = database.query('PRAGMA freelist_count').get() as { freelist_count: number }
  const walCheckpoint = database.query('PRAGMA wal_checkpoint').get() as {
    busy: number
    log: number
    checkpointed: number
  }

  return {
    name: dbName,
    sizeBytes: pageCount.page_count * pageSize.page_size,
    pageCount: pageCount.page_count,
    pageSize: pageSize.page_size,
    freelistPages: freelistCount.freelist_count,
    walPages: walCheckpoint.log - walCheckpoint.checkpointed
  }
}

interface DatabaseStats {
  name: string
  sizeBytes: number
  pageCount: number
  pageSize: number
  freelistPages: number
  walPages: number
}
```

---

*End of Database Architecture specification.*
