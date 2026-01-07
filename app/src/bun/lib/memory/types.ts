// =============================================================================
// MEMORY TYPES (M3A)
// =============================================================================
// TypeScript interfaces for the Multi-Modal Memory Architecture.

import type {
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
  AffectCategory,
  EntityType,
  RelationType,
  CooccurrenceNodeType,
  CurationAction,
  MemoryLayer
} from '../core/types'

// =============================================================================
// L1: RIVER - Sliding Window Buffer
// =============================================================================

export interface L1RiverEntry {
  id: L1RiverId
  chatId: ChatId
  messageId: MessageId
  content: string
  tokenCount: number
  timestamp: string
  evictedAt?: string
}

export interface L1RiverRow {
  id: string
  chat_id: string
  message_id: string
  content: string
  token_count: number
  timestamp: string
  evicted_at: string | null
}

export interface L1RiverStats {
  totalEntries: number
  totalTokens: number
  oldestTimestamp?: string
  newestTimestamp?: string
}

// =============================================================================
// L2: FEELING - Affective State Index
// =============================================================================

export interface L2AffectEntry {
  id: L2AffectId
  chatId: ChatId
  messageId: MessageId
  affectCategory: AffectCategory
  intensity: number  // 0.0 - 1.0
  reasoning?: string
  decayFactor: number
  isMuted: boolean
  createdAt: string
  lastAccessedAt: string
}

export interface L2AffectRow {
  id: string
  chat_id: string
  message_id: string
  affect_category: string
  intensity: number
  reasoning: string | null
  decay_factor: number
  is_muted: number
  created_at: string
  last_accessed_at: string
}

export interface AffectClassificationResult {
  category: AffectCategory
  intensity: number
  reasoning: string
}

// =============================================================================
// L3: ECHO - Redundant Encoding (Vector + Lexical + Graph)
// =============================================================================

// L3.1 - Vector embeddings
export interface L3VectorEntry {
  id: L3VectorId
  chatId: ChatId
  messageId: MessageId
  contentHash: string
  embeddingBlob: Buffer
  embeddingModel: string
  dimensions: number
  boostFactor: number
  isMuted: boolean
  createdAt: string
}

export interface L3VectorRow {
  id: string
  chat_id: string
  message_id: string
  content_hash: string
  embedding_blob: Buffer
  embedding_model: string
  dimensions: number
  boost_factor: number
  is_muted: number
  created_at: string
}

// L3.2 - Lexical metadata
export interface L3LexicalMeta {
  messageId: MessageId
  chatId: ChatId
  boostFactor: number
  isMuted: boolean
  createdAt: string
}

export interface L3LexicalMetaRow {
  message_id: string
  chat_id: string
  boost_factor: number
  is_muted: number
  created_at: string
}

// L3.3 - Entity-relation graph
export interface L3Entity {
  id: L3EntityId
  entityType: EntityType
  entityValue: string
  canonicalForm?: string
  chatId?: ChatId
  firstSeenAt: string
  lastSeenAt: string
}

export interface L3EntityRow {
  id: string
  entity_type: string
  entity_value: string
  canonical_form: string | null
  chat_id: string | null
  first_seen_at: string
  last_seen_at: string
}

export interface L3Relation {
  id: L3RelationId
  sourceEntityId: L3EntityId
  targetEntityId: L3EntityId
  relationType: RelationType
  contextMessageId: MessageId
  confidence: number
  isMuted: boolean
  createdAt: string
}

export interface L3RelationRow {
  id: string
  source_entity_id: string
  target_entity_id: string
  relation_type: string
  context_message_id: string
  confidence: number
  is_muted: number
  created_at: string
}

// Resonance score - how many L3 encodings match
export interface L3ResonanceResult {
  messageId: MessageId
  vectorScore: number
  lexicalScore: number
  graphScore: number
  resonance: number  // 0-3 (found in how many encodings)
}

// =============================================================================
// L4: WOUND - Salience Marker Store
// =============================================================================

export interface L4SalienceEntry {
  id: L4SalienceId
  chatId: ChatId
  messageId: MessageId
  content: string
  salienceScore: number
  predictionError?: number
  userPinned: boolean
  retentionPriority: number
  isMuted: boolean
  createdAt: string
  lastAccessedAt: string
}

export interface L4SalienceRow {
  id: string
  chat_id: string
  message_id: string
  content: string
  salience_score: number
  prediction_error: number | null
  user_pinned: number
  retention_priority: number
  is_muted: number
  created_at: string
  last_accessed_at: string
}

// =============================================================================
// L5: COMPANION - Co-occurrence Graph
// =============================================================================

export interface L5Node {
  id: L5NodeId
  nodeType: CooccurrenceNodeType
  nodeValue: string
  chatId?: ChatId
  firstSeenAt: string
  lastSeenAt: string
}

export interface L5NodeRow {
  id: string
  node_type: string
  node_value: string
  chat_id: string | null
  first_seen_at: string
  last_seen_at: string
}

export interface L5Edge {
  id: L5EdgeId
  sourceNodeId: L5NodeId
  targetNodeId: L5NodeId
  weight: number
  temporalDecay: number
  lastReinforcedAt: string
  createdAt: string
}

export interface L5EdgeRow {
  id: string
  source_node_id: string
  target_node_id: string
  weight: number
  temporal_decay: number
  last_reinforced_at: string
  created_at: string
}

// =============================================================================
// RETRIEVAL & ENSEMBLE
// =============================================================================

export interface MemoryQuery {
  query: string
  chatId: ChatId
  topK?: number
  layers?: MemoryLayer[]
  affectBoost?: AffectCategory[]
  temporalBias?: 'recent' | 'salient' | 'balanced'
}

export interface MemoryResult {
  id: string
  layer: MemoryLayer
  content: string
  messageId: MessageId
  score: number
  metadata: {
    affectCategory?: AffectCategory
    affectIntensity?: number
    salienceScore?: number
    resonance?: number
    timestamp: string
  }
}

export interface EnsembleWeights {
  L1: number
  L2: number
  L3: number
  L4: number
  L5: number
}

export const DEFAULT_ENSEMBLE_WEIGHTS: EnsembleWeights = {
  L1: 0.20,
  L2: 0.20,
  L3: 0.25,
  L4: 0.20,
  L5: 0.15
}

// =============================================================================
// CONSOLIDATION
// =============================================================================

export interface ConsolidationRun {
  id: string
  chatId: ChatId
  triggerType: 'overflow' | 'scheduled' | 'manual'
  itemsProcessed: number
  summariesCreated: number
  conflictsDetected: number
  startedAt: string
  completedAt?: string
}

export interface ConsolidationRunRow {
  id: string
  chat_id: string
  trigger_type: string
  items_processed: number
  summaries_created: number
  conflicts_detected: number
  started_at: string
  completed_at: string | null
}

// =============================================================================
// CURATION API
// =============================================================================

export interface CurationRequest {
  messageId: MessageId
  chatId: ChatId
  action: CurationAction
  metadata?: {
    affectTag?: AffectCategory
    affectIntensity?: number
    reason?: string
  }
}

export interface CurationResult {
  success: boolean
  action: CurationAction
  messageId: MessageId
  affectedLayers: MemoryLayer[]
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface MemoryConfig {
  l1MaxTokens: number
  l1OverflowCallback: 'consolidate' | 'discard'
  l2AffectThreshold: number
  l2DecayRate: number
  l3EmbeddingModel: string
  l4SalienceThreshold: number
  l5TemporalDecayRate: number
  consolidationSchedule: number  // seconds
  memoryEnabled: boolean
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  l1MaxTokens: 8000,
  l1OverflowCallback: 'consolidate',
  l2AffectThreshold: 0.3,
  l2DecayRate: 0.95,
  l3EmbeddingModel: 'openai:text-embedding-3-small',
  l4SalienceThreshold: 0.7,
  l5TemporalDecayRate: 0.98,
  consolidationSchedule: 3600,
  memoryEnabled: true
}

// =============================================================================
// EMBEDDING TYPES
// =============================================================================

export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: Float32Array
  model: string
  dimensions: number
  cached: boolean
}

export interface EmbeddingCacheEntry {
  contentHash: string
  embeddingBlob: Buffer
  embeddingModel: string
  dimensions: number
  createdAt: string
  lastAccessedAt: string
}

export interface EmbeddingCacheRow {
  content_hash: string
  embedding_blob: Buffer
  embedding_model: string
  dimensions: number
  created_at: string
  last_accessed_at: string
}

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

export interface ExtractedEntity {
  type: EntityType
  value: string
  canonicalForm?: string
}

export interface ExtractedRelation {
  sourceEntity: ExtractedEntity
  targetEntity: ExtractedEntity
  relationType: RelationType
  confidence: number
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[]
  relations: ExtractedRelation[]
}

// =============================================================================
// WRITE PIPELINE
// =============================================================================

export interface WriteResult {
  l1: { success: boolean; id?: L1RiverId }
  l2: { success: boolean; id?: L2AffectId; skipped?: boolean }
  l3Vector: { success: boolean; id?: L3VectorId; cached?: boolean }
  l3Lexical: { success: boolean }
  l3Graph: { success: boolean; entities?: number; relations?: number }
  l4: { success: boolean; id?: L4SalienceId; skipped?: boolean }
  l5: { success: boolean; nodes?: number; edges?: number }
  consolidationTriggered: boolean
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface MemoryStats {
  chatId: ChatId
  l1: {
    entries: number
    totalTokens: number
  }
  l2: {
    entries: number
    byCategory: Record<AffectCategory, number>
  }
  l3: {
    vectors: number
    lexicalEntries: number
    entities: number
    relations: number
  }
  l4: {
    entries: number
    pinned: number
  }
  l5: {
    nodes: number
    edges: number
  }
  lastConsolidation?: string
}
