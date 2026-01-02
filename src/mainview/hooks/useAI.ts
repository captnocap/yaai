// =============================================================================
// USE AI
// =============================================================================
// Hook for interacting with AI providers via IPC.
// Supports streaming responses and cancellation.

import { useState, useCallback, useEffect, useRef } from 'react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ProviderType = 'anthropic' | 'openai' | 'google';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    mediaType?: string;
    data?: string;
    url?: string;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider: ProviderType;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  provider: ProviderType;
  stopReason: 'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence';
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamChunk {
  type: 'text' | 'tool_use_start' | 'tool_use_input' | 'message_start' | 'message_end';
  text?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
}

export interface UseAIOptions {
  defaultProvider?: ProviderType;
  defaultModel?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface UseAIReturn {
  // State
  loading: boolean;
  streaming: boolean;
  streamingContent: string;
  error: string | null;

  // Operations
  chat: (messages: ChatMessage[], options?: Partial<ChatRequest>) => Promise<ChatResponse>;
  chatStream: (
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    options?: Partial<ChatRequest>
  ) => Promise<ChatResponse>;
  cancel: () => void;

  // Provider info
  getModels: (provider: ProviderType) => Promise<ModelInfo[]>;
  hasCredentials: (provider: ProviderType) => Promise<boolean>;
}

// -----------------------------------------------------------------------------
// IPC BRIDGE
// -----------------------------------------------------------------------------

const ipc = typeof window !== 'undefined' && (window as any).electrobun?.ipc;

async function sendIPC<T>(channel: string, data?: unknown): Promise<T> {
  if (!ipc) {
    throw new Error('IPC not available');
  }
  return await ipc.send(channel, data);
}

function onIPCMessage(channel: string, handler: (data: unknown) => void): () => void {
  if (!ipc) return () => {};
  ipc.on(channel, handler);
  return () => ipc.off(channel, handler);
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useAI(options: UseAIOptions = {}): UseAIReturn {
  const {
    defaultProvider = 'anthropic',
    defaultModel = 'claude-3-5-sonnet-20241022',
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentRequestId = useRef<string | null>(null);
  const streamResolve = useRef<((response: ChatResponse) => void) | null>(null);
  const streamReject = useRef<((error: Error) => void) | null>(null);
  const accumulatedContent = useRef('');
  const externalOnChunk = useRef<((content: string) => void) | null>(null);

  // ---------------------------------------------------------------------------
  // IPC EVENT LISTENERS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsubChunk = onIPCMessage('ai:stream-chunk', (data: any) => {
      if (data?.requestId !== currentRequestId.current) return;

      const chunk = data.chunk as StreamChunk;
      if (chunk.type === 'text' && chunk.text) {
        accumulatedContent.current += chunk.text;
        setStreamingContent(accumulatedContent.current);
        externalOnChunk.current?.(chunk.text);
      }
    });

    const unsubComplete = onIPCMessage('ai:stream-complete', (data: any) => {
      if (data?.requestId !== currentRequestId.current) return;

      setStreaming(false);
      setLoading(false);
      currentRequestId.current = null;
      streamResolve.current?.(data.response);
    });

    const unsubError = onIPCMessage('ai:stream-error', (data: any) => {
      if (data?.requestId !== currentRequestId.current) return;

      setStreaming(false);
      setLoading(false);
      setError(data.error);
      currentRequestId.current = null;
      streamReject.current?.(new Error(data.error));
    });

    return () => {
      unsubChunk();
      unsubComplete();
      unsubError();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // OPERATIONS
  // ---------------------------------------------------------------------------

  const chat = useCallback(async (
    messages: ChatMessage[],
    requestOptions?: Partial<ChatRequest>
  ): Promise<ChatResponse> => {
    try {
      setLoading(true);
      setError(null);

      const request: ChatRequest = {
        messages,
        model: requestOptions?.model || defaultModel,
        provider: requestOptions?.provider || defaultProvider,
        systemPrompt: requestOptions?.systemPrompt || systemPrompt,
        maxTokens: requestOptions?.maxTokens || maxTokens,
        temperature: requestOptions?.temperature ?? temperature,
        stream: false,
      };

      const response = await sendIPC<ChatResponse>('ai:chat', request);
      return response;
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [defaultModel, defaultProvider, systemPrompt, maxTokens, temperature]);

  const chatStream = useCallback(async (
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    requestOptions?: Partial<ChatRequest>
  ): Promise<ChatResponse> => {
    try {
      setLoading(true);
      setStreaming(true);
      setStreamingContent('');
      setError(null);
      accumulatedContent.current = '';
      externalOnChunk.current = onChunk;

      const request: ChatRequest = {
        messages,
        model: requestOptions?.model || defaultModel,
        provider: requestOptions?.provider || defaultProvider,
        systemPrompt: requestOptions?.systemPrompt || systemPrompt,
        maxTokens: requestOptions?.maxTokens || maxTokens,
        temperature: requestOptions?.temperature ?? temperature,
        stream: true,
      };

      // Start streaming
      const requestId = await sendIPC<string>('ai:chat-stream', request);
      currentRequestId.current = requestId;

      // Wait for completion
      return new Promise<ChatResponse>((resolve, reject) => {
        streamResolve.current = resolve;
        streamReject.current = reject;
      });
    } catch (err) {
      setLoading(false);
      setStreaming(false);
      const message = (err as Error).message;
      setError(message);
      throw err;
    }
  }, [defaultModel, defaultProvider, systemPrompt, maxTokens, temperature]);

  const cancel = useCallback(() => {
    if (currentRequestId.current) {
      sendIPC('ai:cancel', currentRequestId.current).catch(() => {});
      currentRequestId.current = null;
      setStreaming(false);
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // PROVIDER INFO
  // ---------------------------------------------------------------------------

  const getModels = useCallback(async (provider: ProviderType): Promise<ModelInfo[]> => {
    try {
      return await sendIPC<ModelInfo[]>('ai:models', provider);
    } catch (err) {
      // Return default models if IPC not available
      return getDefaultModels(provider);
    }
  }, []);

  const hasCredentials = useCallback(async (provider: ProviderType): Promise<boolean> => {
    try {
      return await sendIPC<boolean>('ai:has-credentials', provider);
    } catch (err) {
      return false;
    }
  }, []);

  return {
    loading,
    streaming,
    streamingContent,
    error,
    chat,
    chatStream,
    cancel,
    getModels,
    hasCredentials,
  };
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getDefaultModels(provider: ProviderType): ModelInfo[] {
  switch (provider) {
    case 'anthropic':
      return [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
      ];
    case 'openai':
      return [
        { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', contextWindow: 128000 },
        { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
      ];
    case 'google':
      return [
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 1000000 },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000 },
      ];
    default:
      return [];
  }
}
