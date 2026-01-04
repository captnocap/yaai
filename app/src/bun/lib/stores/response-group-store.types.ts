import type { ChatId, MessageId } from '../core'

// =============================================================================
// Branded Types
// =============================================================================

/**
 * Branded type for response group IDs
 * Ensures type-safe operations at compile time
 */
export type ResponseGroupId = string & { readonly __brand: 'ResponseGroupId' }

/**
 * Create a ResponseGroupId from a string
 */
export const ResponseGroupId = (id: string): ResponseGroupId => id as ResponseGroupId

/**
 * Generate a new ResponseGroupId
 */
export const newResponseGroupId = (): ResponseGroupId => ResponseGroupId(crypto.randomUUID())

// =============================================================================
// Response Group Entity
// =============================================================================

/**
 * Response group: one user message + multiple assistant responses
 * The selected_response_id determines which one continues the conversation
 */
export interface ResponseGroup {
  id: ResponseGroupId
  chatId: ChatId
  userMessageId: MessageId
  selectedResponseId: MessageId | null  // null = user hasn't selected yet
  createdAt: string                      // ISO 8601
  updatedAt: string                      // ISO 8601
}

/**
 * Response group with all response message IDs populated
 * Ordered by position for display
 */
export interface ResponseGroupWithMessages extends ResponseGroup {
  responseIds: MessageId[]
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Create a new response group with initial responses
 */
export interface CreateResponseGroupInput {
  chatId: ChatId
  userMessageId: MessageId
  responseIds: MessageId[]
  selectedResponseId?: MessageId  // Optional initial selection
}

/**
 * Select a response from an existing group
 */
export interface SelectResponseInput {
  responseGroupId: ResponseGroupId
  messageId: MessageId
}

/**
 * Add a response to an existing group (e.g., regenerate with another model)
 */
export interface AddResponseToGroupInput {
  responseGroupId: ResponseGroupId
  messageId: MessageId
  position?: number  // Where to insert (defaults to end)
}

/**
 * List responses in a group with metadata
 */
export interface ListGroupResponsesInput {
  responseGroupId: ResponseGroupId
}
