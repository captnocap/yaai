// =============================================================================
// ERRORS
// =============================================================================
// Application error types and factories.

export type ErrorCode =
  // Database errors (1xxx)
  | 'DB_CONNECTION_FAILED'
  | 'DB_QUERY_FAILED'
  | 'DB_MIGRATION_FAILED'
  | 'DB_TRANSACTION_FAILED'
  | 'DB_CONSTRAINT_VIOLATION'

  // Store errors (2xxx)
  | 'CHAT_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'ARTIFACT_NOT_FOUND'
  | 'CREDENTIAL_NOT_FOUND'
  | 'MODEL_NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'INVALID_STATE_TRANSITION'

  // AI errors (3xxx)
  | 'AI_REQUEST_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_INVALID_RESPONSE'
  | 'AI_STREAM_INTERRUPTED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_INVALID_CREDENTIALS'

  // WebSocket errors (4xxx)
  | 'WS_CLIENT_NOT_FOUND'
  | 'WS_INVALID_MESSAGE'
  | 'WS_HANDLER_NOT_FOUND'
  | 'WS_TIMEOUT'

  // File system errors (5xxx)
  | 'FS_READ_FAILED'
  | 'FS_WRITE_FAILED'
  | 'FS_NOT_FOUND'
  | 'FS_PERMISSION_DENIED'

  // Validation errors (6xxx)
  | 'VALIDATION_FAILED'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'

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

// -----------------------------------------------------------------------------
// Error Factories
// -----------------------------------------------------------------------------

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
      context: { query: query.slice(0, 100) }
    }),

    migrationFailed: (version: number, cause?: Error) => new AppError({
      code: 'DB_MIGRATION_FAILED',
      message: `Migration ${version} failed`,
      cause,
      context: { version }
    }),

    constraintViolation: (constraint: string, cause?: Error) => new AppError({
      code: 'DB_CONSTRAINT_VIOLATION',
      message: `Constraint violation: ${constraint}`,
      cause,
      context: { constraint }
    })
  },

  store: {
    notFound: (entity: string, id: string) => new AppError({
      code: entity === 'chat' ? 'CHAT_NOT_FOUND' :
            entity === 'message' ? 'MESSAGE_NOT_FOUND' :
            entity === 'session' ? 'SESSION_NOT_FOUND' :
            entity === 'credential' ? 'CREDENTIAL_NOT_FOUND' :
            entity === 'model' ? 'MODEL_NOT_FOUND' :
            'ARTIFACT_NOT_FOUND',
      message: `${entity} not found: ${id}`,
      context: { entity, id },
      recoverable: true
    }),

    duplicate: (entity: string, id: string) => new AppError({
      code: 'DUPLICATE_ENTRY',
      message: `${entity} already exists: ${id}`,
      context: { entity, id }
    })
  },

  ai: {
    rateLimited: (retryAfter?: number) => new AppError({
      code: 'AI_RATE_LIMITED',
      message: 'AI provider rate limit exceeded',
      context: { retryAfter },
      recoverable: true
    }),

    invalidCredentials: (provider: string) => new AppError({
      code: 'AI_INVALID_CREDENTIALS',
      message: `Invalid credentials for ${provider}`,
      context: { provider },
      recoverable: true
    }),

    requestFailed: (provider: string, cause?: Error) => new AppError({
      code: 'AI_REQUEST_FAILED',
      message: `AI request to ${provider} failed`,
      cause,
      context: { provider },
      recoverable: true
    }),

    streamInterrupted: (cause?: Error) => new AppError({
      code: 'AI_STREAM_INTERRUPTED',
      message: 'AI response stream was interrupted',
      cause,
      recoverable: true
    }),

    providerUnavailable: (provider: string) => new AppError({
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: `Provider ${provider} is unavailable`,
      context: { provider },
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
  },

  ws: {
    handlerNotFound: (channel: string) => new AppError({
      code: 'WS_HANDLER_NOT_FOUND',
      message: `No handler for channel: ${channel}`,
      context: { channel }
    }),

    timeout: (channel: string, timeoutMs: number) => new AppError({
      code: 'WS_TIMEOUT',
      message: `Request timeout on channel: ${channel}`,
      context: { channel, timeoutMs },
      recoverable: true
    })
  }
} as const
