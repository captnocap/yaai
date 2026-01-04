# Variable Expansion Engine — Specification

> Version: 1.0.0
> Last Updated: 2026-01-04

Backend variable resolution logic. Covers recursive expansion, system variables, REST API execution, JavaScript evaluation, caching, and error handling.

---

## Table of Contents

1. [Expansion Architecture](#1-expansion-architecture)
2. [Variable Store Implementation](#2-variable-store-implementation)
3. [Expansion Engine](#3-expansion-engine)
4. [System Variables](#4-system-variables)
5. [Wildcard Variables](#5-wildcard-variables)
6. [REST API Variables](#6-rest-api-variables)
7. [JavaScript Variables](#7-javascript-variables)
8. [Caching Strategy](#8-caching-strategy)
9. [Error Handling](#9-error-handling)
10. [Performance Optimization](#10-performance-optimization)

---

## 1. Expansion Architecture

### 1.1 Expansion Request Flow

```
Frontend: variable:expand {variables: ['var1', 'var2']}
    ↓
Backend: variableExpander.expand(['var1', 'var2'])
    ↓
For each variable:
  1. Check cache
  2. If not cached:
    a. Load variable definition from database
    b. Determine type (system, app-level, wildcard, rest-api, javascript)
    c. Execute appropriate resolver
    d. Cache result (if caching enabled)
  3. Return {variable, data, error, metadata}
    ↓
Response: [{variable, data, error, type, lastUpdated}, ...]
    ↓
Frontend: Display in blocks or interpolate
```

### 1.2 Module Structure

```
app/src/bun/lib/
├── stores/
│   └── variable-store.ts          # CRUD operations, database interface
│
├── variables/                     # NEW
│   ├── expander.ts                # VariableExpander (orchestrator)
│   ├── resolvers.ts               # Resolver implementations
│   ├── cache.ts                   # Caching logic
│   ├── sandbox.ts                 # JavaScript sandbox
│   └── interpolator.ts            # Variable interpolation utility
```

---

## 2. Variable Store Implementation

### 2.1 VariableStore Class

```typescript
// lib/stores/variable-store.ts

import { Database } from 'bun:sqlite'
import { Result, AppError, logger, Errors } from '../core'
import type {
  Variable,
  VariableId,
  AppLevelVariable,
  WildcardVariable,
  RestApiVariable,
  JavaScriptVariable,
  RestRequestConfig,
  ResponseParser,
  VariableType
} from '../core/types'
import { encrypt, decrypt } from '../core/encryption'
import { generateId } from '../core/types'

export class VariableStore {
  constructor(private db: Database) {}

  /**
   * List all variables (enabled and disabled)
   */
  async listVariables(): Promise<Variable[]> {
    try {
      const rows = this.db.query(`
        SELECT * FROM variables ORDER BY created_at DESC
      `).all() as any[]

      return rows.map(row => this.rowToVariable(row))
    } catch (error) {
      logger.error('Failed to list variables', error as Error)
      throw Errors.db.queryFailed('SELECT * FROM variables', error as Error)
    }
  }

  /**
   * Get variable by name
   */
  async getVariableByName(name: string): Promise<Result<Variable>> {
    try {
      const row = this.db.query(
        'SELECT * FROM variables WHERE name = ?'
      ).get(name) as any

      if (!row) {
        return Result.err(Errors.variable.notFound(name))
      }

      return Result.ok(this.rowToVariable(row))
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT * FROM variables WHERE name = ?', error as Error))
    }
  }

  /**
   * Get variable by ID
   */
  async getVariableById(id: VariableId): Promise<Result<Variable>> {
    try {
      const row = this.db.query(
        'SELECT * FROM variables WHERE id = ?'
      ).get(id) as any

      if (!row) {
        return Result.err(Errors.variable.notFound(id))
      }

      return Result.ok(this.rowToVariable(row))
    } catch (error) {
      return Result.err(Errors.db.queryFailed('SELECT * FROM variables WHERE id = ?', error as Error))
    }
  }

  /**
   * Create app-level variable
   */
  async createAppLevelVariable(data: {
    name: string
    value: string
    description?: string
  }): Promise<Result<AppLevelVariable>> {
    // Validate name
    if (!this.isValidVariableName(data.name)) {
      return Result.err(Errors.variable.invalidName(data.name, 'invalid format'))
    }

    // Check for conflict
    const existing = await this.getVariableByName(data.name)
    if (existing.ok) {
      return Result.err(Errors.variable.nameConflict(data.name))
    }

    try {
      const id = generateId() as VariableId
      const now = new Date().toISOString()

      this.db.query(`
        INSERT INTO variables (id, name, type, scope, description, is_enabled, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, 'app-level', 'app', data.description || null, 1, data.value, now, now)

      return Result.ok({
        id,
        name: data.name,
        type: 'app-level',
        scope: 'app',
        description: data.description,
        isEnabled: true,
        value: data.value,
        createdAt: now,
        updatedAt: now
      } as AppLevelVariable)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT into variables', error as Error))
    }
  }

  /**
   * Create wildcard variable
   */
  async createWildcardVariable(data: {
    name: string
    options: string[]
    description?: string
    allowDuplicates?: boolean
    cacheDuration?: number
  }): Promise<Result<WildcardVariable>> {
    if (!this.isValidVariableName(data.name)) {
      return Result.err(Errors.variable.invalidName(data.name, 'invalid format'))
    }

    if (data.options.length === 0) {
      return Result.err(Errors.variable.invalidConfig('wildcard', 'options array cannot be empty'))
    }

    const existing = await this.getVariableByName(data.name)
    if (existing.ok) {
      return Result.err(Errors.variable.nameConflict(data.name))
    }

    try {
      const id = generateId() as VariableId
      const now = new Date().toISOString()

      this.db.query(`
        INSERT INTO variables (
          id, name, type, scope, description, is_enabled,
          wildcard_options, wildcard_allow_duplicates, wildcard_cache_duration,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, data.name, 'wildcard', 'app', data.description || null, 1,
        JSON.stringify(data.options),
        data.allowDuplicates ? 1 : 0,
        data.cacheDuration || null,
        now, now
      )

      return Result.ok({
        id,
        name: data.name,
        type: 'wildcard',
        scope: 'app',
        description: data.description,
        isEnabled: true,
        options: data.options,
        allowDuplicates: data.allowDuplicates,
        cacheDuration: data.cacheDuration,
        createdAt: now,
        updatedAt: now
      } as WildcardVariable)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT into variables', error as Error))
    }
  }

  /**
   * Create REST API variable
   */
  async createRestApiVariable(data: {
    name: string
    requestConfig: RestRequestConfig
    responseParser: ResponseParser
    description?: string
    timeout?: number
    retries?: number
    cacheEnabled?: boolean
    cacheDuration?: number
  }): Promise<Result<RestApiVariable>> {
    if (!this.isValidVariableName(data.name)) {
      return Result.err(Errors.variable.invalidName(data.name, 'invalid format'))
    }

    const existing = await this.getVariableByName(data.name)
    if (existing.ok) {
      return Result.err(Errors.variable.nameConflict(data.name))
    }

    try {
      const id = generateId() as VariableId
      const now = new Date().toISOString()

      // Encrypt sensitive fields
      const encryptedHeaders = data.requestConfig.headers
        ? JSON.stringify(encrypt(JSON.stringify(data.requestConfig.headers)))
        : null

      const encryptedBody = data.requestConfig.body
        ? JSON.stringify(encrypt(JSON.stringify(data.requestConfig.body)))
        : null

      const encryptedAuthValue = data.requestConfig.authentication?.value
        ? JSON.stringify(encrypt(data.requestConfig.authentication.value))
        : null

      this.db.query(`
        INSERT INTO variables (
          id, name, type, scope, description, is_enabled,
          rest_method, rest_url, rest_headers, rest_body,
          rest_auth_type, rest_auth_value, rest_auth_key_name,
          rest_timeout, rest_retries, rest_cache_enabled, rest_cache_duration,
          rest_response_parser_type, rest_response_parser_selector, rest_response_parser_default,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, data.name, 'rest-api', 'app', data.description || null, 1,
        data.requestConfig.method,
        data.requestConfig.url,
        encryptedHeaders,
        encryptedBody,
        data.requestConfig.authentication?.type || null,
        encryptedAuthValue,
        data.requestConfig.authentication?.keyName || null,
        data.timeout || 10000,
        data.retries || 1,
        data.cacheEnabled ? 1 : 0,
        data.cacheDuration || null,
        data.responseParser.type,
        data.responseParser.selector,
        data.responseParser.defaultValue || null,
        now, now
      )

      return Result.ok({
        id,
        name: data.name,
        type: 'rest-api',
        scope: 'app',
        description: data.description,
        isEnabled: true,
        requestConfig: data.requestConfig,
        responseParser: data.responseParser,
        timeout: data.timeout,
        retries: data.retries,
        cacheEnabled: data.cacheEnabled,
        cacheDuration: data.cacheDuration,
        createdAt: now,
        updatedAt: now
      } as RestApiVariable)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('INSERT into variables', error as Error))
    }
  }

  /**
   * Update variable
   */
  async updateVariable(id: VariableId, updates: Partial<Variable>): Promise<Result<Variable>> {
    // Validate any name changes
    if (updates.name && !this.isValidVariableName(updates.name)) {
      return Result.err(Errors.variable.invalidName(updates.name, 'invalid format'))
    }

    try {
      const now = new Date().toISOString()
      updates.updatedAt = now

      // Build SQL update
      const setClauses: string[] = []
      const values: unknown[] = []

      for (const [key, value] of Object.entries(updates)) {
        // Skip internal fields
        if (['id', 'type', 'scope'].includes(key)) continue

        const colName = this.camelToSnake(key)
        setClauses.push(`${colName} = ?`)
        values.push(value)
      }

      values.push(id)

      const query = `UPDATE variables SET ${setClauses.join(', ')} WHERE id = ?`
      this.db.query(query).run(...values)

      // Fetch updated record
      const result = await this.getVariableById(id)
      return result
    } catch (error) {
      return Result.err(Errors.db.queryFailed('UPDATE variables', error as Error))
    }
  }

  /**
   * Delete variable
   */
  async deleteVariable(id: VariableId): Promise<Result<boolean>> {
    try {
      this.db.query('DELETE FROM variables WHERE id = ?').run(id)
      return Result.ok(true)
    } catch (error) {
      return Result.err(Errors.db.queryFailed('DELETE FROM variables', error as Error))
    }
  }

  /**
   * Test REST API request (for variable builder)
   */
  async testRestApiRequest(config: RestRequestConfig): Promise<Result<{
    statusCode: number
    headers: Record<string, string>
    body: string | object
  }>> {
    try {
      const { httpClient } = await import('../core/http-client')

      // Build fetch options
      const fetchOptions: RequestInit & { requireProxy?: boolean } = {
        method: config.method,
        requireProxy: true  // REST API variables must respect proxy
      }

      // Add headers
      if (config.headers) {
        fetchOptions.headers = config.headers
      }

      // Add authentication
      if (config.authentication) {
        if (!fetchOptions.headers) {
          fetchOptions.headers = {}
        }

        const headers = fetchOptions.headers as Record<string, string>
        if (config.authentication.type === 'bearer') {
          headers['Authorization'] = `Bearer ${config.authentication.value}`
        } else if (config.authentication.type === 'basic') {
          const encoded = Buffer.from(config.authentication.value).toString('base64')
          headers['Authorization'] = `Basic ${encoded}`
        } else if (config.authentication.type === 'api-key' && config.authentication.keyName) {
          headers[config.authentication.keyName] = config.authentication.value
        }
      }

      // Add body
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        fetchOptions.body = JSON.stringify(config.body)
        if (!fetchOptions.headers) {
          fetchOptions.headers = {}
        }
        ;(fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json'
      }

      // Make request
      const response = await httpClient.fetch(config.url, {
        ...fetchOptions,
        timeout: 10000,
        retries: 1
      })

      if (!response.ok) {
        return Result.err(Errors.variable.restRequestFailed(config.url, response.status))
      }

      // Parse response
      let body: string | object
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        body = await response.json()
      } else {
        body = await response.text()
      }

      return Result.ok({
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body
      })
    } catch (error) {
      return Result.err(Errors.variable.restRequestFailed(
        config.url,
        0,
        error as Error
      ))
    }
  }

  /**
   * Convert row to Variable object
   */
  private rowToVariable(row: any): Variable {
    switch (row.type) {
      case 'system':
        return {
          id: row.id as VariableId,
          name: row.name,
          type: 'system' as const,
          scope: 'system' as const,
          description: row.description,
          isEnabled: !!row.is_enabled,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          computeFn: row.compute_fn
        }

      case 'app-level':
        return {
          id: row.id as VariableId,
          name: row.name,
          type: 'app-level' as const,
          scope: 'app' as const,
          description: row.description,
          isEnabled: !!row.is_enabled,
          value: row.value,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }

      case 'wildcard':
        return {
          id: row.id as VariableId,
          name: row.name,
          type: 'wildcard' as const,
          scope: 'app' as const,
          description: row.description,
          isEnabled: !!row.is_enabled,
          options: JSON.parse(row.wildcard_options),
          allowDuplicates: !!row.wildcard_allow_duplicates,
          cacheDuration: row.wildcard_cache_duration,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }

      case 'rest-api':
        return {
          id: row.id as VariableId,
          name: row.name,
          type: 'rest-api' as const,
          scope: 'app' as const,
          description: row.description,
          isEnabled: !!row.is_enabled,
          requestConfig: {
            method: row.rest_method,
            url: row.rest_url,
            headers: row.rest_headers ? JSON.parse(row.rest_headers) : undefined,
            body: row.rest_body ? JSON.parse(row.rest_body) : undefined,
            authentication: row.rest_auth_type ? {
              type: row.rest_auth_type,
              value: row.rest_auth_value,
              keyName: row.rest_auth_key_name
            } : undefined
          },
          responseParser: {
            type: row.rest_response_parser_type,
            selector: row.rest_response_parser_selector,
            defaultValue: row.rest_response_parser_default
          },
          timeout: row.rest_timeout,
          retries: row.rest_retries,
          cacheEnabled: !!row.rest_cache_enabled,
          cacheDuration: row.rest_cache_duration,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }

      case 'javascript':
        return {
          id: row.id as VariableId,
          name: row.name,
          type: 'javascript' as const,
          scope: 'app' as const,
          description: row.description,
          isEnabled: !!row.is_enabled,
          code: row.js_code,
          timeout: row.js_timeout,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }

      default:
        throw new Error(`Unknown variable type: ${row.type}`)
    }
  }

  private isValidVariableName(name: string): boolean {
    return /^[a-zA-Z_][\w-]*$/.test(name) && name.length <= 50 && name.length > 0
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }
}
```

---

## 3. Expansion Engine

### 3.1 VariableExpander Class

```typescript
// lib/variables/expander.ts

import { logger, Result, AppError } from '../core'
import { VariableStore } from '../stores/variable-store'
import { VariableCache } from './cache'
import { resolveSystemVariable, resolveAppLevelVariable, resolveWildcardVariable, resolveRestApiVariable, resolveJavaScriptVariable } from './resolvers'
import type { Variable, VariableExpansionResult } from '../core/types'

const MAX_RECURSION_DEPTH = 5

export class VariableExpander {
  private cache: VariableCache
  private variableStore: VariableStore
  private expansionDepth = 0

  constructor(variableStore: VariableStore) {
    this.variableStore = variableStore
    this.cache = new VariableCache()
  }

  /**
   * Expand multiple variables
   */
  async expand(
    variableNames: string[]
  ): Promise<VariableExpansionResult[]> {
    this.expansionDepth = 0
    const results: VariableExpansionResult[] = []

    // Expand in parallel (different variables don't depend on each other)
    const promises = variableNames.map(name => this.expandSingle(name))
    const outcomes = await Promise.allSettled(promises)

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value)
      }
    }

    return results
  }

  /**
   * Expand a single variable with recursion and caching
   */
  async expandSingle(
    variableName: string,
    depth: number = 0
  ): Promise<VariableExpansionResult> {
    // Check recursion depth
    if (depth > MAX_RECURSION_DEPTH) {
      return {
        variable: variableName,
        error: `Circular reference detected (max depth ${MAX_RECURSION_DEPTH})`,
        loading: false
      }
    }

    // Check cache
    const cached = this.cache.get(variableName)
    if (cached) {
      return cached
    }

    try {
      // Load variable definition
      const varResult = await this.variableStore.getVariableByName(variableName)

      if (!varResult.ok) {
        return {
          variable: variableName,
          error: `Variable not found: ${variableName}`,
          loading: false
        }
      }

      const variable = varResult.value

      // Check if enabled
      if (!variable.isEnabled) {
        return {
          variable: variableName,
          error: `Variable is disabled: ${variableName}`,
          loading: false
        }
      }

      // Resolve based on type
      let data: string

      switch (variable.type) {
        case 'system':
          data = await resolveSystemVariable(variable)
          break

        case 'app-level':
          // Recursively resolve variables within the value
          data = await this.resolveWithInterpolation(variable.value, depth + 1)
          break

        case 'wildcard':
          data = await resolveWildcardVariable(variable, this.cache)
          break

        case 'rest-api':
          // Resolve request config with interpolation
          const interpolatedConfig = await this.interpolateRequestConfig(variable.requestConfig, depth + 1)
          data = await resolveRestApiVariable(variable, interpolatedConfig)
          break

        case 'javascript':
          data = await resolveJavaScriptVariable(variable)
          break

        default:
          return {
            variable: variableName,
            error: `Unknown variable type: ${(variable as any).type}`,
            loading: false
          }
      }

      // Cache result
      const result: VariableExpansionResult = {
        variable: variableName,
        data,
        loading: false,
        type: variable.type
      }

      // Determine cache duration
      const cacheDuration = this.getCacheDuration(variable)
      if (cacheDuration > 0) {
        this.cache.set(variableName, result, cacheDuration)
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to expand variable: ${variableName}`, error as Error)

      return {
        variable: variableName,
        error: errorMsg,
        loading: false
      }
    }
  }

  /**
   * Resolve text with embedded variables (recursive interpolation)
   */
  private async resolveWithInterpolation(text: string, depth: number): Promise<string> {
    // Find all {{var}} patterns
    const regex = /\{\{([a-zA-Z_][\w-]*)\}\}/g
    const variableNames: string[] = []
    let match

    while ((match = regex.exec(text)) !== null) {
      variableNames.push(match[1])
    }

    // Expand all variables
    const results = await Promise.all(
      variableNames.map(name => this.expandSingle(name, depth))
    )

    // Interpolate into text
    let result = text
    const resultMap = new Map(results.map(r => [r.variable, r.data]))

    for (const [varName, data] of resultMap) {
      if (data) {
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g')
        result = result.replace(regex, data)
      }
    }

    return result
  }

  /**
   * Interpolate variables in REST request config
   */
  private async interpolateRequestConfig(config: RestRequestConfig, depth: number): Promise<RestRequestConfig> {
    return {
      ...config,
      url: await this.resolveWithInterpolation(config.url, depth),
      headers: config.headers
        ? Object.fromEntries(
          await Promise.all(
            Object.entries(config.headers).map(async ([key, value]) => [
              key,
              await this.resolveWithInterpolation(value, depth)
            ])
          )
        )
        : undefined,
      body: config.body
        ? JSON.parse(await this.resolveWithInterpolation(JSON.stringify(config.body), depth))
        : undefined
    }
  }

  /**
   * Determine cache duration for a variable
   */
  private getCacheDuration(variable: Variable): number {
    if (variable.type === 'wildcard' && variable.cacheDuration !== null) {
      return variable.cacheDuration * 1000 // Convert to ms
    }
    if (variable.type === 'rest-api' && variable.cacheEnabled && variable.cacheDuration) {
      return variable.cacheDuration * 1000
    }
    return 0  // No caching
  }
}
```

---

## 4. System Variables

### 4.1 System Variable Resolver

```typescript
// lib/variables/resolvers.ts (partial)

import type { SystemVariable } from '../core/types'

export async function resolveSystemVariable(variable: SystemVariable): Promise<string> {
  switch (variable.computeFn) {
    case 'time':
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })

    case 'date':
      return new Date().toISOString().split('T')[0]  // YYYY-MM-DD

    case 'datetime':
      return new Date().toISOString()  // ISO 8601

    case 'timestamp':
      return Date.now().toString()

    case 'system-info':
      const os = await import('os')
      return `${os.platform()} ${os.release()}`

    case 'user-info':
      const os2 = await import('os')
      return os2.userInfo().username

    default:
      throw new Error(`Unknown system variable: ${(variable as any).computeFn}`)
  }
}
```

---

## 5. Wildcard Variables

### 5.1 Wildcard Variable Resolver

```typescript
// lib/variables/resolvers.ts (partial)

import type { WildcardVariable } from '../core/types'
import type { VariableCache } from './cache'

export async function resolveWildcardVariable(
  variable: WildcardVariable,
  cache: VariableCache
): Promise<string> {
  if (variable.options.length === 0) {
    throw new Error('Wildcard variable has no options')
  }

  // Check if we have a cached selection (for deterministic selection)
  const cacheKey = `${variable.name}_selection`
  const cachedSelection = cache.get(cacheKey)

  if (cachedSelection && variable.cacheDuration) {
    return cachedSelection.data || ''
  }

  // Pick random option
  const index = Math.floor(Math.random() * variable.options.length)
  const selected = variable.options[index]

  return selected
}
```

---

## 6. REST API Variables

### 6.1 REST API Variable Resolver

```typescript
// lib/variables/resolvers.ts (partial)

import type { RestApiVariable } from '../core/types'
import { httpClient } from '../core/http-client'
import { logger } from '../core'

export async function resolveRestApiVariable(
  variable: RestApiVariable,
  interpolatedConfig: RestRequestConfig
): Promise<string> {
  try {
    // Make the request
    const response = await httpClient.fetch(
      interpolatedConfig.url,
      {
        method: interpolatedConfig.method,
        headers: interpolatedConfig.headers,
        body: interpolatedConfig.body ? JSON.stringify(interpolatedConfig.body) : undefined,
        timeout: variable.timeout || 10000,
        retries: variable.retries || 1,
        requireProxy: true
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // Get response body
    const responseBody = await response.json()

    // Extract field based on parser config
    const extracted = extractResponseField(
      responseBody,
      variable.responseParser
    )

    if (extracted === undefined) {
      return variable.responseParser.defaultValue || ''
    }

    return String(extracted)
  } catch (error) {
    logger.error(`REST API variable failed: ${variable.name}`, error as Error)
    throw error
  }
}

function extractResponseField(
  body: any,
  parser: ResponseParser
): any {
  switch (parser.type) {
    case 'json-path':
      // Use JSON path selector (e.g., 'data.weather[0].temp')
      return selectByPath(body, parser.selector)

    case 'regex':
      // Apply regex to stringified body
      const text = typeof body === 'string' ? body : JSON.stringify(body)
      const match = new RegExp(parser.selector).exec(text)
      return match ? match[1] : undefined

    case 'text':
      // Return as-is (usually for text responses)
      return typeof body === 'string' ? body : JSON.stringify(body)

    default:
      return body
  }
}

function selectByPath(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    // Handle array indexing (e.g., 'items[0]')
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      current = current[arrayMatch[1]]?.[parseInt(arrayMatch[2])]
    } else {
      current = current[part]
    }
  }

  return current
}
```

---

## 7. JavaScript Variables

### 7.1 JavaScript Variable Sandbox

```typescript
// lib/variables/sandbox.ts

import { VM } from 'vm2'  // or use Node.js vm module

export async function executeJavaScript(
  code: string,
  timeout: number = 5000,
  context: Record<string, any> = {}
): Promise<string> {
  try {
    // Create sandbox with safe context
    const sandbox = {
      ...context,
      // Expose safe utilities
      Math,
      Date,
      String,
      Number,
      JSON,
      // Block dangerous operations
      require: undefined,
      process: undefined,
      eval: undefined,
      Function: undefined,
      __dirname: undefined,
      __filename: undefined
    }

    const vm = new VM({
      timeout,
      sandbox,
      eval: false,
      fixAsync: true
    })

    const result = vm.run(code)

    return String(result)
  } catch (error) {
    throw new Error(`JavaScript execution error: ${(error as Error).message}`)
  }
}

export async function resolveJavaScriptVariable(
  variable: JavaScriptVariable
): Promise<string> {
  // Provide some useful context
  const context = {
    now: new Date(),
    timestamp: Date.now()
  }

  return executeJavaScript(variable.code, variable.timeout || 5000, context)
}
```

---

## 8. Caching Strategy

### 8.1 VariableCache Class

```typescript
// lib/variables/cache.ts

export interface CacheEntry {
  variable: string
  data?: string
  error?: string
  timestamp: number
  ttl: number  // ms
}

export class VariableCache {
  private cache = new Map<string, CacheEntry>()
  private cleanupTimer?: NodeJS.Timer

  constructor() {
    // Clean up expired entries every 30 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 30000)
  }

  /**
   * Get cached value if valid
   */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry
  }

  /**
   * Set cached value with TTL
   */
  set(key: string, entry: CacheEntry, ttl: number): void {
    this.cache.set(key, {
      ...entry,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expired: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expired.push(key)
      }
    }

    for (const key of expired) {
      this.cache.delete(key)
    }
  }

  destructor(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
  }
}
```

---

## 9. Error Handling

### 9.1 Common Errors

| Situation | Error Code | User Message | Recovery |
|-----------|-----------|---|---|
| Variable not found | VARIABLE_NOT_FOUND | "Variable '{{name}}' not found" | Create variable |
| Circular reference | Circular reference detected | "Variables reference each other" | Edit variables |
| REST request timeout | VARIABLE_TIMEOUT | "Variable request took too long" | Increase timeout, check API |
| Invalid response | VARIABLE_PARSE_FAILED | "Could not extract data from API response" | Check response parser |
| JavaScript error | JavaScript execution error | "Variable code has an error: ..." | Edit variable code |
| Recursion too deep | Circular reference | "Too many nested variables" | Simplify variable definitions |
| Network error | Network request failed | "Cannot reach API (proxy issue?)" | Check proxy, network |

---

## 10. Performance Optimization

### 10.1 Parallel Expansion

When expanding multiple variables:
- Expand different variables in parallel
- Different variables don't depend on each other (unless explicitly nested)
- Use `Promise.allSettled()` to handle individual failures

### 10.2 Caching Strategy

**When to cache:**
- REST API variables (expensive, explicit cache setting)
- Wildcard selections (can cache per-message with duration)

**When not to cache:**
- System variables (always fresh)
- App-level text (could reference changing variables)
- JavaScript (might have side effects, always fresh)

### 10.3 Timeout Strategies

| Variable Type | Default | Max |
|---|---|---|
| REST API | 10s | 30s |
| JavaScript | 5s | 15s |
| Wildcard | N/A | N/A |
| System | N/A | N/A |
| App-level | N/A (recursive) | N/A |

---

## 11. WebSocket Handler Integration

```typescript
// lib/ws/handlers/variable.ts (modification)

const variableExpander = new VariableExpander(variableStore)

export const variableHandlers = {
  /**
   * variable:expand - Expand variables and return resolved data
   */
  'variable:expand': async (req: WSRequest): Promise<WSResponse> => {
    try {
      const { variables } = req.payload as { variables: string[] }

      if (!variables || variables.length === 0) {
        return errorResponse(req, 'No variables specified')
      }

      const results = await variableExpander.expand(variables)

      return {
        type: 'response',
        id: req.id,
        channel: 'variable:expand',
        payload: results,
        timestamp: Date.now()
      }
    } catch (error) {
      return errorResponse(req, error)
    }
  }
}
```

---

*End of Variable Expansion Engine specification.*
