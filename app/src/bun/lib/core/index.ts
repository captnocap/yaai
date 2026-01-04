// =============================================================================
// CORE MODULE
// =============================================================================
// Re-exports all core functionality.

// Errors
export { AppError, Errors, type ErrorCode, type AppErrorOptions } from './errors'

// Result
export { Result, type Result as ResultType } from './result'

// Types
export {
  // Branded types
  type Brand,
  type ChatId,
  type MessageId,
  type SessionId,
  type ArtifactId,
  type JobId,
  type CredentialId,
  type ModelId,
  type ProxyConfigId,

  // ID factories
  ChatId,
  MessageId,
  SessionId,
  ArtifactId,
  JobId,
  CredentialId,
  ModelId,
  ProxyConfigId,

  // ID generators
  generateId,
  newChatId,
  newMessageId,
  newSessionId,
  newArtifactId,
  newJobId,
  newCredentialId,
  newModelId,
  newProxyConfigId,

  // Provider types
  type ProviderType,
  type ProviderFormat,
  type ProviderConfig,
  PROVIDER_TYPES,
  PROVIDER_FORMATS,
  isProviderType,
  isProviderFormat,

  // Proxy types
  type ProxyType,
  type ProxyConfig,
  type ProxyStatus,

  // Utility types
  type PartialBy,
  type RequiredBy,
  type DeepPartial,
  type PaginationParams,
  type PaginatedResult,
  type Timestamps,
  type CreateInput,
  type UpdateInput,

  // Domain types
  type ModelInfo,
  type UserModel,
  type Credential
} from './types'

// Paths
export {
  paths,
  initializeDirectories,
  ensureArtifactDir,
  ensureSnapshotObjectDir
} from './paths'

// Config
export { config, type RuntimeConfig, type LogLevel } from './config'

// Logger
export {
  logger,
  createLogger,
  type Logger,
  type LogEntry
} from './logger'

// HTTP Client & Proxy
export {
  httpClient,
  type HttpClientOptions,
  type HttpResponse
} from './http-client'

export {
  proxyHealthChecker,
  type ProxyHealthChecker
} from './proxy-health-check'
