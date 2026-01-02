# SPEC_AI_PROVIDER.md

AI provider integration using raw HTTP fetch with streaming, tool calling, and unified error handling.

**No SDK dependencies** - direct API calls for full control over streaming and request handling.

---

## Overview

The AI provider system handles:
- Multi-provider support (Anthropic, OpenAI, Google)
- Server-Sent Events (SSE) streaming
- Tool/function calling
- Token counting and usage tracking
- Retry logic with exponential backoff
- Rate limiting integration
- Abort signal handling
- Error mapping to app errors

---

## Provider Configuration

### TypeScript Interfaces

```typescript
// =============================================================================
// AI PROVIDER TYPES
// =============================================================================

// -----------------------------------------------------------------------------
// PROVIDER CONFIGURATION
// -----------------------------------------------------------------------------

export type ProviderType = 'anthropic' | 'openai' | 'google';

export interface ProviderConfig {
  type: ProviderType;
  enabled: boolean;
  baseUrl: string;
  apiVersion?: string;  // For Anthropic
  defaultModel: string;
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  inputPricePerMillion: number;   // USD
  outputPricePerMillion: number;  // USD
}

// -----------------------------------------------------------------------------
// DEFAULT CONFIGURATIONS
// -----------------------------------------------------------------------------

export const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  anthropic: {
    type: 'anthropic',
    enabled: true,
    baseUrl: 'https://api.anthropic.com/v1',
    apiVersion: '2023-06-01',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        contextWindow: 200000,
        maxOutputTokens: 32000,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 15,
        outputPricePerMillion: 75,
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutputTokens: 64000,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 3,
        outputPricePerMillion: 15,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 0.25,
        outputPricePerMillion: 1.25,
      },
    ],
  },
  openai: {
    type: 'openai',
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 2.5,
        outputPricePerMillion: 10,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 0.15,
        outputPricePerMillion: 0.6,
      },
      {
        id: 'o1',
        name: 'o1',
        contextWindow: 200000,
        maxOutputTokens: 100000,
        supportsVision: true,
        supportsTools: false,
        inputPricePerMillion: 15,
        outputPricePerMillion: 60,
      },
    ],
  },
  google: {
    type: 'google',
    enabled: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 0.075,
        outputPricePerMillion: 0.3,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        supportsVision: true,
        supportsTools: true,
        inputPricePerMillion: 1.25,
        outputPricePerMillion: 5,
      },
    ],
  },
};
```

---

## Request/Response Types

```typescript
// -----------------------------------------------------------------------------
// MESSAGES
// -----------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';

  // Text content
  text?: string;

  // Image content
  source?: ImageSource;

  // Tool use (assistant response)
  id?: string;
  name?: string;
  input?: unknown;

  // Tool result (user message)
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface ImageSource {
  type: 'base64' | 'url';
  mediaType?: string;  // 'image/png', 'image/jpeg', etc.
  data?: string;       // base64 data
  url?: string;        // for URL sources
}

// -----------------------------------------------------------------------------
// TOOL DEFINITIONS
// -----------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: JSONSchema;
  }>;
  required?: string[];
}

// -----------------------------------------------------------------------------
// CHAT REQUEST
// -----------------------------------------------------------------------------

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider: ProviderType;

  // Optional parameters
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];

  // Streaming
  stream?: boolean;

  // Tools
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'any' | 'none' | { type: 'tool'; name: string };

  // Control
  signal?: AbortSignal;
  requestId?: string;
}

// -----------------------------------------------------------------------------
// CHAT RESPONSE
// -----------------------------------------------------------------------------

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  provider: ProviderType;
  stopReason: StopReason;
  usage: TokenUsage;
  toolCalls?: ToolCall[];
}

export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'tool_use'
  | 'stop_sequence';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

// -----------------------------------------------------------------------------
// STREAMING
// -----------------------------------------------------------------------------

export type StreamChunkType =
  | 'message_start'
  | 'text'
  | 'tool_use_start'
  | 'tool_use_input'
  | 'message_end'
  | 'error';

export interface StreamChunk {
  type: StreamChunkType;
  text?: string;
  toolCall?: Partial<ToolCall>;
  usage?: Partial<TokenUsage>;
  error?: string;
}

export type StreamCallback = (chunk: StreamChunk) => void;
```

---

## Error Handling

```typescript
// =============================================================================
// AI PROVIDER ERRORS
// =============================================================================

export type AIErrorCode =
  | 'AUTHENTICATION_ERROR'     // 401 - Invalid API key
  | 'PERMISSION_DENIED'        // 403 - Account issue
  | 'NOT_FOUND'                // 404 - Model not found
  | 'RATE_LIMITED'             // 429 - Too many requests
  | 'INVALID_REQUEST'          // 400 - Bad request
  | 'CONTEXT_LENGTH_EXCEEDED'  // Request too large
  | 'CONTENT_FILTERED'         // Content policy violation
  | 'SERVER_ERROR'             // 500+ - Provider error
  | 'NETWORK_ERROR'            // Connection issue
  | 'TIMEOUT'                  // Request timeout
  | 'ABORTED'                  // User cancelled
  | 'UNKNOWN';                 // Unknown error

export interface AIError {
  code: AIErrorCode;
  message: string;
  provider: ProviderType;
  statusCode?: number;
  retryable: boolean;
  retryAfterMs?: number;
}

/**
 * Map HTTP status codes to AI error codes
 */
export function mapStatusToErrorCode(status: number, provider: ProviderType): AIErrorCode {
  switch (status) {
    case 400:
      return 'INVALID_REQUEST';
    case 401:
      return 'AUTHENTICATION_ERROR';
    case 403:
      return 'PERMISSION_DENIED';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    default:
      if (status >= 500) return 'SERVER_ERROR';
      return 'UNKNOWN';
  }
}

/**
 * Determine if an error is retryable
 */
export function isRetryable(code: AIErrorCode): boolean {
  return ['RATE_LIMITED', 'SERVER_ERROR', 'NETWORK_ERROR', 'TIMEOUT'].includes(code);
}

/**
 * Parse provider-specific error response
 */
export function parseErrorResponse(
  provider: ProviderType,
  status: number,
  body: string
): AIError {
  const code = mapStatusToErrorCode(status, provider);
  let message = `${provider} API error: ${status}`;
  let retryAfterMs: number | undefined;

  try {
    const data = JSON.parse(body);

    switch (provider) {
      case 'anthropic':
        message = data.error?.message || message;
        if (data.error?.type === 'overloaded_error') {
          retryAfterMs = 60000; // 1 minute
        }
        break;

      case 'openai':
        message = data.error?.message || message;
        if (status === 429 && data.error?.type === 'tokens') {
          retryAfterMs = 60000;
        }
        break;

      case 'google':
        message = data.error?.message || data.error?.status || message;
        break;
    }
  } catch {
    // Use raw body if not JSON
    if (body.length < 500) {
      message = body;
    }
  }

  return {
    code,
    message,
    provider,
    statusCode: status,
    retryable: isRetryable(code),
    retryAfterMs,
  };
}
```

---

## Retry Logic

```typescript
// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;  // 0-1, adds randomness to prevent thundering herd
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

/**
 * Calculate delay for retry attempt
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterMs?: number
): number {
  // If server specified retry-after, use that
  if (retryAfterMs) {
    return Math.min(retryAfterMs, config.maxDelayMs);
  }

  // Exponential backoff
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

/**
 * Retry wrapper for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  shouldRetry: (error: AIError) => boolean = (e) => e.retryable
): Promise<T> {
  let lastError: AIError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const aiError = error as AIError;

      if (!shouldRetry(aiError) || attempt === config.maxRetries) {
        throw aiError;
      }

      lastError = aiError;
      const delay = calculateRetryDelay(attempt, config, aiError.retryAfterMs);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

---

## Provider Implementations

### Anthropic

```typescript
// =============================================================================
// ANTHROPIC PROVIDER
// =============================================================================

export async function callAnthropic(
  request: ChatRequest,
  apiKey: string,
  config: ProviderConfig,
  onChunk?: StreamCallback
): Promise<ChatResponse> {
  // Build request body
  const body = buildAnthropicRequest(request);

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': config.apiVersion || '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw parseErrorResponse('anthropic', response.status, errorBody);
  }

  if (request.stream && onChunk) {
    return streamAnthropicResponse(response, request, onChunk);
  }

  return parseAnthropicResponse(await response.json(), request);
}

function buildAnthropicRequest(request: ChatRequest): Record<string, unknown> {
  // Convert messages to Anthropic format
  const messages = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: formatAnthropicContent(m.content),
    }));

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens || 4096,
    stream: request.stream ?? false,
  };

  if (request.systemPrompt) {
    body.system = request.systemPrompt;
  }

  if (request.temperature !== undefined) {
    body.temperature = request.temperature;
  }

  if (request.topP !== undefined) {
    body.top_p = request.topP;
  }

  if (request.stopSequences && request.stopSequences.length > 0) {
    body.stop_sequences = request.stopSequences;
  }

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));

    if (request.toolChoice) {
      body.tool_choice = formatAnthropicToolChoice(request.toolChoice);
    }
  }

  return body;
}

function formatAnthropicContent(content: string | ContentBlock[]): unknown {
  if (typeof content === 'string') {
    return content;
  }

  return content.map(block => {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text };

      case 'image':
        return {
          type: 'image',
          source: {
            type: block.source?.type || 'base64',
            media_type: block.source?.mediaType,
            data: block.source?.data,
          },
        };

      case 'tool_use':
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        };

      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: block.content,
          is_error: block.is_error,
        };

      default:
        return block;
    }
  });
}

function formatAnthropicToolChoice(choice: ChatRequest['toolChoice']): unknown {
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'any') return { type: 'any' };
  if (choice === 'none') return { type: 'none' };
  if (typeof choice === 'object') return { type: 'tool', name: choice.name };
  return { type: 'auto' };
}

function parseAnthropicResponse(data: any, request: ChatRequest): ChatResponse {
  let content = '';
  const toolCalls: ToolCall[] = [];

  for (const block of data.content || []) {
    if (block.type === 'text') {
      content += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
  }

  return {
    id: data.id,
    content,
    model: data.model,
    provider: 'anthropic',
    stopReason: mapAnthropicStopReason(data.stop_reason),
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      cacheReadTokens: data.usage?.cache_read_input_tokens,
      cacheWriteTokens: data.usage?.cache_creation_input_tokens,
    },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

function mapAnthropicStopReason(reason: string): StopReason {
  switch (reason) {
    case 'end_turn': return 'end_turn';
    case 'max_tokens': return 'max_tokens';
    case 'tool_use': return 'tool_use';
    case 'stop_sequence': return 'stop_sequence';
    default: return 'end_turn';
  }
}

async function streamAnthropicResponse(
  response: Response,
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<ChatResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw { code: 'NETWORK_ERROR', message: 'No response body', provider: 'anthropic', retryable: true };

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let responseId = '';
  let model = request.model;
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: StopReason = 'end_turn';
  const toolCalls: ToolCall[] = [];
  let currentToolIndex = -1;
  let currentToolInput = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          switch (event.type) {
            case 'message_start':
              responseId = event.message?.id || '';
              model = event.message?.model || model;
              inputTokens = event.message?.usage?.input_tokens || 0;
              onChunk({ type: 'message_start' });
              break;

            case 'content_block_start':
              if (event.content_block?.type === 'tool_use') {
                currentToolIndex = event.index;
                currentToolInput = '';
                toolCalls.push({
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: {},
                });
                onChunk({
                  type: 'tool_use_start',
                  toolCall: { id: event.content_block.id, name: event.content_block.name },
                });
              }
              break;

            case 'content_block_delta':
              if (event.delta?.type === 'text_delta') {
                const text = event.delta.text || '';
                fullContent += text;
                onChunk({ type: 'text', text });
              } else if (event.delta?.type === 'input_json_delta') {
                currentToolInput += event.delta.partial_json || '';
                onChunk({ type: 'tool_use_input', toolCall: { input: event.delta.partial_json } });
              }
              break;

            case 'content_block_stop':
              if (currentToolIndex >= 0 && currentToolInput) {
                try {
                  toolCalls[currentToolIndex].input = JSON.parse(currentToolInput);
                } catch {
                  toolCalls[currentToolIndex].input = currentToolInput;
                }
                currentToolIndex = -1;
                currentToolInput = '';
              }
              break;

            case 'message_delta':
              stopReason = mapAnthropicStopReason(event.delta?.stop_reason || 'end_turn');
              outputTokens = event.usage?.output_tokens || outputTokens;
              break;

            case 'message_stop':
              onChunk({ type: 'message_end', usage: { inputTokens, outputTokens } });
              break;

            case 'error':
              onChunk({ type: 'error', error: event.error?.message || 'Unknown streaming error' });
              break;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    id: responseId,
    content: fullContent,
    model,
    provider: 'anthropic',
    stopReason,
    usage: { inputTokens, outputTokens },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
```

### OpenAI

```typescript
// =============================================================================
// OPENAI PROVIDER
// =============================================================================

export async function callOpenAI(
  request: ChatRequest,
  apiKey: string,
  config: ProviderConfig,
  onChunk?: StreamCallback
): Promise<ChatResponse> {
  const body = buildOpenAIRequest(request);

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw parseErrorResponse('openai', response.status, errorBody);
  }

  if (request.stream && onChunk) {
    return streamOpenAIResponse(response, request, onChunk);
  }

  return parseOpenAIResponse(await response.json(), request);
}

function buildOpenAIRequest(request: ChatRequest): Record<string, unknown> {
  const messages: unknown[] = [];

  // Add system prompt as first message
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }

  // Convert messages to OpenAI format
  for (const m of request.messages) {
    messages.push({
      role: m.role,
      content: formatOpenAIContent(m.content),
    });
  }

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens || 4096,
    stream: request.stream ?? false,
  };

  if (request.temperature !== undefined) {
    body.temperature = request.temperature;
  }

  if (request.topP !== undefined) {
    body.top_p = request.topP;
  }

  if (request.stopSequences && request.stopSequences.length > 0) {
    body.stop = request.stopSequences;
  }

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    if (request.toolChoice) {
      body.tool_choice = formatOpenAIToolChoice(request.toolChoice);
    }
  }

  if (request.stream) {
    body.stream_options = { include_usage: true };
  }

  return body;
}

function formatOpenAIContent(content: string | ContentBlock[]): unknown {
  if (typeof content === 'string') {
    return content;
  }

  return content.map(block => {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text };

      case 'image':
        return {
          type: 'image_url',
          image_url: {
            url: block.source?.type === 'url'
              ? block.source.url
              : `data:${block.source?.mediaType};base64,${block.source?.data}`,
          },
        };

      default:
        return { type: 'text', text: '' };
    }
  });
}

function formatOpenAIToolChoice(choice: ChatRequest['toolChoice']): unknown {
  if (choice === 'auto') return 'auto';
  if (choice === 'any') return 'required';
  if (choice === 'none') return 'none';
  if (typeof choice === 'object') return { type: 'function', function: { name: choice.name } };
  return 'auto';
}

function parseOpenAIResponse(data: any, request: ChatRequest): ChatResponse {
  const choice = data.choices?.[0];
  const message = choice?.message;

  const toolCalls: ToolCall[] = (message?.tool_calls || []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    input: safeParseJSON(tc.function?.arguments),
  }));

  return {
    id: data.id,
    content: message?.content || '',
    model: data.model,
    provider: 'openai',
    stopReason: mapOpenAIStopReason(choice?.finish_reason),
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

function mapOpenAIStopReason(reason: string): StopReason {
  switch (reason) {
    case 'stop': return 'end_turn';
    case 'length': return 'max_tokens';
    case 'tool_calls': return 'tool_use';
    case 'content_filter': return 'end_turn';
    default: return 'end_turn';
  }
}

async function streamOpenAIResponse(
  response: Response,
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<ChatResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw { code: 'NETWORK_ERROR', message: 'No response body', provider: 'openai', retryable: true };

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let responseId = '';
  let model = request.model;
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: StopReason = 'end_turn';
  const toolCalls: ToolCall[] = [];
  const toolInputBuffers: Map<number, string> = new Map();

  onChunk({ type: 'message_start' });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          responseId = event.id || responseId;
          model = event.model || model;

          const delta = event.choices?.[0]?.delta;

          // Text content
          if (delta?.content) {
            fullContent += delta.content;
            onChunk({ type: 'text', text: delta.content });
          }

          // Tool calls
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index ?? 0;

              if (tc.id) {
                // New tool call
                toolCalls[index] = { id: tc.id, name: tc.function?.name || '', input: {} };
                toolInputBuffers.set(index, '');
                onChunk({ type: 'tool_use_start', toolCall: { id: tc.id, name: tc.function?.name } });
              }

              if (tc.function?.arguments) {
                const current = toolInputBuffers.get(index) || '';
                toolInputBuffers.set(index, current + tc.function.arguments);
                onChunk({ type: 'tool_use_input', toolCall: { input: tc.function.arguments } });
              }
            }
          }

          // Usage (when stream_options.include_usage = true)
          if (event.usage) {
            inputTokens = event.usage.prompt_tokens || inputTokens;
            outputTokens = event.usage.completion_tokens || outputTokens;
          }

          // Finish reason
          const finishReason = event.choices?.[0]?.finish_reason;
          if (finishReason) {
            stopReason = mapOpenAIStopReason(finishReason);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Parse accumulated tool inputs
  for (const [index, input] of toolInputBuffers) {
    if (toolCalls[index]) {
      toolCalls[index].input = safeParseJSON(input);
    }
  }

  onChunk({ type: 'message_end', usage: { inputTokens, outputTokens } });

  return {
    id: responseId,
    content: fullContent,
    model,
    provider: 'openai',
    stopReason,
    usage: { inputTokens, outputTokens },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

function safeParseJSON(str: string | undefined): unknown {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
```

### Google

```typescript
// =============================================================================
// GOOGLE PROVIDER
// =============================================================================

export async function callGoogle(
  request: ChatRequest,
  apiKey: string,
  config: ProviderConfig,
  onChunk?: StreamCallback
): Promise<ChatResponse> {
  const body = buildGoogleRequest(request);
  const endpoint = request.stream
    ? `:streamGenerateContent?alt=sse&key=${apiKey}`
    : `:generateContent?key=${apiKey}`;

  const response = await fetch(`${config.baseUrl}/models/${request.model}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw parseErrorResponse('google', response.status, errorBody);
  }

  if (request.stream && onChunk) {
    return streamGoogleResponse(response, request, onChunk);
  }

  return parseGoogleResponse(await response.json(), request);
}

function buildGoogleRequest(request: ChatRequest): Record<string, unknown> {
  const contents = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: formatGoogleParts(m.content),
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: request.maxTokens || 4096,
    },
  };

  if (request.systemPrompt) {
    body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
  }

  if (request.temperature !== undefined) {
    (body.generationConfig as any).temperature = request.temperature;
  }

  if (request.topP !== undefined) {
    (body.generationConfig as any).topP = request.topP;
  }

  if (request.stopSequences && request.stopSequences.length > 0) {
    (body.generationConfig as any).stopSequences = request.stopSequences;
  }

  if (request.tools && request.tools.length > 0) {
    body.tools = [{
      functionDeclarations: request.tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      })),
    }];
  }

  return body;
}

function formatGoogleParts(content: string | ContentBlock[]): unknown[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  return content.map(block => {
    switch (block.type) {
      case 'text':
        return { text: block.text };

      case 'image':
        return {
          inlineData: {
            mimeType: block.source?.mediaType,
            data: block.source?.data,
          },
        };

      case 'tool_result':
        return {
          functionResponse: {
            name: block.tool_use_id,
            response: { content: block.content },
          },
        };

      default:
        return { text: '' };
    }
  });
}

function parseGoogleResponse(data: any, request: ChatRequest): ChatResponse {
  const candidate = data.candidates?.[0];
  let content = '';
  const toolCalls: ToolCall[] = [];

  for (const part of candidate?.content?.parts || []) {
    if (part.text) {
      content += part.text;
    } else if (part.functionCall) {
      toolCalls.push({
        id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: part.functionCall.name,
        input: part.functionCall.args,
      });
    }
  }

  return {
    id: `google_${Date.now()}`,
    content,
    model: request.model,
    provider: 'google',
    stopReason: mapGoogleStopReason(candidate?.finishReason),
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

function mapGoogleStopReason(reason: string): StopReason {
  switch (reason) {
    case 'STOP': return 'end_turn';
    case 'MAX_TOKENS': return 'max_tokens';
    case 'SAFETY':
    case 'RECITATION':
    case 'OTHER': return 'end_turn';
    default: return 'end_turn';
  }
}

// streamGoogleResponse follows similar pattern to Anthropic/OpenAI
// Omitted for brevity - same structure with Google-specific event parsing
```

---

## AIProvider Class

```typescript
// =============================================================================
// AI PROVIDER SERVICE
// =============================================================================

import { Result, ok, err } from '../utils/result';
import { AppError } from '../utils/errors';

export class AIProvider {
  private configs: Map<ProviderType, ProviderConfig> = new Map();
  private apiKeys: Map<ProviderType, string> = new Map();

  constructor() {
    // Initialize with default configs
    for (const [type, config] of Object.entries(PROVIDER_CONFIGS)) {
      this.configs.set(type as ProviderType, config);
    }
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider: ProviderType, apiKey: string): void {
    this.apiKeys.set(provider, apiKey);
  }

  /**
   * Check if provider has API key configured
   */
  hasApiKey(provider: ProviderType): boolean {
    return this.apiKeys.has(provider) && !!this.apiKeys.get(provider);
  }

  /**
   * Get provider configuration
   */
  getConfig(provider: ProviderType): ProviderConfig | undefined {
    return this.configs.get(provider);
  }

  /**
   * Update provider configuration
   */
  updateConfig(provider: ProviderType, updates: Partial<ProviderConfig>): void {
    const current = this.configs.get(provider);
    if (current) {
      this.configs.set(provider, { ...current, ...updates });
    }
  }

  /**
   * Get available models for a provider
   */
  getModels(provider: ProviderType): ModelConfig[] {
    return this.configs.get(provider)?.models || [];
  }

  /**
   * Send chat request with automatic retry
   */
  async chat(
    request: ChatRequest,
    onChunk?: StreamCallback
  ): Promise<Result<ChatResponse, AppError>> {
    const config = this.configs.get(request.provider);
    if (!config) {
      return err(AppError.validation(`Unknown provider: ${request.provider}`));
    }

    if (!config.enabled) {
      return err(AppError.validation(`Provider ${request.provider} is not enabled`));
    }

    const apiKey = this.apiKeys.get(request.provider);
    if (!apiKey) {
      return err(AppError.unauthorized(`No API key for ${request.provider}`));
    }

    try {
      const response = await withRetry(
        async () => {
          switch (request.provider) {
            case 'anthropic':
              return callAnthropic(request, apiKey, config, onChunk);
            case 'openai':
              return callOpenAI(request, apiKey, config, onChunk);
            case 'google':
              return callGoogle(request, apiKey, config, onChunk);
            default:
              throw { code: 'UNKNOWN', message: `Unknown provider`, provider: request.provider, retryable: false };
          }
        },
        DEFAULT_RETRY_CONFIG,
        (error) => error.retryable && !request.signal?.aborted
      );

      return ok(response);
    } catch (error) {
      const aiError = error as AIError;

      // Map to AppError
      switch (aiError.code) {
        case 'AUTHENTICATION_ERROR':
          return err(AppError.unauthorized(aiError.message));
        case 'RATE_LIMITED':
          return err(AppError.rateLimited(aiError.message));
        case 'INVALID_REQUEST':
        case 'CONTEXT_LENGTH_EXCEEDED':
          return err(AppError.validation(aiError.message));
        case 'ABORTED':
          return err(AppError.aborted(aiError.message));
        default:
          return err(AppError.internal(aiError.message, error));
      }
    }
  }

  /**
   * Estimate token count for messages (rough estimate)
   */
  estimateTokens(messages: ChatMessage[]): number {
    let chars = 0;
    for (const m of messages) {
      if (typeof m.content === 'string') {
        chars += m.content.length;
      } else {
        for (const block of m.content) {
          if (block.type === 'text') {
            chars += block.text?.length || 0;
          }
        }
      }
    }
    // Rough estimate: ~4 chars per token
    return Math.ceil(chars / 4);
  }

  /**
   * Calculate cost estimate for a response
   */
  estimateCost(
    provider: ProviderType,
    modelId: string,
    usage: TokenUsage
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const model = this.getModels(provider).find(m => m.id === modelId);
    if (!model) {
      return { inputCost: 0, outputCost: 0, totalCost: 0 };
    }

    const inputCost = (usage.inputTokens / 1000000) * model.inputPricePerMillion;
    const outputCost = (usage.outputTokens / 1000000) * model.outputPricePerMillion;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }
}
```

---

## WebSocket Handlers

```typescript
// =============================================================================
// AI WEBSOCKET HANDLERS
// =============================================================================

import type { WebSocketServer } from '../ws/server';
import type { AIProvider } from './ai-provider';
import type { ChatRequest, StreamChunk } from '../types';

export function registerAIHandlers(ws: WebSocketServer, provider: AIProvider): void {
  // Non-streaming chat
  ws.onRequest('ai:chat', async (request: ChatRequest) => {
    const result = await provider.chat({ ...request, stream: false });
    if (!result.ok) throw result.error;
    return result.value;
  });

  // Streaming chat
  ws.onRequest('ai:chat-stream', async (request: ChatRequest, { emit, requestId }) => {
    const result = await provider.chat(
      { ...request, stream: true, requestId },
      (chunk: StreamChunk) => {
        emit('ai:stream-chunk', { requestId, chunk });
      }
    );

    if (!result.ok) {
      emit('ai:stream-error', { requestId, error: result.error.message });
      throw result.error;
    }

    emit('ai:stream-complete', { requestId, response: result.value });
    return result.value;
  });

  // Get models
  ws.onRequest('ai:models', async ({ provider: providerType }) => {
    return provider.getModels(providerType);
  });

  // Check credentials
  ws.onRequest('ai:has-credentials', async ({ provider: providerType }) => {
    return provider.hasApiKey(providerType);
  });

  // Estimate tokens
  ws.onRequest('ai:estimate-tokens', async ({ messages }) => {
    return provider.estimateTokens(messages);
  });
}
```

---

## Usage Examples

### Basic Chat

```typescript
const provider = new AIProvider();
provider.setApiKey('anthropic', process.env.ANTHROPIC_API_KEY!);

const result = await provider.chat({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  systemPrompt: 'You are a helpful assistant.',
  maxTokens: 1024,
});

if (result.ok) {
  console.log(result.value.content);
}
```

### Streaming

```typescript
const result = await provider.chat(
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: 'Write a story' }],
    stream: true,
  },
  (chunk) => {
    if (chunk.type === 'text') {
      process.stdout.write(chunk.text!);
    }
  }
);
```

### Tool Calling

```typescript
const result = await provider.chat({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'What is the weather in Paris?' }],
  tools: [{
    name: 'get_weather',
    description: 'Get current weather for a location',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
      },
      required: ['location'],
    },
  }],
});

if (result.ok && result.value.toolCalls) {
  for (const call of result.value.toolCalls) {
    console.log(`Tool: ${call.name}, Input:`, call.input);
  }
}
```

### Multi-Modal (Images)

```typescript
import { readFileSync } from 'fs';

const imageData = readFileSync('image.png').toString('base64');

const result = await provider.chat({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      {
        type: 'image',
        source: {
          type: 'base64',
          mediaType: 'image/png',
          data: imageData,
        },
      },
    ],
  }],
});
```

---

## Key Design Decisions

1. **Raw Fetch** - No SDK dependencies for full control
2. **Unified Types** - Same interfaces across all providers
3. **Streaming First** - SSE parsing built-in with proper cleanup
4. **Retry Logic** - Exponential backoff with jitter
5. **Error Mapping** - Provider errors mapped to app errors
6. **Abort Support** - AbortSignal passed through all calls
7. **Cost Tracking** - Token usage and pricing per model
