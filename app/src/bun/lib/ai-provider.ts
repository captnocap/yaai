// =============================================================================
// AI PROVIDER SERVICE
// =============================================================================
// Unified interface for AI providers (Anthropic, OpenAI, Google).
// Handles streaming, tool calling, and token counting.

import { EventEmitter } from 'events';
import { getCredentialStore } from './credential-store';
import { getSettingsStore } from './settings-store';
import { httpClient } from './core';

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
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
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
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface StreamChunk {
  type: 'text' | 'tool_use_start' | 'tool_use_input' | 'message_start' | 'message_end';
  text?: string;
  toolCall?: Partial<ToolCall>;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export type StreamCallback = (chunk: StreamChunk) => void;

// -----------------------------------------------------------------------------
// PROVIDER IMPLEMENTATIONS
// -----------------------------------------------------------------------------

async function callAnthropic(
  request: ChatRequest,
  apiKey: string,
  onChunk?: StreamCallback
): Promise<ChatResponse> {
  const baseUrl = 'https://api.anthropic.com/v1';

  // Convert messages to Anthropic format
  const messages = request.messages.map(m => ({
    role: m.role === 'system' ? 'user' : m.role,
    content: typeof m.content === 'string' ? m.content : m.content.map(b => {
      if (b.type === 'text') return { type: 'text', text: b.text };
      if (b.type === 'image' && b.source) {
        return {
          type: 'image',
          source: b.source,
        };
      }
      return b;
    }),
  }));

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.7,
    stream: request.stream ?? false,
  };

  if (request.systemPrompt) {
    body.system = request.systemPrompt;
  }

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
  }

  const fetchResult = await httpClient.fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!fetchResult.ok) {
    throw new Error(`Anthropic API error: ${fetchResult.error?.code || 'UNKNOWN'} - ${fetchResult.error?.message || 'Unknown error'}`);
  }

  const response = fetchResult.value;

  if (request.stream && onChunk) {
    return await streamAnthropic(response, request, onChunk);
  }

  const data = await response.json();

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
    stopReason: data.stop_reason === 'end_turn' ? 'end_turn' :
                data.stop_reason === 'max_tokens' ? 'max_tokens' :
                data.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

async function streamAnthropic(
  response: Response,
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<ChatResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let responseId = '';
  let model = request.model;
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: ChatResponse['stopReason'] = 'end_turn';
  const toolCalls: ToolCall[] = [];

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

          if (event.type === 'message_start') {
            responseId = event.message?.id || '';
            model = event.message?.model || model;
            inputTokens = event.message?.usage?.input_tokens || 0;
            onChunk({ type: 'message_start' });
          } else if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta') {
              const text = event.delta.text || '';
              fullContent += text;
              onChunk({ type: 'text', text });
            } else if (event.delta?.type === 'input_json_delta') {
              // Tool input streaming
              onChunk({ type: 'tool_use_input', toolCall: { input: event.delta.partial_json } });
            }
          } else if (event.type === 'content_block_start') {
            if (event.content_block?.type === 'tool_use') {
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
          } else if (event.type === 'message_delta') {
            stopReason = event.delta?.stop_reason || 'end_turn';
            outputTokens = event.usage?.output_tokens || outputTokens;
          } else if (event.type === 'message_stop') {
            onChunk({ type: 'message_end', usage: { inputTokens, outputTokens } });
          }
        } catch (e) {
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

async function callOpenAI(
  request: ChatRequest,
  apiKey: string,
  onChunk?: StreamCallback
): Promise<ChatResponse> {
  const baseUrl = 'https://api.openai.com/v1';

  // Convert messages to OpenAI format
  const messages = request.messages.map(m => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    // Handle multi-modal
    return {
      role: m.role,
      content: m.content.map(b => {
        if (b.type === 'text') return { type: 'text', text: b.text };
        if (b.type === 'image' && b.source) {
          return {
            type: 'image_url',
            image_url: {
              url: b.source.type === 'url'
                ? b.source.url
                : `data:${b.source.mediaType};base64,${b.source.data}`,
            },
          };
        }
        return b;
      }),
    };
  });

  // Add system prompt as first message
  if (request.systemPrompt) {
    messages.unshift({ role: 'system', content: request.systemPrompt });
  }

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.7,
    stream: request.stream ?? false,
  };

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  const fetchResult = await httpClient.fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!fetchResult.ok) {
    throw new Error(`OpenAI API error: ${fetchResult.error?.code || 'UNKNOWN'} - ${fetchResult.error?.message || 'Unknown error'}`);
  }

  const response = fetchResult.value;

  if (request.stream && onChunk) {
    return await streamOpenAI(response, request, onChunk);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    id: data.id,
    content: choice?.message?.content || '',
    model: data.model,
    provider: 'openai',
    stopReason: choice?.finish_reason === 'stop' ? 'end_turn' :
                choice?.finish_reason === 'length' ? 'max_tokens' :
                choice?.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
    toolCalls: choice?.message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name,
      input: JSON.parse(tc.function?.arguments || '{}'),
    })),
  };
}

async function streamOpenAI(
  response: Response,
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<ChatResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let responseId = '';
  let model = request.model;
  let stopReason: ChatResponse['stopReason'] = 'end_turn';
  const toolCalls: ToolCall[] = [];

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
          if (delta?.content) {
            fullContent += delta.content;
            onChunk({ type: 'text', text: delta.content });
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = { id: tc.id || '', name: tc.function?.name || '', input: {} };
                  onChunk({ type: 'tool_use_start', toolCall: { id: tc.id, name: tc.function?.name } });
                }
                if (tc.function?.arguments) {
                  onChunk({ type: 'tool_use_input', toolCall: { input: tc.function.arguments } });
                }
              }
            }
          }

          const finishReason = event.choices?.[0]?.finish_reason;
          if (finishReason) {
            stopReason = finishReason === 'stop' ? 'end_turn' :
                        finishReason === 'length' ? 'max_tokens' :
                        finishReason === 'tool_calls' ? 'tool_use' : 'end_turn';
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk({ type: 'message_end' });

  return {
    id: responseId,
    content: fullContent,
    model,
    provider: 'openai',
    stopReason,
    usage: { inputTokens: 0, outputTokens: 0 }, // OpenAI streaming doesn't provide usage
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

async function callGoogle(
  request: ChatRequest,
  apiKey: string,
  onChunk?: StreamCallback
): Promise<ChatResponse> {
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  // Convert messages to Google format
  const contents = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: typeof m.content === 'string'
        ? [{ text: m.content }]
        : m.content.map(b => {
            if (b.type === 'text') return { text: b.text };
            if (b.type === 'image' && b.source) {
              return {
                inlineData: {
                  mimeType: b.source.mediaType,
                  data: b.source.data,
                },
              };
            }
            return {};
          }),
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    },
  };

  if (request.systemPrompt) {
    body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
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

  const streamSuffix = request.stream ? ':streamGenerateContent?alt=sse' : ':generateContent';
  const fetchResult = await httpClient.fetch(
    `${baseUrl}/models/${request.model}${streamSuffix}&key=${apiKey}`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );

  if (!fetchResult.ok) {
    throw new Error(`Google API error: ${fetchResult.error?.code || 'UNKNOWN'} - ${fetchResult.error?.message || 'Unknown error'}`);
  }

  const response = fetchResult.value;

  if (request.stream && onChunk) {
    return await streamGoogle(response, request, onChunk);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  let content = '';
  const toolCalls: ToolCall[] = [];

  for (const part of candidate?.content?.parts || []) {
    if (part.text) {
      content += part.text;
    } else if (part.functionCall) {
      toolCalls.push({
        id: `fc_${Date.now()}`,
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
    stopReason: candidate?.finishReason === 'STOP' ? 'end_turn' :
                candidate?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

async function streamGoogle(
  response: Response,
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<ChatResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let inputTokens = 0;
  let outputTokens = 0;
  const toolCalls: ToolCall[] = [];

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

        try {
          const event = JSON.parse(data);
          const candidate = event.candidates?.[0];

          for (const part of candidate?.content?.parts || []) {
            if (part.text) {
              fullContent += part.text;
              onChunk({ type: 'text', text: part.text });
            } else if (part.functionCall) {
              toolCalls.push({
                id: `fc_${Date.now()}`,
                name: part.functionCall.name,
                input: part.functionCall.args,
              });
              onChunk({
                type: 'tool_use_start',
                toolCall: { name: part.functionCall.name, input: part.functionCall.args },
              });
            }
          }

          if (event.usageMetadata) {
            inputTokens = event.usageMetadata.promptTokenCount || inputTokens;
            outputTokens = event.usageMetadata.candidatesTokenCount || outputTokens;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk({ type: 'message_end', usage: { inputTokens, outputTokens } });

  return {
    id: `google_${Date.now()}`,
    content: fullContent,
    model: request.model,
    provider: 'google',
    stopReason: 'end_turn',
    usage: { inputTokens, outputTokens },
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

// -----------------------------------------------------------------------------
// AI PROVIDER CLASS
// -----------------------------------------------------------------------------

export class AIProvider {
  private events = new EventEmitter();

  /**
   * Send a chat request to an AI provider
   */
  async chat(request: ChatRequest, onChunk?: StreamCallback): Promise<ChatResponse> {
    const credentialStore = getCredentialStore();
    const settingsStore = getSettingsStore();

    // Get provider settings
    const providerSettings = settingsStore.get<{ enabled: boolean; baseUrl?: string }>(
      `providers.${request.provider}`
    );

    if (!providerSettings?.enabled) {
      throw new Error(`Provider ${request.provider} is not enabled`);
    }

    // Get API key from credential store
    const credential = await credentialStore.get(request.provider);
    if (!credential?.token) {
      throw new Error(`No API key found for ${request.provider}. Please add your API key in settings.`);
    }

    // Route to appropriate provider
    switch (request.provider) {
      case 'anthropic':
        return await callAnthropic(request, credential.token, onChunk);
      case 'openai':
        return await callOpenAI(request, credential.token, onChunk);
      case 'google':
        return await callGoogle(request, credential.token, onChunk);
      default:
        throw new Error(`Unknown provider: ${request.provider}`);
    }
  }

  /**
   * Get available models for a provider
   */
  getModels(provider: ProviderType): { id: string; name: string; contextWindow: number }[] {
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
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
        ];
      case 'google':
        return [
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 1000000 },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1000000 },
          { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32000 },
        ];
      default:
        return [];
    }
  }

  /**
   * Check if a provider has valid credentials
   */
  async hasCredentials(provider: ProviderType): Promise<boolean> {
    const credentialStore = getCredentialStore();
    return await credentialStore.exists(provider);
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let aiProviderInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProvider();
  }
  return aiProviderInstance;
}
