// =============================================================================
// USE VARIABLES HOOK
// =============================================================================
// Frontend hook for variable management - CRUD operations and expansion.

import { useState, useEffect, useCallback } from 'react'
import { sendMessage, onMessage } from '../lib/comm-bridge'
import type {
  AnyVariable,
  SystemVariable,
  CreateAppLevelPayload,
  CreateWildcardPayload,
  CreateRestApiPayload,
  CreateJavaScriptPayload,
  UpdateVariablePayload,
  VariableExpansionResult,
  TextExpansionResult,
  RestApiTestResult,
  RestRequestConfig,
  VariableType
} from '../types/variables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseVariablesReturn {
  // State
  variables: AnyVariable[]
  systemVariables: SystemVariable[]
  loading: boolean
  error: string | null

  // CRUD Operations
  createAppVariable: (data: CreateAppLevelPayload) => Promise<AnyVariable>
  createWildcardVariable: (data: CreateWildcardPayload) => Promise<AnyVariable>
  createRestApiVariable: (data: CreateRestApiPayload) => Promise<AnyVariable>
  createJavaScriptVariable: (data: CreateJavaScriptPayload) => Promise<AnyVariable>
  updateVariable: (data: UpdateVariablePayload) => Promise<AnyVariable>
  deleteVariable: (id: string) => Promise<void>
  toggleVariable: (id: string, enabled: boolean) => Promise<void>

  // Queries
  refreshVariables: () => Promise<void>
  getVariablesByType: (type: VariableType) => AnyVariable[]
  checkNameExists: (name: string) => Promise<boolean>

  // Expansion
  expandVariables: (names: string[], sessionId?: string) => Promise<VariableExpansionResult[]>
  expandText: (text: string, sessionId?: string) => Promise<TextExpansionResult>

  // Testing
  testRestApi: (config: RestRequestConfig, timeout?: number) => Promise<RestApiTestResult>
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useVariables(): UseVariablesReturn {
  const [variables, setVariables] = useState<AnyVariable[]>([])
  const [systemVariables, setSystemVariables] = useState<SystemVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load variables on mount
  useEffect(() => {
    loadVariables()
    loadSystemVariables()

    // Subscribe to variable updates (for real-time sync if needed)
    const unsubscribe = onMessage('variable:updated', () => {
      loadVariables()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------

  const loadVariables = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await sendMessage<AnyVariable[]>('variable:list')
      setVariables(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSystemVariables = useCallback(async () => {
    try {
      const result = await sendMessage<SystemVariable[]>('variable:system-info')
      setSystemVariables(result)
    } catch (e) {
      console.error('Failed to load system variables:', e)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  const createAppVariable = useCallback(async (data: CreateAppLevelPayload): Promise<AnyVariable> => {
    const result = await sendMessage<AnyVariable>('variable:create-app', data)
    setVariables(prev => [...prev, result])
    return result
  }, [])

  const createWildcardVariable = useCallback(async (data: CreateWildcardPayload): Promise<AnyVariable> => {
    const result = await sendMessage<AnyVariable>('variable:create-wildcard', data)
    setVariables(prev => [...prev, result])
    return result
  }, [])

  const createRestApiVariable = useCallback(async (data: CreateRestApiPayload): Promise<AnyVariable> => {
    const result = await sendMessage<AnyVariable>('variable:create-rest-api', data)
    setVariables(prev => [...prev, result])
    return result
  }, [])

  const createJavaScriptVariable = useCallback(async (data: CreateJavaScriptPayload): Promise<AnyVariable> => {
    const result = await sendMessage<AnyVariable>('variable:create-javascript', data)
    setVariables(prev => [...prev, result])
    return result
  }, [])

  const updateVariable = useCallback(async (data: UpdateVariablePayload): Promise<AnyVariable> => {
    const result = await sendMessage<AnyVariable>('variable:update', data)
    setVariables(prev => prev.map(v => v.id === result.id ? result : v))
    return result
  }, [])

  const deleteVariable = useCallback(async (id: string): Promise<void> => {
    await sendMessage('variable:delete', { id })
    setVariables(prev => prev.filter(v => v.id !== id))
  }, [])

  const toggleVariable = useCallback(async (id: string, enabled: boolean): Promise<void> => {
    await sendMessage('variable:toggle', { id, enabled })
    setVariables(prev => prev.map(v =>
      v.id === id ? { ...v, isEnabled: enabled } : v
    ))
  }, [])

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const refreshVariables = useCallback(async () => {
    await loadVariables()
  }, [loadVariables])

  const getVariablesByType = useCallback((type: VariableType): AnyVariable[] => {
    return variables.filter(v => v.type === type)
  }, [variables])

  const checkNameExists = useCallback(async (name: string): Promise<boolean> => {
    return await sendMessage<boolean>('variable:name-exists', { name })
  }, [])

  // ---------------------------------------------------------------------------
  // Expansion
  // ---------------------------------------------------------------------------

  const expandVariables = useCallback(async (
    names: string[],
    sessionId?: string
  ): Promise<VariableExpansionResult[]> => {
    return await sendMessage<VariableExpansionResult[]>('variable:expand', {
      variables: names,
      sessionId,
      includeMetadata: true
    })
  }, [])

  const expandText = useCallback(async (
    text: string,
    sessionId?: string
  ): Promise<TextExpansionResult> => {
    return await sendMessage<TextExpansionResult>('variable:expand-text', {
      text,
      sessionId
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Testing
  // ---------------------------------------------------------------------------

  const testRestApi = useCallback(async (
    config: RestRequestConfig,
    timeout?: number
  ): Promise<RestApiTestResult> => {
    return await sendMessage<RestApiTestResult>('variable:test-rest-api', {
      requestConfig: config,
      timeout
    })
  }, [])

  return {
    variables,
    systemVariables,
    loading,
    error,
    createAppVariable,
    createWildcardVariable,
    createRestApiVariable,
    createJavaScriptVariable,
    updateVariable,
    deleteVariable,
    toggleVariable,
    refreshVariables,
    getVariablesByType,
    checkNameExists,
    expandVariables,
    expandText,
    testRestApi
  }
}

// -----------------------------------------------------------------------------
// Utility Hook: Variable Expansion State
// -----------------------------------------------------------------------------

export interface UseVariableExpansionReturn {
  expansions: Map<string, VariableExpansionResult>
  expand: (names: string[]) => Promise<void>
  expandVariables: (names: string[]) => Promise<VariableExpansionResult[]>
  getExpansion: (name: string) => VariableExpansionResult | undefined
  clearExpansions: () => void
  isExpanding: boolean
}

/**
 * Hook for managing variable expansion state (for chat input integration)
 */
export function useVariableExpansion(sessionId?: string): UseVariableExpansionReturn {
  const [expansions, setExpansions] = useState<Map<string, VariableExpansionResult>>(new Map())
  const [isExpanding, setIsExpanding] = useState(false)

  /**
   * Expand variables and return results directly (for one-off expansions)
   */
  const expandVariables = useCallback(async (names: string[]): Promise<VariableExpansionResult[]> => {
    if (names.length === 0) return []

    setIsExpanding(true)
    try {
      const results = await sendMessage<VariableExpansionResult[]>('variable:expand', {
        variables: names,
        sessionId,
        includeMetadata: true
      })
      return results
    } finally {
      setIsExpanding(false)
    }
  }, [sessionId])

  /**
   * Expand variables and update internal state
   */
  const expand = useCallback(async (names: string[]) => {
    if (names.length === 0) return

    // Mark as loading
    setIsExpanding(true)
    setExpansions(prev => {
      const next = new Map(prev)
      for (const name of names) {
        if (!next.has(name)) {
          next.set(name, { variable: name, loading: true })
        }
      }
      return next
    })

    try {
      const results = await sendMessage<VariableExpansionResult[]>('variable:expand', {
        variables: names,
        sessionId,
        includeMetadata: true
      })

      setExpansions(prev => {
        const next = new Map(prev)
        for (const result of results) {
          next.set(result.variable, { ...result, loading: false })
        }
        return next
      })
    } catch (e) {
      // Mark all as error
      setExpansions(prev => {
        const next = new Map(prev)
        for (const name of names) {
          next.set(name, {
            variable: name,
            loading: false,
            error: (e as Error).message
          })
        }
        return next
      })
    } finally {
      setIsExpanding(false)
    }
  }, [sessionId])

  const getExpansion = useCallback((name: string): VariableExpansionResult | undefined => {
    return expansions.get(name)
  }, [expansions])

  const clearExpansions = useCallback(() => {
    setExpansions(new Map())
  }, [])

  return {
    expansions,
    expand,
    expandVariables,
    getExpansion,
    clearExpansions,
    isExpanding
  }
}
