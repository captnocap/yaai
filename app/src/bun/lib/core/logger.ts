// =============================================================================
// LOGGER
// =============================================================================
// Structured logging with file output.

import { AppError } from './errors'
import { config, type LogLevel } from './config'
import { paths } from './paths'

export type { LogLevel }

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

// Log level priority for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

class ConsoleLogger implements Logger {
  private baseContext: Record<string, unknown>
  private minLevel: number

  constructor(context: Record<string, unknown> = {}) {
    this.baseContext = context
    this.minLevel = LOG_LEVELS[config.logLevel]
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ) {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: Object.keys(this.baseContext).length > 0 || context
        ? { ...this.baseContext, ...context }
        : undefined
    }

    if (error) {
      entry.error = {
        code: error instanceof AppError ? error.code : undefined,
        message: error.message,
        stack: error.stack
      }
    }

    // Format output
    const output = this.formatEntry(entry)

    // Console output
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

    // File output (async, non-blocking)
    this.writeToFile(entry).catch(() => {
      // Silently ignore file write errors
    })
  }

  private formatEntry(entry: LogEntry): string {
    // In dev mode, use pretty format; in prod, use JSON
    if (config.isDev) {
      const levelColors: Record<LogLevel, string> = {
        debug: '\x1b[90m',  // gray
        info: '\x1b[36m',   // cyan
        warn: '\x1b[33m',   // yellow
        error: '\x1b[31m'   // red
      }
      const reset = '\x1b[0m'
      const color = levelColors[entry.level]

      let msg = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`

      if (entry.context && Object.keys(entry.context).length > 0) {
        msg += ` ${JSON.stringify(entry.context)}`
      }

      if (entry.error) {
        msg += `\n  Error: ${entry.error.message}`
        if (entry.error.code) {
          msg += ` (${entry.error.code})`
        }
      }

      return msg
    }

    // Production: JSON format
    return JSON.stringify(entry)
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    const logPath = paths.logs.file('app.log')
    const line = JSON.stringify(entry) + '\n'

    try {
      const file = Bun.file(logPath)
      const existing = await file.exists() ? await file.text() : ''
      await Bun.write(logPath, existing + line)
    } catch {
      // Ignore file write errors
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
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

// Create module-specific loggers
export function createLogger(module: string): Logger {
  return logger.child({ module })
}
