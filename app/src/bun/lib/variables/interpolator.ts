// =============================================================================
// INTERPOLATOR
// =============================================================================
// Utilities for detecting and replacing {{var}} patterns in text.

// -----------------------------------------------------------------------------
// Variable Detection
// -----------------------------------------------------------------------------

/**
 * Regex pattern for matching variable syntax: {{variableName}}
 * - Must start with letter or underscore
 * - Can contain letters, numbers, underscores, hyphens
 * - Max 50 characters
 */
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_-]{0,49})\}\}/g

/**
 * Represents a detected variable in text
 */
export interface DetectedVariable {
  name: string           // Variable name (without braces)
  fullMatch: string      // Full match including braces: "{{name}}"
  startIndex: number     // Position in original text
  endIndex: number       // End position in original text
}

/**
 * Detect all variables in text
 * Returns array of detected variables with their positions
 */
export function detectVariables(text: string): DetectedVariable[] {
  const variables: DetectedVariable[] = []
  const regex = new RegExp(VARIABLE_PATTERN.source, 'g')  // Fresh regex instance

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
// Variable Validation
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
 * Find incomplete variable syntax (unclosed braces)
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
 * Values to interpolate - map of variable name to resolved value
 */
export type InterpolationValues = Record<string, string | undefined>

/**
 * Options for interpolation
 */
export interface InterpolateOptions {
  /** Leave unresolved variables as-is (default: false - removes them) */
  preserveUnresolved?: boolean
  /** Custom placeholder for unresolved variables */
  unresolvedPlaceholder?: string
  /** Escape the result (for HTML safety, etc.) */
  escape?: (value: string) => string
}

/**
 * Interpolate variables in text
 *
 * @param text - Text containing {{variable}} syntax
 * @param values - Map of variable names to their resolved values
 * @param options - Interpolation options
 * @returns Text with variables replaced by their values
 */
export function interpolate(
  text: string,
  values: InterpolationValues,
  options: InterpolateOptions = {}
): string {
  const {
    preserveUnresolved = false,
    unresolvedPlaceholder,
    escape
  } = options

  return text.replace(VARIABLE_PATTERN, (fullMatch, varName) => {
    const value = values[varName]

    if (value === undefined) {
      if (preserveUnresolved) {
        return fullMatch
      }
      if (unresolvedPlaceholder !== undefined) {
        return unresolvedPlaceholder
      }
      return ''  // Remove unresolved variable
    }

    return escape ? escape(value) : value
  })
}

/**
 * Interpolate with error tracking
 * Returns both the result and list of unresolved variables
 */
export function interpolateWithTracking(
  text: string,
  values: InterpolationValues
): {
  result: string
  unresolved: string[]
  resolved: string[]
} {
  const unresolved: string[] = []
  const resolved: string[] = []

  const result = text.replace(VARIABLE_PATTERN, (fullMatch, varName) => {
    const value = values[varName]

    if (value === undefined) {
      unresolved.push(varName)
      return fullMatch  // Preserve for visibility
    }

    resolved.push(varName)
    return value
  })

  return { result, unresolved, resolved }
}

// -----------------------------------------------------------------------------
// Recursive Interpolation
// -----------------------------------------------------------------------------

/**
 * Check if a value contains variables (needs further expansion)
 */
export function needsFurtherExpansion(value: string): boolean {
  return hasVariables(value)
}

/**
 * Get variables that need to be resolved for a given text
 * This includes nested variables (variables within resolved values)
 */
export function getDependencies(
  text: string,
  resolvedValues: InterpolationValues = {}
): string[] {
  const directDeps = getUniqueVariableNames(text)

  // Check if any resolved values contain more variables
  const nestedDeps: string[] = []
  for (const varName of directDeps) {
    const value = resolvedValues[varName]
    if (value && hasVariables(value)) {
      const nested = getUniqueVariableNames(value)
      nestedDeps.push(...nested)
    }
  }

  // Return unique combined list
  return [...new Set([...directDeps, ...nestedDeps])]
}

// -----------------------------------------------------------------------------
// Escape Utilities
// -----------------------------------------------------------------------------

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, char => map[char])
}

/**
 * Escape for JSON string embedding
 */
export function escapeJson(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}
