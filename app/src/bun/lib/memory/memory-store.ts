// =============================================================================
// MEMORY STORE
// =============================================================================
// Core store for the Multi-Modal Memory Architecture (M3A).
// Implements all 5 memory layers and ensemble retrieval.

import { db } from '../db/connection'
import { Result, Errors, logger } from '../core'
import {
  ChatId,
  MessageId,
  L1RiverId,
  L2AffectId,
  L3VectorId,
  L3EntityId,
  L3RelationId,
  L4SalienceId,
  L5NodeId,
  L5EdgeId,
  newL1RiverId,
  newL2AffectId,
  newL3VectorId,
  newL3EntityId,
  newL3RelationId,
  newL4SalienceId,
  newL5NodeId,
  newL5EdgeId,
  AffectCategory,
  EntityType,
  RelationType,
  CooccurrenceNodeType,
  MemoryLayer,
  isAffectCategory
} from '../core/types'
import type {
  L1RiverEntry,
  L1RiverRow,
  L1RiverStats,
  L2AffectEntry,
  L2AffectRow,
  L3VectorEntry,
  L3VectorRow,
  L3LexicalMeta,
  L3LexicalMetaRow,
  L3Entity,
  L3EntityRow,
  L3Relation,
  L3RelationRow,
  L3ResonanceResult,
  L4SalienceEntry,
  L4SalienceRow,
  L5Node,
  L5NodeRow,
  L5Edge,
  L5EdgeRow,
  MemoryQuery,
  MemoryResult,
  EnsembleWeights,
  ConsolidationRun,
  ConsolidationRunRow,
  MemoryConfig,
  MemoryStats,
  EmbeddingCacheEntry,
  EmbeddingCacheRow
} from './types'
import { DEFAULT_ENSEMBLE_WEIGHTS, DEFAULT_MEMORY_CONFIG } from './types'
import {
  cosineSimilarity,
  deserializeEmbedding,
  serializeEmbedding,
  hashContent
} from './similarity'

const log = logger.child({ module: 'memory-store' })

// =============================================================================
// ROW CONVERTERS
// =============================================================================

function rowToL1River(row: L1RiverRow): L1RiverEntry {
  return {
    id: L1RiverId(row.id),
    chatId: ChatId(row.chat_id),
    messageId: MessageId(row.message_id),
    content: row.content,
    tokenCount: row.token_count,
    timestamp: row.timestamp,
    evictedAt: row.evicted_at ?? undefined
  }
}

function rowToL2Affect(row: L2AffectRow): L2AffectEntry {
  return {
    id: L2AffectId(row.id),
    chatId: ChatId(row.chat_id),
    messageId: MessageId(row.message_id),
    affectCategory: row.affect_category as AffectCategory,
    intensity: row.intensity,
    reasoning: row.reasoning ?? undefined,
    decayFactor: row.decay_factor,
    isMuted: row.is_muted === 1,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at
  }
}

function rowToL3Vector(row: L3VectorRow): L3VectorEntry {
  return {
    id: L3VectorId(row.id),
    chatId: ChatId(row.chat_id),
    messageId: MessageId(row.message_id),
    contentHash: row.content_hash,
    embeddingBlob: row.embedding_blob,
    embeddingModel: row.embedding_model,
    dimensions: row.dimensions,
    boostFactor: row.boost_factor,
    isMuted: row.is_muted === 1,
    createdAt: row.created_at
  }
}

function rowToL3Entity(row: L3EntityRow): L3Entity {
  return {
    id: L3EntityId(row.id),
    entityType: row.entity_type as EntityType,
    entityValue: row.entity_value,
    canonicalForm: row.canonical_form ?? undefined,
    chatId: row.chat_id ? ChatId(row.chat_id) : undefined,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  }
}

function rowToL3Relation(row: L3RelationRow): L3Relation {
  return {
    id: L3RelationId(row.id),
    sourceEntityId: L3EntityId(row.source_entity_id),
    targetEntityId: L3EntityId(row.target_entity_id),
    relationType: row.relation_type as RelationType,
    contextMessageId: MessageId(row.context_message_id),
    confidence: row.confidence,
    isMuted: row.is_muted === 1,
    createdAt: row.created_at
  }
}

function rowToL4Salience(row: L4SalienceRow): L4SalienceEntry {
  return {
    id: L4SalienceId(row.id),
    chatId: ChatId(row.chat_id),
    messageId: MessageId(row.message_id),
    content: row.content,
    salienceScore: row.salience_score,
    predictionError: row.prediction_error ?? undefined,
    userPinned: row.user_pinned === 1,
    retentionPriority: row.retention_priority,
    isMuted: row.is_muted === 1,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at
  }
}

function rowToL5Node(row: L5NodeRow): L5Node {
  return {
    id: L5NodeId(row.id),
    nodeType: row.node_type as CooccurrenceNodeType,
    nodeValue: row.node_value,
    chatId: row.chat_id ? ChatId(row.chat_id) : undefined,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  }
}

function rowToL5Edge(row: L5EdgeRow): L5Edge {
  return {
    id: L5EdgeId(row.id),
    sourceNodeId: L5NodeId(row.source_node_id),
    targetNodeId: L5NodeId(row.target_node_id),
    weight: row.weight,
    temporalDecay: row.temporal_decay,
    lastReinforcedAt: row.last_reinforced_at,
    createdAt: row.created_at
  }
}

function rowToConsolidationRun(row: ConsolidationRunRow): ConsolidationRun {
  return {
    id: row.id,
    chatId: ChatId(row.chat_id),
    triggerType: row.trigger_type as 'overflow' | 'scheduled' | 'manual',
    itemsProcessed: row.items_processed,
    summariesCreated: row.summaries_created,
    conflictsDetected: row.conflicts_detected,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined
  }
}

// =============================================================================
// MEMORY STORE
// =============================================================================

export const MemoryStore = {
  // ===========================================================================
  // L1: RIVER - Sliding Window Buffer
  // ===========================================================================

  /**
   * Add entry to the L1 river (sliding window buffer).
   */
  addToRiver(
    chatId: ChatId,
    messageId: MessageId,
    content: string,
    tokenCount: number
  ): Result<L1RiverEntry> {
    try {
      const id = newL1RiverId()
      const timestamp = new Date().toISOString()

      db.memory.run(
        `INSERT INTO l1_river (id, chat_id, message_id, content, token_count, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, chatId, messageId, content, tokenCount, timestamp]
      )

      log.debug('Added to L1 river', { chatId, messageId, tokenCount })

      return Result.ok({
        id,
        chatId,
        messageId,
        content,
        tokenCount,
        timestamp
      })
    } catch (error) {
      log.error('Failed to add to L1 river', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l1_river', error as Error))
    }
  },

  /**
   * Get recent entries from L1 river for a chat.
   */
  getRiverEntries(chatId: ChatId, limit = 100): Result<L1RiverEntry[]> {
    try {
      const rows = db.memory.query(
        `SELECT * FROM l1_river
         WHERE chat_id = ? AND evicted_at IS NULL
         ORDER BY timestamp DESC
         LIMIT ?`
      ).all(chatId, limit) as L1RiverRow[]

      return Result.ok(rows.map(rowToL1River))
    } catch (error) {
      log.error('Failed to get L1 river entries', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l1_river', error as Error))
    }
  },

  /**
   * Get current total tokens in L1 river for a chat.
   */
  getRiverTokenCount(chatId: ChatId): Result<number> {
    try {
      const row = db.memory.query(
        `SELECT COALESCE(SUM(token_count), 0) as total
         FROM l1_river
         WHERE chat_id = ? AND evicted_at IS NULL`
      ).get(chatId) as { total: number }

      return Result.ok(row.total)
    } catch (error) {
      log.error('Failed to get L1 river token count', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l1_river SUM', error as Error))
    }
  },

  /**
   * Get L1 river statistics for a chat.
   */
  getRiverStats(chatId: ChatId): Result<L1RiverStats> {
    try {
      const row = db.memory.query(
        `SELECT
           COUNT(*) as total_entries,
           COALESCE(SUM(token_count), 0) as total_tokens,
           MIN(timestamp) as oldest,
           MAX(timestamp) as newest
         FROM l1_river
         WHERE chat_id = ? AND evicted_at IS NULL`
      ).get(chatId) as {
        total_entries: number
        total_tokens: number
        oldest: string | null
        newest: string | null
      }

      return Result.ok({
        totalEntries: row.total_entries,
        totalTokens: row.total_tokens,
        oldestTimestamp: row.oldest ?? undefined,
        newestTimestamp: row.newest ?? undefined
      })
    } catch (error) {
      log.error('Failed to get L1 river stats', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l1_river stats', error as Error))
    }
  },

  /**
   * Evict oldest entries from L1 river until under token limit.
   * Returns the evicted entries for consolidation.
   */
  evictFromRiver(chatId: ChatId, maxTokens: number): Result<L1RiverEntry[]> {
    try {
      const currentTokens = this.getRiverTokenCount(chatId)
      if (!currentTokens.ok) return Result.err(currentTokens.error)

      if (currentTokens.value <= maxTokens) {
        return Result.ok([])
      }

      // Get entries to evict (oldest first)
      const toEvict = db.memory.query(
        `SELECT * FROM l1_river
         WHERE chat_id = ? AND evicted_at IS NULL
         ORDER BY timestamp ASC`
      ).all(chatId) as L1RiverRow[]

      const evicted: L1RiverEntry[] = []
      let tokensRemaining = currentTokens.value
      const now = new Date().toISOString()

      for (const row of toEvict) {
        if (tokensRemaining <= maxTokens) break

        // Mark as evicted
        db.memory.run(
          `UPDATE l1_river SET evicted_at = ? WHERE id = ?`,
          [now, row.id]
        )

        evicted.push(rowToL1River(row))
        tokensRemaining -= row.token_count
      }

      log.info('Evicted from L1 river', {
        chatId,
        evictedCount: evicted.length,
        tokensRemaining
      })

      return Result.ok(evicted)
    } catch (error) {
      log.error('Failed to evict from L1 river', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE l1_river evict', error as Error))
    }
  },

  // ===========================================================================
  // L2: FEELING - Affective State Index
  // ===========================================================================

  /**
   * Add an affective state entry.
   */
  addAffectEntry(
    chatId: ChatId,
    messageId: MessageId,
    category: AffectCategory,
    intensity: number,
    reasoning?: string
  ): Result<L2AffectEntry> {
    try {
      const id = newL2AffectId()
      const now = new Date().toISOString()

      db.memory.run(
        `INSERT INTO l2_affect
         (id, chat_id, message_id, affect_category, intensity, reasoning, created_at, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, chatId, messageId, category, intensity, reasoning ?? null, now, now]
      )

      log.debug('Added L2 affect entry', { chatId, messageId, category, intensity })

      return Result.ok({
        id,
        chatId,
        messageId,
        affectCategory: category,
        intensity,
        reasoning,
        decayFactor: 1.0,
        isMuted: false,
        createdAt: now,
        lastAccessedAt: now
      })
    } catch (error) {
      log.error('Failed to add L2 affect entry', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l2_affect', error as Error))
    }
  },

  /**
   * Get affect entries for a chat, optionally filtered by category.
   */
  getAffectEntries(
    chatId: ChatId,
    options?: {
      category?: AffectCategory
      minIntensity?: number
      limit?: number
      includeMuted?: boolean
    }
  ): Result<L2AffectEntry[]> {
    try {
      const { category, minIntensity = 0, limit = 100, includeMuted = false } = options ?? {}

      let sql = `SELECT * FROM l2_affect WHERE chat_id = ? AND intensity >= ?`
      const params: unknown[] = [chatId, minIntensity]

      if (!includeMuted) {
        sql += ` AND is_muted = 0`
      }

      if (category) {
        sql += ` AND affect_category = ?`
        params.push(category)
      }

      sql += ` ORDER BY (intensity * decay_factor) DESC LIMIT ?`
      params.push(limit)

      const rows = db.memory.query(sql).all(...params) as L2AffectRow[]

      // Update last_accessed_at for retrieved entries
      const ids = rows.map(r => r.id)
      if (ids.length > 0) {
        const now = new Date().toISOString()
        db.memory.run(
          `UPDATE l2_affect SET last_accessed_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
          [now, ...ids]
        )
      }

      return Result.ok(rows.map(rowToL2Affect))
    } catch (error) {
      log.error('Failed to get L2 affect entries', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l2_affect', error as Error))
    }
  },

  /**
   * Apply decay to all affect entries for a chat.
   */
  decayAffectEntries(chatId: ChatId, decayRate: number = 0.95): Result<number> {
    try {
      const result = db.memory.run(
        `UPDATE l2_affect SET decay_factor = decay_factor * ? WHERE chat_id = ?`,
        [decayRate, chatId]
      )

      log.debug('Decayed L2 affect entries', { chatId, decayRate, affected: result.changes })

      return Result.ok(result.changes)
    } catch (error) {
      log.error('Failed to decay L2 affect entries', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE l2_affect decay', error as Error))
    }
  },

  // ===========================================================================
  // L3: ECHO - Redundant Encoding
  // ===========================================================================

  // L3.1 - Vector embeddings

  /**
   * Add a vector embedding entry.
   */
  addVectorEmbedding(
    chatId: ChatId,
    messageId: MessageId,
    content: string,
    embedding: Float32Array,
    model: string
  ): Result<L3VectorEntry> {
    try {
      const id = newL3VectorId()
      const contentHash = hashContent(content)
      const embeddingBlob = serializeEmbedding(embedding)
      const now = new Date().toISOString()

      db.memory.run(
        `INSERT INTO l3_vectors
         (id, chat_id, message_id, content_hash, embedding_blob, embedding_model, dimensions, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, chatId, messageId, contentHash, embeddingBlob, model, embedding.length, now]
      )

      log.debug('Added L3 vector embedding', { chatId, messageId, model, dimensions: embedding.length })

      return Result.ok({
        id,
        chatId,
        messageId,
        contentHash,
        embeddingBlob,
        embeddingModel: model,
        dimensions: embedding.length,
        boostFactor: 1.0,
        isMuted: false,
        createdAt: now
      })
    } catch (error) {
      log.error('Failed to add L3 vector embedding', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l3_vectors', error as Error))
    }
  },

  /**
   * Search for similar vectors using brute-force cosine similarity.
   */
  searchVectorSimilarity(
    chatId: ChatId,
    queryEmbedding: Float32Array,
    topK: number = 10,
    includeMuted: boolean = false
  ): Result<Array<{ entry: L3VectorEntry; score: number }>> {
    try {
      let sql = `SELECT * FROM l3_vectors WHERE chat_id = ?`
      if (!includeMuted) {
        sql += ` AND is_muted = 0`
      }

      const rows = db.memory.query(sql).all(chatId) as L3VectorRow[]

      // Compute similarities
      const scored = rows.map(row => {
        const embedding = deserializeEmbedding(row.embedding_blob)
        const score = cosineSimilarity(queryEmbedding, embedding) * row.boost_factor
        return { entry: rowToL3Vector(row), score }
      })

      // Sort by score descending and take top K
      scored.sort((a, b) => b.score - a.score)

      return Result.ok(scored.slice(0, topK))
    } catch (error) {
      log.error('Failed to search L3 vectors', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l3_vectors similarity', error as Error))
    }
  },

  // L3.2 - Lexical FTS5

  /**
   * Add content to the lexical FTS index.
   */
  addToLexicalIndex(
    chatId: ChatId,
    messageId: MessageId,
    content: string
  ): Result<void> {
    try {
      // Insert into FTS5
      db.memory.run(
        `INSERT INTO l3_lexical_fts (content, chat_id, message_id) VALUES (?, ?, ?)`,
        [content, chatId, messageId]
      )

      // Insert metadata
      const now = new Date().toISOString()
      db.memory.run(
        `INSERT OR IGNORE INTO l3_lexical_meta (message_id, chat_id, created_at) VALUES (?, ?, ?)`,
        [messageId, chatId, now]
      )

      log.debug('Added to L3 lexical index', { chatId, messageId })

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to add to L3 lexical index', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l3_lexical_fts', error as Error))
    }
  },

  /**
   * Search the lexical FTS index.
   */
  searchLexical(
    chatId: ChatId,
    query: string,
    topK: number = 10,
    includeMuted: boolean = false
  ): Result<Array<{ messageId: MessageId; content: string; score: number }>> {
    try {
      // FTS5 search with BM25 ranking
      let sql = `
        SELECT
          fts.message_id,
          fts.content,
          bm25(l3_lexical_fts) as score,
          COALESCE(meta.boost_factor, 1.0) as boost
        FROM l3_lexical_fts fts
        LEFT JOIN l3_lexical_meta meta ON fts.message_id = meta.message_id
        WHERE fts.chat_id = ? AND l3_lexical_fts MATCH ?`

      if (!includeMuted) {
        sql += ` AND COALESCE(meta.is_muted, 0) = 0`
      }

      sql += ` ORDER BY (bm25(l3_lexical_fts) * COALESCE(meta.boost_factor, 1.0)) LIMIT ?`

      const rows = db.memory.query(sql).all(chatId, query, topK) as Array<{
        message_id: string
        content: string
        score: number
        boost: number
      }>

      return Result.ok(rows.map(row => ({
        messageId: MessageId(row.message_id),
        content: row.content,
        score: Math.abs(row.score) * row.boost  // BM25 returns negative scores
      })))
    } catch (error) {
      log.error('Failed to search L3 lexical index', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l3_lexical_fts', error as Error))
    }
  },

  // L3.3 - Entity-relation graph

  /**
   * Add or update an entity.
   */
  addEntity(
    entityType: EntityType,
    entityValue: string,
    chatId?: ChatId,
    canonicalForm?: string
  ): Result<L3Entity> {
    try {
      const now = new Date().toISOString()

      // Try to insert, on conflict update last_seen_at
      const existing = db.memory.query(
        `SELECT * FROM l3_entities WHERE entity_type = ? AND entity_value = ? AND chat_id IS ?`
      ).get(entityType, entityValue, chatId ?? null) as L3EntityRow | null

      if (existing) {
        db.memory.run(
          `UPDATE l3_entities SET last_seen_at = ? WHERE id = ?`,
          [now, existing.id]
        )
        return Result.ok(rowToL3Entity({ ...existing, last_seen_at: now }))
      }

      const id = newL3EntityId()
      db.memory.run(
        `INSERT INTO l3_entities (id, entity_type, entity_value, canonical_form, chat_id, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, entityType, entityValue, canonicalForm ?? null, chatId ?? null, now, now]
      )

      log.debug('Added L3 entity', { entityType, entityValue, chatId })

      return Result.ok({
        id,
        entityType,
        entityValue,
        canonicalForm,
        chatId,
        firstSeenAt: now,
        lastSeenAt: now
      })
    } catch (error) {
      log.error('Failed to add L3 entity', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l3_entities', error as Error))
    }
  },

  /**
   * Add a relation between entities.
   */
  addRelation(
    sourceEntityId: L3EntityId,
    targetEntityId: L3EntityId,
    relationType: RelationType,
    contextMessageId: MessageId,
    confidence: number = 1.0
  ): Result<L3Relation> {
    try {
      const id = newL3RelationId()
      const now = new Date().toISOString()

      db.memory.run(
        `INSERT INTO l3_relations
         (id, source_entity_id, target_entity_id, relation_type, context_message_id, confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, sourceEntityId, targetEntityId, relationType, contextMessageId, confidence, now]
      )

      log.debug('Added L3 relation', { sourceEntityId, targetEntityId, relationType })

      return Result.ok({
        id,
        sourceEntityId,
        targetEntityId,
        relationType,
        contextMessageId,
        confidence,
        isMuted: false,
        createdAt: now
      })
    } catch (error) {
      log.error('Failed to add L3 relation', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l3_relations', error as Error))
    }
  },

  /**
   * Get related entities via graph traversal.
   */
  getRelatedEntities(
    entityValue: string,
    chatId?: ChatId,
    hops: number = 2
  ): Result<Array<{ entity: L3Entity; distance: number }>> {
    try {
      // Simple BFS traversal
      const visited = new Set<string>()
      const results: Array<{ entity: L3Entity; distance: number }> = []

      // Find starting entities
      let sql = `SELECT * FROM l3_entities WHERE entity_value = ?`
      const params: unknown[] = [entityValue]
      if (chatId) {
        sql += ` AND (chat_id = ? OR chat_id IS NULL)`
        params.push(chatId)
      }

      const startEntities = db.memory.query(sql).all(...params) as L3EntityRow[]

      const queue: Array<{ id: string; distance: number }> = startEntities.map(e => ({
        id: e.id,
        distance: 0
      }))

      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current.id) || current.distance > hops) continue
        visited.add(current.id)

        if (current.distance > 0) {
          const entity = db.memory.query(
            `SELECT * FROM l3_entities WHERE id = ?`
          ).get(current.id) as L3EntityRow | null

          if (entity) {
            results.push({ entity: rowToL3Entity(entity), distance: current.distance })
          }
        }

        // Get neighbors
        const relations = db.memory.query(
          `SELECT target_entity_id as neighbor FROM l3_relations WHERE source_entity_id = ? AND is_muted = 0
           UNION
           SELECT source_entity_id as neighbor FROM l3_relations WHERE target_entity_id = ? AND is_muted = 0`
        ).all(current.id, current.id) as Array<{ neighbor: string }>

        for (const rel of relations) {
          if (!visited.has(rel.neighbor)) {
            queue.push({ id: rel.neighbor, distance: current.distance + 1 })
          }
        }
      }

      return Result.ok(results)
    } catch (error) {
      log.error('Failed to get related entities', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l3_entities graph', error as Error))
    }
  },

  // ===========================================================================
  // L4: WOUND - Salience Marker Store
  // ===========================================================================

  /**
   * Add a salience entry.
   */
  addSalienceEntry(
    chatId: ChatId,
    messageId: MessageId,
    content: string,
    salienceScore: number,
    predictionError?: number
  ): Result<L4SalienceEntry> {
    try {
      const id = newL4SalienceId()
      const now = new Date().toISOString()
      const retentionPriority = Math.floor(salienceScore * 100)

      db.memory.run(
        `INSERT OR REPLACE INTO l4_salience
         (id, chat_id, message_id, content, salience_score, prediction_error, retention_priority, created_at, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, chatId, messageId, content, salienceScore, predictionError ?? null, retentionPriority, now, now]
      )

      log.debug('Added L4 salience entry', { chatId, messageId, salienceScore })

      return Result.ok({
        id,
        chatId,
        messageId,
        content,
        salienceScore,
        predictionError,
        userPinned: false,
        retentionPriority,
        isMuted: false,
        createdAt: now,
        lastAccessedAt: now
      })
    } catch (error) {
      log.error('Failed to add L4 salience entry', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l4_salience', error as Error))
    }
  },

  /**
   * Pin a message (user action).
   */
  pinMessage(chatId: ChatId, messageId: MessageId, content: string): Result<L4SalienceEntry> {
    try {
      const id = newL4SalienceId()
      const now = new Date().toISOString()

      // Insert or update with max salience and user_pinned flag
      db.memory.run(
        `INSERT INTO l4_salience
         (id, chat_id, message_id, content, salience_score, user_pinned, retention_priority, created_at, last_accessed_at)
         VALUES (?, ?, ?, ?, 1.0, 1, 100, ?, ?)
         ON CONFLICT(message_id) DO UPDATE SET
           user_pinned = 1,
           salience_score = 1.0,
           retention_priority = 100,
           last_accessed_at = ?`,
        [id, chatId, messageId, content, now, now, now]
      )

      log.info('Pinned message', { chatId, messageId })

      return Result.ok({
        id,
        chatId,
        messageId,
        content,
        salienceScore: 1.0,
        userPinned: true,
        retentionPriority: 100,
        isMuted: false,
        createdAt: now,
        lastAccessedAt: now
      })
    } catch (error) {
      log.error('Failed to pin message', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l4_salience pin', error as Error))
    }
  },

  /**
   * Get salient entries for a chat.
   */
  getSalienceEntries(
    chatId: ChatId,
    options?: { minScore?: number; pinnedOnly?: boolean; limit?: number; includeMuted?: boolean }
  ): Result<L4SalienceEntry[]> {
    try {
      const { minScore = 0, pinnedOnly = false, limit = 50, includeMuted = false } = options ?? {}

      let sql = `SELECT * FROM l4_salience WHERE chat_id = ? AND salience_score >= ?`
      const params: unknown[] = [chatId, minScore]

      if (!includeMuted) {
        sql += ` AND is_muted = 0`
      }

      if (pinnedOnly) {
        sql += ` AND user_pinned = 1`
      }

      sql += ` ORDER BY retention_priority DESC, salience_score DESC LIMIT ?`
      params.push(limit)

      const rows = db.memory.query(sql).all(...params) as L4SalienceRow[]

      // Update last_accessed_at
      const ids = rows.map(r => r.id)
      if (ids.length > 0) {
        const now = new Date().toISOString()
        db.memory.run(
          `UPDATE l4_salience SET last_accessed_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
          [now, ...ids]
        )
      }

      return Result.ok(rows.map(rowToL4Salience))
    } catch (error) {
      log.error('Failed to get L4 salience entries', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l4_salience', error as Error))
    }
  },

  // ===========================================================================
  // L5: COMPANION - Co-occurrence Graph
  // ===========================================================================

  /**
   * Add or update a co-occurrence node.
   */
  addNode(
    nodeType: CooccurrenceNodeType,
    nodeValue: string,
    chatId?: ChatId
  ): Result<L5Node> {
    try {
      const now = new Date().toISOString()

      // Try to find existing
      const existing = db.memory.query(
        `SELECT * FROM l5_nodes WHERE node_type = ? AND node_value = ? AND chat_id IS ?`
      ).get(nodeType, nodeValue, chatId ?? null) as L5NodeRow | null

      if (existing) {
        db.memory.run(
          `UPDATE l5_nodes SET last_seen_at = ? WHERE id = ?`,
          [now, existing.id]
        )
        return Result.ok(rowToL5Node({ ...existing, last_seen_at: now }))
      }

      const id = newL5NodeId()
      db.memory.run(
        `INSERT INTO l5_nodes (id, node_type, node_value, chat_id, first_seen_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nodeType, nodeValue, chatId ?? null, now, now]
      )

      return Result.ok({
        id,
        nodeType,
        nodeValue,
        chatId,
        firstSeenAt: now,
        lastSeenAt: now
      })
    } catch (error) {
      log.error('Failed to add L5 node', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l5_nodes', error as Error))
    }
  },

  /**
   * Add or reinforce a co-occurrence edge.
   */
  addOrReinforceEdge(
    sourceNodeId: L5NodeId,
    targetNodeId: L5NodeId,
    strength: number = 1.0
  ): Result<L5Edge> {
    try {
      const now = new Date().toISOString()

      // Check for existing edge
      const existing = db.memory.query(
        `SELECT * FROM l5_edges WHERE source_node_id = ? AND target_node_id = ?`
      ).get(sourceNodeId, targetNodeId) as L5EdgeRow | null

      if (existing) {
        // Reinforce: weight = old_weight * decay + strength * (1 - decay)
        const decay = 0.7
        const newWeight = existing.weight * decay + strength * (1 - decay)

        db.memory.run(
          `UPDATE l5_edges SET weight = ?, last_reinforced_at = ?, temporal_decay = 1.0 WHERE id = ?`,
          [newWeight, now, existing.id]
        )

        return Result.ok(rowToL5Edge({ ...existing, weight: newWeight, last_reinforced_at: now }))
      }

      const id = newL5EdgeId()
      db.memory.run(
        `INSERT INTO l5_edges (id, source_node_id, target_node_id, weight, created_at, last_reinforced_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, sourceNodeId, targetNodeId, strength, now, now]
      )

      return Result.ok({
        id,
        sourceNodeId,
        targetNodeId,
        weight: strength,
        temporalDecay: 1.0,
        lastReinforcedAt: now,
        createdAt: now
      })
    } catch (error) {
      log.error('Failed to add/reinforce L5 edge', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT l5_edges', error as Error))
    }
  },

  /**
   * Get co-occurring nodes for a given node.
   */
  getCooccurringNodes(nodeId: L5NodeId, topK: number = 10): Result<Array<{ node: L5Node; weight: number }>> {
    try {
      const rows = db.memory.query(
        `SELECT n.*, e.weight
         FROM l5_edges e
         JOIN l5_nodes n ON (
           (e.source_node_id = ? AND e.target_node_id = n.id) OR
           (e.target_node_id = ? AND e.source_node_id = n.id)
         )
         ORDER BY e.weight * e.temporal_decay DESC
         LIMIT ?`
      ).all(nodeId, nodeId, topK) as Array<L5NodeRow & { weight: number }>

      return Result.ok(rows.map(row => ({
        node: rowToL5Node(row),
        weight: row.weight
      })))
    } catch (error) {
      log.error('Failed to get co-occurring nodes', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT l5_edges cooccur', error as Error))
    }
  },

  /**
   * Apply temporal decay to all edges.
   */
  decayEdges(decayRate: number = 0.98): Result<number> {
    try {
      const result = db.memory.run(
        `UPDATE l5_edges SET temporal_decay = temporal_decay * ?`,
        [decayRate]
      )

      return Result.ok(result.changes)
    } catch (error) {
      log.error('Failed to decay L5 edges', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE l5_edges decay', error as Error))
    }
  },

  /**
   * Prune weak edges below threshold.
   */
  pruneWeakEdges(threshold: number = 0.1): Result<number> {
    try {
      const result = db.memory.run(
        `DELETE FROM l5_edges WHERE weight * temporal_decay < ?`,
        [threshold]
      )

      log.info('Pruned weak L5 edges', { threshold, pruned: result.changes })

      return Result.ok(result.changes)
    } catch (error) {
      log.error('Failed to prune L5 edges', error as Error)
      return Result.err(Errors.db.queryFailed('DELETE l5_edges prune', error as Error))
    }
  },

  // ===========================================================================
  // CURATION API
  // ===========================================================================

  /**
   * Mute a message across all layers.
   */
  muteMessage(messageId: MessageId): Result<MemoryLayer[]> {
    try {
      const affectedLayers: MemoryLayer[] = []

      // L2
      const l2Result = db.memory.run(
        `UPDATE l2_affect SET is_muted = 1 WHERE message_id = ?`,
        [messageId]
      )
      if (l2Result.changes > 0) affectedLayers.push('L2')

      // L3 vectors
      const l3vResult = db.memory.run(
        `UPDATE l3_vectors SET is_muted = 1 WHERE message_id = ?`,
        [messageId]
      )
      if (l3vResult.changes > 0) affectedLayers.push('L3')

      // L3 lexical
      db.memory.run(
        `UPDATE l3_lexical_meta SET is_muted = 1 WHERE message_id = ?`,
        [messageId]
      )

      // L3 relations
      db.memory.run(
        `UPDATE l3_relations SET is_muted = 1 WHERE context_message_id = ?`,
        [messageId]
      )

      // L4
      const l4Result = db.memory.run(
        `UPDATE l4_salience SET is_muted = 1 WHERE message_id = ?`,
        [messageId]
      )
      if (l4Result.changes > 0) affectedLayers.push('L4')

      log.info('Muted message', { messageId, affectedLayers })

      return Result.ok(affectedLayers)
    } catch (error) {
      log.error('Failed to mute message', error as Error)
      return Result.err(Errors.memory.curationFailed('MUTE', messageId, error as Error))
    }
  },

  /**
   * Boost L3 encoding for a message.
   */
  boostL3Encoding(messageId: MessageId, factor: number = 2.0): Result<void> {
    try {
      db.memory.run(
        `UPDATE l3_vectors SET boost_factor = boost_factor * ? WHERE message_id = ?`,
        [factor, messageId]
      )

      db.memory.run(
        `UPDATE l3_lexical_meta SET boost_factor = boost_factor * ? WHERE message_id = ?`,
        [factor, messageId]
      )

      log.info('Boosted L3 encoding', { messageId, factor })

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to boost L3 encoding', error as Error)
      return Result.err(Errors.memory.curationFailed('IMPORTANT', messageId, error as Error))
    }
  },

  // ===========================================================================
  // ENSEMBLE RETRIEVAL
  // ===========================================================================

  /**
   * Retrieve memories using ensemble scoring across all layers.
   */
  async retrieve(
    query: MemoryQuery,
    queryEmbedding?: Float32Array
  ): Promise<Result<MemoryResult[]>> {
    try {
      const { chatId, topK = 10, layers, affectBoost, temporalBias = 'balanced' } = query

      // Compute dynamic weights
      const weights = this.computeWeights(query)

      // Candidate map: messageId -> { scores, content, etc. }
      const candidates = new Map<string, {
        content: string
        messageId: MessageId
        scores: Partial<Record<MemoryLayer, number>>
        metadata: MemoryResult['metadata']
      }>()

      const enabledLayers = layers ?? ['L1', 'L2', 'L3', 'L4', 'L5']

      // L1: Recent entries
      if (enabledLayers.includes('L1')) {
        const l1Result = this.getRiverEntries(chatId, topK * 2)
        if (l1Result.ok) {
          for (const entry of l1Result.value) {
            const existing = candidates.get(entry.messageId) ?? {
              content: entry.content,
              messageId: entry.messageId,
              scores: {},
              metadata: { timestamp: entry.timestamp }
            }
            // Recency score: newer = higher
            const age = Date.now() - new Date(entry.timestamp).getTime()
            const recencyScore = Math.exp(-age / (1000 * 60 * 60 * 24)) // 1-day half-life
            existing.scores.L1 = recencyScore
            candidates.set(entry.messageId, existing)
          }
        }
      }

      // L2: Affect-based
      if (enabledLayers.includes('L2')) {
        const l2Result = this.getAffectEntries(chatId, {
          category: affectBoost?.[0],
          limit: topK * 2
        })
        if (l2Result.ok) {
          for (const entry of l2Result.value) {
            const existing = candidates.get(entry.messageId) ?? {
              content: '',
              messageId: entry.messageId,
              scores: {},
              metadata: { timestamp: entry.createdAt }
            }
            existing.scores.L2 = entry.intensity * entry.decayFactor
            existing.metadata.affectCategory = entry.affectCategory
            existing.metadata.affectIntensity = entry.intensity
            candidates.set(entry.messageId, existing)
          }
        }
      }

      // L3: Vector + Lexical (if we have embedding)
      if (enabledLayers.includes('L3')) {
        // Vector search
        if (queryEmbedding) {
          const vectorResult = this.searchVectorSimilarity(chatId, queryEmbedding, topK * 2)
          if (vectorResult.ok) {
            for (const { entry, score } of vectorResult.value) {
              const existing = candidates.get(entry.messageId) ?? {
                content: '',
                messageId: entry.messageId,
                scores: {},
                metadata: { timestamp: entry.createdAt }
              }
              existing.scores.L3 = (existing.scores.L3 ?? 0) + score * 0.6  // Vector weight
              candidates.set(entry.messageId, existing)
            }
          }
        }

        // Lexical search
        const lexicalResult = this.searchLexical(chatId, query.query, topK * 2)
        if (lexicalResult.ok) {
          for (const { messageId, content, score } of lexicalResult.value) {
            const existing = candidates.get(messageId) ?? {
              content,
              messageId,
              scores: {},
              metadata: { timestamp: new Date().toISOString() }
            }
            existing.scores.L3 = (existing.scores.L3 ?? 0) + score * 0.4  // Lexical weight
            if (!existing.content) existing.content = content
            candidates.set(messageId, existing)
          }
        }
      }

      // L4: Salience
      if (enabledLayers.includes('L4')) {
        const l4Result = this.getSalienceEntries(chatId, { limit: topK * 2 })
        if (l4Result.ok) {
          for (const entry of l4Result.value) {
            const existing = candidates.get(entry.messageId) ?? {
              content: entry.content,
              messageId: entry.messageId,
              scores: {},
              metadata: { timestamp: entry.createdAt }
            }
            existing.scores.L4 = entry.salienceScore * (entry.userPinned ? 1.5 : 1.0)
            existing.metadata.salienceScore = entry.salienceScore
            if (!existing.content) existing.content = entry.content
            candidates.set(entry.messageId, existing)
          }
        }
      }

      // L5: Co-occurrence (TODO: implement based on query concepts)
      // For now, skip L5 in retrieval as it requires concept extraction from query

      // Compute ensemble scores
      const results: MemoryResult[] = []
      for (const [messageId, candidate] of candidates) {
        let ensembleScore = 0
        let dominantLayer: MemoryLayer = 'L1'
        let maxLayerScore = 0

        for (const [layer, score] of Object.entries(candidate.scores)) {
          const weightedScore = score * weights[layer as MemoryLayer]
          ensembleScore += weightedScore

          if (weightedScore > maxLayerScore) {
            maxLayerScore = weightedScore
            dominantLayer = layer as MemoryLayer
          }
        }

        results.push({
          id: messageId,
          layer: dominantLayer,
          content: candidate.content,
          messageId: candidate.messageId,
          score: ensembleScore,
          metadata: candidate.metadata
        })
      }

      // Sort by score and return top-k
      results.sort((a, b) => b.score - a.score)

      log.debug('Retrieved memories', {
        chatId,
        query: query.query.slice(0, 50),
        candidates: candidates.size,
        returned: Math.min(topK, results.length)
      })

      return Result.ok(results.slice(0, topK))
    } catch (error) {
      log.error('Failed to retrieve memories', error as Error)
      return Result.err(Errors.memory.retrievalFailed(query.query, error as Error))
    }
  },

  /**
   * Compute dynamic weights based on query signals.
   */
  computeWeights(query: MemoryQuery): EnsembleWeights {
    const weights = { ...DEFAULT_ENSEMBLE_WEIGHTS }
    const queryLower = query.query.toLowerCase()

    // Temporal references boost L1
    if (/\b(recent|just|earlier|before|last|now)\b/.test(queryLower)) {
      weights.L1 += 0.25
    }

    // Affect boost L2
    if (query.affectBoost && query.affectBoost.length > 0) {
      weights.L2 += 0.20
    }

    // Certainty language boosts L3
    if (/\b(definitely|certainly|sure|always|never|exactly)\b/.test(queryLower)) {
      weights.L3 += 0.20
    }

    // Disruption references boost L4
    if (/\b(broke|failed|error|crash|bug|issue|problem|wrong)\b/.test(queryLower)) {
      weights.L4 += 0.25
    }

    // Social references boost L5
    if (/\b(usually|typically|common|often|people|everyone)\b/.test(queryLower)) {
      weights.L5 += 0.20
    }

    // Temporal bias adjustments
    if (query.temporalBias === 'recent') {
      weights.L1 += 0.15
      weights.L4 -= 0.10
    } else if (query.temporalBias === 'salient') {
      weights.L4 += 0.15
      weights.L1 -= 0.10
    }

    // Normalize to sum to 1.0
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    for (const key of Object.keys(weights) as MemoryLayer[]) {
      weights[key] /= total
    }

    return weights
  },

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Get memory configuration.
   */
  getConfig(): Result<MemoryConfig> {
    try {
      const rows = db.memory.query(`SELECT key, value FROM memory_config`).all() as Array<{
        key: string
        value: string
      }>

      const config: MemoryConfig = { ...DEFAULT_MEMORY_CONFIG }

      for (const row of rows) {
        switch (row.key) {
          case 'l1_max_tokens':
            config.l1MaxTokens = parseInt(row.value, 10)
            break
          case 'l1_overflow_callback':
            config.l1OverflowCallback = row.value as 'consolidate' | 'discard'
            break
          case 'l2_affect_threshold':
            config.l2AffectThreshold = parseFloat(row.value)
            break
          case 'l2_decay_rate':
            config.l2DecayRate = parseFloat(row.value)
            break
          case 'l3_embedding_model':
            config.l3EmbeddingModel = row.value
            break
          case 'l4_salience_threshold':
            config.l4SalienceThreshold = parseFloat(row.value)
            break
          case 'l5_temporal_decay_rate':
            config.l5TemporalDecayRate = parseFloat(row.value)
            break
          case 'consolidation_schedule':
            config.consolidationSchedule = parseInt(row.value, 10)
            break
          case 'memory_enabled':
            config.memoryEnabled = row.value === 'true'
            break
        }
      }

      return Result.ok(config)
    } catch (error) {
      log.error('Failed to get memory config', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT memory_config', error as Error))
    }
  },

  /**
   * Update memory configuration.
   */
  updateConfig(updates: Partial<MemoryConfig>): Result<void> {
    try {
      const now = new Date().toISOString()

      const keyMap: Record<keyof MemoryConfig, string> = {
        l1MaxTokens: 'l1_max_tokens',
        l1OverflowCallback: 'l1_overflow_callback',
        l2AffectThreshold: 'l2_affect_threshold',
        l2DecayRate: 'l2_decay_rate',
        l3EmbeddingModel: 'l3_embedding_model',
        l4SalienceThreshold: 'l4_salience_threshold',
        l5TemporalDecayRate: 'l5_temporal_decay_rate',
        consolidationSchedule: 'consolidation_schedule',
        memoryEnabled: 'memory_enabled'
      }

      for (const [key, value] of Object.entries(updates)) {
        const dbKey = keyMap[key as keyof MemoryConfig]
        if (dbKey) {
          const dbValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
          db.memory.run(
            `INSERT OR REPLACE INTO memory_config (key, value, updated_at) VALUES (?, ?, ?)`,
            [dbKey, dbValue, now]
          )
        }
      }

      log.info('Updated memory config', { updates })

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update memory config', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE memory_config', error as Error))
    }
  },

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get memory statistics for a chat.
   */
  getStats(chatId: ChatId): Result<MemoryStats> {
    try {
      // L1 stats
      const l1Stats = db.memory.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(token_count), 0) as tokens
         FROM l1_river WHERE chat_id = ? AND evicted_at IS NULL`
      ).get(chatId) as { count: number; tokens: number }

      // L2 stats
      const l2Stats = db.memory.query(
        `SELECT affect_category, COUNT(*) as count
         FROM l2_affect WHERE chat_id = ? AND is_muted = 0
         GROUP BY affect_category`
      ).all(chatId) as Array<{ affect_category: string; count: number }>

      const l2ByCategory: Record<AffectCategory, number> = {
        FRUSTRATED: 0, CONFUSED: 0, CURIOUS: 0, SATISFIED: 0, URGENT: 0, REFLECTIVE: 0
      }
      let l2Total = 0
      for (const row of l2Stats) {
        if (isAffectCategory(row.affect_category)) {
          l2ByCategory[row.affect_category] = row.count
          l2Total += row.count
        }
      }

      // L3 stats
      const l3VectorCount = (db.memory.query(
        `SELECT COUNT(*) as count FROM l3_vectors WHERE chat_id = ? AND is_muted = 0`
      ).get(chatId) as { count: number }).count

      const l3LexicalCount = (db.memory.query(
        `SELECT COUNT(*) as count FROM l3_lexical_meta WHERE chat_id = ? AND is_muted = 0`
      ).get(chatId) as { count: number }).count

      const l3EntityCount = (db.memory.query(
        `SELECT COUNT(*) as count FROM l3_entities WHERE chat_id = ? OR chat_id IS NULL`
      ).get(chatId) as { count: number }).count

      const l3RelationCount = (db.memory.query(
        `SELECT COUNT(*) as count FROM l3_relations WHERE is_muted = 0`
      ).get() as { count: number }).count

      // L4 stats
      const l4Stats = db.memory.query(
        `SELECT COUNT(*) as count, SUM(user_pinned) as pinned
         FROM l4_salience WHERE chat_id = ? AND is_muted = 0`
      ).get(chatId) as { count: number; pinned: number }

      // L5 stats
      const l5NodeCount = (db.memory.query(
        `SELECT COUNT(*) as count FROM l5_nodes WHERE chat_id = ? OR chat_id IS NULL`
      ).get(chatId) as { count: number }).count

      const l5EdgeCount = (db.memory.query(
        `SELECT COUNT(*) as count FROM l5_edges`
      ).get() as { count: number }).count

      // Last consolidation
      const lastConsolidation = db.memory.query(
        `SELECT completed_at FROM consolidation_runs
         WHERE chat_id = ? AND completed_at IS NOT NULL
         ORDER BY completed_at DESC LIMIT 1`
      ).get(chatId) as { completed_at: string } | null

      return Result.ok({
        chatId,
        l1: {
          entries: l1Stats.count,
          totalTokens: l1Stats.tokens
        },
        l2: {
          entries: l2Total,
          byCategory: l2ByCategory
        },
        l3: {
          vectors: l3VectorCount,
          lexicalEntries: l3LexicalCount,
          entities: l3EntityCount,
          relations: l3RelationCount
        },
        l4: {
          entries: l4Stats.count,
          pinned: l4Stats.pinned ?? 0
        },
        l5: {
          nodes: l5NodeCount,
          edges: l5EdgeCount
        },
        lastConsolidation: lastConsolidation?.completed_at
      })
    } catch (error) {
      log.error('Failed to get memory stats', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT memory stats', error as Error))
    }
  },

  // ===========================================================================
  // CONSOLIDATION TRACKING
  // ===========================================================================

  /**
   * Record a consolidation run.
   */
  recordConsolidationRun(run: ConsolidationRun): Result<void> {
    try {
      db.memory.run(
        `INSERT INTO consolidation_runs
         (id, chat_id, trigger_type, items_processed, summaries_created, conflicts_detected, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          run.id,
          run.chatId,
          run.triggerType,
          run.itemsProcessed,
          run.summariesCreated,
          run.conflictsDetected,
          run.startedAt,
          run.completedAt ?? null
        ]
      )

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to record consolidation run', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT consolidation_runs', error as Error))
    }
  },

  /**
   * Update consolidation run completion.
   */
  completeConsolidationRun(
    runId: string,
    updates: { itemsProcessed: number; summariesCreated: number; conflictsDetected: number }
  ): Result<void> {
    try {
      const now = new Date().toISOString()

      db.memory.run(
        `UPDATE consolidation_runs
         SET completed_at = ?, items_processed = ?, summaries_created = ?, conflicts_detected = ?
         WHERE id = ?`,
        [now, updates.itemsProcessed, updates.summariesCreated, updates.conflictsDetected, runId]
      )

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to complete consolidation run', error as Error)
      return Result.err(Errors.db.queryFailed('UPDATE consolidation_runs', error as Error))
    }
  },

  // ===========================================================================
  // EMBEDDING CACHE
  // ===========================================================================

  /**
   * Get cached embedding by content hash.
   */
  getCachedEmbedding(contentHash: string, model: string): Result<Buffer | null> {
    try {
      const row = db.memory.query(
        `SELECT embedding_blob FROM embedding_cache
         WHERE content_hash = ? AND embedding_model = ?`
      ).get(contentHash, model) as { embedding_blob: Buffer } | null

      if (row) {
        // Update last_accessed_at
        db.memory.run(
          `UPDATE embedding_cache SET last_accessed_at = ? WHERE content_hash = ?`,
          [new Date().toISOString(), contentHash]
        )
      }

      return Result.ok(row?.embedding_blob ?? null)
    } catch (error) {
      log.error('Failed to get cached embedding', error as Error)
      return Result.err(Errors.db.queryFailed('SELECT embedding_cache', error as Error))
    }
  },

  /**
   * Cache an embedding.
   */
  cacheEmbedding(
    contentHash: string,
    embedding: Float32Array,
    model: string
  ): Result<void> {
    try {
      const now = new Date().toISOString()
      const blob = serializeEmbedding(embedding)

      db.memory.run(
        `INSERT OR REPLACE INTO embedding_cache
         (content_hash, embedding_blob, embedding_model, dimensions, created_at, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [contentHash, blob, model, embedding.length, now, now]
      )

      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to cache embedding', error as Error)
      return Result.err(Errors.db.queryFailed('INSERT embedding_cache', error as Error))
    }
  }
}
