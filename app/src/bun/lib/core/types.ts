// =============================================================================
// TYPES
// =============================================================================
// Branded types, utility types, and common interfaces.

// -----------------------------------------------------------------------------
// Branded Types
// -----------------------------------------------------------------------------

declare const brand: unique symbol

export type Brand<T, B> = T & { [brand]: B }

// ID types
export type ChatId = Brand<string, 'ChatId'>
export type MessageId = Brand<string, 'MessageId'>
export type SessionId = Brand<string, 'SessionId'>
export type ArtifactId = Brand<string, 'ArtifactId'>
export type JobId = Brand<string, 'JobId'>
export type CredentialId = Brand<string, 'CredentialId'>
export type ModelId = Brand<string, 'ModelId'>
export type ProxyConfigId = Brand<string, 'ProxyConfigId'>

// Memory system IDs
export type MemoryId = Brand<string, 'MemoryId'>
export type L1RiverId = Brand<string, 'L1RiverId'>
export type L2AffectId = Brand<string, 'L2AffectId'>
export type L3VectorId = Brand<string, 'L3VectorId'>
export type L3EntityId = Brand<string, 'L3EntityId'>
export type L3RelationId = Brand<string, 'L3RelationId'>
export type L4SalienceId = Brand<string, 'L4SalienceId'>
export type L5NodeId = Brand<string, 'L5NodeId'>
export type L5EdgeId = Brand<string, 'L5EdgeId'>

// ID factories
export const ChatId = (id: string): ChatId => id as ChatId
export const MessageId = (id: string): MessageId => id as MessageId
export const SessionId = (id: string): SessionId => id as SessionId
export const ArtifactId = (id: string): ArtifactId => id as ArtifactId
export const JobId = (id: string): JobId => id as JobId
export const CredentialId = (id: string): CredentialId => id as CredentialId
export const ModelId = (id: string): ModelId => id as ModelId
export const ProxyConfigId = (id: string): ProxyConfigId => id as ProxyConfigId

// Memory ID factories
export const MemoryId = (id: string): MemoryId => id as MemoryId
export const L1RiverId = (id: string): L1RiverId => id as L1RiverId
export const L2AffectId = (id: string): L2AffectId => id as L2AffectId
export const L3VectorId = (id: string): L3VectorId => id as L3VectorId
export const L3EntityId = (id: string): L3EntityId => id as L3EntityId
export const L3RelationId = (id: string): L3RelationId => id as L3RelationId
export const L4SalienceId = (id: string): L4SalienceId => id as L4SalienceId
export const L5NodeId = (id: string): L5NodeId => id as L5NodeId
export const L5EdgeId = (id: string): L5EdgeId => id as L5EdgeId

// UUID generator
export function generateId(): string {
  return crypto.randomUUID()
}

// ID generator factories
export const newChatId = (): ChatId => ChatId(generateId())
export const newMessageId = (): MessageId => MessageId(generateId())
export const newSessionId = (): SessionId => SessionId(generateId())
export const newArtifactId = (): ArtifactId => ArtifactId(generateId())
export const newJobId = (): JobId => JobId(generateId())
export const newCredentialId = (): CredentialId => CredentialId(generateId())
export const newModelId = (): ModelId => ModelId(generateId())
export const newProxyConfigId = (): ProxyConfigId => ProxyConfigId(generateId())

// Memory ID generator factories
export const newMemoryId = (): MemoryId => MemoryId(generateId())
export const newL1RiverId = (): L1RiverId => L1RiverId(generateId())
export const newL2AffectId = (): L2AffectId => L2AffectId(generateId())
export const newL3VectorId = (): L3VectorId => L3VectorId(generateId())
export const newL3EntityId = (): L3EntityId => L3EntityId(generateId())
export const newL3RelationId = (): L3RelationId => L3RelationId(generateId())
export const newL4SalienceId = (): L4SalienceId => L4SalienceId(generateId())
export const newL5NodeId = (): L5NodeId => L5NodeId(generateId())
export const newL5EdgeId = (): L5EdgeId => L5EdgeId(generateId())

// -----------------------------------------------------------------------------
// Provider Types
// -----------------------------------------------------------------------------

// The API format/protocol - how to structure requests
export type ProviderFormat = 'anthropic' | 'openai' | 'google'

export const PROVIDER_FORMATS: readonly ProviderFormat[] = ['anthropic', 'openai', 'google'] as const

export function isProviderFormat(value: string): value is ProviderFormat {
  return PROVIDER_FORMATS.includes(value as ProviderFormat)
}

// Legacy alias for backwards compatibility during migration
export type ProviderType = ProviderFormat
export const PROVIDER_TYPES = PROVIDER_FORMATS
export const isProviderType = isProviderFormat

// Provider instance - a configured provider (can be custom)
export interface ProviderConfig {
  id: string              // unique id: 'anthropic', 'openai', 'together-ai', 'my-ollama'
  name: string            // display name: "Anthropic", "Together AI", "My Local LLM"
  format: ProviderFormat  // which API format to use
  baseUrl: string         // API endpoint
  brandColor?: string     // for UI
  isBuiltIn?: boolean     // true for anthropic/openai/google
}

// -----------------------------------------------------------------------------
// Utility Types
// -----------------------------------------------------------------------------

// Make specific properties optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Make specific properties required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

// Deep partial
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// -----------------------------------------------------------------------------
// Pagination
// -----------------------------------------------------------------------------

export interface PaginationParams {
  limit: number
  offset: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// -----------------------------------------------------------------------------
// Timestamps
// -----------------------------------------------------------------------------

export interface Timestamps {
  createdAt: string
  updatedAt: string
}

// Create input type (no id, no timestamps)
export type CreateInput<T extends { id: string } & Timestamps> =
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>

// Update input type (partial, no id, no createdAt)
export type UpdateInput<T extends { id: string } & Timestamps> =
  Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>

// -----------------------------------------------------------------------------
// Model Types
// -----------------------------------------------------------------------------

export interface ModelInfo {
  id: string
  provider: ProviderType
  displayName: string
  contextWindow: number
  maxOutput: number
  supportsVision: boolean
  supportsTools: boolean
  inputPrice?: number   // per million tokens
  outputPrice?: number  // per million tokens
}

export interface UserModel extends ModelInfo {
  isDefault: boolean
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// -----------------------------------------------------------------------------
// Credential Types
// -----------------------------------------------------------------------------

export interface Credential {
  id: string              // provider id (e.g., 'anthropic', 'together-ai')
  name: string            // display name
  format: ProviderFormat  // API format to use
  apiKey: string          // Will be encrypted in storage
  baseUrl: string         // API endpoint
  brandColor?: string     // for UI
  metadata?: Record<string, unknown>
  // Image models
  imageEndpoint?: string  // URL suffix for image generation API
  imageModels?: ImageModelConfig[]  // Custom image model configurations
  // Embedding models
  embeddingEndpoint?: string  // URL suffix for embedding API
  embeddingModels?: EmbeddingModelInfo[]  // Custom embedding model configurations
  // Video models
  videoEndpoint?: string  // URL suffix for video generation API
  videoModels?: VideoModelConfig[]  // Custom video model configurations
  // TTS models
  ttsEndpoint?: string    // URL suffix for TTS API
  ttsModels?: TTSModelConfig[]  // Custom TTS model configurations
  // TEE models
  teeEndpoint?: string    // URL suffix for TEE chat API
  teeModels?: TEEModelInfo[]  // TEE model configurations
  createdAt: string
  updatedAt: string
}

// Re-export model config types for convenience
export type { ImageModelConfig } from '../../../mainview/types/image-model-config'
export type { EmbeddingModelInfo } from '../../../mainview/types/embedding-model-config'
export type { VideoModelConfig } from '../../../mainview/types/video-model-config'
export type { TTSModelConfig } from '../../../mainview/types/tts-model-config'
export type { TEEModelInfo } from '../../../mainview/types/tee-model-config'

// Legacy - provider field maps to id
export type CredentialLegacy = Credential & { provider: string }

// -----------------------------------------------------------------------------
// Variable Types
// -----------------------------------------------------------------------------

export type VariableId = Brand<string, 'VariableId'>
export const VariableId = (id: string): VariableId => id as VariableId
export const newVariableId = (): VariableId => VariableId(generateId())

export type VariableType = 'system' | 'app-level' | 'wildcard' | 'rest-api' | 'javascript'
export type VariableScope = 'system' | 'app' | 'chat'

// Base variable interface
export interface Variable {
  id: VariableId
  name: string                    // {{name}} - must be valid identifier
  type: VariableType
  scope: VariableScope            // system (read-only), app (user), chat (per-chat)
  description?: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

// System variables (read-only, built-in)
export interface SystemVariable extends Variable {
  type: 'system'
  scope: 'system'
  computeFn: 'time' | 'date' | 'datetime' | 'timestamp' | 'system-info' | 'user-info'
}

// App-level variables (user-defined, persistent)
export interface AppLevelVariable extends Variable {
  type: 'app-level'
  scope: 'app'
  value: string                   // Static text value
}

// Wildcard string variables (array of options)
export interface WildcardVariable extends Variable {
  type: 'wildcard'
  scope: 'app'
  options: string[]               // Array of text options
  allowDuplicates?: boolean       // Can same option be selected twice in a row
  cacheDuration?: number          // ms to cache selection (null = no cache, reroll each time)
}

// REST API variables
export interface RestApiVariable extends Variable {
  type: 'rest-api'
  scope: 'app'
  requestConfig: RestRequestConfig
  responseParser: ResponseParser
  timeout?: number                // ms, default 10000
  retries?: number                // default 1
  cacheEnabled?: boolean
  cacheDuration?: number          // ms
}

// JavaScript variables
export interface JavaScriptVariable extends Variable {
  type: 'javascript'
  scope: 'app'
  code: string                    // Code that returns string
  timeout?: number                // ms, default 5000
}

// REST request configuration
export interface RestRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string                     // Can contain {{other-var}} for interpolation
  headers?: Record<string, string>
  body?: unknown                  // JSON or form data
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key'
    value: string                 // Encrypted in database
    keyName?: string              // For api-key type (e.g., 'X-API-Key')
  }
}

// Response field selector
export interface ResponseParser {
  type: 'text' | 'json-path' | 'regex'
  selector: string                // Path (e.g., 'data.message') or regex pattern
  defaultValue?: string           // If selector doesn't match
}

// Variable expansion result
export interface VariableExpansionResult {
  variable: string
  data?: string                   // Resolved value
  error?: string                  // Error message if failed
  loading?: boolean               // Still expanding
  type?: VariableType             // Metadata
}

// Variable test result
export interface VariableTestResult {
  success: boolean
  data?: string                   // Resolved value
  error?: string
  duration: number                // ms
  timestamp: string
}

// Union type for any variable
export type AnyVariable = SystemVariable | AppLevelVariable | WildcardVariable | RestApiVariable | JavaScriptVariable

// =============================================================================
// Proxy Types
// =============================================================================

export type ProxyType = 'http' | 'socks5'

export interface ProxyConfig extends Timestamps {
  id: ProxyConfigId
  nickname: string           // User-friendly name
  type: ProxyType            // 'http' or 'socks5'
  hostname: string           // IP or domain
  port: number               // 1-65535
  authentication?: {
    username: string
    password: string
  }
  isActive: boolean           // Only one can be true
}

export interface ProxyStatus {
  isEnabled: boolean              // Is any proxy active?
  activeConfig?: ProxyConfig      // Current active config (if enabled)
  healthStatus: 'healthy' | 'degraded' | 'failed'
  lastHealthCheck: string         // ISO 8601
  outboundIp?: string             // Detected IP (from icanhazip.com)
  userIp?: string                 // User's real IP (detected once at startup)
  healthCheckMessage?: string     // Error message if degraded/failed
}

// =============================================================================
// Memory Types (M3A)
// =============================================================================

// L2: Affective state categories
export type AffectCategory =
  | 'FRUSTRATED'   // High arousal, negative valence
  | 'CONFUSED'     // Low arousal, negative valence
  | 'CURIOUS'      // High arousal, positive valence
  | 'SATISFIED'    // Low arousal, positive valence
  | 'URGENT'       // High arousal, neutral valence
  | 'REFLECTIVE'   // Low arousal, neutral valence

export const AFFECT_CATEGORIES: readonly AffectCategory[] = [
  'FRUSTRATED', 'CONFUSED', 'CURIOUS', 'SATISFIED', 'URGENT', 'REFLECTIVE'
] as const

export function isAffectCategory(value: string): value is AffectCategory {
  return AFFECT_CATEGORIES.includes(value as AffectCategory)
}

// L3: Entity types for knowledge graph
export type EntityType =
  | 'PERSON'
  | 'CONCEPT'
  | 'TOOL'
  | 'LOCATION'
  | 'FILE'
  | 'TECHNOLOGY'
  | 'OTHER'

export const ENTITY_TYPES: readonly EntityType[] = [
  'PERSON', 'CONCEPT', 'TOOL', 'LOCATION', 'FILE', 'TECHNOLOGY', 'OTHER'
] as const

// L3: Relation types for knowledge graph
export type RelationType =
  | 'USES'
  | 'PART_OF'
  | 'RELATED_TO'
  | 'MENTIONED_WITH'
  | 'DEPENDS_ON'

export const RELATION_TYPES: readonly RelationType[] = [
  'USES', 'PART_OF', 'RELATED_TO', 'MENTIONED_WITH', 'DEPENDS_ON'
] as const

// L5: Co-occurrence node types
export type CooccurrenceNodeType = 'CONCEPT' | 'TOPIC' | 'ENTITY'

// User curation actions
export type CurationAction = 'PIN' | 'IMPORTANT' | 'MUTE' | 'AFFECT_TAG'

export const CURATION_ACTIONS: readonly CurationAction[] = [
  'PIN', 'IMPORTANT', 'MUTE', 'AFFECT_TAG'
] as const

// Memory layer identifiers
export type MemoryLayer = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export const MEMORY_LAYERS: readonly MemoryLayer[] = [
  'L1', 'L2', 'L3', 'L4', 'L5'
] as const
