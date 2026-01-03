// =============================================================================
// DEEP RESEARCH - SHARED TYPE DEFINITIONS
// =============================================================================
// These types are shared between the frontend (mainview) and backend (bun).
// They define the complete data model for the Deep Research feature.
// =============================================================================

// =============================================================================
// RESEARCH SESSION TYPES
// =============================================================================

export type DepthProfile = 'light' | 'general' | 'exhaustive';

export const DEPTH_PROFILE_CONFIG: Record<DepthProfile, {
  label: string;
  maxSources: number;
  maxConcurrentReaders: number;
  estimatedMinutes: number;
  estimatedCostUsd: number;
}> = {
  light: {
    label: 'Light',
    maxSources: 10,
    maxConcurrentReaders: 2,
    estimatedMinutes: 2,
    estimatedCostUsd: 0.15,
  },
  general: {
    label: 'General',
    maxSources: 30,
    maxConcurrentReaders: 3,
    estimatedMinutes: 5,
    estimatedCostUsd: 0.45,
  },
  exhaustive: {
    label: 'Exhaustive',
    maxSources: 100,
    maxConcurrentReaders: 5,
    estimatedMinutes: 15,
    estimatedCostUsd: 1.50,
  },
};

export type SessionStatus =
  | 'idle'           // Not started
  | 'initializing'   // Breaking down query
  | 'scouting'       // Searching for sources
  | 'reading'        // Extracting from sources
  | 'synthesizing'   // Building report
  | 'paused'         // User paused
  | 'completed'      // Finished successfully
  | 'failed';        // Error occurred

export interface ResearchSession {
  id: string;
  query: string;
  depthProfile: DepthProfile;
  status: SessionStatus;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;

  // Stats
  stats: ResearchStats;

  // Configuration
  config: ResearchConfig;

  // User guidance
  guidance: SessionGuidance;

  // Report
  report?: Report;

  // Error if failed
  error?: string;

  // Chat integration
  chatId?: string;       // If spawned from chat
  messageId?: string;    // Message that triggered it
}

export interface ResearchStats {
  sourcesSearched: number;
  sourcesQueued: number;
  sourcesReading: number;
  sourcesCompleted: number;
  sourcesRejected: number;
  sourcesFailed: number;
  findingsExtracted: number;
  contradictionsFound: number;
  contradictionsResolved: number;
  sectionsCompleted: number;
  sectionsTotal: number;
  elapsedMs: number;
  estimatedCostUsd: number;

  // Agent counts
  activeScouts: number;
  activeReaders: number;
}

export interface ResearchConfig {
  maxSources: number;
  maxConcurrentReaders: number;
  maxConcurrentScouts: number;
  timeoutPerSourceMs: number;
  autoApprove: boolean;           // Auto-approve high-relevance sources
  autoApproveThreshold: number;   // Relevance score threshold (0-1)
}

export interface SessionGuidance {
  userNotes: GuidanceNote[];
  blockedDomains: string[];
  preferredDomains: string[];
  learnedPatterns: LearnedPattern[];
}

export interface GuidanceNote {
  id: string;
  content: string;
  createdAt: number;
}

export interface LearnedPattern {
  id: string;
  type: 'avoid' | 'prefer';
  pattern: string;
  description: string;
  confidence: number;
  learnedAt: number;
}

// =============================================================================
// SOURCE TYPES
// =============================================================================

export type SourceState =
  | 'pending'      // Discovered, waiting for approval
  | 'approved'     // User approved, queued for reading
  | 'reading'      // Currently being extracted
  | 'complete'     // Successfully extracted
  | 'rejected'     // User rejected
  | 'failed';      // Error during reading

export type SourceType =
  | 'article'
  | 'paper'
  | 'documentation'
  | 'forum'
  | 'news'
  | 'blog'
  | 'video'
  | 'unknown';

export type BiasIndicator =
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right'
  | 'unknown';

export interface Source {
  id: string;
  sessionId: string;

  // Basic info
  url: string;
  title: string;
  domain: string;
  path: string;
  favicon?: string;
  thumbnail?: string;
  snippet?: string;

  // Metadata
  type: SourceType;
  publishedAt?: number;
  author?: string;
  bias?: BiasIndicator;

  // State
  state: SourceState;
  stateChangedAt: number;

  // Attribution
  discoveredBy: string;    // Scout ID
  readBy?: string;         // Reader ID

  // Scoring (0-1 scale)
  relevanceScore: number;
  credibilityScore: number;
  freshnessScore: number;

  // Reading progress
  readProgress?: number;   // 0-1
  readStage?: 'fetching' | 'parsing' | 'extracting' | 'complete';

  // Results (when complete)
  findings: Finding[];
  readTimeMs?: number;
  tokenCount?: number;

  // User feedback
  userComment?: string;
  rejectionReason?: string;

  // Error (when failed)
  error?: string;

  // Timestamps
  discoveredAt: number;
  approvedAt?: number;
  completedAt?: number;
}

// =============================================================================
// FINDING & CITATION TYPES
// =============================================================================

export type FindingCategory =
  | 'statistic'
  | 'claim'
  | 'quote'
  | 'definition'
  | 'methodology'
  | 'conclusion'
  | 'background'
  | 'example';

export interface Finding {
  id: string;
  sourceId: string;
  sessionId: string;

  // Content
  content: string;
  category: FindingCategory;

  // Quality
  confidence: number;      // 0-1
  importance: number;      // 0-1

  // Source reference
  pageNumber?: number;
  paragraph?: number;
  originalText?: string;   // Exact quote from source

  // Metadata
  extractedAt: number;
}

export interface Citation {
  id: string;
  marker: string;          // "[1]", "[2]", etc.
  sourceId: string;
  findingId?: string;

  // Display info
  text: string;            // The text being cited
  sourceTitle: string;
  sourceUrl: string;
  sourceDomain: string;

  // Position in report
  sectionId: string;
  position: number;        // Character position
}

// =============================================================================
// CONTRADICTION TYPES
// =============================================================================

export type ContradictionStatus = 'unresolved' | 'resolved' | 'dismissed';
export type ResolutionType = 'trust_a' | 'trust_b' | 'use_both' | 'tiebreaker' | 'dismiss';

export interface Contradiction {
  id: string;
  sessionId: string;

  // The conflicting claims
  claimA: ContradictionClaim;
  claimB: ContradictionClaim;

  // Status
  status: ContradictionStatus;

  // Resolution (if resolved)
  resolution?: {
    type: ResolutionType;
    explanation?: string;
    tiebreakerSourceId?: string;
    resolvedAt: number;
  };

  // Metadata
  topic: string;           // What they disagree about
  severity: 'minor' | 'moderate' | 'major';
  detectedAt: number;
}

export interface ContradictionClaim {
  findingId: string;
  sourceId: string;
  text: string;
  sourceTitle: string;
  sourceDomain: string;
  sourceBias?: BiasIndicator;
  sourceDate?: number;
  sourceType?: SourceType;
}

// =============================================================================
// REPORT TYPES
// =============================================================================

export type SectionStatus = 'pending' | 'generating' | 'complete';

export interface ReportSection {
  id: string;
  reportId: string;

  // Structure
  order: number;
  level: number;           // 1, 2, 3 for H1, H2, H3
  title: string;

  // Content
  content: string;         // Markdown with citation markers [1][2]
  summary?: string;        // Brief summary

  // References
  citations: Citation[];
  contradictions: Contradiction[];

  // Stats
  wordCount: number;
  findingsUsed: number;

  // Status
  status: SectionStatus;
  generatedAt?: number;
}

export interface Report {
  id: string;
  sessionId: string;

  // Header
  title: string;
  subtitle?: string;
  summary: string;

  // Content
  sections: ReportSection[];
  tableOfContents: TOCEntry[];

  // Stats
  totalWordCount: number;
  totalCitations: number;
  totalContradictions: number;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface TOCEntry {
  id: string;
  sectionId: string;
  title: string;
  level: number;
  status: SectionStatus;
}

// =============================================================================
// GALAXY VISUALIZATION TYPES
// =============================================================================

export type GalaxyViewMode = 'sovereign' | 'galaxy' | 'immersive';

export interface GalaxyNode {
  id: string;
  type: 'core' | 'sub_query' | 'source';

  // Position (computed by layout)
  position: [number, number, number];
  targetPosition: [number, number, number];
  velocity: [number, number, number];

  // Visual properties
  radius: number;
  color: string;
  emissiveIntensity: number;
  opacity: number;

  // For source nodes
  sourceId?: string;
  state?: SourceState;
  relevance?: number;

  // For query nodes
  label?: string;
  sectionId?: string;

  // Thumbnail
  thumbnail?: {
    url: string;
    loaded: boolean;
  };

  // Connections
  connections: GalaxyConnection[];
}

export interface GalaxyConnection {
  targetId: string;
  type: 'citation' | 'similarity' | 'contradiction' | 'hierarchy';
  strength: number;
  visible: boolean;
}

export interface GalaxyEdge {
  id: string;
  from: string;
  to: string;
  type: 'citation' | 'similarity' | 'contradiction' | 'hierarchy';
  strength: number;
  color: string;
  animated: boolean;
}

export interface ScoutAgent {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  target: [number, number, number] | null;
  state: 'searching' | 'found' | 'returning' | 'idle';
  trail: [number, number, number][];
  color: string;
}

export interface GalaxyState {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  scouts: ScoutAgent[];

  // Core
  corePosition: [number, number, number];
  coreRadius: number;
  corePulsePhase: number;

  // Camera
  viewMode: GalaxyViewMode;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];

  // Highlight
  highlightedNodeId?: string;
  highlightedEdgeIds: string[];

  // Animation
  isAnimating: boolean;
  animationProgress: number;
}

export interface CameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
  timestamp: number;
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

// =============================================================================
// CINEMATIC TYPES
// =============================================================================

export type CinematicStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'complete';

export interface CinematicScript {
  id: string;
  sessionId: string;

  // Timing
  totalDuration: number;

  // Segments
  segments: CinematicSegment[];

  // Word timings for text reveal
  wordTimings: WordTiming[];

  // Camera path
  cameraPath: CameraKeyframe[];

  // Generated
  generatedAt: number;
}

export type CinematicSegmentType = 'title' | 'section' | 'narration' | 'media' | 'transition' | 'conclusion';

export interface CinematicSegment {
  id: string;
  type: CinematicSegmentType;

  // Timing
  startTime: number;
  duration: number;

  // Content (varies by type)
  content: {
    // For title/section
    title?: string;
    subtitle?: string;

    // For narration
    text?: string;
    ttsUrl?: string;
    sectionId?: string;

    // For media
    mediaType?: 'image' | 'chart' | 'video';
    mediaUrl?: string;
    mediaPrompt?: string;

    // For transition
    transitionType?: 'fade' | 'zoom' | 'pan' | 'section_change';

    // Galaxy instructions
    highlightNodes?: string[];
    cameraTarget?: [number, number, number];
  };
}

export interface WordTiming {
  word: string;
  sectionId: string;
  paragraphIndex: number;
  wordIndex: number;
  startTime: number;
  endTime: number;
}

export interface CinematicState {
  status: CinematicStatus;
  script?: CinematicScript;

  // Playback
  currentTime: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;

  // Current segment
  currentSegmentIndex: number;

  // Text reveal
  revealedWordIndex: number;
  currentSectionId?: string;

  // Loading
  loadProgress: number;
  loadingStage?: string;
}

// =============================================================================
// MEDIA GENERATION TYPES
// =============================================================================

export type MediaType = 'hero_image' | 'concept_diagram' | 'chart' | 'video_broll';
export type MediaStatus = 'pending' | 'generating' | 'complete' | 'failed';

export interface MediaAsset {
  id: string;
  sessionId: string;
  sectionId?: string;

  type: MediaType;
  status: MediaStatus;

  // Generation
  prompt?: string;
  generatedUrl?: string;

  // For charts
  chartType?: 'bar' | 'line' | 'pie' | 'comparison';
  chartData?: unknown;

  // Metadata
  width?: number;
  height?: number;
  duration?: number;  // For video
  cost?: number;

  // Timestamps
  requestedAt: number;
  completedAt?: number;

  // Error
  error?: string;
}

// =============================================================================
// CHAT EMBED TYPES
// =============================================================================

export interface ResearchEmbedData {
  sessionId: string;
  query: string;
  status: SessionStatus;
  depthProfile: DepthProfile;
  stats: ResearchStats;
  reportPreview?: string;  // First ~200 chars
  reportTitle?: string;
}

// =============================================================================
// WEBSOCKET EVENT TYPES
// =============================================================================

export type ResearchEventType =
  // Session events
  | 'session:created'
  | 'session:started'
  | 'session:paused'
  | 'session:resumed'
  | 'session:completed'
  | 'session:failed'
  | 'session:stats-updated'

  // Source events
  | 'source:discovered'
  | 'source:approved'
  | 'source:rejected'
  | 'source:reading-started'
  | 'source:reading-progress'
  | 'source:completed'
  | 'source:failed'

  // Finding events
  | 'finding:extracted'

  // Contradiction events
  | 'contradiction:detected'
  | 'contradiction:resolved'

  // Report events
  | 'report:section-started'
  | 'report:section-progress'
  | 'report:section-completed'
  | 'report:completed'

  // Galaxy events
  | 'galaxy:scout-moved'
  | 'galaxy:node-added'
  | 'galaxy:node-updated'
  | 'galaxy:edge-added'

  // Cinematic events
  | 'cinematic:ready'
  | 'cinematic:media-generated';

export interface ResearchEvent<T = unknown> {
  type: ResearchEventType;
  sessionId: string;
  timestamp: number;
  data: T;
}

// =============================================================================
// WEBSOCKET REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateSessionRequest {
  query: string;
  depthProfile: DepthProfile;
  chatId?: string;
  messageId?: string;
}

export interface CreateSessionResponse {
  session: ResearchSession;
}

export interface GetSessionRequest {
  sessionId: string;
}

export interface GetSessionResponse {
  session: ResearchSession;
  sources: Source[];
  report?: Report;
}

export interface ApproveSourceRequest {
  sessionId: string;
  sourceId: string;
  comment?: string;
}

export interface RejectSourceRequest {
  sessionId: string;
  sourceId: string;
  reason?: string;
  blockDomain?: boolean;
}

export interface ResolveContradictionRequest {
  sessionId: string;
  contradictionId: string;
  resolution: ResolutionType;
  explanation?: string;
}

export interface UpdateGuidanceRequest {
  sessionId: string;
  guidance: Partial<SessionGuidance>;
}

export interface ExportRequest {
  sessionId: string;
  format: 'markdown' | 'pdf' | 'html' | 'json';
}

export interface ExportResponse {
  url?: string;
  content?: string;
  filename: string;
}
