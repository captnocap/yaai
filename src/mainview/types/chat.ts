import type { Message } from './message';
import type { ModelInfo } from './model';
import type { Memory } from './memory';

export interface Chat {
  id: string;
  title: string;
  promptId?: string;
  models: ModelInfo[];    // Active models for this chat
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  chat: Chat | null;
  messages: Message[];
  isStreaming: boolean;
  streamingMessageId?: string;
  attachedMemories: Memory[];
  tokenUsage: TokenUsage;
}

export interface TokenUsage {
  system: number;
  memories: number;
  history: number;
  input: number;
  total: number;
  limit: number;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  variables: PromptVariable[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVariable {
  name: string;           // Without braces
  type: 'text' | 'function' | 'api';
  value?: string;         // For text type
  fn?: string;            // For function type (JS code)
  endpoint?: string;      // For api type
}
