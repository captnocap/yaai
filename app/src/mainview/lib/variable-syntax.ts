// =============================================================================
// VARIABLE SYNTAX UTILITIES
// =============================================================================
// Frontend utilities for detecting and working with {{variable}} syntax.

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DetectedVariable {
  name: string
  fullMatch: string
  startIndex: number
  endIndex: number
}

// -----------------------------------------------------------------------------
// Detection
// -----------------------------------------------------------------------------

/**
 * Regex pattern for matching variable syntax: {{variableName}}
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_-]{0,49})\}\}/g

/**
 * Detect all variables in text
 */
export function detectVariables(text: string): DetectedVariable[] {
  const variables: DetectedVariable[] = []
  const regex = new RegExp(VARIABLE_PATTERN.source, 'g')

  let match
  while ((match = regex.exec(text)) !== null) {
    variables.push({
      name: match[1],
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }

  return variables
}

/**
 * Get unique variable names from text
 */
export function getUniqueVariableNames(text: string): string[] {
  const detected = detectVariables(text)
  return [...new Set(detected.map(v => v.name))]
}

/**
 * Check if text contains any variables
 */
export function hasVariables(text: string): boolean {
  return VARIABLE_PATTERN.test(text)
}

/**
 * Count occurrences of variables in text
 */
export function countVariables(text: string): number {
  const matches = text.match(VARIABLE_PATTERN)
  return matches ? matches.length : 0
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

/**
 * Validate a variable name
 */
export function isValidVariableName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  if (name.length > 50) return false
  return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)
}

/**
 * Check if all variable syntax is complete (balanced braces)
 */
export function hasCompleteVariableSyntax(text: string): boolean {
  const openCount = (text.match(/\{\{/g) || []).length
  const closeCount = (text.match(/\}\}/g) || []).length
  return openCount === closeCount
}

/**
 * Find incomplete variable syntax (for live feedback)
 */
export function findIncompleteVariables(text: string): string[] {
  const incomplete: string[] = []

  // Find {{ without matching }}
  const openPattern = /\{\{([^}]*?)(?:\{|$)/g
  let match
  while ((match = openPattern.exec(text)) !== null) {
    if (match[1]) {
      incomplete.push(match[1])
    }
  }

  return incomplete
}

// -----------------------------------------------------------------------------
// Interpolation
// -----------------------------------------------------------------------------

/**
 * Replace variables with their values
 */
export function interpolate(
  text: string,
  values: Record<string, string | undefined>,
  options: { preserveUnresolved?: boolean } = {}
): string {
  return text.replace(VARIABLE_PATTERN, (fullMatch, varName) => {
    const value = values[varName]

    if (value === undefined) {
      return options.preserveUnresolved ? fullMatch : ''
    }

    return value
  })
}

// -----------------------------------------------------------------------------
// Cursor Helpers
// -----------------------------------------------------------------------------

/**
 * Check if cursor is inside a variable syntax
 */
export function isCursorInVariable(text: string, cursorPosition: number): {
  inVariable: boolean
  variableName?: string
  startIndex?: number
  endIndex?: number
} {
  const variables = detectVariables(text)

  for (const v of variables) {
    if (cursorPosition >= v.startIndex && cursorPosition <= v.endIndex) {
      return {
        inVariable: true,
        variableName: v.name,
        startIndex: v.startIndex,
        endIndex: v.endIndex
      }
    }
  }

  // Check if typing a new variable (after {{ but before }})
  const beforeCursor = text.substring(0, cursorPosition)
  const openMatch = beforeCursor.match(/\{\{([a-zA-Z_][a-zA-Z0-9_-]*)?$/)

  if (openMatch) {
    return {
      inVariable: true,
      variableName: openMatch[1] || '',
      startIndex: cursorPosition - openMatch[0].length
    }
  }

  return { inVariable: false }
}

/**
 * Get variable being typed at cursor position (for autocomplete)
 */
export function getVariableAtCursor(text: string, cursorPosition: number): string | null {
  const result = isCursorInVariable(text, cursorPosition)
  return result.inVariable ? (result.variableName || null) : null
}
