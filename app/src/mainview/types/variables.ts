// =============================================================================
// VARIABLE TYPES (Frontend)
// =============================================================================
// Type definitions for variable management in the frontend.

export type VariableType = 'system' | 'app-level' | 'wildcard' | 'rest-api' | 'javascript'
export type VariableScope = 'system' | 'app' | 'chat'

// -----------------------------------------------------------------------------
// Base Variable Interface
// -----------------------------------------------------------------------------

export interface Variable {
  id: string
  name: string
  type: VariableType
  scope: VariableScope
  description?: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

// -----------------------------------------------------------------------------
// Type-Specific Variables
// -----------------------------------------------------------------------------

export interface AppLevelVariable extends Variable {
  type: 'app-level'
  value: string
}

export interface WildcardVariable extends Variable {
  type: 'wildcard'
  options: string[]
  allowDuplicates?: boolean
  cacheDuration?: number
}

export interface RestApiVariable extends Variable {
  type: 'rest-api'
  requestConfig: {
    method: string
    url: string
    headers?: string[]  // Just header names for display (values hidden)
    hasBody: boolean
    authType?: 'bearer' | 'basic' | 'api-key'
  }
  responseParser: ResponseParser
  timeout?: number
  retries?: number
  cacheEnabled?: boolean
  cacheDuration?: number
}

export interface JavaScriptVariable extends Variable {
  type: 'javascript'
  code: string
  timeout?: number
}

export interface SystemVariable {
  name: string
  description: string
  example: string
}

// -----------------------------------------------------------------------------
// Request/Response Types
// -----------------------------------------------------------------------------

export interface RestRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: unknown
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key'
    value: string
    keyName?: string
  }
}

export interface ResponseParser {
  type: 'text' | 'json-path' | 'regex'
  selector: string
  defaultValue?: string
}

// -----------------------------------------------------------------------------
// Expansion Types
// -----------------------------------------------------------------------------

export interface VariableExpansionResult {
  variable: string
  data?: string
  error?: string
  loading: boolean
  type?: VariableType
  fromCache?: boolean
  duration?: number
  nestedExpansions?: string[]
}

export interface TextExpansionResult {
  text: string
  expansions: Array<{
    variable: string
    value: string
    fromCache: boolean
    duration: number
  }>
  errors: Array<{
    variable: string
    error: string
  }>
  totalDuration: number
}

// -----------------------------------------------------------------------------
// Test Results
// -----------------------------------------------------------------------------

export interface RestApiTestResult {
  success: boolean
  error?: string
  statusCode?: number
  headers?: Record<string, string>
  body?: string
  duration: number
}

export interface VariableTestRecord {
  id: string
  variableId: string
  success: boolean
  inputData?: string
  outputData?: string
  errorMessage?: string
  duration: number
  testedAt: string
}

// -----------------------------------------------------------------------------
// Create/Update Payloads
// -----------------------------------------------------------------------------

export interface CreateAppLevelPayload {
  name: string
  value: string
  description?: string
}

export interface CreateWildcardPayload {
  name: string
  options: string[]
  description?: string
  allowDuplicates?: boolean
  cacheDuration?: number
}

export interface CreateRestApiPayload {
  name: string
  description?: string
  requestConfig: RestRequestConfig
  responseParser: ResponseParser
  timeout?: number
  retries?: number
  cacheEnabled?: boolean
  cacheDuration?: number
}

export interface CreateJavaScriptPayload {
  name: string
  description?: string
  code: string
  timeout?: number
}

export interface UpdateVariablePayload {
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
// Union Types
// -----------------------------------------------------------------------------

export type AnyVariable = AppLevelVariable | WildcardVariable | RestApiVariable | JavaScriptVariable

export type CreateVariablePayload =
  | { type: 'app-level'; data: CreateAppLevelPayload }
  | { type: 'wildcard'; data: CreateWildcardPayload }
  | { type: 'rest-api'; data: CreateRestApiPayload }
  | { type: 'javascript'; data: CreateJavaScriptPayload }
