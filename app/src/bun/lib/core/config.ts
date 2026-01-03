// =============================================================================
// CONFIG
// =============================================================================
// Runtime configuration loaded from environment variables.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

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
