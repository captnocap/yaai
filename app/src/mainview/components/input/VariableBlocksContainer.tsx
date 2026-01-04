// =============================================================================
// VARIABLE BLOCKS CONTAINER
// =============================================================================
// Container for variable blocks shown below the chat input.
// Manages expansion state and coordinates with the input.

import React, { useEffect, useCallback, useRef } from 'react'
import { VariableBlock, type VariableBlockStatus } from './VariableBlock'
import { detectVariables, getUniqueVariableNames } from '../../lib/variable-syntax'
import { useVariableExpansion } from '../../hooks/useVariables'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface VariableState {
  name: string
  status: VariableBlockStatus
  value?: string
  error?: string
}

export interface VariableBlocksContainerProps {
  /** Current input text */
  inputText: string
  /** Called when variable values are ready (for interpolation before send) */
  onVariablesResolved?: (values: Record<string, string>) => void
  /** Whether live preview mode is enabled */
  livePreviewEnabled?: boolean
  /** Debounce delay for variable detection (ms) */
  debounceMs?: number
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function VariableBlocksContainer({
  inputText,
  onVariablesResolved,
  livePreviewEnabled = true,
  debounceMs = 300
}: VariableBlocksContainerProps) {
  const { expandVariables, isExpanding } = useVariableExpansion()
  const [variableStates, setVariableStates] = React.useState<Map<string, VariableState>>(new Map())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousNamesRef = useRef<Set<string>>(new Set())

  // Detect variables from input text with debouncing
  useEffect(() => {
    if (!livePreviewEnabled) {
      setVariableStates(new Map())
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const currentNames = new Set(getUniqueVariableNames(inputText))
      const previousNames = previousNamesRef.current

      // Find new variables (added)
      const newNames = [...currentNames].filter(name => !previousNames.has(name))

      // Find removed variables
      const removedNames = [...previousNames].filter(name => !currentNames.has(name))

      // Update state: remove old variables
      if (removedNames.length > 0) {
        setVariableStates(prev => {
          const next = new Map(prev)
          removedNames.forEach(name => next.delete(name))
          return next
        })
      }

      // Expand new variables
      if (newNames.length > 0) {
        // Set loading state for new variables
        setVariableStates(prev => {
          const next = new Map(prev)
          newNames.forEach(name => {
            next.set(name, { name, status: 'loading' })
          })
          return next
        })

        // Expand them
        expandVariables(newNames).then(results => {
          setVariableStates(prev => {
            const next = new Map(prev)
            results.forEach(result => {
              if (result.error) {
                next.set(result.variable, {
                  name: result.variable,
                  status: 'error',
                  error: result.error
                })
              } else {
                next.set(result.variable, {
                  name: result.variable,
                  status: 'resolved',
                  value: result.data
                })
              }
            })
            return next
          })
        }).catch(err => {
          // Mark all as error on failure
          setVariableStates(prev => {
            const next = new Map(prev)
            newNames.forEach(name => {
              next.set(name, {
                name,
                status: 'error',
                error: err.message || 'Expansion failed'
              })
            })
            return next
          })
        })
      }

      previousNamesRef.current = currentNames
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputText, livePreviewEnabled, debounceMs, expandVariables])

  // Notify parent when all variables are resolved
  useEffect(() => {
    if (!onVariablesResolved) return

    const allResolved = [...variableStates.values()].every(
      v => v.status === 'resolved' || v.status === 'error'
    )

    if (allResolved && variableStates.size > 0) {
      const values: Record<string, string> = {}
      variableStates.forEach(state => {
        if (state.status === 'resolved' && state.value !== undefined) {
          values[state.name] = state.value
        }
      })
      onVariablesResolved(values)
    }
  }, [variableStates, onVariablesResolved])

  // Refresh a single variable
  const handleRefresh = useCallback((name: string) => {
    setVariableStates(prev => {
      const next = new Map(prev)
      next.set(name, { name, status: 'loading' })
      return next
    })

    expandVariables([name]).then(results => {
      const result = results[0]
      setVariableStates(prev => {
        const next = new Map(prev)
        if (result?.error) {
          next.set(name, { name, status: 'error', error: result.error })
        } else {
          next.set(name, { name, status: 'resolved', value: result?.data })
        }
        return next
      })
    }).catch(err => {
      setVariableStates(prev => {
        const next = new Map(prev)
        next.set(name, { name, status: 'error', error: err.message || 'Refresh failed' })
        return next
      })
    })
  }, [expandVariables])

  // Remove a variable from tracking (user chose to remove it)
  const handleRemove = useCallback((name: string) => {
    setVariableStates(prev => {
      const next = new Map(prev)
      next.delete(name)
      return next
    })
    // Also remove from previous names so it can be re-added if user types it again
    previousNamesRef.current.delete(name)
  }, [])

  // Don't render if no variables
  if (variableStates.size === 0) {
    return null
  }

  // Sort variables by order of appearance in text
  const sortedVariables = [...variableStates.values()].sort((a, b) => {
    const aIndex = inputText.indexOf(`{{${a.name}}}`)
    const bIndex = inputText.indexOf(`{{${b.name}}}`)
    return aIndex - bIndex
  })

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px 16px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)'
      }}
    >
      {sortedVariables.map(variable => (
        <VariableBlock
          key={variable.name}
          name={variable.name}
          status={variable.status}
          value={variable.value}
          error={variable.error}
          onRefresh={() => handleRefresh(variable.name)}
          onRemove={() => handleRemove(variable.name)}
        />
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Utility Hook for Getting Resolved Values
// -----------------------------------------------------------------------------

/**
 * Get all currently resolved variable values
 * Use this when sending a message to interpolate variables
 */
export function useResolvedVariables(variableStates: Map<string, VariableState>): {
  values: Record<string, string>
  hasErrors: boolean
  isComplete: boolean
} {
  const values: Record<string, string> = {}
  let hasErrors = false
  let isComplete = true

  variableStates.forEach(state => {
    if (state.status === 'resolved' && state.value !== undefined) {
      values[state.name] = state.value
    } else if (state.status === 'error') {
      hasErrors = true
    } else if (state.status === 'loading') {
      isComplete = false
    }
  })

  return { values, hasErrors, isComplete }
}
