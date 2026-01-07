// =============================================================================
// MEMORY TYPES (Frontend)
// =============================================================================
// Types for the M3A memory system on the frontend.

// Affect categories
export type AffectCategory =
  | 'FRUSTRATED'
  | 'CONFUSED'
  | 'CURIOUS'
  | 'SATISFIED'
  | 'URGENT'
  | 'REFLECTIVE'

// Memory layer identifiers
export type MemoryLayer = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

// Curation actions
export type CurationAction = 'PIN' | 'IMPORTANT' | 'MUTE' | 'AFFECT_TAG'

// Legacy Memory interface (kept for backwards compatibility)
export interface Memory {
  id: string
  summary: string
  content: string
  source: 'auto' | 'manual'
  sourceMessageId?: string
  relevance?: number
  timestamp: Date
  tags?: string[]
}

// Legacy ContextSummary interface
export interface ContextSummary {
  id: string
  chatId?: string
  summary: string
  lastUpdated: Date
  tokenCount: number
}

// =============================================================================
// M3A Types
// =============================================================================

// Retrieved memory result from ensemble
export interface MemoryResult {
  id: string
  layer: MemoryLayer
  content: string
  messageId: string
  score: number
  metadata: {
    affectCategory?: AffectCategory
    affectIntensity?: number
    salienceScore?: number
    resonance?: number
    timestamp: string
  }
}

// L1 River entry
export interface RiverEntry {
  id: string
  chatId: string
  messageId: string
  content: string
  tokenCount: number
  timestamp: string
}

// L1 River statistics
export interface RiverStats {
  totalEntries: number
  totalTokens: number
  oldestTimestamp?: string
  newestTimestamp?: string
}

// L2 Affect entry
export interface AffectEntry {
  id: string
  chatId: string
  messageId: string
  affectCategory: AffectCategory
  intensity: number
  reasoning?: string
  decayFactor: number
  createdAt: string
}

// L4 Salience entry
export interface SalienceEntry {
  id: string
  chatId: string
  messageId: string
  content: string
  salienceScore: number
  userPinned: boolean
  createdAt: string
}

// Related entity from graph
export interface RelatedEntity {
  entity: {
    id: string
    entityType: string
    entityValue: string
    canonicalForm?: string
  }
  distance: number
}

// Memory statistics
export interface MemoryStats {
  chatId: string
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

// Memory configuration
export interface MemoryConfig {
  l1MaxTokens: number
  l2AffectThreshold: number
  l2DecayRate: number
  l3EmbeddingModel: string
  l4SalienceThreshold: number
  l5TemporalDecayRate: number
  consolidationSchedule: number
  memoryEnabled: boolean
}

// Curation request
export interface CurationRequest {
  messageId: string
  chatId: string
  action: CurationAction
  content?: string  // Required for PIN
  metadata?: {
    affectTag?: AffectCategory
    affectIntensity?: number
    boostFactor?: number
    reason?: string
  }
}

// Retrieval query
export interface MemoryQuery {
  query: string
  chatId: string
  topK?: number
  layers?: MemoryLayer[]
  affectBoost?: AffectCategory[]
  temporalBias?: 'recent' | 'salient' | 'balanced'
}

// Consolidation run result
export interface ConsolidationRun {
  id: string
  chatId: string
  triggerType: 'overflow' | 'scheduled' | 'manual'
  itemsProcessed: number
  summariesCreated: number
  conflictsDetected: number
  startedAt: string
  completedAt?: string
}
