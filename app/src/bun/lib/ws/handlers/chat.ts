// =============================================================================
// CHAT HANDLERS
// =============================================================================
// WebSocket handlers for chat and message management.

import { ChatStore } from '../../stores/chat-store'
import { logger, type ChatId, type MessageId } from '../../core'
import type {
  CreateChatInput,
  UpdateChatInput,
  CreateMessageInput,
  UpdateMessageInput,
  ListChatsOptions,
  ListMessagesOptions,
  SearchMessagesOptions,
  ContentBlock,
} from '../../stores/chat-store.types'

const log = logger.child({ module: 'ws-chat' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
  broadcast(channel: string, data: unknown): void
}

/**
 * Register chat handlers with the WebSocket server
 */
export function registerChatHandlers(wsServer: WSServer): void {
  // ---------------------------------------------------------------------------
  // Chat CRUD
  // ---------------------------------------------------------------------------

  // List chats with optional search
  wsServer.onRequest('chat:list', async (payload) => {
    const options = payload as ListChatsOptions | undefined

    const result = ChatStore.listChats(options)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Get a single chat by ID
  wsServer.onRequest('chat:get', async (payload) => {
    const { chatId } = payload as { chatId: string }

    const result = ChatStore.getChatWithStats(chatId as ChatId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Create a new chat
  wsServer.onRequest('chat:create', async (payload) => {
    const input = payload as CreateChatInput

    log.info('Creating chat', { title: input.title })
    const result = ChatStore.createChat(input)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    // Broadcast to other clients
    wsServer.broadcast('chat:created', result.value)

    return result.value
  })

  // Update a chat
  wsServer.onRequest('chat:update', async (payload) => {
    const { chatId, ...input } = payload as { chatId: string } & UpdateChatInput

    log.info('Updating chat', { chatId })
    const result = ChatStore.updateChat(chatId as ChatId, input)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('chat:updated', result.value)
    }

    return result.value
  })

  // Delete a chat
  wsServer.onRequest('chat:delete', async (payload) => {
    const { chatId } = payload as { chatId: string }

    log.info('Deleting chat', { chatId })
    const result = ChatStore.deleteChat(chatId as ChatId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('chat:deleted', { chatId })
    }

    return { success: result.value }
  })

  // ---------------------------------------------------------------------------
  // Message CRUD
  // ---------------------------------------------------------------------------

  // Get messages for a chat
  wsServer.onRequest('chat:get-messages', async (payload) => {
    const { chatId, ...options } = payload as { chatId: string } & ListMessagesOptions

    const result = ChatStore.getMessages(chatId as ChatId, options)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Add a message to a chat
  wsServer.onRequest('chat:add-message', async (payload) => {
    const { chatId, role, content, model, tokenCount, generationTime, branchId, parentId, metadata } = payload as {
      chatId: string
      role: 'user' | 'assistant' | 'system'
      content: ContentBlock[] | string
      model?: string
      tokenCount?: number
      generationTime?: number
      branchId?: string
      parentId?: string
      metadata?: Record<string, unknown>
    }

    // Normalize content to ContentBlock[]
    const normalizedContent: ContentBlock[] = typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : content

    const input: CreateMessageInput = {
      chatId: chatId as ChatId,
      role,
      content: normalizedContent,
      model,
      tokenCount,
      generationTime,
      branchId,
      parentId: parentId as MessageId | undefined,
      metadata,
    }

    const result = ChatStore.addMessage(input)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    wsServer.broadcast('chat:message-added', result.value)

    return result.value
  })

  // Update a message
  wsServer.onRequest('chat:update-message', async (payload) => {
    const { messageId, ...input } = payload as { messageId: string } & UpdateMessageInput

    const result = ChatStore.updateMessage(messageId as MessageId, input)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('chat:message-updated', result.value)
    }

    return result.value
  })

  // Delete a message
  wsServer.onRequest('chat:delete-message', async (payload) => {
    const { messageId } = payload as { messageId: string }

    const result = ChatStore.deleteMessage(messageId as MessageId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (result.value) {
      wsServer.broadcast('chat:message-deleted', { messageId })
    }

    return { success: result.value }
  })

  // Clear all messages in a chat
  wsServer.onRequest('chat:clear-messages', async (payload) => {
    const { chatId } = payload as { chatId: string }

    log.info('Clearing messages', { chatId })
    const result = ChatStore.clearMessages(chatId as ChatId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    wsServer.broadcast('chat:messages-cleared', { chatId })

    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // Utility Operations
  // ---------------------------------------------------------------------------

  // Toggle like on a message
  wsServer.onRequest('chat:toggle-like', async (payload) => {
    const { messageId } = payload as { messageId: string }

    const result = ChatStore.toggleMessageLike(messageId as MessageId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    wsServer.broadcast('chat:message-liked', { messageId, isLiked: result.value })

    return { isLiked: result.value }
  })

  // Full-text search across messages
  wsServer.onRequest('chat:search', async (payload) => {
    const options = payload as SearchMessagesOptions

    const result = ChatStore.searchMessages(options)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // ---------------------------------------------------------------------------
  // Branch Operations
  // ---------------------------------------------------------------------------

  // Get branches for a chat
  wsServer.onRequest('chat:get-branches', async (payload) => {
    const { chatId } = payload as { chatId: string }

    const result = ChatStore.getBranches(chatId as ChatId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Create a new branch
  wsServer.onRequest('chat:create-branch', async (payload) => {
    const { chatId, forkMessageId, parentBranchId, name } = payload as {
      chatId: string
      forkMessageId: string
      parentBranchId?: string
      name?: string
    }

    const result = ChatStore.createBranch({
      chatId: chatId as ChatId,
      forkMessageId: forkMessageId as MessageId,
      parentBranchId,
      name,
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    wsServer.broadcast('chat:branch-created', result.value)

    return result.value
  })

  log.info('Chat handlers registered')
}
