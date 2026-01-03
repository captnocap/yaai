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

// ID factories
export const ChatId = (id: string): ChatId => id as ChatId
export const MessageId = (id: string): MessageId => id as MessageId
export const SessionId = (id: string): SessionId => id as SessionId
export const ArtifactId = (id: string): ArtifactId => id as ArtifactId
export const JobId = (id: string): JobId => id as JobId
export const CredentialId = (id: string): CredentialId => id as CredentialId
export const ModelId = (id: string): ModelId => id as ModelId

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
  createdAt: string
  updatedAt: string
}

// Legacy - provider field maps to id
export type CredentialLegacy = Credential & { provider: string }
