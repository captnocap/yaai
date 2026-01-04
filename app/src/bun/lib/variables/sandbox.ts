// =============================================================================
// JAVASCRIPT SANDBOX
// =============================================================================
// Safe execution environment for JavaScript variable code.
// Provides limited API surface with timeout enforcement.

import { runInNewContext, type Context } from 'vm'
import { createLogger } from '../core/logger'
import { Errors } from '../core/errors'

const logger = createLogger('js-sandbox')

// -----------------------------------------------------------------------------
// Safe Globals
// -----------------------------------------------------------------------------

/**
 * Safe globals available in the sandbox.
 * These are standard JavaScript built-ins that cannot access
 * the file system, network, or process.
 */
const SAFE_GLOBALS = {
  // Math
  Math: Math,

  // Numbers
  Number: Number,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  Infinity: Infinity,
  NaN: NaN,

  // Strings
  String: String,
  encodeURI: encodeURI,
  decodeURI: decodeURI,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,

  // Arrays
  Array: Array,

  // Objects
  Object: Object,

  // Booleans
  Boolean: Boolean,

  // JSON
  JSON: JSON,

  // Regular expressions
  RegExp: RegExp,

  // Date (read-only, creates new Date objects)
  Date: Date,

  // Collections
  Map: Map,
  Set: Set,
  WeakMap: WeakMap,
  WeakSet: WeakSet,

  // Errors (for error handling in code)
  Error: Error,
  TypeError: TypeError,
  RangeError: RangeError,
  SyntaxError: SyntaxError,

  // Utilities
  undefined: undefined,
  null: null,

  // Console (safe logging)
  console: {
    log: (...args: unknown[]) => logger.debug('Sandbox console.log', { args }),
    warn: (...args: unknown[]) => logger.debug('Sandbox console.warn', { args }),
    error: (...args: unknown[]) => logger.debug('Sandbox console.error', { args }),
    info: (...args: unknown[]) => logger.debug('Sandbox console.info', { args }),
  }
}

/**
 * Blocked identifiers - these should never be accessible
 */
const BLOCKED_IDENTIFIERS = [
  'require',
  'import',
  'module',
  'exports',
  'process',
  'global',
  'globalThis',
  'Buffer',
  '__dirname',
  '__filename',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
]

// -----------------------------------------------------------------------------
// Sandbox Options
// -----------------------------------------------------------------------------

export interface SandboxOptions {
  /** Execution timeout in milliseconds (default: 5000) */
  timeout?: number
  /** Additional context variables */
  context?: Record<string, unknown>
  /** Variable name for logging */
  variableName?: string
}

export interface SandboxResult {
  success: boolean
  value?: string
  error?: string
  duration: number
}

// -----------------------------------------------------------------------------
// Sandbox Execution
// -----------------------------------------------------------------------------

/**
 * Execute JavaScript code in a sandboxed environment.
 *
 * The code should return a string value. If it returns a non-string,
 * it will be converted to string using String().
 *
 * @param code - JavaScript code to execute (should return a string)
 * @param options - Sandbox options
 * @returns Execution result with value or error
 */
export function executeSandboxed(
  code: string,
  options: SandboxOptions = {}
): SandboxResult {
  const {
    timeout = 5000,
    context = {},
    variableName = 'unknown'
  } = options

  const startTime = Date.now()

  // Basic code validation
  const validationError = validateCode(code)
  if (validationError) {
    return {
      success: false,
      error: validationError,
      duration: Date.now() - startTime
    }
  }

  try {
    // Create sandbox context with safe globals
    const sandboxContext: Context = {
      ...SAFE_GLOBALS,
      ...context,
      // Provide a result variable for the code to set
      __result__: undefined
    }

    // Wrap the code to capture the return value
    // The code can either:
    // 1. Return a value directly
    // 2. Set __result__ = value
    const wrappedCode = `
      (function() {
        "use strict";
        ${code}
      })()
    `

    // Execute in sandbox with timeout
    const result = runInNewContext(wrappedCode, sandboxContext, {
      timeout,
      displayErrors: false,
      breakOnSigint: true
    })

    // Convert result to string
    let value: string
    if (result === undefined || result === null) {
      value = ''
    } else if (typeof result === 'string') {
      value = result
    } else {
      value = String(result)
    }

    const duration = Date.now() - startTime
    logger.debug('Sandbox execution success', {
      variableName,
      duration,
      resultLength: value.length
    })

    return {
      success: true,
      value,
      duration
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check for timeout
    if (errorMessage.includes('Script execution timed out')) {
      logger.warn('Sandbox timeout', { variableName, timeout })
      return {
        success: false,
        error: `Execution timed out after ${timeout}ms`,
        duration
      }
    }

    logger.warn('Sandbox execution failed', {
      variableName,
      error: errorMessage,
      duration
    })

    return {
      success: false,
      error: errorMessage,
      duration
    }
  }
}

/**
 * Execute code asynchronously with proper error handling
 */
export async function executeSandboxedAsync(
  code: string,
  options: SandboxOptions = {}
): Promise<SandboxResult> {
  return new Promise((resolve) => {
    // Use setImmediate to avoid blocking
    setImmediate(() => {
      resolve(executeSandboxed(code, options))
    })
  })
}

// -----------------------------------------------------------------------------
// Code Validation
// -----------------------------------------------------------------------------

/**
 * Validate code before execution
 * Returns error message if invalid, undefined if valid
 */
function validateCode(code: string): string | undefined {
  if (!code || typeof code !== 'string') {
    return 'Code must be a non-empty string'
  }

  if (code.length > 10000) {
    return 'Code exceeds maximum length (10000 characters)'
  }

  // Check for blocked identifiers
  for (const blocked of BLOCKED_IDENTIFIERS) {
    // Check for the identifier as a word boundary
    const pattern = new RegExp(`\\b${blocked}\\b`)
    if (pattern.test(code)) {
      return `Blocked identifier: ${blocked}`
    }
  }

  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /\beval\s*\(/,           // eval()
    /\bFunction\s*\(/,       // new Function()
    /\bimport\s*\(/,         // dynamic import
    /\brequire\s*\(/,        // require()
    /\bprocess\./,           // process access
    /\bglobal\./,            // global access
    /\bglobalThis\./,        // globalThis access
    /\b__proto__/,           // prototype pollution
    /\bconstructor\s*\[/,    // constructor bracket access
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return `Potentially dangerous pattern detected`
    }
  }

  return undefined
}

/**
 * Check if code is safe (for UI feedback)
 */
export function isCodeSafe(code: string): {
  safe: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (!code || typeof code !== 'string') {
    return { safe: false, warnings: ['Code is empty'] }
  }

  // Check blocked identifiers
  for (const blocked of BLOCKED_IDENTIFIERS) {
    const pattern = new RegExp(`\\b${blocked}\\b`)
    if (pattern.test(code)) {
      warnings.push(`Uses blocked identifier: ${blocked}`)
    }
  }

  // Check for infinite loop potential
  if (/\bwhile\s*\(\s*true\s*\)/.test(code) || /\bfor\s*\(\s*;\s*;\s*\)/.test(code)) {
    warnings.push('Potential infinite loop detected')
  }

  // Check for very long strings (memory concern)
  if (/['"`].{1000,}['"`]/.test(code)) {
    warnings.push('Very long string literal detected')
  }

  return {
    safe: warnings.length === 0,
    warnings
  }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Create a sandbox context with custom variables
 */
export function createSandboxContext(
  customVariables: Record<string, unknown> = {}
): Context {
  return {
    ...SAFE_GLOBALS,
    ...customVariables
  }
}

/**
 * Get list of available globals for documentation
 */
export function getAvailableGlobals(): string[] {
  return Object.keys(SAFE_GLOBALS)
}

/**
 * Get list of blocked identifiers for documentation
 */
export function getBlockedIdentifiers(): string[] {
  return [...BLOCKED_IDENTIFIERS]
}
