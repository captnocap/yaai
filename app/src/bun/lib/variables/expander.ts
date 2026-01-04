// =============================================================================
// VARIABLE EXPANDER
// =============================================================================
// Main orchestrator for variable expansion. Coordinates resolvers, handles
// nested variable interpolation, and manages recursive expansion.

import { createLogger } from '../core/logger'
import { Errors, AppError } from '../core/errors'
import { Result, ok, err } from '../core/result'
import type { Variable, VariableType } from '../core/types'
import { isSystemVariable, type SystemVariableName } from './system-variables'
import {
  resolveSystem,
  resolveAppLevel,
  resolveWildcard,
  resolveRestApi,
  resolveJavaScript,
  type ResolutionResult
} from './resolvers'
import {
  detectVariables,
  interpolate,
  hasVariables,
  getUniqueVariableNames
} from './interpolator'

const logger = createLogger('variable-expander')

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ExpansionResult {
  name: string
  value: string
  fromCache: boolean
  duration: number
  nestedExpansions?: string[]  // Variables that were expanded within this value
}

export interface ExpansionError {
  name: string
  error: AppError
}

export interface ExpandTextResult {
  text: string
  expansions: ExpansionResult[]
  errors: ExpansionError[]
  totalDuration: number
}

export interface ExpanderOptions {
  /** Maximum recursion depth for nested variables (default: 5) */
  maxDepth?: number
  /** Session ID for caching context */
  sessionId?: string
  /** Additional context for JavaScript variables */
  jsContext?: Record<string, string>
  /** Lookup function to get variable definitions by name */
  getVariable: (name: string) => Promise<Variable | undefined>
}

// -----------------------------------------------------------------------------
// Variable Expander Class
// -----------------------------------------------------------------------------

export class VariableExpander {
  private maxDepth: number
  private sessionId?: string
  private jsContext: Record<string, string>
  private getVariable: (name: string) => Promise<Variable | undefined>

  constructor(options: ExpanderOptions) {
    this.maxDepth = options.maxDepth ?? 5
    this.sessionId = options.sessionId
    this.jsContext = options.jsContext ?? {}
    this.getVariable = options.getVariable
  }

  /**
   * Expand a single variable by name
   */
  async expandSingle(
    name: string,
    depth: number = 0
  ): Promise<Result<ExpansionResult, AppError>> {
    const startTime = Date.now()

    // Check recursion depth
    if (depth >= this.maxDepth) {
      return err(Errors.variable.circularReference(name))
    }

    logger.debug('Expanding variable', { name, depth })

    // Check if it's a system variable first
    if (isSystemVariable(name)) {
      const result = resolveSystem(name)
      if (!result.ok) {
        return result
      }
      return ok({
        name,
        value: result.value.value,
        fromCache: result.value.fromCache,
        duration: result.value.duration
      })
    }

    // Look up the variable definition
    const variable = await this.getVariable(name)
    if (!variable) {
      return err(Errors.variable.notFound(name))
    }

    if (!variable.isEnabled) {
      return err(new AppError({
        code: 'VARIABLE_NOT_FOUND',
        message: `Variable "${name}" is disabled`,
        context: { name }
      }))
    }

    // Resolve based on type
    const resolution = await this.resolveVariable(variable)
    if (!resolution.ok) {
      return resolution
    }

    let expandedValue = resolution.value.value
    const nestedExpansions: string[] = []

    // Handle nested variables in the resolved value
    if (hasVariables(expandedValue)) {
      const nested = getUniqueVariableNames(expandedValue)

      // Expand each nested variable
      const nestedValues: Record<string, string> = {}
      for (const nestedName of nested) {
        const nestedResult = await this.expandSingle(nestedName, depth + 1)
        if (nestedResult.ok) {
          nestedValues[nestedName] = nestedResult.value.value
          nestedExpansions.push(nestedName)
        } else {
          // Log warning but continue - leave unresolved
          logger.warn('Failed to expand nested variable', {
            parent: name,
            nested: nestedName,
            error: nestedResult.error.message
          })
        }
      }

      // Interpolate nested values
      expandedValue = interpolate(expandedValue, nestedValues, {
        preserveUnresolved: true
      })
    }

    return ok({
      name,
      value: expandedValue,
      fromCache: resolution.value.fromCache,
      duration: Date.now() - startTime,
      nestedExpansions: nestedExpansions.length > 0 ? nestedExpansions : undefined
    })
  }

  /**
   * Expand multiple variables in parallel
   */
  async expandMultiple(
    names: string[]
  ): Promise<{ results: ExpansionResult[]; errors: ExpansionError[] }> {
    const uniqueNames = [...new Set(names)]
    const results: ExpansionResult[] = []
    const errors: ExpansionError[] = []

    // Expand all in parallel
    const expansions = await Promise.all(
      uniqueNames.map(name => this.expandSingle(name))
    )

    for (let i = 0; i < uniqueNames.length; i++) {
      const result = expansions[i]
      if (result.ok) {
        results.push(result.value)
      } else {
        errors.push({
          name: uniqueNames[i],
          error: result.error
        })
      }
    }

    return { results, errors }
  }

  /**
   * Expand all variables in a text string
   */
  async expandText(text: string): Promise<ExpandTextResult> {
    const startTime = Date.now()
    const detected = detectVariables(text)
    const uniqueNames = [...new Set(detected.map(v => v.name))]

    if (uniqueNames.length === 0) {
      return {
        text,
        expansions: [],
        errors: [],
        totalDuration: 0
      }
    }

    // Expand all variables
    const { results, errors } = await this.expandMultiple(uniqueNames)

    // Build value map for interpolation
    const values: Record<string, string> = {}
    for (const result of results) {
      values[result.name] = result.value
    }

    // Interpolate the text
    const expandedText = interpolate(text, values, {
      preserveUnresolved: true  // Keep {{var}} for failed expansions
    })

    return {
      text: expandedText,
      expansions: results,
      errors,
      totalDuration: Date.now() - startTime
    }
  }

  /**
   * Resolve a variable based on its type
   */
  private async resolveVariable(
    variable: Variable
  ): Promise<Result<ResolutionResult, AppError>> {
    switch (variable.type) {
      case 'app-level':
        return resolveAppLevel(variable as any)

      case 'wildcard':
        return resolveWildcard(variable as any, this.sessionId)

      case 'rest-api':
        return await resolveRestApi(variable as any)

      case 'javascript':
        return resolveJavaScript(variable as any, this.jsContext)

      case 'system':
        // System variables should be caught earlier, but handle anyway
        if (isSystemVariable(variable.name)) {
          return resolveSystem(variable.name)
        }
        return err(Errors.variable.notFound(variable.name))

      default:
        return err(Errors.variable.invalidType(variable.type as string))
    }
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a VariableExpander with the given options
 */
export function createExpander(options: ExpanderOptions): VariableExpander {
  return new VariableExpander(options)
}

// -----------------------------------------------------------------------------
// Convenience Functions
// -----------------------------------------------------------------------------

/**
 * Quick expand for a single variable (creates temporary expander)
 */
export async function quickExpand(
  name: string,
  getVariable: (name: string) => Promise<Variable | undefined>
): Promise<Result<string, AppError>> {
  const expander = new VariableExpander({ getVariable })
  const result = await expander.expandSingle(name)

  if (!result.ok) {
    return result
  }

  return ok(result.value.value)
}

/**
 * Quick expand text (creates temporary expander)
 */
export async function quickExpandText(
  text: string,
  getVariable: (name: string) => Promise<Variable | undefined>
): Promise<Result<string, AppError>> {
  const expander = new VariableExpander({ getVariable })
  const result = await expander.expandText(text)

  if (result.errors.length > 0) {
    // Return first error
    return err(result.errors[0].error)
  }

  return ok(result.text)
}

// -----------------------------------------------------------------------------
// Batch Expansion
// -----------------------------------------------------------------------------

export interface BatchExpansionRequest {
  id: string
  text: string
}

export interface BatchExpansionResult {
  id: string
  text: string
  success: boolean
  errors?: string[]
}

/**
 * Expand variables in multiple texts (for batch processing)
 */
export async function expandBatch(
  requests: BatchExpansionRequest[],
  getVariable: (name: string) => Promise<Variable | undefined>,
  options?: Partial<ExpanderOptions>
): Promise<BatchExpansionResult[]> {
  const expander = new VariableExpander({
    ...options,
    getVariable
  })

  const results = await Promise.all(
    requests.map(async (req) => {
      const result = await expander.expandText(req.text)
      return {
        id: req.id,
        text: result.text,
        success: result.errors.length === 0,
        errors: result.errors.length > 0
          ? result.errors.map(e => `${e.name}: ${e.error.message}`)
          : undefined
      }
    })
  )

  return results
}
