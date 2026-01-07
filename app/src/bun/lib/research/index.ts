// =============================================================================
// RESEARCH MODULE
// =============================================================================
// Re-exports all research functionality.

export { NanoGPTService } from './nanogpt-service'
export type {
  SearchProvider,
  SearchDepth,
  WebSearchRequest,
  WebSearchResult,
  ScoredSearchResult,
  SourcedAnswerResult,
  ScrapeRequest,
  ScrapeResult,
  YouTubeTranscribeRequest,
  YouTubeTranscribeResult,
  MultiSearchRequest,
  RateLimitStatus,
  CostEstimate,
} from './nanogpt-service'

export { ResearchOrchestrator } from './research-orchestrator'
export type { OrchestratorConfig } from './research-orchestrator'
