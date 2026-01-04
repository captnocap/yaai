import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatId, MessageId } from '../types'

export interface ModelConfig {
  model: string
  provider: string
}

export interface ModelStreamStatus {
  model: string
  provider: string
  status: 'pending' | 'streaming' | 'complete' | 'error'
  content: string
  usage: { inputTokens: number; outputTokens: number }
  error?: string
  messageId?: MessageId
}

export interface UseParallelAIOptions {
  chatId: ChatId
  onComplete?: (responseGroupId: string, messageIds: MessageId[]) => void
  onError?: (error: string) => void
}

export interface UseParallelAIReturn {
  streamingStatuses: ModelStreamStatus[]
  isStreaming: boolean
  sendParallel: (
    userMessageId: MessageId,
    messages: Array<{ role: string; content: string }>,
    models: ModelConfig[]
  ) => Promise<void>
  cancel: () => void
  selectResponse: (responseGroupId: string, messageId: MessageId) => Promise<void>
}

/**
 * Hook for managing parallel AI streaming requests
 * Handles status updates, chunk streaming, and response selection
 */
export function useParallelAI(options?: UseParallelAIOptions): UseParallelAIReturn {
  const { chatId, onComplete, onError } = options || {}

  const [streamingStatuses, setStreamingStatuses] = useState<ModelStreamStatus[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const currentRequestId = useRef<string | null>(null)

  // Mock WebSocket integration - in real app would use actual WebSocket
  const sendMessage = useCallback(
    async (channel: string, data: unknown) => {
      console.log(`[useParallelAI] ${channel}`, data)
      // In real implementation, would send via WebSocket
      return Promise.resolve()
    },
    []
  )

  const onMessage = useCallback(
    (pattern: string, callback: (data: any) => void) => {
      // In real implementation, would subscribe to WebSocket events
      // For now, return a no-op unsubscribe function
      return () => {}
    },
    []
  )

  // ==========================================================================
  // WebSocket Event Listeners
  // ==========================================================================

  useEffect(() => {
    const unsubStatus = onMessage(`ai:parallel-status:`, (data: any) => {
      if (!currentRequestId.current || !data?.requestId?.includes(currentRequestId.current)) return
      setStreamingStatuses(data?.models || [])
    })

    const unsubComplete = onMessage(`ai:parallel-complete:`, (data: any) => {
      if (!currentRequestId.current || !data?.requestId?.includes(currentRequestId.current)) return

      setIsStreaming(false)
      const reqId = currentRequestId.current
      currentRequestId.current = null
      onComplete?.(data.responseGroupId, data.messageIds)
    })

    const unsubError = onMessage(`ai:parallel-error:`, (data: any) => {
      if (!currentRequestId.current || !data?.requestId?.includes(currentRequestId.current)) return

      setIsStreaming(false)
      const reqId = currentRequestId.current
      currentRequestId.current = null
      onError?.(data.error)
    })

    const unsubCancelled = onMessage(`ai:parallel-cancelled:`, (data: any) => {
      if (!currentRequestId.current || !data?.requestId?.includes(currentRequestId.current)) return

      setIsStreaming(false)
      currentRequestId.current = null
    })

    return () => {
      unsubStatus()
      unsubComplete()
      unsubError()
      unsubCancelled()
    }
  }, [onComplete, onError, onMessage])

  // ==========================================================================
  // Operations
  // ==========================================================================

  const sendParallel = useCallback(
    async (
      userMessageId: MessageId,
      messages: Array<{ role: string; content: string }>,
      models: ModelConfig[]
    ) => {
      const requestId = `parallel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      currentRequestId.current = requestId

      setIsStreaming(true)
      setStreamingStatuses(
        models.map(m => ({
          model: m.model,
          provider: m.provider,
          status: 'pending' as const,
          content: '',
          usage: { inputTokens: 0, outputTokens: 0 },
        }))
      )

      try {
        await sendMessage('ai:parallel-chat-stream', {
          requestId,
          chatId,
          userMessageId,
          messages,
          models,
        })
      } catch (err) {
        setIsStreaming(false)
        currentRequestId.current = null
        throw err
      }
    },
    [chatId, sendMessage]
  )

  const cancel = useCallback(() => {
    if (currentRequestId.current) {
      sendMessage('ai:parallel-cancel', { requestId: currentRequestId.current }).catch(() => {})
      currentRequestId.current = null
      setIsStreaming(false)
    }
  }, [sendMessage])

  const selectResponse = useCallback(
    async (responseGroupId: string, messageId: MessageId) => {
      await sendMessage('parallel:select-response', {
        responseGroupId,
        messageId,
      })
    },
    [sendMessage]
  )

  return {
    streamingStatuses,
    isStreaming,
    sendParallel,
    cancel,
    selectResponse,
  }
}
