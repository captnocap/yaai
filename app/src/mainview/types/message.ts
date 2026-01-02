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
  | 'image_gen';

export interface MessageContent {
  type: ContentType;
  value: string;
  language?: string;      // For code blocks
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: MessageContent[];
  model?: ModelInfo;      // For assistant messages
  attachments?: FileObject[];
  toolCalls?: ToolCall[];
  tokenCount?: number;
  generationTime?: number;
  timestamp: Date;
  branchId?: string;
  parentId?: string;
  isLiked?: boolean;      // For multi-model selection
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
