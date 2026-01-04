// =============================================================================
// VARIABLE RESOLVERS
// =============================================================================
// Type-specific resolution functions for each variable type.

import { createLogger } from '../core/logger'
import { Errors, AppError } from '../core/errors'
import { Result } from '../core/result'
import { httpClient } from '../core/http-client'
import type {
  AppLevelVariable,
  WildcardVariable,
  RestApiVariable,
  JavaScriptVariable,
  ResponseParser
} from '../core/types'
import { resolveSystemVariable, isSystemVariable, type SystemVariableName } from './system-variables'
import { executeSandboxed } from './sandbox'
import { variableCache, wildcardCacheKey, restApiCacheKey, hashUrl } from './cache'

const logger = createLogger('variable-resolvers')

// -----------------------------------------------------------------------------
// Resolution Result Type
// -----------------------------------------------------------------------------

export interface ResolutionResult {
  value: string
  fromCache: boolean
  duration: number
}

// -----------------------------------------------------------------------------
// System Variable Resolver
// -----------------------------------------------------------------------------

/**
 * Resolve a system variable
 */
export function resolveSystem(name: string): Result<ResolutionResult, AppError> {
  const startTime = Date.now()

  if (!isSystemVariable(name)) {
    return Result.err(Errors.variable.notFound(name))
  }

  try {
    const value = resolveSystemVariable(name as SystemVariableName)
    return Result.ok({
      value,
      fromCache: false,
      duration: Date.now() - startTime
    })
  } catch (error) {
    return Result.err(new AppError({
      code: 'VARIABLE_PARSE_FAILED',
      message: `Failed to resolve system variable "${name}": ${(error as Error).message}`,
      cause: error as Error,
      context: { name }
    }))
  }
}

// -----------------------------------------------------------------------------
// App-Level Variable Resolver
// -----------------------------------------------------------------------------

/**
 * Resolve an app-level variable (simple text lookup)
 */
export function resolveAppLevel(variable: AppLevelVariable): Result<ResolutionResult, AppError> {
  const startTime = Date.now()

  return Result.ok({
    value: variable.value,
    fromCache: false,
    duration: Date.now() - startTime
  })
}

// -----------------------------------------------------------------------------
// Wildcard Variable Resolver
// -----------------------------------------------------------------------------

// Track last selected index to avoid duplicates when not allowed
const lastWildcardSelections = new Map<string, number>()

/**
 * Resolve a wildcard variable (random selection from options)
 */
export function resolveWildcard(
  variable: WildcardVariable,
  sessionId?: string
): Result<ResolutionResult, AppError> {
  const startTime = Date.now()

  if (!variable.options || variable.options.length === 0) {
    return Result.err(Errors.variable.invalidConfig('wildcard', 'options array is empty'))
  }

  // Check cache if duration is set
  if (variable.cacheDuration && variable.cacheDuration > 0) {
    const cacheKey = wildcardCacheKey(variable.name, sessionId)
    const cached = variableCache.get(cacheKey)
    if (cached !== undefined) {
      return Result.ok({
        value: cached,
        fromCache: true,
        duration: Date.now() - startTime
      })
    }
  }

  // Select random option
  let selectedIndex: number

  if (variable.allowDuplicates || variable.options.length === 1) {
    // Any option is valid
    selectedIndex = Math.floor(Math.random() * variable.options.length)
  } else {
    // Avoid selecting the same option twice in a row
    const lastIndex = lastWildcardSelections.get(variable.name)

    if (lastIndex !== undefined && variable.options.length > 1) {
      // Select from options excluding last selection
      const availableIndices = variable.options
        .map((_, i) => i)
        .filter(i => i !== lastIndex)
      selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else {
      selectedIndex = Math.floor(Math.random() * variable.options.length)
    }
  }

  // Remember selection
  lastWildcardSelections.set(variable.name, selectedIndex)

  const value = variable.options[selectedIndex]

  // Cache if duration is set
  if (variable.cacheDuration && variable.cacheDuration > 0) {
    const cacheKey = wildcardCacheKey(variable.name, sessionId)
    variableCache.set(cacheKey, value, variable.cacheDuration)
  }

  logger.debug('Wildcard resolved', {
    name: variable.name,
    selectedIndex,
    optionCount: variable.options.length
  })

  return Result.ok({
    value,
    fromCache: false,
    duration: Date.now() - startTime
  })
}

// -----------------------------------------------------------------------------
// REST API Variable Resolver
// -----------------------------------------------------------------------------

/**
 * Resolve a REST API variable
 */
export async function resolveRestApi(
  variable: RestApiVariable
): Promise<Result<ResolutionResult, AppError>> {
  const startTime = Date.now()
  const { requestConfig, responseParser } = variable

  // Check cache if enabled
  if (variable.cacheEnabled && variable.cacheDuration && variable.cacheDuration > 0) {
    const cacheKey = restApiCacheKey(variable.name, hashUrl(requestConfig.url))
    const cached = variableCache.get(cacheKey)
    if (cached !== undefined) {
      return Result.ok({
        value: cached,
        fromCache: true,
        duration: Date.now() - startTime
      })
    }
  }

  // Build request headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(requestConfig.headers || {})
  }

  // Add authentication
  if (requestConfig.authentication) {
    const { type, value, keyName } = requestConfig.authentication

    switch (type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${value}`
        break
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(value).toString('base64')}`
        break
      case 'api-key':
        headers[keyName || 'X-API-Key'] = value
        break
    }
  }

  // Build request body
  let body: string | undefined
  if (requestConfig.body && requestConfig.method !== 'GET') {
    body = typeof requestConfig.body === 'string'
      ? requestConfig.body
      : JSON.stringify(requestConfig.body)

    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  logger.debug('REST API request', {
    name: variable.name,
    method: requestConfig.method,
    url: requestConfig.url
  })

  // Make request through httpClient (the door)
  const response = await httpClient.fetch(requestConfig.url, {
    method: requestConfig.method,
    headers,
    body,
    timeout: variable.timeout || 10000,
    retries: variable.retries || 1
  })

  if (!response.ok) {
    return Result.err(response.error)
  }

  const httpResponse = response.value

  // Check status code
  if (!httpResponse.ok) {
    return Result.err(Errors.variable.restRequestFailed(
      requestConfig.url,
      httpResponse.status
    ))
  }

  // Parse response
  let parsedValue: string

  try {
    const responseText = await httpResponse.text()
    parsedValue = parseResponse(responseText, responseParser)
  } catch (error) {
    return Result.err(Errors.variable.parseFailed(
      responseParser.selector,
      (error as Error).message
    ))
  }

  // Cache if enabled
  if (variable.cacheEnabled && variable.cacheDuration && variable.cacheDuration > 0) {
    const cacheKey = restApiCacheKey(variable.name, hashUrl(requestConfig.url))
    variableCache.set(cacheKey, parsedValue, variable.cacheDuration)
  }

  logger.debug('REST API resolved', {
    name: variable.name,
    valueLength: parsedValue.length,
    duration: Date.now() - startTime
  })

  return Result.ok({
    value: parsedValue,
    fromCache: false,
    duration: Date.now() - startTime
  })
}

/**
 * Parse response based on parser configuration
 */
function parseResponse(responseText: string, parser: ResponseParser): string {
  switch (parser.type) {
    case 'text':
      // Return raw text, optionally trimmed
      return parser.selector === 'trim'
        ? responseText.trim()
        : responseText

    case 'json-path':
      return parseJsonPath(responseText, parser.selector, parser.defaultValue)

    case 'regex':
      return parseRegex(responseText, parser.selector, parser.defaultValue)

    default:
      return responseText
  }
}

/**
 * Parse JSON using dot-path selector
 * e.g., "data.items[0].name" or "results.0.value"
 */
function parseJsonPath(json: string, path: string, defaultValue?: string): string {
  try {
    const data = JSON.parse(json)
    const value = getNestedValue(data, path)

    if (value === undefined || value === null) {
      return defaultValue || ''
    }

    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return defaultValue || ''
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(/[.\[\]]/).filter(Boolean)
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Parse using regex with capture group
 */
function parseRegex(text: string, pattern: string, defaultValue?: string): string {
  try {
    const regex = new RegExp(pattern)
    const match = text.match(regex)

    if (!match) {
      return defaultValue || ''
    }

    // Return first capture group if exists, otherwise full match
    return match[1] ?? match[0]
  } catch {
    return defaultValue || ''
  }
}

// -----------------------------------------------------------------------------
// JavaScript Variable Resolver
// -----------------------------------------------------------------------------

/**
 * Resolve a JavaScript variable (sandboxed execution)
 */
export function resolveJavaScript(
  variable: JavaScriptVariable,
  context?: Record<string, string>
): Result<ResolutionResult, AppError> {
  const startTime = Date.now()

  const result = executeSandboxed(variable.code, {
    timeout: variable.timeout || 5000,
    context: context || {},
    variableName: variable.name
  })

  if (!result.success) {
    return Result.err(Errors.variable.jsExecutionFailed(
      variable.name,
      result.error || 'Unknown error'
    ))
  }

  logger.debug('JavaScript resolved', {
    name: variable.name,
    duration: result.duration
  })

  return Result.ok({
    value: result.value || '',
    fromCache: false,
    duration: Date.now() - startTime
  })
}

// -----------------------------------------------------------------------------
// Test Resolver (for REST API builder)
// -----------------------------------------------------------------------------

export interface TestRequestOptions {
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key'
    value: string
    keyName?: string
  }
  timeout?: number
}

export interface TestRequestResult {
  success: boolean
  statusCode?: number
  headers?: Record<string, string>
  body?: string
  error?: string
  duration: number
}

/**
 * Test a REST API request (for the builder UI)
 */
export async function testRestRequest(
  options: TestRequestOptions
): Promise<TestRequestResult> {
  const startTime = Date.now()

  // Build headers
  const headers: Record<string, string> = {
    'Accept': '*/*',
    ...(options.headers || {})
  }

  // Add authentication
  if (options.authentication) {
    const { type, value, keyName } = options.authentication

    switch (type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${value}`
        break
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(value).toString('base64')}`
        break
      case 'api-key':
        headers[keyName || 'X-API-Key'] = value
        break
    }
  }

  // Build body
  let body: string | undefined
  if (options.body && options.method !== 'GET') {
    body = typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)

    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  try {
    const response = await httpClient.fetch(options.url, {
      method: options.method as any,
      headers,
      body,
      timeout: options.timeout || 10000,
      retries: 1
    })

    if (!response.ok) {
      return {
        success: false,
        error: response.error.message,
        duration: Date.now() - startTime
      }
    }

    const httpResponse = response.value
    const responseBody = await httpResponse.text()

    return {
      success: true,
      statusCode: httpResponse.status,
      headers: httpResponse.headers,
      body: responseBody,
      duration: Date.now() - startTime
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      duration: Date.now() - startTime
    }
  }
}
