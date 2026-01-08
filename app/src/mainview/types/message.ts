import type { ModelInfo } from './model';
import type { FileObject } from './file';
import type { ToolCall } from './tool';

export type MessageRole = 'user' | 'assistant' | 'system';

export type ContentType =
  | 'text'
  | 'code'
  | 'html'
  | 'react'
  | 'csv'
  | 'image'
  | 'video'
  | 'file'
  | 'image_gen'
  | 'thinking';  // For model reasoning/chain-of-thought

export interface MessageContent {
  type: ContentType;
  value?: string;
  text?: string;          // Alias for value (some providers use this)
  language?: string;      // For code blocks
  url?: string;           // For image blocks
  data?: string;          // For base64 image data
  metadata?: Record<string, unknown>;
}

export interface TokenCount {
  input?: number;
  output?: number;
}

export type MessageErrorCode =
  | 'context_length_exceeded'
  | 'rate_limit'
  | 'service_unavailable'
  | 'authentication_error'
  | 'invalid_request'
  | 'content_filter'
  | 'timeout'
  | 'network_error'
  | 'unknown';

export interface MessageError {
  code: MessageErrorCode;
  message: string;
  details?: string;
  retryable?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: MessageContent[];
  model?: ModelInfo | string;  // For assistant messages (can be string for demos)
  attachments?: FileObject[];
  toolCalls?: ToolCall[];
  tokenCount?: number | TokenCount;
  generationTime?: number;
  timestamp: Date;
  branchId?: string;
  parentId?: string;
  isLiked?: boolean;      // For multi-model selection
  error?: MessageError;   // Error state for failed responses
}

export interface MessageInput {
  content: string;
  attachments?: File[];
  models: string[];       // Model IDs to query
  tools?: string[];       // Enabled tool IDs
  memoryIds?: string[];   // Manually attached memories
}

export interface StreamingChunk {
  messageId: string;
  content: string;
  done: boolean;
}
