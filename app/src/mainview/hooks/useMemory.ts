// =============================================================================
// USE MEMORY HOOK
// =============================================================================
// React hook for interacting with the M3A memory system.

import { useState, useCallback, useEffect } from 'react'
import { sendMessage, onMessage } from '../lib/comm-bridge'
import type {
  MemoryResult,
  MemoryQuery,
  MemoryStats,
  MemoryConfig,
  RiverEntry,
  RiverStats,
  AffectEntry,
  SalienceEntry,
  RelatedEntity,
  CurationAction,
  AffectCategory,
  ConsolidationRun,
  MemoryLayer
} from '../types/memory'

// =============================================================================
// TYPES
// =============================================================================

export interface UseMemoryReturn {
  // State
  memories: MemoryResult[]
  stats: MemoryStats | null
  config: MemoryConfig | null
  loading: boolean
  error: string | null

  // Retrieval
  retrieve: (query: MemoryQuery) => Promise<MemoryResult[]>
  searchLexical: (chatId: string, query: string, topK?: number) => Promise<Array<{
    messageId: string
    content: string
    score: number
  }>>
  getRecent: (chatId: string, limit?: number) => Promise<RiverEntry[]>

  // Curation
  pinMemory: (chatId: string, messageId: string, content: string) => Promise<void>
  markImportant: (chatId: string, messageId: string, boostFactor?: number) => Promise<void>
  muteMemory: (chatId: string, messageId: string) => Promise<MemoryLayer[]>
  tagAffect: (
    chatId: string,
    messageId: string,
    category: AffectCategory,
    intensity: number,
    reason?: string
  ) => Promise<void>

  // L2 Affect
  getAffectEntries: (chatId: string, options?: {
    category?: AffectCategory
    minIntensity?: number
    limit?: number
  }) => Promise<AffectEntry[]>

  // L4 Salience
  getSalienceEntries: (chatId: string, options?: {
    minScore?: number
    pinnedOnly?: boolean
    limit?: number
  }) => Promise<SalienceEntry[]>
  getPinnedMemories: (chatId: string) => Promise<SalienceEntry[]>

  // L5 Graph
  getRelatedEntities: (entityValue: string, chatId?: string, hops?: number) => Promise<RelatedEntity[]>

  // Statistics
  getStats: (chatId: string) => Promise<MemoryStats>
  getRiverStats: (chatId: string) => Promise<RiverStats>

  // Configuration
  getConfig: () => Promise<MemoryConfig>
  updateConfig: (updates: Partial<MemoryConfig>) => Promise<void>

  // Consolidation
  triggerConsolidation: (chatId: string) => Promise<ConsolidationRun>

  // Refresh
  refreshStats: (chatId: string) => Promise<void>
}

// =============================================================================
// HOOK
// =============================================================================

export function useMemory(): UseMemoryReturn {
  const [memories, setMemories] = useState<MemoryResult[]>([])
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [config, setConfig] = useState<MemoryConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Event Listeners
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Listen for memory events
    const unsubPinned = onMessage('memory:pinned', (data) => {
      console.log('Memory pinned:', data)
    })

    const unsubMuted = onMessage('memory:muted', (data) => {
      console.log('Memory muted:', data)
    })

    const unsubConsolidation = onMessage('memory:consolidation-complete', (data) => {
      console.log('Consolidation complete:', data)
    })

    const unsubConfigUpdated = onMessage('memory:config-updated', (data) => {
      setConfig(data as MemoryConfig)
    })

    return () => {
      unsubPinned()
      unsubMuted()
      unsubConsolidation()
      unsubConfigUpdated()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Retrieval
  // ---------------------------------------------------------------------------

  const retrieve = useCallback(async (query: MemoryQuery): Promise<MemoryResult[]> => {
    setLoading(true)
    setError(null)

    try {
      const response = await sendMessage<{ memories: MemoryResult[] }>('memory:retrieve', query)
      setMemories(response.memories)
      return response.memories
    } catch (err) {
      const message = (err as Error).message
      setError(message)
      console.error('Memory retrieval failed:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const searchLexical = useCallback(async (
    chatId: string,
    query: string,
    topK?: number
  ): Promise<Array<{ messageId: string; content: string; score: number }>> => {
    try {
      const response = await sendMessage<{
        results: Array<{ messageId: string; content: string; score: number }>
      }>('memory:search-lexical', { chatId, query, topK })
      return response.results
    } catch (err) {
      console.error('Lexical search failed:', err)
      return []
    }
  }, [])

  const getRecent = useCallback(async (chatId: string, limit?: number): Promise<RiverEntry[]> => {
    try {
      const response = await sendMessage<{ entries: RiverEntry[] }>('memory:recent', { chatId, limit })
      return response.entries
    } catch (err) {
      console.error('Get recent failed:', err)
      return []
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Curation
  // ---------------------------------------------------------------------------

  const pinMemory = useCallback(async (
    chatId: string,
    messageId: string,
    content: string
  ): Promise<void> => {
    try {
      await sendMessage('memory:curate', {
        chatId,
        messageId,
        action: 'PIN' as CurationAction,
        content
      })
    } catch (err) {
      console.error('Pin memory failed:', err)
      throw err
    }
  }, [])

  const markImportant = useCallback(async (
    chatId: string,
    messageId: string,
    boostFactor: number = 2.0
  ): Promise<void> => {
    try {
      await sendMessage('memory:curate', {
        chatId,
        messageId,
        action: 'IMPORTANT' as CurationAction,
        metadata: { boostFactor }
      })
    } catch (err) {
      console.error('Mark important failed:', err)
      throw err
    }
  }, [])

  const muteMemory = useCallback(async (
    chatId: string,
    messageId: string
  ): Promise<MemoryLayer[]> => {
    try {
      const response = await sendMessage<{ affectedLayers: MemoryLayer[] }>('memory:curate', {
        chatId,
        messageId,
        action: 'MUTE' as CurationAction
      })
      return response.affectedLayers
    } catch (err) {
      console.error('Mute memory failed:', err)
      throw err
    }
  }, [])

  const tagAffect = useCallback(async (
    chatId: string,
    messageId: string,
    category: AffectCategory,
    intensity: number,
    reason?: string
  ): Promise<void> => {
    try {
      await sendMessage('memory:curate', {
        chatId,
        messageId,
        action: 'AFFECT_TAG' as CurationAction,
        metadata: {
          affectTag: category,
          affectIntensity: intensity,
          reason
        }
      })
    } catch (err) {
      console.error('Tag affect failed:', err)
      throw err
    }
  }, [])

  // ---------------------------------------------------------------------------
  // L2 Affect
  // ---------------------------------------------------------------------------

  const getAffectEntries = useCallback(async (
    chatId: string,
    options?: {
      category?: AffectCategory
      minIntensity?: number
      limit?: number
    }
  ): Promise<AffectEntry[]> => {
    try {
      const response = await sendMessage<{ entries: AffectEntry[] }>(
        'memory:affect-list',
        { chatId, ...options }
      )
      return response.entries
    } catch (err) {
      console.error('Get affect entries failed:', err)
      return []
    }
  }, [])

  // ---------------------------------------------------------------------------
  // L4 Salience
  // ---------------------------------------------------------------------------

  const getSalienceEntries = useCallback(async (
    chatId: string,
    options?: {
      minScore?: number
      pinnedOnly?: boolean
      limit?: number
    }
  ): Promise<SalienceEntry[]> => {
    try {
      const response = await sendMessage<{ entries: SalienceEntry[] }>(
        'memory:salience-list',
        { chatId, ...options }
      )
      return response.entries
    } catch (err) {
      console.error('Get salience entries failed:', err)
      return []
    }
  }, [])

  const getPinnedMemories = useCallback(async (chatId: string): Promise<SalienceEntry[]> => {
    try {
      const response = await sendMessage<{ entries: SalienceEntry[] }>(
        'memory:pinned-list',
        { chatId }
      )
      return response.entries
    } catch (err) {
      console.error('Get pinned memories failed:', err)
      return []
    }
  }, [])

  // ---------------------------------------------------------------------------
  // L5 Graph
  // ---------------------------------------------------------------------------

  const getRelatedEntities = useCallback(async (
    entityValue: string,
    chatId?: string,
    hops?: number
  ): Promise<RelatedEntity[]> => {
    try {
      const response = await sendMessage<{ entities: RelatedEntity[] }>(
        'memory:related-entities',
        { entityValue, chatId, hops }
      )
      return response.entities
    } catch (err) {
      console.error('Get related entities failed:', err)
      return []
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  const getStats = useCallback(async (chatId: string): Promise<MemoryStats> => {
    const response = await sendMessage<MemoryStats>('memory:stats', { chatId })
    setStats(response)
    return response
  }, [])

  const getRiverStats = useCallback(async (chatId: string): Promise<RiverStats> => {
    const response = await sendMessage<RiverStats>('memory:river-stats', { chatId })
    return response
  }, [])

  const refreshStats = useCallback(async (chatId: string): Promise<void> => {
    try {
      await getStats(chatId)
    } catch (err) {
      console.error('Refresh stats failed:', err)
    }
  }, [getStats])

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  const getConfig = useCallback(async (): Promise<MemoryConfig> => {
    const response = await sendMessage<MemoryConfig>('memory:config-get', {})
    setConfig(response)
    return response
  }, [])

  const updateConfig = useCallback(async (updates: Partial<MemoryConfig>): Promise<void> => {
    await sendMessage('memory:config-update', updates)
    // Config will be updated via event listener
  }, [])

  // ---------------------------------------------------------------------------
  // Consolidation
  // ---------------------------------------------------------------------------

  const triggerConsolidation = useCallback(async (chatId: string): Promise<ConsolidationRun> => {
    setLoading(true)
    try {
      const response = await sendMessage<{ run: ConsolidationRun }>('memory:consolidate', { chatId })
      return response.run
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    memories,
    stats,
    config,
    loading,
    error,

    // Retrieval
    retrieve,
    searchLexical,
    getRecent,

    // Curation
    pinMemory,
    markImportant,
    muteMemory,
    tagAffect,

    // L2 Affect
    getAffectEntries,

    // L4 Salience
    getSalienceEntries,
    getPinnedMemories,

    // L5 Graph
    getRelatedEntities,

    // Statistics
    getStats,
    getRiverStats,
    refreshStats,

    // Configuration
    getConfig,
    updateConfig,

    // Consolidation
    triggerConsolidation
  }
}
