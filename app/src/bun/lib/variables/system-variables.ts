// =============================================================================
// SYSTEM VARIABLES
// =============================================================================
// Predefined system variables that are always available.
// These are read-only and computed at expansion time.

import { hostname, userInfo } from 'os'

// -----------------------------------------------------------------------------
// System Variable Definitions
// -----------------------------------------------------------------------------

export type SystemVariableName =
  | 'time'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'weekday'
  | 'timezone'
  | 'user-name'
  | 'hostname'
  | 'platform'
  | 'random-uuid'
  | 'random-number'

export interface SystemVariableDefinition {
  name: SystemVariableName
  description: string
  example: string
  compute: () => string
}

// -----------------------------------------------------------------------------
// System Variable Registry
// -----------------------------------------------------------------------------

export const SYSTEM_VARIABLES: Record<SystemVariableName, SystemVariableDefinition> = {
  // Date/Time variables
  'time': {
    name: 'time',
    description: 'Current time in HH:MM:SS format (24-hour)',
    example: '14:30:45',
    compute: () => {
      const now = new Date()
      return now.toTimeString().split(' ')[0]
    }
  },

  'date': {
    name: 'date',
    description: 'Current date in YYYY-MM-DD format',
    example: '2026-01-04',
    compute: () => {
      const now = new Date()
      return now.toISOString().split('T')[0]
    }
  },

  'datetime': {
    name: 'datetime',
    description: 'Current date and time in ISO 8601 format',
    example: '2026-01-04T14:30:45.123Z',
    compute: () => new Date().toISOString()
  },

  'timestamp': {
    name: 'timestamp',
    description: 'Current Unix timestamp in milliseconds',
    example: '1735999845123',
    compute: () => Date.now().toString()
  },

  'year': {
    name: 'year',
    description: 'Current year (4 digits)',
    example: '2026',
    compute: () => new Date().getFullYear().toString()
  },

  'month': {
    name: 'month',
    description: 'Current month (01-12)',
    example: '01',
    compute: () => (new Date().getMonth() + 1).toString().padStart(2, '0')
  },

  'day': {
    name: 'day',
    description: 'Current day of month (01-31)',
    example: '04',
    compute: () => new Date().getDate().toString().padStart(2, '0')
  },

  'hour': {
    name: 'hour',
    description: 'Current hour (00-23)',
    example: '14',
    compute: () => new Date().getHours().toString().padStart(2, '0')
  },

  'minute': {
    name: 'minute',
    description: 'Current minute (00-59)',
    example: '30',
    compute: () => new Date().getMinutes().toString().padStart(2, '0')
  },

  'weekday': {
    name: 'weekday',
    description: 'Current day of the week',
    example: 'Saturday',
    compute: () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return days[new Date().getDay()]
    }
  },

  'timezone': {
    name: 'timezone',
    description: 'Current timezone offset',
    example: '-05:00',
    compute: () => {
      const offset = new Date().getTimezoneOffset()
      const sign = offset <= 0 ? '+' : '-'
      const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
      const mins = (Math.abs(offset) % 60).toString().padStart(2, '0')
      return `${sign}${hours}:${mins}`
    }
  },

  // System info variables
  'user-name': {
    name: 'user-name',
    description: 'Current system username',
    example: 'john',
    compute: () => {
      try {
        return userInfo().username
      } catch {
        return 'unknown'
      }
    }
  },

  'hostname': {
    name: 'hostname',
    description: 'System hostname',
    example: 'my-computer',
    compute: () => {
      try {
        return hostname()
      } catch {
        return 'unknown'
      }
    }
  },

  'platform': {
    name: 'platform',
    description: 'Operating system platform',
    example: 'linux',
    compute: () => process.platform
  },

  // Random variables
  'random-uuid': {
    name: 'random-uuid',
    description: 'Random UUID v4',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    compute: () => crypto.randomUUID()
  },

  'random-number': {
    name: 'random-number',
    description: 'Random number between 0 and 1',
    example: '0.7234891',
    compute: () => Math.random().toString()
  }
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if a variable name is a system variable
 */
export function isSystemVariable(name: string): name is SystemVariableName {
  return name in SYSTEM_VARIABLES
}

/**
 * Get all system variable names
 */
export function getSystemVariableNames(): SystemVariableName[] {
  return Object.keys(SYSTEM_VARIABLES) as SystemVariableName[]
}

/**
 * Resolve a system variable
 */
export function resolveSystemVariable(name: SystemVariableName): string {
  const definition = SYSTEM_VARIABLES[name]
  if (!definition) {
    throw new Error(`Unknown system variable: ${name}`)
  }
  return definition.compute()
}

/**
 * Get system variable info for UI display
 */
export function getSystemVariableInfo(): Array<{
  name: string
  description: string
  example: string
}> {
  return Object.values(SYSTEM_VARIABLES).map(v => ({
    name: v.name,
    description: v.description,
    example: v.example
  }))
}
