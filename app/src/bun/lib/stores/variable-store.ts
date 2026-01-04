// =============================================================================
// VARIABLE STORE
// =============================================================================
// SQLite-backed storage for variable definitions (app-level, wildcard, REST API, JavaScript).

import { db } from '../db'
import {
  Result,
  Errors,
  logger,
  type VariableId,
  type VariableType,
  type VariableScope,
  type Variable,
  type AppLevelVariable,
  type WildcardVariable,
  type RestApiVariable,
  type JavaScriptVariable,
  type RestRequestConfig,
  type ResponseParser,
  type AnyVariable,
  newVariableId
} from '../core'
import { encryptForStorage, decryptFromStorage, decryptJsonFromStorage } from '../core/encryption'

const log = logger.child({ module: 'variable-store' })

// -----------------------------------------------------------------------------
// Database Row Types
// -----------------------------------------------------------------------------

interface VariableRow {
  id: string
  name: string
  type: VariableType
  scope: VariableScope
  description: string | null
  is_enabled: number
  created_at: string
  updated_at: string

  // App-level
  value: string | null

  // Wildcard
  wildcard_options: string | null
  wildcard_allow_duplicates: number | null
  wildcard_cache_duration: number | null

  // REST API
  rest_method: string | null
  rest_url: string | null
  rest_headers: string | null
  rest_body: string | null
  rest_auth_type: string | null
  rest_auth_value: string | null
  rest_auth_key_name: string | null
  rest_timeout: number | null
  rest_retries: number | null
  rest_cache_enabled: number | null
  rest_cache_duration: number | null
  rest_response_parser_type: string | null
  rest_response_parser_selector: string | null
  rest_response_parser_default: string | null

  // JavaScript
  js_code: string | null
  js_timeout: number | null
}

// -----------------------------------------------------------------------------
// Row to Domain Conversion
// -----------------------------------------------------------------------------

function rowToVariable(row: VariableRow): AnyVariable {
  const base: Variable = {
    id: row.id as VariableId,
    name: row.name,
    type: row.type,
    scope: row.scope,
    description: row.description || undefined,
    isEnabled: row.is_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }

  switch (row.type) {
    case 'system':
      return {
        ...base,
        type: 'system',
        scope: 'system',
        computeFn: 'time' // System variables are handled separately
      } as any

    case 'app-level':
      return {
        ...base,
        type: 'app-level',
        scope: 'app',
        value: row.value || ''
      } as AppLevelVariable

    case 'wildcard':
      return {
        ...base,
        type: 'wildcard',
        scope: 'app',
        options: row.wildcard_options ? JSON.parse(row.wildcard_options) : [],
        allowDuplicates: row.wildcard_allow_duplicates === 1,
        cacheDuration: row.wildcard_cache_duration || undefined
      } as WildcardVariable

    case 'rest-api':
      const requestConfig: RestRequestConfig = {
        method: (row.rest_method || 'GET') as RestRequestConfig['method'],
        url: row.rest_url || '',
        headers: decryptJsonFromStorage<Record<string, string>>(row.rest_headers) || undefined,
        body: decryptJsonFromStorage(row.rest_body) || undefined,
        authentication: row.rest_auth_type ? {
          type: row.rest_auth_type as 'bearer' | 'basic' | 'api-key',
          value: decryptFromStorage(row.rest_auth_value) || '',
          keyName: row.rest_auth_key_name || undefined
        } : undefined
      }

      const responseParser: ResponseParser = {
        type: (row.rest_response_parser_type || 'text') as ResponseParser['type'],
        selector: row.rest_response_parser_selector || '',
        defaultValue: row.rest_response_parser_default || undefined
      }

      return {
        ...base,
        type: 'rest-api',
        scope: 'app',
        requestConfig,
        responseParser,
        timeout: row.rest_timeout || 10000,
        retries: row.rest_retries || 1,
        cacheEnabled: row.rest_cache_enabled === 1,
        cacheDuration: row.rest_cache_duration || undefined
      } as RestApiVariable

    case 'javascript':
      return {
        ...base,
        type: 'javascript',
        scope: 'app',
        code: decryptFromStorage(row.js_code) || '',
        timeout: row.js_timeout || 5000
      } as JavaScriptVariable

    default:
      return base as AnyVariable
  }
}

// -----------------------------------------------------------------------------
// Variable Name Validation
// -----------------------------------------------------------------------------

const VARIABLE_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]*$/
const MAX_NAME_LENGTH = 50
const RESERVED_NAMES = new Set([
  'time', 'date', 'datetime', 'timestamp', 'user-name', 'system-info',
  'model', 'chat-title', 'chat-id', 'message-count'
])

function validateVariableName(name: string): Result<void> {
  if (!name || name.trim() === '') {
    return Result.err(Errors.variable.invalidName(name, 'name cannot be empty'))
  }

  if (name.length > MAX_NAME_LENGTH) {
    return Result.err(Errors.variable.invalidName(name, `name must be ${MAX_NAME_LENGTH} characters or less`))
  }

  if (!VARIABLE_NAME_REGEX.test(name)) {
    return Result.err(Errors.variable.invalidName(name, 'name must start with letter or underscore, contain only letters, numbers, underscores, and hyphens'))
  }

  if (RESERVED_NAMES.has(name.toLowerCase())) {
    return Result.err(Errors.variable.invalidName(name, 'name is reserved for system variables'))
  }

  return Result.ok(undefined)
}

// -----------------------------------------------------------------------------
// Variable Store
// -----------------------------------------------------------------------------

export interface CreateAppLevelInput {
  name: string
  value: string
  description?: string
}

export interface CreateWildcardInput {
  name: string
  options: string[]
  description?: string
  allowDuplicates?: boolean
  cacheDuration?: number
}

export interface CreateRestApiInput {
  name: string
  description?: string
  requestConfig: RestRequestConfig
  responseParser: ResponseParser
  timeout?: number
  retries?: number
  cacheEnabled?: boolean
  cacheDuration?: number
}

export interface CreateJavaScriptInput {
  name: string
  description?: string
  code: string
  timeout?: number
}

export interface UpdateVariableInput {
  name?: string
  description?: string
  isEnabled?: boolean
  // Type-specific fields
  value?: string
  options?: string[]
  allowDuplicates?: boolean
  cacheDuration?: number
  requestConfig?: RestRequestConfig
  responseParser?: ResponseParser
  timeout?: number
  retries?: number
  cacheEnabled?: boolean
  code?: string
}

export const VariableStore = {
  /**
   * List all variables
   */
  listVariables(): Result<AnyVariable[]> {
    try {
      const rows = db.app
        .prepare('SELECT * FROM variables ORDER BY name')
        .all() as VariableRow[]

      return Result.ok(rows.map(rowToVariable))
    } catch (error) {
      log.error('Failed to list variables', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * List variables by type
   */
  listVariablesByType(type: VariableType): Result<AnyVariable[]> {
    try {
      const rows = db.app
        .prepare('SELECT * FROM variables WHERE type = ? ORDER BY name')
        .all(type) as VariableRow[]

      return Result.ok(rows.map(rowToVariable))
    } catch (error) {
      log.error('Failed to list variables by type', error instanceof Error ? error : undefined, { type })
      return Result.err(Errors.db.queryFailed('SELECT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get a variable by ID
   */
  getVariableById(id: VariableId): Result<AnyVariable | null> {
    try {
      const row = db.app
        .prepare('SELECT * FROM variables WHERE id = ?')
        .get(id) as VariableRow | null

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(rowToVariable(row))
    } catch (error) {
      log.error('Failed to get variable by id', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('SELECT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get a variable by name
   */
  getVariableByName(name: string): Result<AnyVariable | null> {
    try {
      const row = db.app
        .prepare('SELECT * FROM variables WHERE name = ?')
        .get(name) as VariableRow | null

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(rowToVariable(row))
    } catch (error) {
      log.error('Failed to get variable by name', error instanceof Error ? error : undefined, { name })
      return Result.err(Errors.db.queryFailed('SELECT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Check if a variable name exists
   */
  nameExists(name: string): boolean {
    try {
      const row = db.app
        .prepare('SELECT 1 FROM variables WHERE name = ?')
        .get(name)
      return row !== null
    } catch {
      return false
    }
  },

  /**
   * Create an app-level variable (simple text value)
   */
  createAppLevelVariable(input: CreateAppLevelInput): Result<AppLevelVariable> {
    const nameValidation = validateVariableName(input.name)
    if (!nameValidation.ok) {
      return nameValidation as Result<never>
    }

    if (this.nameExists(input.name)) {
      return Result.err(Errors.variable.nameConflict(input.name))
    }

    try {
      const id = newVariableId()
      const now = new Date().toISOString()

      db.app.prepare(`
        INSERT INTO variables (id, name, type, scope, description, is_enabled, value, created_at, updated_at)
        VALUES (?, ?, 'app-level', 'app', ?, 1, ?, ?, ?)
      `).run(id, input.name, input.description || null, input.value, now, now)

      log.info('App-level variable created', { id, name: input.name })

      const variable: AppLevelVariable = {
        id,
        name: input.name,
        type: 'app-level',
        scope: 'app',
        description: input.description,
        isEnabled: true,
        value: input.value,
        createdAt: now,
        updatedAt: now
      }

      return Result.ok(variable)
    } catch (error) {
      log.error('Failed to create app-level variable', error instanceof Error ? error : undefined, { name: input.name })
      return Result.err(Errors.db.queryFailed('INSERT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Create a wildcard variable (random selection from options)
   */
  createWildcardVariable(input: CreateWildcardInput): Result<WildcardVariable> {
    const nameValidation = validateVariableName(input.name)
    if (!nameValidation.ok) {
      return nameValidation as Result<never>
    }

    if (this.nameExists(input.name)) {
      return Result.err(Errors.variable.nameConflict(input.name))
    }

    if (!input.options || input.options.length === 0) {
      return Result.err(Errors.variable.invalidConfig('wildcard', 'options array cannot be empty'))
    }

    try {
      const id = newVariableId()
      const now = new Date().toISOString()

      db.app.prepare(`
        INSERT INTO variables (id, name, type, scope, description, is_enabled,
          wildcard_options, wildcard_allow_duplicates, wildcard_cache_duration,
          created_at, updated_at)
        VALUES (?, ?, 'wildcard', 'app', ?, 1, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.name,
        input.description || null,
        JSON.stringify(input.options),
        input.allowDuplicates ? 1 : 0,
        input.cacheDuration || null,
        now,
        now
      )

      log.info('Wildcard variable created', { id, name: input.name, optionCount: input.options.length })

      const variable: WildcardVariable = {
        id,
        name: input.name,
        type: 'wildcard',
        scope: 'app',
        description: input.description,
        isEnabled: true,
        options: input.options,
        allowDuplicates: input.allowDuplicates,
        cacheDuration: input.cacheDuration,
        createdAt: now,
        updatedAt: now
      }

      return Result.ok(variable)
    } catch (error) {
      log.error('Failed to create wildcard variable', error instanceof Error ? error : undefined, { name: input.name })
      return Result.err(Errors.db.queryFailed('INSERT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Create a REST API variable
   */
  createRestApiVariable(input: CreateRestApiInput): Result<RestApiVariable> {
    const nameValidation = validateVariableName(input.name)
    if (!nameValidation.ok) {
      return nameValidation as Result<never>
    }

    if (this.nameExists(input.name)) {
      return Result.err(Errors.variable.nameConflict(input.name))
    }

    if (!input.requestConfig.url) {
      return Result.err(Errors.variable.invalidConfig('rest-api', 'URL is required'))
    }

    try {
      const id = newVariableId()
      const now = new Date().toISOString()

      // Encrypt sensitive fields
      const encryptedHeaders = input.requestConfig.headers
        ? encryptForStorage(input.requestConfig.headers)
        : null
      const encryptedBody = input.requestConfig.body
        ? encryptForStorage(input.requestConfig.body)
        : null
      const encryptedAuthValue = input.requestConfig.authentication?.value
        ? encryptForStorage(input.requestConfig.authentication.value)
        : null

      db.app.prepare(`
        INSERT INTO variables (id, name, type, scope, description, is_enabled,
          rest_method, rest_url, rest_headers, rest_body,
          rest_auth_type, rest_auth_value, rest_auth_key_name,
          rest_timeout, rest_retries, rest_cache_enabled, rest_cache_duration,
          rest_response_parser_type, rest_response_parser_selector, rest_response_parser_default,
          created_at, updated_at)
        VALUES (?, ?, 'rest-api', 'app', ?, 1,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?)
      `).run(
        id,
        input.name,
        input.description || null,
        input.requestConfig.method,
        input.requestConfig.url,
        encryptedHeaders,
        encryptedBody,
        input.requestConfig.authentication?.type || null,
        encryptedAuthValue,
        input.requestConfig.authentication?.keyName || null,
        input.timeout || 10000,
        input.retries || 1,
        input.cacheEnabled ? 1 : 0,
        input.cacheDuration || null,
        input.responseParser.type,
        input.responseParser.selector,
        input.responseParser.defaultValue || null,
        now,
        now
      )

      log.info('REST API variable created', { id, name: input.name, url: input.requestConfig.url })

      const variable: RestApiVariable = {
        id,
        name: input.name,
        type: 'rest-api',
        scope: 'app',
        description: input.description,
        isEnabled: true,
        requestConfig: input.requestConfig,
        responseParser: input.responseParser,
        timeout: input.timeout || 10000,
        retries: input.retries || 1,
        cacheEnabled: input.cacheEnabled,
        cacheDuration: input.cacheDuration,
        createdAt: now,
        updatedAt: now
      }

      return Result.ok(variable)
    } catch (error) {
      log.error('Failed to create REST API variable', error instanceof Error ? error : undefined, { name: input.name })
      return Result.err(Errors.db.queryFailed('INSERT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Create a JavaScript variable
   */
  createJavaScriptVariable(input: CreateJavaScriptInput): Result<JavaScriptVariable> {
    const nameValidation = validateVariableName(input.name)
    if (!nameValidation.ok) {
      return nameValidation as Result<never>
    }

    if (this.nameExists(input.name)) {
      return Result.err(Errors.variable.nameConflict(input.name))
    }

    if (!input.code || input.code.trim() === '') {
      return Result.err(Errors.variable.invalidConfig('javascript', 'code cannot be empty'))
    }

    try {
      const id = newVariableId()
      const now = new Date().toISOString()

      // Encrypt code
      const encryptedCode = encryptForStorage(input.code)

      db.app.prepare(`
        INSERT INTO variables (id, name, type, scope, description, is_enabled,
          js_code, js_timeout, created_at, updated_at)
        VALUES (?, ?, 'javascript', 'app', ?, 1, ?, ?, ?, ?)
      `).run(
        id,
        input.name,
        input.description || null,
        encryptedCode,
        input.timeout || 5000,
        now,
        now
      )

      log.info('JavaScript variable created', { id, name: input.name })

      const variable: JavaScriptVariable = {
        id,
        name: input.name,
        type: 'javascript',
        scope: 'app',
        description: input.description,
        isEnabled: true,
        code: input.code,
        timeout: input.timeout || 5000,
        createdAt: now,
        updatedAt: now
      }

      return Result.ok(variable)
    } catch (error) {
      log.error('Failed to create JavaScript variable', error instanceof Error ? error : undefined, { name: input.name })
      return Result.err(Errors.db.queryFailed('INSERT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Update a variable
   */
  updateVariable(id: VariableId, input: UpdateVariableInput): Result<AnyVariable> {
    // Get existing variable
    const existingResult = this.getVariableById(id)
    if (!existingResult.ok) {
      return existingResult
    }
    if (!existingResult.value) {
      return Result.err(Errors.variable.notFound(id))
    }

    const existing = existingResult.value

    // Validate name change if provided
    if (input.name && input.name !== existing.name) {
      const nameValidation = validateVariableName(input.name)
      if (!nameValidation.ok) {
        return nameValidation as Result<never>
      }
      if (this.nameExists(input.name)) {
        return Result.err(Errors.variable.nameConflict(input.name))
      }
    }

    try {
      const now = new Date().toISOString()
      const updates: string[] = []
      const values: unknown[] = []

      // Common fields
      if (input.name !== undefined) {
        updates.push('name = ?')
        values.push(input.name)
      }
      if (input.description !== undefined) {
        updates.push('description = ?')
        values.push(input.description || null)
      }
      if (input.isEnabled !== undefined) {
        updates.push('is_enabled = ?')
        values.push(input.isEnabled ? 1 : 0)
      }

      // Type-specific fields
      if (existing.type === 'app-level' && input.value !== undefined) {
        updates.push('value = ?')
        values.push(input.value)
      }

      if (existing.type === 'wildcard') {
        if (input.options !== undefined) {
          updates.push('wildcard_options = ?')
          values.push(JSON.stringify(input.options))
        }
        if (input.allowDuplicates !== undefined) {
          updates.push('wildcard_allow_duplicates = ?')
          values.push(input.allowDuplicates ? 1 : 0)
        }
        if (input.cacheDuration !== undefined) {
          updates.push('wildcard_cache_duration = ?')
          values.push(input.cacheDuration || null)
        }
      }

      if (existing.type === 'rest-api') {
        if (input.requestConfig !== undefined) {
          const cfg = input.requestConfig
          updates.push('rest_method = ?', 'rest_url = ?')
          values.push(cfg.method, cfg.url)

          updates.push('rest_headers = ?')
          values.push(cfg.headers ? encryptForStorage(cfg.headers) : null)

          updates.push('rest_body = ?')
          values.push(cfg.body ? encryptForStorage(cfg.body) : null)

          updates.push('rest_auth_type = ?', 'rest_auth_value = ?', 'rest_auth_key_name = ?')
          values.push(
            cfg.authentication?.type || null,
            cfg.authentication?.value ? encryptForStorage(cfg.authentication.value) : null,
            cfg.authentication?.keyName || null
          )
        }
        if (input.responseParser !== undefined) {
          updates.push('rest_response_parser_type = ?', 'rest_response_parser_selector = ?', 'rest_response_parser_default = ?')
          values.push(input.responseParser.type, input.responseParser.selector, input.responseParser.defaultValue || null)
        }
        if (input.timeout !== undefined) {
          updates.push('rest_timeout = ?')
          values.push(input.timeout)
        }
        if (input.retries !== undefined) {
          updates.push('rest_retries = ?')
          values.push(input.retries)
        }
        if (input.cacheEnabled !== undefined) {
          updates.push('rest_cache_enabled = ?')
          values.push(input.cacheEnabled ? 1 : 0)
        }
        if (input.cacheDuration !== undefined) {
          updates.push('rest_cache_duration = ?')
          values.push(input.cacheDuration || null)
        }
      }

      if (existing.type === 'javascript') {
        if (input.code !== undefined) {
          updates.push('js_code = ?')
          values.push(encryptForStorage(input.code))
        }
        if (input.timeout !== undefined) {
          updates.push('js_timeout = ?')
          values.push(input.timeout)
        }
      }

      // Always update timestamp
      updates.push('updated_at = ?')
      values.push(now)
      values.push(id)

      if (updates.length > 1) {  // More than just updated_at
        db.app.prepare(`UPDATE variables SET ${updates.join(', ')} WHERE id = ?`).run(...values)
        log.info('Variable updated', { id, name: existing.name })
      }

      // Return updated variable
      return this.getVariableById(id) as Result<AnyVariable>
    } catch (error) {
      log.error('Failed to update variable', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('UPDATE variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Delete a variable
   */
  deleteVariable(id: VariableId): Result<void> {
    try {
      const result = db.app
        .prepare('DELETE FROM variables WHERE id = ?')
        .run(id)

      if (result.changes === 0) {
        return Result.err(Errors.variable.notFound(id))
      }

      log.info('Variable deleted', { id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to delete variable', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('DELETE variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Toggle variable enabled state
   */
  toggleVariable(id: VariableId, enabled: boolean): Result<void> {
    try {
      const now = new Date().toISOString()
      const result = db.app
        .prepare('UPDATE variables SET is_enabled = ?, updated_at = ? WHERE id = ?')
        .run(enabled ? 1 : 0, now, id)

      if (result.changes === 0) {
        return Result.err(Errors.variable.notFound(id))
      }

      log.info('Variable toggled', { id, enabled })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to toggle variable', error instanceof Error ? error : undefined, { id })
      return Result.err(Errors.db.queryFailed('UPDATE variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get all enabled variables (for expansion)
   */
  getEnabledVariables(): Result<AnyVariable[]> {
    try {
      const rows = db.app
        .prepare('SELECT * FROM variables WHERE is_enabled = 1 ORDER BY name')
        .all() as VariableRow[]

      return Result.ok(rows.map(rowToVariable))
    } catch (error) {
      log.error('Failed to get enabled variables', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT variables', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Record a variable test result
   */
  recordTestResult(
    variableId: VariableId,
    success: boolean,
    data?: string,
    error?: string,
    duration?: number
  ): Result<void> {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      db.app.prepare(`
        INSERT INTO variable_tests (id, variable_id, success, data, error, duration, tested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, variableId, success ? 1 : 0, data || null, error || null, duration || null, now)

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to record test result', error instanceof Error ? error : undefined, { variableId })
      return Result.err(Errors.db.queryFailed('INSERT variable_tests', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get recent test results for a variable
   */
  getTestResults(variableId: VariableId, limit = 10): Result<Array<{
    success: boolean
    data?: string
    error?: string
    duration?: number
    testedAt: string
  }>> {
    try {
      const rows = db.app.prepare(`
        SELECT success, data, error, duration, tested_at
        FROM variable_tests
        WHERE variable_id = ?
        ORDER BY tested_at DESC
        LIMIT ?
      `).all(variableId, limit) as Array<{
        success: number
        data: string | null
        error: string | null
        duration: number | null
        tested_at: string
      }>

      return Result.ok(rows.map(row => ({
        success: row.success === 1,
        data: row.data || undefined,
        error: row.error || undefined,
        duration: row.duration || undefined,
        testedAt: row.tested_at
      })))
    } catch (error) {
      log.error('Failed to get test results', error instanceof Error ? error : undefined, { variableId })
      return Result.err(Errors.db.queryFailed('SELECT variable_tests', error instanceof Error ? error : undefined))
    }
  }
}
