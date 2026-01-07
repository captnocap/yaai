// =============================================================================
// RESEARCH STORE TYPES
// =============================================================================
// Type definitions for research store. Re-exports shared types and adds
// store-specific types for database rows and inputs.

import type { ChatId, Brand, PaginatedResult, generateId } from '../core'

// Re-export all shared research types
export type {
  DepthProfile,
  SessionStatus,
  ResearchSession,
  ResearchStats,
  ResearchConfig,
  SessionGuidance,
  GuidanceNote,
  LearnedPattern,
  SourceState,
  SourceType,
  BiasIndicator,
  Source,
  FindingCategory,
  Finding,
  Citation,
  ContradictionStatus,
  ResolutionType,
  Contradiction,
  ContradictionClaim,
  SectionStatus,
  ReportSection,
  Report,
  TOCEntry,
  ResearchEventType,
  ResearchEvent,
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionRequest,
  GetSessionResponse,
  ApproveSourceRequest,
  RejectSourceRequest,
  ResolveContradictionRequest,
  UpdateGuidanceRequest,
  ExportRequest,
  ExportResponse,
} from '../../../shared/research-types'

export { DEPTH_PROFILE_CONFIG } from '../../../shared/research-types'

// -----------------------------------------------------------------------------
// Branded ID Types
// -----------------------------------------------------------------------------

export type ResearchSessionId = Brand<string, 'ResearchSessionId'>
export type SourceId = Brand<string, 'SourceId'>
export type FindingId = Brand<string, 'FindingId'>
export type ContradictionId = Brand<string, 'ContradictionId'>
export type ReportId = Brand<string, 'ReportId'>
export type ReportSectionId = Brand<string, 'ReportSectionId'>

// ID factories
export const ResearchSessionId = (id: string): ResearchSessionId => id as ResearchSessionId
export const SourceId = (id: string): SourceId => id as SourceId
export const FindingId = (id: string): FindingId => id as FindingId
export const ContradictionId = (id: string): ContradictionId => id as ContradictionId
export const ReportId = (id: string): ReportId => id as ReportId
export const ReportSectionId = (id: string): ReportSectionId => id as ReportSectionId

// ID generators (using crypto.randomUUID)
export const newResearchSessionId = (): ResearchSessionId => ResearchSessionId(crypto.randomUUID())
export const newSourceId = (): SourceId => SourceId(crypto.randomUUID())
export const newFindingId = (): FindingId => FindingId(crypto.randomUUID())
export const newContradictionId = (): ContradictionId => ContradictionId(crypto.randomUUID())
export const newReportId = (): ReportId => ReportId(crypto.randomUUID())
export const newReportSectionId = (): ReportSectionId => ReportSectionId(crypto.randomUUID())

// -----------------------------------------------------------------------------
// Database Row Types
// -----------------------------------------------------------------------------

export interface ResearchSessionRow {
  id: string
  query: string
  depth_profile: string
  status: string
  config: string       // JSON
  guidance: string     // JSON
  stats: string        // JSON
  chat_id: string | null
  message_id: string | null
  error: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export interface SourceRow {
  id: string
  session_id: string
  url: string
  title: string | null
  domain: string
  path: string | null
  favicon: string | null
  thumbnail: string | null
  snippet: string | null
  source_type: string
  published_at: string | null
  author: string | null
  bias: string
  state: string
  state_changed_at: string
  discovered_by: string | null
  read_by: string | null
  providers: string           // JSON array
  relevance_score: number
  credibility_score: number
  freshness_score: number
  provider_boost: number
  read_progress: number
  read_stage: string | null
  content: string | null
  read_time_ms: number | null
  token_count: number | null
  user_comment: string | null
  rejection_reason: string | null
  error: string | null
  discovered_at: string
  approved_at: string | null
  completed_at: string | null
}

export interface FindingRow {
  id: string
  source_id: string
  session_id: string
  content: string
  category: string
  confidence: number
  importance: number
  page_number: number | null
  paragraph: number | null
  original_text: string | null
  extracted_at: string
}

export interface ContradictionRow {
  id: string
  session_id: string
  claim_a: string           // JSON
  claim_b: string           // JSON
  status: string
  resolution: string | null // JSON
  topic: string | null
  severity: string
  detected_at: string
}

export interface ReportRow {
  id: string
  session_id: string
  title: string
  subtitle: string | null
  summary: string | null
  table_of_contents: string // JSON
  total_word_count: number
  total_citations: number
  total_contradictions: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface ReportSectionRow {
  id: string
  report_id: string
  section_order: number
  level: number
  title: string
  content: string | null
  summary: string | null
  citations: string        // JSON
  contradictions: string   // JSON
  word_count: number
  findings_used: number
  status: string
  generated_at: string | null
}

// -----------------------------------------------------------------------------
// Input Types
// -----------------------------------------------------------------------------

import type {
  DepthProfile,
  ResearchConfig,
  SessionGuidance,
  ResearchStats,
  SourceState,
  SourceType,
  BiasIndicator,
  FindingCategory,
  ContradictionClaim,
  ResolutionType,
  SectionStatus,
  Citation,
  Contradiction,
} from '../../../shared/research-types'

export interface CreateSessionInput {
  query: string
  depthProfile: DepthProfile
  chatId?: ChatId
  messageId?: string
  config?: Partial<ResearchConfig>
}

export interface CreateSourceInput {
  sessionId: ResearchSessionId
  url: string
  title?: string
  domain: string
  path?: string
  favicon?: string
  thumbnail?: string
  snippet?: string
  type?: SourceType
  publishedAt?: number
  author?: string
  bias?: BiasIndicator
  discoveredBy?: string
  providers?: string[]
  relevanceScore?: number
  credibilityScore?: number
  freshnessScore?: number
  providerBoost?: number
}

export interface UpdateSourceInput {
  title?: string
  state?: SourceState
  readBy?: string
  readProgress?: number
  readStage?: 'fetching' | 'parsing' | 'extracting' | 'complete'
  content?: string
  readTimeMs?: number
  tokenCount?: number
  userComment?: string
  rejectionReason?: string
  error?: string
  approvedAt?: string
  completedAt?: string
}

export interface CreateFindingInput {
  sourceId: SourceId
  sessionId: ResearchSessionId
  content: string
  category: FindingCategory
  confidence?: number
  importance?: number
  pageNumber?: number
  paragraph?: number
  originalText?: string
}

export interface CreateContradictionInput {
  sessionId: ResearchSessionId
  claimA: ContradictionClaim
  claimB: ContradictionClaim
  topic?: string
  severity?: 'minor' | 'moderate' | 'major'
}

export interface ResolveContradictionInput {
  type: ResolutionType
  explanation?: string
  tiebreakerSourceId?: string
}

export interface CreateReportInput {
  sessionId: ResearchSessionId
  title: string
  subtitle?: string
  summary?: string
}

export interface CreateReportSectionInput {
  reportId: ReportId
  order: number
  level?: number
  title: string
  content?: string
  summary?: string
}

export interface UpdateReportSectionInput {
  content?: string
  summary?: string
  citations?: Citation[]
  contradictions?: Contradiction[]
  wordCount?: number
  findingsUsed?: number
  status?: SectionStatus
}

// -----------------------------------------------------------------------------
// Query Options
// -----------------------------------------------------------------------------

export interface ListSessionsOptions {
  limit?: number
  offset?: number
  status?: string
  chatId?: ChatId
  orderBy?: 'createdAt' | 'updatedAt' | 'startedAt'
  order?: 'asc' | 'desc'
}

export interface ListSourcesOptions {
  state?: SourceState | SourceState[]
  orderBy?: 'discoveredAt' | 'relevanceScore' | 'state'
  order?: 'asc' | 'desc'
}

// -----------------------------------------------------------------------------
// Result Types
// -----------------------------------------------------------------------------

import type { ResearchSession, Source, Finding, Report } from '../../../shared/research-types'

export interface SessionWithData {
  session: ResearchSession
  sources: Source[]
  report?: Report
}

export type SessionListResult = PaginatedResult<ResearchSession>
