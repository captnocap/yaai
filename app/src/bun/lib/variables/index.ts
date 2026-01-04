// =============================================================================
// VARIABLE SYSTEM - PUBLIC API
// =============================================================================
// Entry point for the variable expansion system.

// Expander (main orchestrator)
export {
  VariableExpander,
  createExpander,
  quickExpand,
  quickExpandText,
  expandBatch,
  type ExpansionResult,
  type ExpansionError,
  type ExpandTextResult,
  type ExpanderOptions,
  type BatchExpansionRequest,
  type BatchExpansionResult
} from './expander'

// Resolvers
export {
  resolveSystem,
  resolveAppLevel,
  resolveWildcard,
  resolveRestApi,
  resolveJavaScript,
  testRestRequest,
  type ResolutionResult,
  type TestRequestOptions,
  type TestRequestResult
} from './resolvers'

// Interpolation
export {
  detectVariables,
  interpolate,
  interpolateWithTracking,
  hasVariables,
  countVariables,
  getUniqueVariableNames,
  isValidVariableName,
  hasCompleteVariableSyntax,
  findIncompleteVariables,
  needsFurtherExpansion,
  getDependencies,
  escapeHtml,
  escapeJson,
  type DetectedVariable,
  type InterpolationValues,
  type InterpolateOptions
} from './interpolator'

// Cache
export {
  VariableCache,
  variableCache,
  variableCacheKey,
  wildcardCacheKey,
  restApiCacheKey,
  hashUrl,
  type CacheStats
} from './cache'

// System Variables
export {
  SYSTEM_VARIABLES,
  isSystemVariable,
  getSystemVariableNames,
  resolveSystemVariable,
  getSystemVariableInfo,
  type SystemVariableName,
  type SystemVariableDefinition
} from './system-variables'

// Sandbox
export {
  executeSandboxed,
  executeSandboxedAsync,
  isCodeSafe,
  createSandboxContext,
  getAvailableGlobals,
  getBlockedIdentifiers,
  type SandboxOptions,
  type SandboxResult
} from './sandbox'
