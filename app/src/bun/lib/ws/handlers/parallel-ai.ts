// =============================================================================
// PARALLEL AI HANDLERS
// =============================================================================
// WebSocket handlers for parallel multi-model AI requests and response selection.

import { ChatStore } from '../../stores/chat-store'
import { ResponseGroupStore } from '../../stores/response-group-store'
import { CredentialStore } from '../../stores/credential-store'
import { logger, type ChatId, type MessageId, type ProviderFormat } from '../../core'
import type { ContentBlock, CreateMessageInput } from '../../stores/chat-store.types'
import type { ResponseGroupId } from '../../stores/response-group-store.types'

const log = logger.child({ module: 'ws-parallel-ai' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
  broadcast(channel: string, data: unknown): void
  send(clientId: string, channel: string, data: unknown): void
}

// =============================================================================
// Types
// =============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

interface ModelTarget {
  model: string
  provider: string
}

interface ParallelChatRequest {
  requestId?: string
  chatId: string
  userMessageId: string
  messages: ChatMessage[]
  models: ModelTarget[]
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

interface StreamChunk {
  type: 'text' | 'tool_use_start' | 'tool_use_input' | 'message_start' | 'message_end'
  text?: string
  toolCall?: { id?: string; name?: string; input?: unknown }
  usage?: { inputTokens?: number; outputTokens?: number }
}

interface ModelStreamStatus {
  model: string
  provider: string
  status: 'pending' | 'streaming' | 'complete' | 'error'
  content: string
  usage: { inputTokens: number; outputTokens: number }
  error?: string
  messageId?: MessageId
}

// Track active parallel requests
const activeParallelRequests = new Map<string, Map<string, AbortController>>()

// =============================================================================
// Handlers Registration
// =============================================================================

export function registerParallelAIHandlers(wsServer: WSServer): void {
  /**
   * Parallel streaming to multiple models simultaneously
   * Each model is called independently and can fail without affecting others
   */
  wsServer.onRequest('ai:parallel-chat-stream', async (payload) => {
    const request = payload as ParallelChatRequest
    const requestId = request.requestId || `parallel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    log.info('Parallel AI chat stream request', {
      requestId,
      modelCount: request.models.length,
      chatId: request.chatId,
    })

    const modelControllers = new Map<string, AbortController>()
    activeParallelRequests.set(requestId, modelControllers)

    const modelStatuses: ModelStreamStatus[] = request.models.map(m => ({
      model: m.model,
      provider: m.provider,
      status: 'pending' as const,
      content: '',
      usage: { inputTokens: 0, outputTokens: 0 },
    }))

    // Broadcast initial status
    wsServer.broadcast(`ai:parallel-status:${requestId}`, { requestId, models: modelStatuses })

    try {
      // Launch all model requests in parallel
      const modelPromises = request.models.map(async (modelConfig, index) => {
        const modelKey = `${modelConfig.provider}:${modelConfig.model}`
        const controller = new AbortController()
        modelControllers.set(modelKey, controller)

        modelStatuses[index].status = 'streaming'
        wsServer.broadcast(`ai:parallel-status:${requestId}`, { requestId, models: modelStatuses })

        try {
          // Get credentials
          const credResult = CredentialStore.getCredential(modelConfig.provider)
          if (!credResult.ok || !credResult.value) {
            throw new Error(`No credentials configured for provider: ${modelConfig.provider}`)
          }

          const credential = credResult.value

          // Call the provider (using simplified streaming for now)
          // In production, would reuse callProvider from ai.ts
          const result = await callProviderDirect(
            credential.format,
            credential.baseUrl || getDefaultBaseUrl(credential.format),
            credential.apiKey,
            {
              ...request,
              model: modelConfig.model,
              provider: modelConfig.provider,
              stream: true,
            },
            (chunk: StreamChunk) => {
              // Stream chunk to frontend for this specific model
              wsServer.broadcast(`ai:parallel-chunk:${requestId}:${modelKey}`, {
                requestId,
                modelKey,
                chunk,
              })

              if (chunk.type === 'text' && chunk.text) {
                modelStatuses[index].content += chunk.text
              }
              if (chunk.usage) {
                modelStatuses[index].usage = chunk.usage
              }
            },
            controller.signal
          )

          // Save assistant message
          const messageResult = ChatStore.addMessage({
            chatId: request.chatId as ChatId,
            role: 'assistant',
            content: [{ type: 'text', text: result.content }] as ContentBlock[],
            model: modelConfig.model,
            tokenCount: result.usage.inputTokens + result.usage.outputTokens,
            metadata: {
              provider: modelConfig.provider,
              format: credential.format,
              generationTime: Date.now(),
            },
          })

          if (!messageResult.ok) {
            throw new Error(`Failed to save message: ${messageResult.error.message}`)
          }

          modelStatuses[index].status = 'complete'
          modelStatuses[index].content = result.content
          modelStatuses[index].usage = result.usage
          modelStatuses[index].messageId = messageResult.value.id

          wsServer.broadcast(`ai:parallel-status:${requestId}`, { requestId, models: modelStatuses })

          return messageResult.value.id as MessageId
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'

          if (controller.signal.aborted) {
            modelStatuses[index].status = 'error'
            modelStatuses[index].error = 'Cancelled by user'
          } else {
            modelStatuses[index].status = 'error'
            modelStatuses[index].error = errorMsg
          }

          wsServer.broadcast(`ai:parallel-status:${requestId}`, { requestId, models: modelStatuses })

          log.error('Model request failed', error instanceof Error ? error : undefined, { modelKey })
          return null
        }
      })

      // Wait for all models to complete (or fail independently)
      const messageIds = await Promise.all(modelPromises)
      const successfulMessageIds = messageIds.filter((id): id is MessageId => id !== null)

      if (successfulMessageIds.length === 0) {
        throw new Error('All model requests failed - at least one must succeed')
      }

      // Create response group
      const groupResult = ResponseGroupStore.createGroup({
        chatId: request.chatId as ChatId,
        userMessageId: request.userMessageId as MessageId,
        responseIds: successfulMessageIds,
        // Don't auto-select - let user choose
      })

      if (!groupResult.ok) {
        throw new Error(groupResult.error.message)
      }

      // Broadcast completion
      wsServer.broadcast(`ai:parallel-complete:${requestId}`, {
        requestId,
        responseGroupId: groupResult.value.id,
        messageIds: successfulMessageIds,
        successCount: successfulMessageIds.length,
        totalCount: request.models.length,
      })

      log.info('Parallel request completed', {
        requestId,
        successCount: successfulMessageIds.length,
        totalCount: request.models.length,
      })

      return {
        success: true,
        requestId,
        responseGroupId: groupResult.value.id,
        messageIds: successfulMessageIds,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      wsServer.broadcast(`ai:parallel-error:${requestId}`, {
        requestId,
        error: errorMsg,
      })
      throw error
    } finally {
      activeParallelRequests.delete(requestId)
    }
  })

  /**
   * Cancel a parallel streaming request
   */
  wsServer.onRequest('ai:parallel-cancel', async (payload) => {
    const { requestId } = payload as { requestId: string }

    const controllers = activeParallelRequests.get(requestId)
    if (controllers) {
      // Abort all model requests
      controllers.forEach(controller => controller.abort())
      activeParallelRequests.delete(requestId)

      wsServer.broadcast(`ai:parallel-cancelled:${requestId}`, { requestId })
      log.info('Parallel request cancelled', { requestId })
      return { success: true, cancelled: true }
    }

    log.warn('Cancel requested for non-existent request', { requestId })
    return { success: false, error: 'Request not found' }
  })

  /**
   * Select which response from a group continues the conversation
   */
  wsServer.onRequest('parallel:select-response', async (payload) => {
    const { responseGroupId, messageId } = payload as {
      responseGroupId: string
      messageId: string
    }

    const result = ResponseGroupStore.selectResponse({
      responseGroupId: responseGroupId as ResponseGroupId,
      messageId: messageId as MessageId,
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    // Broadcast selection to all clients
    wsServer.broadcast('parallel:response-selected', {
      responseGroupId,
      messageId,
    })

    log.info('Response selected', { responseGroupId, messageId })

    return { success: true, group: result.value }
  })

  log.info('Parallel AI handlers registered')
}

// =============================================================================
// Provider Call (Simplified)
// =============================================================================

async function callProviderDirect(
  format: ProviderFormat,
  baseUrl: string,
  apiKey: string,
  request: ParallelChatRequest & { model: string; provider: string; stream: boolean },
  onChunk?: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  // Placeholder implementation - in production would call actual provider APIs
  // For now, use a simple mock that returns quickly
  log.info('Calling provider', { format, model: request.model })

  // Simulate a small delay
  await new Promise(resolve => setTimeout(resolve, 100))

  const mockResponse = `Response from ${request.model}`
  onChunk?.({ type: 'text', text: mockResponse, usage: { inputTokens: 10, outputTokens: 20 } })

  return {
    content: mockResponse,
    usage: { inputTokens: 10, outputTokens: 20 },
  }
}

function getDefaultBaseUrl(format: ProviderFormat): string {
  const urls: Record<ProviderFormat, string> = {
    anthropic: 'https://api.anthropic.com/v1',
    openai: 'https://api.openai.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta',
  }
  return urls[format]
}
