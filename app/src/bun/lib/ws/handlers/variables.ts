// =============================================================================
// VARIABLE HANDLERS
// =============================================================================
// WebSocket handlers for variable management and expansion.

import { VariableStore } from '../../stores/variable-store'
import {
  logger,
  type VariableId,
  type RestRequestConfig,
  type ResponseParser,
  type AnyVariable,
  type Variable
} from '../../core'
import {
  createExpander,
  testRestRequest,
  getSystemVariableInfo,
  isSystemVariable,
  resolveSystemVariable,
  type SystemVariableName
} from '../../variables'

const log = logger.child({ module: 'ws-variables' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
}

// -----------------------------------------------------------------------------
// Payload Types
// -----------------------------------------------------------------------------

interface CreateAppLevelPayload {
  name: string
  value: string
  description?: string
}

interface CreateWildcardPayload {
  name: string
  options: string[]
  description?: string
  allowDuplicates?: boolean
  cacheDuration?: number
}

interface CreateRestApiPayload {
  name: string
  description?: string
  requestConfig: RestRequestConfig
  responseParser: ResponseParser
  timeout?: number
  retries?: number
  cacheEnabled?: boolean
  cacheDuration?: number
}

interface CreateJavaScriptPayload {
  name: string
  description?: string
  code: string
  timeout?: number
}

interface UpdateVariablePayload {
  id: string
  name?: string
  description?: string
  isEnabled?: boolean
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

// -----------------------------------------------------------------------------
// Response Helpers
// -----------------------------------------------------------------------------

function sanitizeVariable(variable: AnyVariable): Record<string, unknown> {
  // Return variable without sensitive data exposed directly
  // (encryption handles storage, but we still omit raw sensitive fields from responses)
  const base = {
    id: variable.id,
    name: variable.name,
    type: variable.type,
    scope: variable.scope,
    description: variable.description,
    isEnabled: variable.isEnabled,
    createdAt: variable.createdAt,
    updatedAt: variable.updatedAt
  }

  switch (variable.type) {
    case 'app-level':
      return { ...base, value: variable.value }

    case 'wildcard':
      return {
        ...base,
        options: variable.options,
        allowDuplicates: variable.allowDuplicates,
        cacheDuration: variable.cacheDuration
      }

    case 'rest-api':
      return {
        ...base,
        requestConfig: {
          method: variable.requestConfig.method,
          url: variable.requestConfig.url,
          headers: variable.requestConfig.headers ? Object.keys(variable.requestConfig.headers) : [],
          hasBody: !!variable.requestConfig.body,
          authType: variable.requestConfig.authentication?.type
        },
        responseParser: variable.responseParser,
        timeout: variable.timeout,
        retries: variable.retries,
        cacheEnabled: variable.cacheEnabled,
        cacheDuration: variable.cacheDuration
      }

    case 'javascript':
      return {
        ...base,
        code: variable.code,  // Code is visible to the user who created it
        timeout: variable.timeout
      }

    default:
      return base
  }
}

// -----------------------------------------------------------------------------
// Handler Registration
// -----------------------------------------------------------------------------

/**
 * Register variable handlers with the WebSocket server
 */
export function registerVariableHandlers(wsServer: WSServer): void {
  // List all variables
  wsServer.onRequest('variable:list', async () => {
    const result = VariableStore.listVariables()

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value.map(sanitizeVariable)
  })

  // List variables by type
  wsServer.onRequest('variable:list-by-type', async (payload) => {
    const { type } = payload as { type: string }

    const result = VariableStore.listVariablesByType(type as any)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value.map(sanitizeVariable)
  })

  // Get a single variable by ID
  wsServer.onRequest('variable:get', async (payload) => {
    const { id } = payload as { id: string }

    const result = VariableStore.getVariableById(id as VariableId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (!result.value) {
      return null
    }

    return sanitizeVariable(result.value)
  })

  // Get a single variable by name
  wsServer.onRequest('variable:get-by-name', async (payload) => {
    const { name } = payload as { name: string }

    const result = VariableStore.getVariableByName(name)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (!result.value) {
      return null
    }

    return sanitizeVariable(result.value)
  })

  // Create app-level variable
  wsServer.onRequest('variable:create-app', async (payload) => {
    const { name, value, description } = payload as CreateAppLevelPayload

    log.info('Creating app-level variable', { name })

    const result = VariableStore.createAppLevelVariable({
      name,
      value,
      description
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return sanitizeVariable(result.value)
  })

  // Create wildcard variable
  wsServer.onRequest('variable:create-wildcard', async (payload) => {
    const { name, options, description, allowDuplicates, cacheDuration } = payload as CreateWildcardPayload

    log.info('Creating wildcard variable', { name, optionCount: options.length })

    const result = VariableStore.createWildcardVariable({
      name,
      options,
      description,
      allowDuplicates,
      cacheDuration
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return sanitizeVariable(result.value)
  })

  // Create REST API variable
  wsServer.onRequest('variable:create-rest-api', async (payload) => {
    const {
      name,
      description,
      requestConfig,
      responseParser,
      timeout,
      retries,
      cacheEnabled,
      cacheDuration
    } = payload as CreateRestApiPayload

    log.info('Creating REST API variable', { name, url: requestConfig.url })

    const result = VariableStore.createRestApiVariable({
      name,
      description,
      requestConfig,
      responseParser,
      timeout,
      retries,
      cacheEnabled,
      cacheDuration
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return sanitizeVariable(result.value)
  })

  // Create JavaScript variable
  wsServer.onRequest('variable:create-javascript', async (payload) => {
    const { name, description, code, timeout } = payload as CreateJavaScriptPayload

    log.info('Creating JavaScript variable', { name })

    const result = VariableStore.createJavaScriptVariable({
      name,
      description,
      code,
      timeout
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return sanitizeVariable(result.value)
  })

  // Update variable
  wsServer.onRequest('variable:update', async (payload) => {
    const { id, ...updates } = payload as UpdateVariablePayload

    log.info('Updating variable', { id })

    const result = VariableStore.updateVariable(id as VariableId, updates)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return sanitizeVariable(result.value)
  })

  // Delete variable
  wsServer.onRequest('variable:delete', async (payload) => {
    const { id } = payload as { id: string }

    log.info('Deleting variable', { id })

    const result = VariableStore.deleteVariable(id as VariableId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Toggle variable enabled/disabled
  wsServer.onRequest('variable:toggle', async (payload) => {
    const { id, enabled } = payload as { id: string; enabled: boolean }

    log.info('Toggling variable', { id, enabled })

    const result = VariableStore.toggleVariable(id as VariableId, enabled)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Check if name exists
  wsServer.onRequest('variable:name-exists', async (payload) => {
    const { name } = payload as { name: string }
    return VariableStore.nameExists(name)
  })

  // Get test results for a variable
  wsServer.onRequest('variable:test-results', async (payload) => {
    const { id, limit } = payload as { id: string; limit?: number }

    const result = VariableStore.getTestResults(id as VariableId, limit)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // ==========================================================================
  // Variable Expansion
  // ==========================================================================

  // Get system variables info (for UI display)
  wsServer.onRequest('variable:system-info', async () => {
    return getSystemVariableInfo()
  })

  // Expand variables - this is the main entry point for variable resolution
  wsServer.onRequest('variable:expand', async (payload) => {
    const { variables, sessionId, includeMetadata } = payload as {
      variables: string[]
      sessionId?: string
      includeMetadata?: boolean
    }

    log.info('Expanding variables', { variables, count: variables.length })

    // Create expander with variable lookup function
    const expander = createExpander({
      sessionId,
      getVariable: async (name: string): Promise<Variable | undefined> => {
        const result = VariableStore.getVariableByName(name)
        if (!result.ok || !result.value) {
          return undefined
        }
        return result.value as Variable
      }
    })

    // Expand all variables
    const { results, errors } = await expander.expandMultiple(variables)

    // Format response for frontend
    const response = variables.map(varName => {
      // Check if it's a system variable
      if (isSystemVariable(varName)) {
        try {
          const value = resolveSystemVariable(varName as SystemVariableName)
          return {
            variable: varName,
            data: value,
            error: undefined,
            loading: false,
            type: includeMetadata ? 'system' : undefined,
            fromCache: false
          }
        } catch (e) {
          return {
            variable: varName,
            data: undefined,
            error: (e as Error).message,
            loading: false,
            type: includeMetadata ? 'system' : undefined
          }
        }
      }

      // Check results
      const result = results.find(r => r.name === varName)
      if (result) {
        // Get variable type for metadata
        let varType: string | undefined
        if (includeMetadata) {
          const varResult = VariableStore.getVariableByName(varName)
          if (varResult.ok && varResult.value) {
            varType = varResult.value.type
          }
        }

        return {
          variable: varName,
          data: result.value,
          error: undefined,
          loading: false,
          type: varType,
          fromCache: result.fromCache,
          duration: result.duration,
          nestedExpansions: result.nestedExpansions
        }
      }

      // Check errors
      const error = errors.find(e => e.name === varName)
      if (error) {
        return {
          variable: varName,
          data: undefined,
          error: error.error.message,
          loading: false,
          type: undefined
        }
      }

      // Should not reach here, but handle gracefully
      return {
        variable: varName,
        data: undefined,
        error: 'Unknown expansion error',
        loading: false,
        type: undefined
      }
    })

    return response
  })

  // Expand text with variables
  wsServer.onRequest('variable:expand-text', async (payload) => {
    const { text, sessionId } = payload as {
      text: string
      sessionId?: string
    }

    log.info('Expanding text', { textLength: text.length })

    const expander = createExpander({
      sessionId,
      getVariable: async (name: string): Promise<Variable | undefined> => {
        const result = VariableStore.getVariableByName(name)
        if (!result.ok || !result.value) {
          return undefined
        }
        return result.value as Variable
      }
    })

    const result = await expander.expandText(text)

    return {
      text: result.text,
      expansions: result.expansions.map(e => ({
        variable: e.name,
        value: e.value,
        fromCache: e.fromCache,
        duration: e.duration
      })),
      errors: result.errors.map(e => ({
        variable: e.name,
        error: e.error.message
      })),
      totalDuration: result.totalDuration
    }
  })

  // Test REST API request (for builder UI)
  wsServer.onRequest('variable:test-rest-api', async (payload) => {
    const { requestConfig, timeout } = payload as {
      requestConfig: RestRequestConfig
      timeout?: number
    }

    log.info('Testing REST API request', { url: requestConfig.url })

    const result = await testRestRequest({
      method: requestConfig.method,
      url: requestConfig.url,
      headers: requestConfig.headers,
      body: requestConfig.body,
      authentication: requestConfig.authentication,
      timeout
    })

    return {
      success: result.success,
      error: result.error,
      statusCode: result.statusCode,
      headers: result.headers,
      body: result.body,
      duration: result.duration
    }
  })

  log.info('Variable handlers registered')
}
