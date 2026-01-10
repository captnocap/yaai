// =============================================================================
// CHAT STORE TYPES
// =============================================================================
// Type definitions for chat, message, and related entities.

import type {
  ChatId,
  MessageId,
  PaginatedResult,
  Timestamps,
} from '../core'

// Re-export for consumers
export type { PaginatedResult }

// -----------------------------------------------------------------------------
// Content Block Types
// -----------------------------------------------------------------------------

export interface TextBlock {
  type: 'text'
  text: string
}

export interface CodeBlock {
  type: 'code'
  code: string
  language?: string
  filename?: string
}

export interface ImageBlock {
  type: 'image'
  url?: string
  base64?: string
  mimeType: string
  alt?: string
}

export interface FileBlock {
  type: 'file'
  name: string
  mimeType: string
  size: number
  url?: string
  storagePath?: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  toolUseId: string
  content: string | ContentBlock[]
  isError?: boolean
}

export type ContentBlock =
  | TextBlock
  | CodeBlock
  | ImageBlock
  | FileBlock
  | ToolUseBlock
  | ToolResultBlock

// -----------------------------------------------------------------------------
// Message Types
// -----------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Attachment {
  id: string
  messageId: MessageId
  name: string
  mimeType: string
  size: number
  storagePath?: string
  url?: string
  metadata?: Record<string, unknown>
}

export interface ToolCall {
  id: string
  messageId: MessageId
  name: string
  input: Record<string, unknown>
  output?: string
  status: 'pending' | 'running' | 'success' | 'error'
  error?: string
  startedAt?: string
  completedAt?: string
}

export interface Message {
  id: MessageId
  chatId: ChatId
  role: MessageRole
  content: ContentBlock[]
  model?: string
  tokenCount?: number
  generationTime?: number
  timestamp: string
  branchId?: string
  parentId?: MessageId
  isLiked: boolean
  metadata?: Record<string, unknown>
  attachments?: Attachment[]
  toolCalls?: ToolCall[]
}

// -----------------------------------------------------------------------------
// Chat Types
// -----------------------------------------------------------------------------

export interface Chat extends Timestamps {
  id: ChatId
  title: string
  promptId?: string
  defaultModel?: string
  lastInteractedAt?: string
  isPinned: boolean
  isArchived: boolean
}

export interface ChatWithStats extends Chat {
  messageCount: number
  lastMessageAt?: string
  lastMessagePreview?: string
}

export interface Branch {
  id: string
  chatId: ChatId
  parentBranchId?: string
  forkMessageId: MessageId
  name?: string
  createdAt: string
}

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

export interface CreateChatInput {
  title: string
  promptId?: string
  defaultModel?: string
}

export interface UpdateChatInput {
  title?: string
  promptId?: string
  defaultModel?: string
}

export interface CreateMessageInput {
  chatId: ChatId
  role: MessageRole
  content: ContentBlock[]
  model?: string
  tokenCount?: number
  generationTime?: number
  branchId?: string
  parentId?: MessageId
  metadata?: Record<string, unknown>
}

export interface UpdateMessageInput {
  content?: ContentBlock[]
  isLiked?: boolean
  metadata?: Record<string, unknown>
}

export interface CreateAttachmentInput {
  messageId: MessageId
  name: string
  mimeType: string
  size: number
  storagePath?: string
  url?: string
  metadata?: Record<string, unknown>
}

export interface CreateToolCallInput {
  messageId: MessageId
  name: string
  input: Record<string, unknown>
}

export interface UpdateToolCallInput {
  output?: string
  status?: 'pending' | 'running' | 'success' | 'error'
  error?: string
  startedAt?: string
  completedAt?: string
}

export interface CreateBranchInput {
  chatId: ChatId
  forkMessageId: MessageId
  parentBranchId?: string
  name?: string
}

// -----------------------------------------------------------------------------
// Query Options
// -----------------------------------------------------------------------------

export interface ListChatsOptions {
  limit?: number
  offset?: number
  search?: string
  orderBy?: 'createdAt' | 'updatedAt' | 'lastInteractedAt' | 'title'
  order?: 'asc' | 'desc'
  includeArchived?: boolean
  pinnedFirst?: boolean
}

// -----------------------------------------------------------------------------
// Project Types (unified view across modes)
// -----------------------------------------------------------------------------

export type ProjectType = 'chat' | 'code' | 'image' | 'research'

export interface ProjectSummary {
  id: string
  type: ProjectType
  title: string
  lastInteractedAt: string
  isPinned: boolean
  isArchived: boolean
  preview?: string
  metadata?: {
    projectPath?: string  // For code projects
  }
}

export interface ListProjectsOptions {
  limit?: number
  offset?: number
  search?: string
  types?: ProjectType[]
  includeArchived?: boolean
  pinnedFirst?: boolean
  orderBy?: 'lastInteractedAt' | 'title' | 'type'
  order?: 'asc' | 'desc'
}

export interface ListMessagesOptions {
  limit?: number
  offset?: number
  branchId?: string
  afterId?: MessageId
  beforeId?: MessageId
}

export interface SearchMessagesOptions {
  query: string
  chatId?: ChatId
  limit?: number
  offset?: number
}

export interface SearchResult {
  messageId: MessageId
  chatId: ChatId
  chatTitle: string
  snippet: string
  timestamp: string
}

// -----------------------------------------------------------------------------
// Result Types
// -----------------------------------------------------------------------------

export type ChatListResult = PaginatedResult<ChatWithStats>
export type MessageListResult = Message[]
export type SearchMessagesResult = PaginatedResult<SearchResult>
