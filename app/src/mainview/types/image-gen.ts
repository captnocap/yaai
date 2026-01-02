// =============================================================================
// IMAGE GENERATION TYPES
// =============================================================================
// Type definitions for the image generation feature.
// Covers queue management, job execution, API payloads, and compression.

// -----------------------------------------------------------------------------
// ASPECT RATIOS
// -----------------------------------------------------------------------------

export type AspectRatio =
  | '21:9'
  | '16:9'
  | '9:16'
  | '5:4'
  | '4:3'
  | '3:4'
  | '2:3'
  | '3:2'
  | 'square'
  | 'auto';

// -----------------------------------------------------------------------------
// RESOLUTION
// -----------------------------------------------------------------------------

export type ResolutionPreset = '1k' | '2k' | '4k' | '8k' | 'auto';

export interface ResolutionConfig {
  type: 'dimensions' | 'preset';
  width?: number;
  height?: number;
  preset?: ResolutionPreset;
  aspectRatio?: AspectRatio | null;
}

// -----------------------------------------------------------------------------
// REFERENCE PATTERNS
// -----------------------------------------------------------------------------

export type ReferenceType =
  | 'explicit'         // specific file path
  | 'random'           // !folder - one random from folder
  | 'random-recursive' // !!folder - one random from folder + subdirs
  | 'all'              // !!folder!! - all from folder
  | 'random-global'    // !#N - N random from entire tree
  | 'wildcard';        // {a|b|c} - pick one option

export interface ReferencePattern {
  id: string;
  type: ReferenceType;
  path: string;         // supports $aliases
  count?: number;       // for 'random-global' type
}

export interface ResolvedReference {
  originalPattern: ReferencePattern;
  resolvedPaths: string[];
  base64Data: string[];
}

// -----------------------------------------------------------------------------
// PROMPT CONFIGURATION
// -----------------------------------------------------------------------------

export type PromptType = 'library' | 'inline' | 'wildcard';

export interface PromptConfig {
  type: PromptType;
  // For 'library': filename without extension
  // For 'inline': the actual prompt text
  // For 'wildcard': array of library prompt names
  value: string | string[];
}

// -----------------------------------------------------------------------------
// EXTENDED PARAMETERS (MODEL-SPECIFIC)
// -----------------------------------------------------------------------------

export interface ExtendedParams {
  aspectRatio?: AspectRatio;
  steps?: number;           // riverflow
  cfgScale?: number;        // riverflow
  strength?: number;        // riverflow
  seed?: number | null;     // null = random
  guidanceScale?: number;   // seedream
  safetyChecker?: boolean;  // seedream
}

// -----------------------------------------------------------------------------
// QUEUE ENTRY
// -----------------------------------------------------------------------------

export type ExecutionMode = 'fixed' | 'target';

export interface QueueEntry {
  id: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;

  // Prompt Configuration
  prompt: PromptConfig;

  // Generation Settings
  resolution: ResolutionConfig;
  imagesPerBatch: number;   // 1-10
  batchCount: number;       // for fixed mode
  model: string;
  style: string | null;

  // Reference Images
  references: ReferencePattern[];

  // Extended Parameters (model-specific)
  extParams: ExtendedParams;

  // Execution Mode
  executionMode: ExecutionMode;
  targetImages: number | null;  // for target mode
  tolerance: number;            // for target mode, default 3
}

// -----------------------------------------------------------------------------
// QUEUE GROUP
// -----------------------------------------------------------------------------

export interface QueueGroup {
  id: string;
  name: string;
  collapsed: boolean;
  sortOrder: number;
  entries: string[];  // QueueEntry IDs in order
  createdAt: number;
  updatedAt: number;
}

// -----------------------------------------------------------------------------
// JOB STATE (RUNTIME)
// -----------------------------------------------------------------------------

export type JobState =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobStats {
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
  totalImages: number;
  expectedBatches: number;
  expectedImages: number;
}

export interface JobError {
  message: string;
  code: number | null;
  timestamp: number;
  batchIndex: number;
  details: string | null;
  hint: string | null;
}

export interface JobLiveConfig {
  targetImages: number;
  paused: boolean;
}

export interface Job {
  id: string;
  queueEntryId: string;
  state: JobState;

  // Timing
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;

  // Progress
  stats: JobStats;

  // Failure Tracking
  consecutiveFailures: number;
  lastError: JobError | null;
  autoPaused: boolean;
  pauseReason: string | null;

  // Live Configuration (can be modified during execution)
  liveConfig: JobLiveConfig;

  // Resolved References (cached after first resolution)
  resolvedReferences: ResolvedReference[] | null;
}

// -----------------------------------------------------------------------------
// BATCH REQUEST
// -----------------------------------------------------------------------------

export type BatchState = 'queued' | 'in-flight' | 'completed' | 'failed';

export interface SavedFile {
  filename: string;
  path: string;
  size: number;
}

export interface BatchRequest {
  id: string;
  jobId: string;
  batchIndex: number;
  state: BatchState;

  // Timing
  queuedAt: number;
  startedAt: number | null;
  completedAt: number | null;

  // Result
  imageCount: number;
  savedFiles: SavedFile[];
  error: JobError | null;

  // Request Details (for debugging/retry)
  promptUsed: string;
  referencesUsed: string[];
  modelUsed: string;
}

// -----------------------------------------------------------------------------
// API PAYLOADS
// -----------------------------------------------------------------------------

export type PayloadType = 'standard' | 'resolution';

/** Standard models (width/height based) */
export interface StandardPayload {
  prompt: string;
  model: string;
  width: number;
  height: number;
  nImages: number;         // 1-10
  responseFormat: 'b64_json';
  showExplicitContent: boolean;

  // Optional
  imageDataUrls?: string[];  // data:image/png;base64,<data>
  style?: string;

  // Model-specific (seedream)
  guidance_scale?: number;
  enable_safety_checker?: boolean;
}

/** Resolution-based models */
export interface ResolutionPayload {
  prompt: string;
  model: string;
  resolution: ResolutionPreset;
  aspect_ratio?: AspectRatio;
  nImages: number;
  responseFormat: 'b64_json';
  showExplicitContent: boolean;

  // Optional
  imageDataUrls?: string[];
  style?: string;

  // riverflow-specific
  steps?: number;
  CFGScale?: number;
  strength?: number;

  // wan-specific
  seed?: number;
}

export type APIPayload = StandardPayload | ResolutionPayload;

// -----------------------------------------------------------------------------
// API RESPONSE
// -----------------------------------------------------------------------------

export interface ImageResult {
  b64_json?: string;
  image?: string;  // alternate field name
}

export interface APIResponse {
  data: ImageResult[];
}

export interface APIError {
  status: number;
  message: string;
  details?: string;
}

// -----------------------------------------------------------------------------
// MODEL CONFIGURATION
// -----------------------------------------------------------------------------

export interface ModelConfig {
  id: string;
  name: string;
  payloadType: PayloadType;
  maxResolution: number | ResolutionPreset;
  supports8k: boolean;
  defaultParams: Record<string, unknown>;
  enabled: boolean;
}

// -----------------------------------------------------------------------------
// RATE LIMITER
// -----------------------------------------------------------------------------

export interface RateLimiterConfig {
  maxTokens: number;     // max calls in window
  windowMs: number;      // time window in ms
  minDelayMs: number;    // minimum delay between calls
}

export interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  callTimestamps: number[];
}

// -----------------------------------------------------------------------------
// CONCURRENCY
// -----------------------------------------------------------------------------

export interface ConcurrencyConfig {
  maxConcurrent: number;
}

export interface ConcurrencyState {
  active: number;
  max: number;
  available: number;
}

// -----------------------------------------------------------------------------
// FAILURE POLICY
// -----------------------------------------------------------------------------

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface FailurePolicy {
  consecutiveFailureThreshold: number;
  retryPolicy: RetryPolicy;
  retryableErrors: number[];
  fatalErrors: number[];
}

// -----------------------------------------------------------------------------
// PAYLOAD CONSTRAINTS
// -----------------------------------------------------------------------------

export interface PayloadConstraints {
  maxPayloadBytes: number;
  maxReferenceImages: number;
  promptReserveBytes: number;
  metadataReserveBytes: number;
  safetyMarginPercent: number;
  minPerImageBytes: number;
  maxPerImageBytes: number;
}

// -----------------------------------------------------------------------------
// COMPRESSION SETTINGS
// -----------------------------------------------------------------------------

export interface CompressionSettings {
  maxDimension: number;
  emergencyDimensionFactor: number;
  initialQuality: number;
  minQuality: number;
  qualityStep: number;
  maxAttempts: number;
  autoCompress: boolean;
  warnOnHeavyCompression: boolean;
  heavyCompressionThreshold: number;
  showCompressionDetails: boolean;
}

// -----------------------------------------------------------------------------
// COMPRESSION RESULT
// -----------------------------------------------------------------------------

export interface CompressionResult {
  base64: string;
  originalSize: number;
  compressedSize: number;
  originalDimensions: { width: number; height: number };
  finalDimensions: { width: number; height: number };
  finalQuality: number;
  compressionRatio: number;
}

// -----------------------------------------------------------------------------
// PROCESSED IMAGE
// -----------------------------------------------------------------------------

export interface ProcessedImage extends CompressionResult {
  path: string;
}

// -----------------------------------------------------------------------------
// PATH ALIASES
// -----------------------------------------------------------------------------

export interface PathAliases {
  [alias: string]: string;
}

// -----------------------------------------------------------------------------
// FOLDER/FILE BROWSER
// -----------------------------------------------------------------------------

export interface FolderNode {
  name: string;
  path: string;
  isAlias: boolean;
  aliasName?: string;
  hasChildren: boolean;
}

export interface ImageNode {
  name: string;
  path: string;
  size: number;
  dimensions?: { width: number; height: number };
}

export interface FolderContents {
  path: string;
  folders: FolderNode[];
  images: ImageNode[];
  totalImages: number;
}

export interface FolderStats {
  totalImages: number;
  totalSize: number;
  deepestLevel: number;
}

// -----------------------------------------------------------------------------
// PROMPT LIBRARY
// -----------------------------------------------------------------------------

export interface PromptFile {
  name: string;  // filename without .txt
  path: string;
  size: number;
  modifiedAt: number;
}

export type PromptChangeEventType = 'created' | 'modified' | 'deleted';

export interface PromptChangeEvent {
  type: PromptChangeEventType;
  name: string;
  path: string;
}

// -----------------------------------------------------------------------------
// SELECTED IMAGE (MEDIA PANEL)
// -----------------------------------------------------------------------------

export interface SelectedImage {
  id: string;
  path: string;
  originalPath: string;
  compressed: ProcessedImage | null;
  index: number;
}

// -----------------------------------------------------------------------------
// GENERATED IMAGE (OUTPUT GALLERY)
// -----------------------------------------------------------------------------

export interface GeneratedImage {
  id: string;
  path: string;
  filename: string;
  jobId: string;
  batchId: string;
  model: string;
  prompt: string;
  createdAt: number;
  size: number;
  dimensions?: { width: number; height: number };
}

// -----------------------------------------------------------------------------
// GALLERY FILTERS
// -----------------------------------------------------------------------------

export interface GalleryFilters {
  jobId?: string;
  model?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  sortBy: 'newest' | 'oldest' | 'name';
}

// -----------------------------------------------------------------------------
// BUDGET CALCULATION
// -----------------------------------------------------------------------------

export type BudgetWarningLevel = 'info' | 'warning' | 'error';

export interface BudgetWarning {
  level: BudgetWarningLevel;
  message: string;
}

export interface BudgetCalculation {
  constraints: PayloadConstraints;
  selectedImageCount: number;
  effectiveImageBudget: number;
  perImageBudget: number;
  canAddMore: boolean;
  remainingSlots: number;
  warnings: BudgetWarning[];
}

// -----------------------------------------------------------------------------
// IMAGE GEN SETTINGS
// -----------------------------------------------------------------------------

export interface ImageGenSettings {
  // API
  apiUrl: string;
  apiKey: string;  // stored in credential store, reference only

  // Models
  models: ModelConfig[];
  defaultModel: string;

  // Paths
  promptsDir: string;
  referencesDir: string;
  outputDir: string;
  pathAliases: PathAliases;

  // Pipeline
  rateLimit: RateLimiterConfig;
  concurrency: ConcurrencyConfig;
  failurePolicy: FailurePolicy;

  // Payload & Compression
  payload: PayloadConstraints;
  compression: CompressionSettings;

  // Queue defaults
  defaultImagesPerBatch: number;
  defaultBatchCount: number;
  defaultExecutionMode: ExecutionMode;
  defaultTolerance: number;

  // UI preferences
  showCompressionBadges: boolean;
  autoExpandGroups: boolean;
}

// -----------------------------------------------------------------------------
// WEBSOCKET EVENTS
// -----------------------------------------------------------------------------

export type ImageGenEventType =
  | 'queue-updated'
  | 'job-created'
  | 'job-started'
  | 'job-progress'
  | 'job-paused'
  | 'job-resumed'
  | 'job-completed'
  | 'job-failed'
  | 'job-cancelled'
  | 'batch-started'
  | 'batch-completed'
  | 'batch-failed'
  | 'rate-limited'
  | 'auto-paused'
  | 'pipeline-started'
  | 'pipeline-stopped';

export interface ImageGenEvent {
  type: ImageGenEventType;
  timestamp: number;
  data: ImageGenEventData;
}

export type ImageGenEventData =
  | QueueUpdatedData
  | JobEventData
  | BatchEventData
  | RateLimitedData
  | PipelineEventData;

export interface QueueUpdatedData {
  groups: QueueGroup[];
  entries: Record<string, QueueEntry>;
}

export interface JobEventData {
  jobId: string;
  job?: Job;
  stats?: JobStats;
  error?: JobError;
}

export interface BatchEventData {
  jobId: string;
  batchId: string;
  batch?: BatchRequest;
  result?: SavedFile[];
  error?: JobError;
}

export interface RateLimitedData {
  waitMs: number;
  reason: string;
}

export interface PipelineEventData {
  running: boolean;
  reason?: string;
}

// -----------------------------------------------------------------------------
// QUEUE FILE (PERSISTENCE)
// -----------------------------------------------------------------------------

export interface QueueFile {
  version: number;
  groups: QueueGroup[];
  entries: QueueEntry[];
}

// -----------------------------------------------------------------------------
// HISTORY
// -----------------------------------------------------------------------------

export interface JobHistory {
  jobs: Job[];
  limit: number;
}

// -----------------------------------------------------------------------------
// PIPELINE STATE
// -----------------------------------------------------------------------------

export interface PipelineState {
  running: boolean;
  rateLimiter: {
    config: RateLimiterConfig;
    state: RateLimiterState;
  };
  concurrency: {
    config: ConcurrencyConfig;
    state: ConcurrencyState;
  };
  queue: {
    queued: number;
    inFlight: number;
  };
}

// -----------------------------------------------------------------------------
// QUICK GENERATE
// -----------------------------------------------------------------------------

export interface QuickGenerateRequest {
  prompt: string;
  model: string;
  resolution: ResolutionConfig;
  imagesPerBatch: number;
  references: string[];  // paths
  style?: string;
  extParams?: ExtendedParams;
}

export interface QuickGenerateResult {
  id: string;
  images: GeneratedImage[];
  prompt: string;
  model: string;
  createdAt: number;
}

// -----------------------------------------------------------------------------
// CHAT INTEGRATION
// -----------------------------------------------------------------------------

export type ImageGenContentBlockStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface ImageGenContentBlock {
  type: 'image_gen';
  prompt: string;
  model: string;
  status: ImageGenContentBlockStatus;
  result?: QuickGenerateResult;
  error?: string;
}

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const DEFAULT_RATE_LIMIT: RateLimiterConfig = {
  maxTokens: 25,
  windowMs: 2500,
  minDelayMs: 50,
};

export const DEFAULT_CONCURRENCY: ConcurrencyConfig = {
  maxConcurrent: 75,
};

export const DEFAULT_FAILURE_POLICY: FailurePolicy = {
  consecutiveFailureThreshold: 5,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
  },
  retryableErrors: [429, 500, 502, 503, 504],
  fatalErrors: [400, 401, 413],
};

export const DEFAULT_PAYLOAD_CONSTRAINTS: PayloadConstraints = {
  maxPayloadBytes: 4 * 1024 * 1024,         // 4 MB
  maxReferenceImages: 10,
  promptReserveBytes: 50 * 1024,            // 50 KB
  metadataReserveBytes: 20 * 1024,          // 20 KB
  safetyMarginPercent: 10,
  minPerImageBytes: 100 * 1024,             // 100 KB
  maxPerImageBytes: 800 * 1024,             // 800 KB
};

export const DEFAULT_COMPRESSION_SETTINGS: CompressionSettings = {
  maxDimension: 1440,
  emergencyDimensionFactor: 0.8,
  initialQuality: 87,
  minQuality: 50,
  qualityStep: 10,
  maxAttempts: 5,
  autoCompress: true,
  warnOnHeavyCompression: true,
  heavyCompressionThreshold: 60,
  showCompressionDetails: true,
};

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'seedream-v4',
    name: 'SeeDream V4',
    payloadType: 'standard',
    maxResolution: 4096,
    supports8k: false,
    defaultParams: {},
    enabled: true,
  },
  {
    id: 'seedream-v3',
    name: 'SeeDream V3',
    payloadType: 'standard',
    maxResolution: 4096,
    supports8k: false,
    defaultParams: {
      guidance_scale: 7.5,
      enable_safety_checker: false,
    },
    enabled: true,
  },
  {
    id: 'nano-banana-pro-ultra',
    name: 'Nano Banana Pro Ultra',
    payloadType: 'resolution',
    maxResolution: '8k',
    supports8k: true,
    defaultParams: {
      resolution: 'auto',
      aspect_ratio: 'auto',
    },
    enabled: true,
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    payloadType: 'resolution',
    maxResolution: '4k',
    supports8k: false,
    defaultParams: {
      resolution: 'auto',
      aspect_ratio: 'auto',
    },
    enabled: true,
  },
  {
    id: 'riverflow-2-max',
    name: 'Riverflow 2 Max',
    payloadType: 'resolution',
    maxResolution: '4k',
    supports8k: false,
    defaultParams: {
      steps: 30,
      CFGScale: 7,
      strength: 0.8,
    },
    enabled: true,
  },
  {
    id: 'wan-2.6-image-edit',
    name: 'WAN 2.6 Image Edit',
    payloadType: 'resolution',
    maxResolution: '4k',
    supports8k: false,
    defaultParams: {},
    enabled: true,
  },
];

export const DEFAULT_IMAGE_GEN_SETTINGS: ImageGenSettings = {
  apiUrl: 'https://nano-gpt.com/api/generate-image',
  apiKey: '',

  models: DEFAULT_MODELS,
  defaultModel: 'seedream-v4',

  promptsDir: '',        // Set from paths.ts
  referencesDir: '',     // Set from paths.ts
  outputDir: '',         // Set from paths.ts
  pathAliases: {},

  rateLimit: DEFAULT_RATE_LIMIT,
  concurrency: DEFAULT_CONCURRENCY,
  failurePolicy: DEFAULT_FAILURE_POLICY,

  payload: DEFAULT_PAYLOAD_CONSTRAINTS,
  compression: DEFAULT_COMPRESSION_SETTINGS,

  defaultImagesPerBatch: 1,
  defaultBatchCount: 25,
  defaultExecutionMode: 'fixed',
  defaultTolerance: 3,

  showCompressionBadges: true,
  autoExpandGroups: true,
};
