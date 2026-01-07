// =============================================================================
// MEMORY HANDLERS
// =============================================================================
// WebSocket handlers for the M3A memory system.

import {
  MemoryStore,
  consolidate,
  type MemoryQuery,
  type CurationRequest,
  type MemoryConfig
} from '../../memory'
import { logger, type ChatId, type MessageId, type CurationAction } from '../../core'

const log = logger.child({ module: 'ws-memory' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
  broadcast(channel: string, data: unknown): void
}

/**
 * Register memory handlers with the WebSocket server
 */
export function registerMemoryHandlers(wsServer: WSServer): void {
  // ---------------------------------------------------------------------------
  // Retrieval
  // ---------------------------------------------------------------------------

  /**
   * Retrieve memories using ensemble scoring
   * Channel: memory:retrieve
   */
  wsServer.onRequest('memory:retrieve', async (payload) => {
    const { query, chatId, topK, layers, affectBoost, temporalBias } = payload as {
      query: string
      chatId: string
      topK?: number
      layers?: string[]
      affectBoost?: string[]
      temporalBias?: 'recent' | 'salient' | 'balanced'
    }

    log.debug('Retrieving memories', { chatId, query: query.slice(0, 50) })

    const memoryQuery: MemoryQuery = {
      query,
      chatId: chatId as ChatId,
      topK,
      layers: layers as any,
      affectBoost: affectBoost as any,
      temporalBias
    }

    // Note: For full functionality, we'd need to generate a query embedding here
    // This requires access to the embedding credentials
    const result = await MemoryStore.retrieve(memoryQuery)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { memories: result.value }
  })

  /**
   * Search lexical index only (fast text search)
   * Channel: memory:search-lexical
   */
  wsServer.onRequest('memory:search-lexical', async (payload) => {
    const { query, chatId, topK } = payload as {
      query: string
      chatId: string
      topK?: number
    }

    const result = MemoryStore.searchLexical(chatId as ChatId, query, topK)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { results: result.value }
  })

  // ---------------------------------------------------------------------------
  // Curation
  // ---------------------------------------------------------------------------

  /**
   * Apply curation action to a message
   * Channel: memory:curate
   */
  wsServer.onRequest('memory:curate', async (payload) => {
    const { messageId, chatId, action, metadata } = payload as CurationRequest & { chatId: string }

    log.info('Curating memory', { messageId, chatId, action })

    switch (action) {
      case 'PIN': {
        // Need to get content for the message
        // For now, we'll require content in the payload for PIN
        const content = (payload as any).content as string
        if (!content) {
          throw new Error('Content required for PIN action')
        }

        const result = MemoryStore.pinMessage(chatId as ChatId, messageId as MessageId, content)
        if (!result.ok) {
          throw new Error(result.error.message)
        }

        wsServer.broadcast('memory:pinned', {
          chatId,
          messageId,
          entry: result.value
        })

        return { success: true, entry: result.value }
      }

      case 'IMPORTANT': {
        const factor = metadata?.boostFactor ?? 2.0
        const result = MemoryStore.boostL3Encoding(messageId as MessageId, factor)
        if (!result.ok) {
          throw new Error(result.error.message)
        }

        wsServer.broadcast('memory:boosted', { chatId, messageId })

        return { success: true }
      }

      case 'MUTE': {
        const result = MemoryStore.muteMessage(messageId as MessageId)
        if (!result.ok) {
          throw new Error(result.error.message)
        }

        wsServer.broadcast('memory:muted', {
          chatId,
          messageId,
          affectedLayers: result.value
        })

        return { success: true, affectedLayers: result.value }
      }

      case 'AFFECT_TAG': {
        if (!metadata?.affectTag || metadata?.affectIntensity === undefined) {
          throw new Error('Affect tag requires affectTag and affectIntensity metadata')
        }

        const result = MemoryStore.addAffectEntry(
          chatId as ChatId,
          messageId as MessageId,
          metadata.affectTag,
          metadata.affectIntensity,
          metadata.reason
        )
        if (!result.ok) {
          throw new Error(result.error.message)
        }

        wsServer.broadcast('memory:affect-tagged', {
          chatId,
          messageId,
          entry: result.value
        })

        return { success: true, entry: result.value }
      }

      default:
        throw new Error(`Unknown curation action: ${action}`)
    }
  })

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get memory statistics for a chat
   * Channel: memory:stats
   */
  wsServer.onRequest('memory:stats', async (payload) => {
    const { chatId } = payload as { chatId: string }

    const result = MemoryStore.getStats(chatId as ChatId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  /**
   * Get L1 river statistics
   * Channel: memory:river-stats
   */
  wsServer.onRequest('memory:river-stats', async (payload) => {
    const { chatId } = payload as { chatId: string }

    const result = MemoryStore.getRiverStats(chatId as ChatId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Get memory configuration
   * Channel: memory:config-get
   */
  wsServer.onRequest('memory:config-get', async () => {
    const result = MemoryStore.getConfig()

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  /**
   * Update memory configuration
   * Channel: memory:config-update
   */
  wsServer.onRequest('memory:config-update', async (payload) => {
    const updates = payload as Partial<MemoryConfig>

    log.info('Updating memory config', { updates })

    const result = MemoryStore.updateConfig(updates)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    // Get updated config
    const configResult = MemoryStore.getConfig()

    wsServer.broadcast('memory:config-updated', configResult.ok ? configResult.value : updates)

    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // Consolidation
  // ---------------------------------------------------------------------------

  /**
   * Trigger manual consolidation
   * Channel: memory:consolidate
   */
  wsServer.onRequest('memory:consolidate', async (payload) => {
    const { chatId } = payload as { chatId: string }

    log.info('Manual consolidation triggered', { chatId })

    const result = await consolidate(chatId as ChatId, 'manual')

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    wsServer.broadcast('memory:consolidation-complete', {
      chatId,
      run: result.value
    })

    return { success: true, run: result.value }
  })

  // ---------------------------------------------------------------------------
  // L2 Affect
  // ---------------------------------------------------------------------------

  /**
   * Get affect entries for a chat
   * Channel: memory:affect-list
   */
  wsServer.onRequest('memory:affect-list', async (payload) => {
    const { chatId, category, minIntensity, limit } = payload as {
      chatId: string
      category?: string
      minIntensity?: number
      limit?: number
    }

    const result = MemoryStore.getAffectEntries(chatId as ChatId, {
      category: category as any,
      minIntensity,
      limit
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { entries: result.value }
  })

  // ---------------------------------------------------------------------------
  // L4 Salience
  // ---------------------------------------------------------------------------

  /**
   * Get salient (important) memories
   * Channel: memory:salience-list
   */
  wsServer.onRequest('memory:salience-list', async (payload) => {
    const { chatId, minScore, pinnedOnly, limit } = payload as {
      chatId: string
      minScore?: number
      pinnedOnly?: boolean
      limit?: number
    }

    const result = MemoryStore.getSalienceEntries(chatId as ChatId, {
      minScore,
      pinnedOnly,
      limit
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { entries: result.value }
  })

  /**
   * Get pinned memories only
   * Channel: memory:pinned-list
   */
  wsServer.onRequest('memory:pinned-list', async (payload) => {
    const { chatId } = payload as { chatId: string }

    const result = MemoryStore.getSalienceEntries(chatId as ChatId, {
      pinnedOnly: true
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { entries: result.value }
  })

  // ---------------------------------------------------------------------------
  // L5 Graph
  // ---------------------------------------------------------------------------

  /**
   * Get related entities from the knowledge graph
   * Channel: memory:related-entities
   */
  wsServer.onRequest('memory:related-entities', async (payload) => {
    const { entityValue, chatId, hops } = payload as {
      entityValue: string
      chatId?: string
      hops?: number
    }

    const result = MemoryStore.getRelatedEntities(
      entityValue,
      chatId ? chatId as ChatId : undefined,
      hops
    )

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { entities: result.value }
  })

  // ---------------------------------------------------------------------------
  // Recent Context (L1)
  // ---------------------------------------------------------------------------

  /**
   * Get recent context from L1 river
   * Channel: memory:recent
   */
  wsServer.onRequest('memory:recent', async (payload) => {
    const { chatId, limit } = payload as {
      chatId: string
      limit?: number
    }

    const result = MemoryStore.getRiverEntries(chatId as ChatId, limit)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { entries: result.value }
  })

  log.info('Memory handlers registered')
}
