// =============================================================================
// MEMORY MODULE
// =============================================================================
// Multi-Modal Memory Architecture (M3A) - Public API

// Types
export type {
  // L1 Types
  L1RiverEntry,
  L1RiverRow,
  L1RiverStats,

  // L2 Types
  L2AffectEntry,
  L2AffectRow,
  AffectClassificationResult,

  // L3 Types
  L3VectorEntry,
  L3VectorRow,
  L3LexicalMeta,
  L3LexicalMetaRow,
  L3Entity,
  L3EntityRow,
  L3Relation,
  L3RelationRow,
  L3ResonanceResult,

  // L4 Types
  L4SalienceEntry,
  L4SalienceRow,

  // L5 Types
  L5Node,
  L5NodeRow,
  L5Edge,
  L5EdgeRow,

  // Retrieval Types
  MemoryQuery,
  MemoryResult,
  EnsembleWeights,

  // Consolidation Types
  ConsolidationRun,
  ConsolidationRunRow,

  // Curation Types
  CurationRequest,
  CurationResult,

  // Configuration Types
  MemoryConfig,

  // Statistics Types
  MemoryStats,

  // Embedding Types
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingCacheEntry,
  EmbeddingCacheRow,

  // Entity Extraction Types
  ExtractedEntity,
  ExtractedRelation,
  EntityExtractionResult,

  // Write Pipeline Types
  WriteResult
} from './types'

// Constants
export {
  DEFAULT_ENSEMBLE_WEIGHTS,
  DEFAULT_MEMORY_CONFIG
} from './types'

// Store
export { MemoryStore } from './memory-store'

// Similarity utilities
export {
  cosineSimilarity,
  euclideanDistance,
  dotProduct,
  normalize,
  serializeEmbedding,
  deserializeEmbedding,
  hashContent,
  findTopKSimilar,
  batchCosineSimilarity,
  averageEmbedding,
  estimateTokens,
  predictionError
} from './similarity'

// Affect classifier
export {
  classifyAffect,
  classifyAffectBatch,
  getAffectDistribution
} from './affect-classifier'

// Entity extractor
export {
  extractEntities,
  extractConcepts
} from './entity-extractor'

// Write pipeline
export {
  processMessage,
  processMessageBatch,
  type WritePipelineOptions
} from './write-pipeline'

// Consolidator
export {
  consolidate,
  startScheduledConsolidation,
  stopScheduledConsolidation,
  runMaintenance,
  clearChatMemory
} from './consolidator'
