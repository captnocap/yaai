# Backend Foundation — Specification

> Version: 1.0.0
> Last Updated: 2026-01-02

Core patterns, directory structure, error handling, and utilities that all backend modules build upon.

---

## Table of Contents

1. [Directory Structure](#1-directory-structure)
2. [Error Handling](#2-error-handling)
3. [Logging](#3-logging)
4. [Result Types](#4-result-types)
5. [Path Utilities](#5-path-utilities)
6. [Configuration](#6-configuration)
7. [TypeScript Patterns](#7-typescript-patterns)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Directory Structure

### 1.1 Application Data Root

All user data lives in `~/.yaai/`. This path is resolved once at startup and cached.

```
~/.yaai/
├── db/                          # SQLite databases (separate per concern)
│   ├── chat.sqlite              # Chats and messages
│   ├── code.sqlite              # Code sessions and transcripts
│   ├── imagegen.sqlite          # Image generation queue and metadata
│   └── app.sqlite               # Settings, credentials, artifact registry
│
├── artifacts/                   # User-authored artifacts (file-based)
│   └── {artifact-id}/
│       ├── manifest.json
│       ├── handler.ts
│       ├── ui/
│       └── .storage/
│
├── snapshots/                   # Content-addressed restore points
│   ├── objects/                 # SHA-256 named blobs
│   └── manifests/               # Snapshot metadata
│
├── image-gen/                   # Image generation files
│   ├── outputs/                 # Generated images
│   ├── references/              # Reference images
│   ├── prompts/                 # Saved prompt files (.txt)
│   └── thumbnails/              # Cached thumbnails
│
├── cache/                       # Ephemeral caches
│   ├── ui-bundles/              # Bundled artifact UIs
│   └── thumbnails/              # Image thumbnails
│
├── logs/                        # Application logs
│   ├── app.log                  # Current log file
│   └── app.log.{date}           # Rotated logs
│
└── temp/                        # Temporary files (cleared on startup)
```

### 1.2 Source Code Structure

```
app/src/bun/
├── index.ts                     # Main entry, WebSocket server setup
├── lib/
│   ├── core/                    # Foundation modules
│   │   ├── paths.ts             # Path constants and utilities
│   │   ├── errors.ts            # Error types and factories
│   │   ├── logger.ts            # Structured logging
│   │   ├── result.ts            # Result<T, E> type utilities
│   │   └── config.ts            # Runtime configuration
│   │
│   ├── db/                      # Database layer
│   │   ├── connection.ts        # Database connections (singleton)
│   │   ├── migrations.ts        # Migration runner
│   │   └── queries.ts           # Query builder utilities
│   │
│   ├── stores/                  # Data stores
│   │   ├── chat-store.ts
│   │   ├── code-session-store.ts
│   │   ├── image-gen-store.ts
│   │   └── app-store.ts         # Settings, credentials, artifacts
│   │
│   ├── ai/                      # AI provider integration
│   │   ├── provider.ts          # Unified provider interface
│   │   ├── anthropic.ts         # Anthropic-specific
│   │   ├── openai.ts            # OpenAI-specific
│   │   ├── google.ts            # Google-specific
│   │   └── streaming.ts         # SSE parsing utilities
│   │
│   ├── ws/                      # WebSocket layer
│   │   ├── server.ts            # Bun WebSocket server
│   │   ├── protocol.ts          # Message types
│   │   └── handlers/            # Channel handlers
│   │
│   └── image-gen/               # Image generation (existing)
│       └── ...
│
└── migrations/                  # SQL migration files
    ├── chat/
    ├── code/
    ├── imagegen/
    └── app/
```

---

## 2. Error Handling

### 2.1 Error Base Class

All application errors extend a typed base class with error codes.

```typescript
// lib/core/errors.ts

export type ErrorCode =
  // Database errors (1xxx)
  | 'DB_CONNECTION_FAILED'      // 1001
  | 'DB_QUERY_FAILED'           // 1002
  | 'DB_MIGRATION_FAILED'       // 1003
  | 'DB_TRANSACTION_FAILED'     // 1004
  | 'DB_CONSTRAINT_VIOLATION'   // 1005

  // Store errors (2xxx)
  | 'CHAT_NOT_FOUND'            // 2001
  | 'MESSAGE_NOT_FOUND'         // 2002
  | 'SESSION_NOT_FOUND'         // 2003
  | 'ARTIFACT_NOT_FOUND'        // 2004
  | 'DUPLICATE_ENTRY'           // 2005
  | 'INVALID_STATE_TRANSITION'  // 2006

  // AI errors (3xxx)
  | 'AI_REQUEST_FAILED'         // 3001
  | 'AI_RATE_LIMITED'           // 3002
  | 'AI_INVALID_RESPONSE'       // 3003
  | 'AI_STREAM_INTERRUPTED'     // 3004
  | 'AI_PROVIDER_UNAVAILABLE'   // 3005
  | 'AI_INVALID_CREDENTIALS'    // 3006

  // WebSocket errors (4xxx)
  | 'WS_CLIENT_NOT_FOUND'       // 4001
  | 'WS_INVALID_MESSAGE'        // 4002
  | 'WS_HANDLER_NOT_FOUND'      // 4003
  | 'WS_TIMEOUT'                // 4004

  // File system errors (5xxx)
  | 'FS_READ_FAILED'            // 5001
  | 'FS_WRITE_FAILED'           // 5002
  | 'FS_NOT_FOUND'              // 5003
  | 'FS_PERMISSION_DENIED'      // 5004

  // Validation errors (6xxx)
  | 'VALIDATION_FAILED'         // 6001
  | 'INVALID_INPUT'             // 6002
  | 'MISSING_REQUIRED_FIELD'    // 6003

export interface AppErrorOptions {
  code: ErrorCode
  message: string
  cause?: Error
  context?: Record<string, unknown>
  recoverable?: boolean
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly cause?: Error
  readonly context: Record<string, unknown>
  readonly recoverable: boolean
  readonly timestamp: string

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.cause = options.cause
    this.context = options.context ?? {}
    this.recoverable = options.recoverable ?? false
    this.timestamp = new Date().toISOString()

    // Capture stack trace
    Error.captureStackTrace(this, AppError)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause?.message
    }
  }
}
```

### 2.2 Error Factories

```typescript
// Convenience factories for common errors

export const Errors = {
  db: {
    connectionFailed: (cause?: Error) => new AppError({
      code: 'DB_CONNECTION_FAILED',
      message: 'Failed to connect to database',
      cause,
      recoverable: true
    }),

    queryFailed: (query: string, cause?: Error) => new AppError({
      code: 'DB_QUERY_FAILED',
      message: 'Database query failed',
      cause,
      context: { query }
    }),

    notFound: (table: string, id: string) => new AppError({
      code: 'CHAT_NOT_FOUND', // or appropriate code
      message: `${table} with id ${id} not found`,
      context: { table, id },
      recoverable: true
    })
  },

  ai: {
    rateLimited: (retryAfter?: number) => new AppError({
      code: 'AI_RATE_LIMITED',
      message: 'AI provider rate limit exceeded',
      context: { retryAfter },
      recoverable: true
    }),

    streamInterrupted: (cause?: Error) => new AppError({
      code: 'AI_STREAM_INTERRUPTED',
      message: 'AI response stream was interrupted',
      cause,
      recoverable: true
    })
  },

  validation: {
    required: (field: string) => new AppError({
      code: 'MISSING_REQUIRED_FIELD',
      message: `Missing required field: ${field}`,
      context: { field }
    }),

    invalid: (field: string, reason: string) => new AppError({
      code: 'INVALID_INPUT',
      message: `Invalid ${field}: ${reason}`,
      context: { field, reason }
    })
  }
} as const
```

---

## 3. Logging

### 3.1 Logger Interface

```typescript
// lib/core/logger.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    code?: string
    message: string
    stack?: string
  }
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: Error, context?: Record<string, unknown>): void
  child(context: Record<string, unknown>): Logger
}
```

### 3.2 Logger Implementation

```typescript
class ConsoleLogger implements Logger {
  private baseContext: Record<string, unknown>

  constructor(context: Record<string, unknown> = {}) {
    this.baseContext = context
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.baseContext, ...context }
    }

    if (error) {
      entry.error = {
        code: error instanceof AppError ? error.code : undefined,
        message: error.message,
        stack: error.stack
      }
    }

    // Structured JSON output
    const output = JSON.stringify(entry)

    switch (level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.info(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
    }

    // Also write to log file (async, non-blocking)
    this.writeToFile(entry)
  }

  private async writeToFile(entry: LogEntry) {
    const logPath = paths.logs('app.log')
    const line = JSON.stringify(entry) + '\n'
    await Bun.write(logPath, line, { append: true })
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (config.logLevel === 'debug') {
      this.log('debug', message, context)
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error)
  }

  child(context: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.baseContext, ...context })
  }
}

// Singleton logger instance
export const logger = new ConsoleLogger({ service: 'yaai' })
```

---

## 4. Result Types

### 4.1 Result<T, E> Type

For operations that can fail, use explicit Result types instead of throwing.

```typescript
// lib/core/result.ts

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value }
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error }
  },

  // Map over success value
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.ok) {
      return Result.ok(fn(result.value))
    }
    return result
  },

  // Map over error
  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.ok) {
      return Result.err(fn(result.error))
    }
    return result
  },

  // Chain operations
  flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    if (result.ok) {
      return fn(result.value)
    }
    return result
  },

  // Unwrap with default
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.ok) {
      return result.value
    }
    return defaultValue
  },

  // Unwrap or throw
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) {
      return result.value
    }
    throw result.error
  },

  // Convert Promise<T> to Promise<Result<T, E>>
  async fromPromise<T, E = AppError>(
    promise: Promise<T>,
    mapError?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await promise
      return Result.ok(value)
    } catch (error) {
      if (mapError) {
        return Result.err(mapError(error))
      }
      if (error instanceof AppError) {
        return Result.err(error as E)
      }
      return Result.err(new AppError({
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined
      }) as E)
    }
  },

  // Combine multiple results
  all<T extends readonly Result<unknown, unknown>[]>(
    results: T
  ): Result<{ [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never },
            T[number] extends Result<unknown, infer E> ? E : never> {
    const values: unknown[] = []
    for (const result of results) {
      if (!result.ok) {
        return result as any
      }
      values.push(result.value)
    }
    return Result.ok(values as any)
  }
}
```

### 4.2 Usage Examples

```typescript
// Store method returning Result
async function getChatById(id: string): Promise<Result<Chat>> {
  const row = db.query('SELECT * FROM chats WHERE id = ?').get(id)

  if (!row) {
    return Result.err(Errors.db.notFound('chats', id))
  }

  return Result.ok(rowToChat(row))
}

// Consuming Results
const result = await getChatById('chat-123')

if (result.ok) {
  console.log('Chat title:', result.value.title)
} else {
  logger.error('Failed to get chat', result.error)
}

// Chaining
const titleResult = Result.map(result, chat => chat.title)

// With defaults
const title = Result.unwrapOr(titleResult, 'Untitled')
```

---

## 5. Path Utilities

### 5.1 Path Constants

```typescript
// lib/core/paths.ts

import { homedir } from 'os'
import { join } from 'path'

const DATA_ROOT = join(homedir(), '.yaai')

export const paths = {
  // Root
  root: DATA_ROOT,

  // Databases
  db: {
    root: join(DATA_ROOT, 'db'),
    chat: join(DATA_ROOT, 'db', 'chat.sqlite'),
    code: join(DATA_ROOT, 'db', 'code.sqlite'),
    imagegen: join(DATA_ROOT, 'db', 'imagegen.sqlite'),
    app: join(DATA_ROOT, 'db', 'app.sqlite')
  },

  // Artifacts
  artifacts: {
    root: join(DATA_ROOT, 'artifacts'),
    byId: (id: string) => join(DATA_ROOT, 'artifacts', id),
    manifest: (id: string) => join(DATA_ROOT, 'artifacts', id, 'manifest.json'),
    handler: (id: string) => join(DATA_ROOT, 'artifacts', id, 'handler.ts'),
    ui: (id: string) => join(DATA_ROOT, 'artifacts', id, 'ui'),
    storage: (id: string) => join(DATA_ROOT, 'artifacts', id, '.storage')
  },

  // Snapshots
  snapshots: {
    root: join(DATA_ROOT, 'snapshots'),
    objects: join(DATA_ROOT, 'snapshots', 'objects'),
    manifests: join(DATA_ROOT, 'snapshots', 'manifests'),
    object: (hash: string) => join(DATA_ROOT, 'snapshots', 'objects', hash.slice(0, 2), hash)
  },

  // Image generation
  imageGen: {
    root: join(DATA_ROOT, 'image-gen'),
    outputs: join(DATA_ROOT, 'image-gen', 'outputs'),
    references: join(DATA_ROOT, 'image-gen', 'references'),
    prompts: join(DATA_ROOT, 'image-gen', 'prompts'),
    thumbnails: join(DATA_ROOT, 'image-gen', 'thumbnails'),
    output: (filename: string) => join(DATA_ROOT, 'image-gen', 'outputs', filename),
    reference: (filename: string) => join(DATA_ROOT, 'image-gen', 'references', filename),
    prompt: (name: string) => join(DATA_ROOT, 'image-gen', 'prompts', `${name}.txt`),
    thumbnail: (hash: string) => join(DATA_ROOT, 'image-gen', 'thumbnails', `${hash}.jpg`)
  },

  // Cache
  cache: {
    root: join(DATA_ROOT, 'cache'),
    uiBundles: join(DATA_ROOT, 'cache', 'ui-bundles'),
    uiBundle: (artifactId: string) => join(DATA_ROOT, 'cache', 'ui-bundles', `${artifactId}.js`)
  },

  // Logs
  logs: (filename: string) => join(DATA_ROOT, 'logs', filename),

  // Temp
  temp: (filename: string) => join(DATA_ROOT, 'temp', filename)
} as const
```

### 5.2 Directory Initialization

```typescript
// Called once at startup to ensure all directories exist

export async function initializeDirectories(): Promise<void> {
  const dirs = [
    paths.db.root,
    paths.artifacts.root,
    paths.snapshots.objects,
    paths.snapshots.manifests,
    paths.imageGen.outputs,
    paths.imageGen.references,
    paths.imageGen.prompts,
    paths.imageGen.thumbnails,
    paths.cache.uiBundles,
    join(paths.root, 'logs'),
    join(paths.root, 'temp')
  ]

  for (const dir of dirs) {
    await Bun.write(join(dir, '.gitkeep'), '')
  }

  // Clear temp directory
  const tempDir = join(paths.root, 'temp')
  const tempFiles = await Array.fromAsync(new Bun.Glob('*').scan(tempDir))
  for (const file of tempFiles) {
    if (file !== '.gitkeep') {
      await Bun.file(join(tempDir, file)).delete()
    }
  }

  logger.info('Directories initialized', { root: paths.root })
}
```

---

## 6. Configuration

### 6.1 Runtime Configuration

```typescript
// lib/core/config.ts

export interface RuntimeConfig {
  // Server
  wsPort: number
  wsHost: string

  // Logging
  logLevel: LogLevel

  // Database
  dbWalMode: boolean
  dbBusyTimeout: number

  // AI
  aiDefaultTimeout: number
  aiMaxRetries: number
  aiRetryBaseDelay: number

  // Image gen
  imageGenConcurrency: number
  imageGenRateLimit: number

  // Development
  isDev: boolean
}

function loadConfig(): RuntimeConfig {
  return {
    // Server
    wsPort: parseInt(process.env.WS_PORT ?? '3001', 10),
    wsHost: process.env.WS_HOST ?? 'localhost',

    // Logging
    logLevel: (process.env.LOG_LEVEL as LogLevel) ?? 'info',

    // Database
    dbWalMode: process.env.DB_WAL_MODE !== 'false',
    dbBusyTimeout: parseInt(process.env.DB_BUSY_TIMEOUT ?? '5000', 10),

    // AI
    aiDefaultTimeout: parseInt(process.env.AI_TIMEOUT ?? '120000', 10),
    aiMaxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '3', 10),
    aiRetryBaseDelay: parseInt(process.env.AI_RETRY_DELAY ?? '1000', 10),

    // Image gen
    imageGenConcurrency: parseInt(process.env.IMAGEGEN_CONCURRENCY ?? '2', 10),
    imageGenRateLimit: parseInt(process.env.IMAGEGEN_RATE_LIMIT ?? '10', 10),

    // Development
    isDev: process.env.NODE_ENV !== 'production'
  }
}

export const config = loadConfig()
```

---

## 7. TypeScript Patterns

### 7.1 Branded Types

Use branded types for type-safe IDs.

```typescript
// lib/core/types.ts

declare const brand: unique symbol

export type Brand<T, B> = T & { [brand]: B }

// ID types
export type ChatId = Brand<string, 'ChatId'>
export type MessageId = Brand<string, 'MessageId'>
export type SessionId = Brand<string, 'SessionId'>
export type ArtifactId = Brand<string, 'ArtifactId'>
export type JobId = Brand<string, 'JobId'>

// Factories
export const ChatId = (id: string): ChatId => id as ChatId
export const MessageId = (id: string): MessageId => id as MessageId
export const SessionId = (id: string): SessionId => id as SessionId
export const ArtifactId = (id: string): ArtifactId => id as ArtifactId
export const JobId = (id: string): JobId => id as JobId

// UUID generator
export function generateId(): string {
  return crypto.randomUUID()
}

export const newChatId = (): ChatId => ChatId(generateId())
export const newMessageId = (): MessageId => MessageId(generateId())
export const newSessionId = (): SessionId => SessionId(generateId())
export const newJobId = (): JobId => JobId(generateId())
```

### 7.2 Utility Types

```typescript
// Common utility types

// Make specific properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Make specific properties required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

// Deep partial
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Pagination types
export interface PaginationParams {
  limit: number
  offset: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Timestamps
export interface Timestamps {
  createdAt: string
  updatedAt: string
}

// Create input type (no id, no timestamps)
export type CreateInput<T extends { id: string } & Timestamps> =
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>

// Update input type (partial, no id, no createdAt)
export type UpdateInput<T extends { id: string } & Timestamps> =
  Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
```

---

## 8. Testing Strategy

### 8.1 Test Structure

```
app/src/bun/
├── __tests__/
│   ├── unit/
│   │   ├── core/
│   │   │   ├── errors.test.ts
│   │   │   ├── result.test.ts
│   │   │   └── paths.test.ts
│   │   ├── stores/
│   │   │   ├── chat-store.test.ts
│   │   │   └── ...
│   │   └── ai/
│   │       └── provider.test.ts
│   │
│   ├── integration/
│   │   ├── db-migrations.test.ts
│   │   ├── chat-flow.test.ts
│   │   └── ai-streaming.test.ts
│   │
│   └── fixtures/
│       ├── chats.ts
│       ├── messages.ts
│       └── ...
```

### 8.2 Test Utilities

```typescript
// __tests__/fixtures/test-db.ts

import { Database } from 'bun:sqlite'
import { paths } from '../../lib/core/paths'

export function createTestDb(name: string): Database {
  // Use in-memory database for tests
  return new Database(':memory:')
}

export function withTestDb<T>(
  name: string,
  fn: (db: Database) => T | Promise<T>
): Promise<T> {
  const db = createTestDb(name)
  try {
    return Promise.resolve(fn(db))
  } finally {
    db.close()
  }
}
```

### 8.3 Running Tests

```bash
# All tests
bun test

# Specific test file
bun test __tests__/unit/core/result.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

---

## 9. Module Exports

### 9.1 Core Module Index

```typescript
// lib/core/index.ts

export * from './errors'
export * from './logger'
export * from './result'
export * from './paths'
export * from './config'
export * from './types'
```

### 9.2 Main Library Index

```typescript
// lib/index.ts

// Core
export * from './core'

// Database
export * from './db/connection'
export * from './db/migrations'

// Stores
export { ChatStore } from './stores/chat-store'
export { CodeSessionStore } from './stores/code-session-store'
export { ImageGenStore } from './stores/image-gen-store'
export { AppStore } from './stores/app-store'

// AI
export { AIProvider } from './ai/provider'

// WebSocket
export { WSServer } from './ws/server'
```

---

*End of Backend Foundation specification.*
