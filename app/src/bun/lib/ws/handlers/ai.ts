// =============================================================================
// AI HANDLERS
// =============================================================================
// WebSocket handlers for AI chat, streaming, and model management.

import { ChatStore } from '../../stores/chat-store'
import { CredentialStore } from '../../stores/credential-store'
import { logger, type ChatId, type ProviderFormat } from '../../core'
import type { ContentBlock, CreateMessageInput } from '../../stores/chat-store.types'

const log = logger.child({ module: 'ws-ai' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
  broadcast(channel: string, data: unknown): void
  send(clientId: string, channel: string, data: unknown): void
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

interface AIChatRequest {
  chatId?: string
  messages: ChatMessage[]
  model: string
  provider: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

interface StreamChunk {
  type: 'text' | 'tool_use_start' | 'tool_use_input' | 'message_start' | 'message_end'
  text?: string
  toolCall?: { id?: string; name?: string; input?: unknown }
  usage?: { inputTokens?: number; outputTokens?: number }
}

// Track in-flight requests for cancellation
const activeRequests = new Map<string, AbortController>()

// Default base URLs
const DEFAULT_BASE_URLS: Record<ProviderFormat, string> = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
}

// -----------------------------------------------------------------------------
// Provider Implementations
// -----------------------------------------------------------------------------

async function callProvider(
  format: ProviderFormat,
  baseUrl: string,
  apiKey: string,
  request: AIChatRequest,
  onChunk?: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  switch (format) {
    case 'anthropic':
      return callAnthropic(baseUrl, apiKey, request, onChunk, signal)
    case 'openai':
      return callOpenAI(baseUrl, apiKey, request, onChunk, signal)
    case 'google':
      return callGoogle(baseUrl, apiKey, request, onChunk, signal)
    default:
      throw new Error(`Unsupported provider format: ${format}`)
  }
}

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  request: AIChatRequest,
  onChunk?: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  // Convert messages
  const messages = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : m.content.map(b => {
            if (b.type === 'text') return { type: 'text', text: b.text }
            if (b.type === 'image') {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: b.mimeType,
                  data: b.base64,
                },
              }
            }
            return { type: 'text', text: '' }
          }),
    }))

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.7,
    stream: request.stream ?? false,
  }

  if (request.systemPrompt) {
    body.system = request.systemPrompt
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  if (request.stream && onChunk) {
    return streamAnthropic(response, onChunk)
  }

  const data = await response.json()
  let content = ''
  for (const block of data.content || []) {
    if (block.type === 'text') content += block.text
  }

  return {
    content,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    },
  }
}

async function streamAnthropic(
  response: Response,
  onChunk: (chunk: StreamChunk) => void
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let inputTokens = 0
  let outputTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data)

          if (event.type === 'message_start') {
            inputTokens = event.message?.usage?.input_tokens || 0
            onChunk({ type: 'message_start' })
          } else if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta') {
              const text = event.delta.text || ''
              fullContent += text
              onChunk({ type: 'text', text })
            }
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage?.output_tokens || outputTokens
          } else if (event.type === 'message_stop') {
            onChunk({ type: 'message_end', usage: { inputTokens, outputTokens } })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { content: fullContent, usage: { inputTokens, outputTokens } }
}

async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  request: AIChatRequest,
  onChunk?: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const messages = request.messages.map(m => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content }
    }
    return {
      role: m.role,
      content: m.content.map(b => {
        if (b.type === 'text') return { type: 'text', text: b.text }
        if (b.type === 'image') {
          return {
            type: 'image_url',
            image_url: {
              url: b.url || `data:${b.mimeType};base64,${b.base64}`,
            },
          }
        }
        return { type: 'text', text: '' }
      }),
    }
  })

  if (request.systemPrompt) {
    messages.unshift({ role: 'system', content: request.systemPrompt })
  }

  const body: Record<string, unknown> = {
    model: request.model,
    messages,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.7,
    stream: request.stream ?? false,
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  if (request.stream && onChunk) {
    return streamOpenAI(response, onChunk)
  }

  const data = await response.json()
  const choice = data.choices?.[0]

  return {
    content: choice?.message?.content || '',
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  }
}

async function streamOpenAI(
  response: Response,
  onChunk: (chunk: StreamChunk) => void
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  onChunk({ type: 'message_start' })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data)
          const delta = event.choices?.[0]?.delta
          if (delta?.content) {
            fullContent += delta.content
            onChunk({ type: 'text', text: delta.content })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  onChunk({ type: 'message_end' })

  return { content: fullContent, usage: { inputTokens: 0, outputTokens: 0 } }
}

async function callGoogle(
  baseUrl: string,
  apiKey: string,
  request: AIChatRequest,
  onChunk?: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const contents = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: typeof m.content === 'string'
        ? [{ text: m.content }]
        : m.content.map(b => {
            if (b.type === 'text') return { text: b.text }
            if (b.type === 'image') {
              return {
                inlineData: {
                  mimeType: b.mimeType,
                  data: b.base64,
                },
              }
            }
            return {}
          }),
    }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
    },
  }

  if (request.systemPrompt) {
    body.systemInstruction = { parts: [{ text: request.systemPrompt }] }
  }

  const streamSuffix = request.stream ? ':streamGenerateContent?alt=sse' : ':generateContent'
  const response = await fetch(
    `${baseUrl}/models/${request.model}${streamSuffix}&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google API error: ${response.status} - ${error}`)
  }

  if (request.stream && onChunk) {
    return streamGoogle(response, onChunk)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]

  let content = ''
  for (const part of candidate?.content?.parts || []) {
    if (part.text) content += part.text
  }

  return {
    content,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  }
}

async function streamGoogle(
  response: Response,
  onChunk: (chunk: StreamChunk) => void
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let inputTokens = 0
  let outputTokens = 0

  onChunk({ type: 'message_start' })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)

        try {
          const event = JSON.parse(data)
          const candidate = event.candidates?.[0]

          for (const part of candidate?.content?.parts || []) {
            if (part.text) {
              fullContent += part.text
              onChunk({ type: 'text', text: part.text })
            }
          }

          if (event.usageMetadata) {
            inputTokens = event.usageMetadata.promptTokenCount || inputTokens
            outputTokens = event.usageMetadata.candidatesTokenCount || outputTokens
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  onChunk({ type: 'message_end', usage: { inputTokens, outputTokens } })

  return { content: fullContent, usage: { inputTokens, outputTokens } }
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/**
 * Register AI handlers with the WebSocket server
 */
export function registerAIHandlers(wsServer: WSServer): void {
  // Non-streaming chat request
  wsServer.onRequest('ai:chat', async (payload) => {
    const request = payload as AIChatRequest & { requestId?: string }
    const requestId = request.requestId || `req_${Date.now()}`

    log.info('AI chat request', { model: request.model, provider: request.provider })

    // Get credentials
    const credResult = CredentialStore.getCredential(request.provider)
    if (!credResult.ok) {
      throw new Error(credResult.error.message)
    }
    if (!credResult.value) {
      throw new Error(`No credentials found for provider: ${request.provider}`)
    }

    const credential = credResult.value
    const baseUrl = credential.baseUrl || DEFAULT_BASE_URLS[credential.format]

    // Create abort controller
    const controller = new AbortController()
    activeRequests.set(requestId, controller)

    try {
      const result = await callProvider(
        credential.format,
        baseUrl,
        credential.apiKey,
        { ...request, stream: false },
        undefined,
        controller.signal
      )

      // Save assistant message if chatId provided
      if (request.chatId) {
        const messageResult = ChatStore.addMessage({
          chatId: request.chatId as ChatId,
          role: 'assistant',
          content: [{ type: 'text', text: result.content }],
          model: request.model,
          tokenCount: result.usage.inputTokens + result.usage.outputTokens,
        })

        if (!messageResult.ok) {
          log.error('Failed to save assistant message', new Error(messageResult.error.message))
        }
      }

      return {
        content: result.content,
        usage: result.usage,
        model: request.model,
        provider: request.provider,
      }
    } finally {
      activeRequests.delete(requestId)
    }
  })

  // Streaming chat request
  wsServer.onRequest('ai:chat-stream', async (payload) => {
    const request = payload as AIChatRequest & { requestId: string; clientId?: string }
    const requestId = request.requestId || `req_${Date.now()}`

    log.info('AI chat stream request', { model: request.model, provider: request.provider, requestId })

    // Get credentials
    const credResult = CredentialStore.getCredential(request.provider)
    if (!credResult.ok) {
      throw new Error(credResult.error.message)
    }
    if (!credResult.value) {
      throw new Error(`No credentials found for provider: ${request.provider}`)
    }

    const credential = credResult.value
    const baseUrl = credential.baseUrl || DEFAULT_BASE_URLS[credential.format]

    // Create abort controller
    const controller = new AbortController()
    activeRequests.set(requestId, controller)

    let fullContent = ''
    let usage = { inputTokens: 0, outputTokens: 0 }

    try {
      const result = await callProvider(
        credential.format,
        baseUrl,
        credential.apiKey,
        { ...request, stream: true },
        (chunk) => {
          // Send chunk to client
          wsServer.broadcast(`ai:stream-chunk:${requestId}`, chunk)

          if (chunk.type === 'text' && chunk.text) {
            fullContent += chunk.text
          }
          if (chunk.usage) {
            usage = chunk.usage
          }
        },
        controller.signal
      )

      fullContent = result.content
      usage = result.usage

      // Save assistant message if chatId provided
      if (request.chatId) {
        const messageResult = ChatStore.addMessage({
          chatId: request.chatId as ChatId,
          role: 'assistant',
          content: [{ type: 'text', text: fullContent }],
          model: request.model,
          tokenCount: usage.inputTokens + usage.outputTokens,
        })

        if (!messageResult.ok) {
          log.error('Failed to save assistant message', new Error(messageResult.error.message))
        } else {
          // Broadcast the saved message
          wsServer.broadcast('chat:message-added', messageResult.value)
        }
      }

      // Send completion
      wsServer.broadcast(`ai:stream-complete:${requestId}`, {
        content: fullContent,
        usage,
        model: request.model,
        provider: request.provider,
      })

      return { success: true, requestId }
    } catch (error) {
      if (controller.signal.aborted) {
        wsServer.broadcast(`ai:stream-cancelled:${requestId}`, { requestId })
        return { success: false, cancelled: true, requestId }
      }

      wsServer.broadcast(`ai:stream-error:${requestId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      })

      throw error
    } finally {
      activeRequests.delete(requestId)
    }
  })

  // Cancel a streaming request
  wsServer.onRequest('ai:cancel', async (payload) => {
    const { requestId } = payload as { requestId: string }

    log.info('Cancelling AI request', { requestId })

    const controller = activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      activeRequests.delete(requestId)
      return { success: true, cancelled: true }
    }

    return { success: false, error: 'Request not found' }
  })

  // NOTE: ai:models handler is in models.ts (uses AppStore.getUserModels)

  log.info('AI handlers registered')
}
