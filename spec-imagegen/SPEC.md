# Image Generation App — Single Source of Truth Specification

> Version: 1.0.0  
> Last Updated: 2025-01-02

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Models](#2-data-models)
3. [API Integration](#3-api-integration)
4. [Request Pipeline](#4-request-pipeline)
5. [Queue System](#5-queue-system)
6. [Reference System](#6-reference-system)
7. [Prompt System](#7-prompt-system)
8. [UI Components](#8-ui-components)
9. [State Management](#9-state-management)
10. [Storage & Persistence](#10-storage--persistence)
11. [Libraries & Dependencies](#11-libraries--dependencies)
12. [Configuration](#12-configuration)

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ELECTRON MAIN PROCESS                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  File System    │  │  Config Store   │  │  Request Pipeline           │  │
│  │  - Prompts      │  │  - Settings     │  │  - Rate Limiter             │  │
│  │  - References   │  │  - Aliases      │  │  - Concurrency Controller   │  │
│  │  - Output       │  │  - API Keys     │  │  - Request Queue            │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                 │
│           └────────────────────┼──────────────────────────┘                 │
│                                │ WebSocket                                  │
├────────────────────────────────┼────────────────────────────────────────────┤
│                                │                                            │
│                      ELECTRON RENDERER PROCESS                              │
│  ┌─────────────────────────────┴─────────────────────────────────────────┐  │
│  │                         React Application                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ Queue Table │  │ Job Monitor │  │ Prompt      │  │ Reference   │   │  │
│  │  │             │  │             │  │ Editor      │  │ Browser     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                     Zustand Store                               │  │  │
│  │  │  - Queue State    - Job State    - UI State    - Settings       │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Principles

- **Offline-first**: All queue/prompt data persisted locally
- **Non-blocking UI**: All API work happens in pipeline, UI remains responsive
- **Live adjustable**: Rate limits, job targets, queue entries modifiable during execution
- **Fail-safe**: Auto-pause on repeated failures, graceful cancellation

---

## 2. Data Models

### 2.1 Queue Entry

```typescript
interface QueueEntry {
  id: string                          // uuid
  enabled: boolean                    // replaces ? prefix
  createdAt: number                   // timestamp
  updatedAt: number                   // timestamp
  
  // Prompt Configuration
  prompt: PromptConfig
  
  // Generation Settings
  resolution: ResolutionConfig
  imagesPerBatch: number              // 1-10
  batchCount: number                  // for fixed mode
  model: string
  style: string | null
  
  // Reference Images
  references: ReferencePattern[]
  
  // Extended Parameters (model-specific)
  extParams: ExtendedParams
  
  // Execution Mode
  executionMode: 'fixed' | 'target'
  targetImages: number | null         // for target mode
  tolerance: number                   // for target mode, default 3
  
  // Runtime State (not persisted with entry, but tracked during execution)
  // See JobState for runtime tracking
}

interface PromptConfig {
  type: 'library' | 'inline' | 'wildcard'
  
  // For 'library': filename without extension
  // For 'inline': the actual prompt text
  // For 'wildcard': array of library prompt names
  value: string | string[]
}

interface ResolutionConfig {
  type: 'dimensions' | 'preset'
  
  // For 'dimensions'
  width?: number
  height?: number
  
  // For 'preset': "1k", "2k", "4k", "8k", "auto"
  preset?: string
  
  // Optional aspect ratio override
  aspectRatio?: AspectRatio | null
}

type AspectRatio = '21:9' | '16:9' | '9:16' | '5:4' | '4:3' | '3:4' | '2:3' | '3:2' | 'square' | 'auto'

interface ExtendedParams {
  aspectRatio?: AspectRatio
  steps?: number                      // riverflow
  cfgScale?: number                   // riverflow
  strength?: number                   // riverflow
  seed?: number | null                // null = random
  guidanceScale?: number              // seedream
  safetyChecker?: boolean             // seedream
}
```

### 2.2 Reference Pattern

```typescript
interface ReferencePattern {
  id: string                          // uuid for UI tracking
  type: ReferenceType
  path: string                        // supports $aliases
  count?: number                      // for 'random-global' type
}

type ReferenceType = 
  | 'explicit'           // specific file path
  | 'random'             // !folder - one random from folder
  | 'random-recursive'   // !!folder - one random from folder + subdirs
  | 'all'                // !!folder!! - all from folder
  | 'random-global'      // !#N - N random from entire tree
  | 'wildcard'           // {a|b|c} - pick one option
```

### 2.3 Queue Group

```typescript
interface QueueGroup {
  id: string
  name: string
  collapsed: boolean
  sortOrder: number
  entries: string[]                   // QueueEntry IDs in order
  createdAt: number
  updatedAt: number
}
```

### 2.4 Job State (Runtime)

```typescript
interface Job {
  id: string                          // uuid
  queueEntryId: string                // link to QueueEntry
  state: JobState
  
  // Timing
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
  
  // Progress
  stats: JobStats
  
  // Failure Tracking
  consecutiveFailures: number
  lastError: JobError | null
  autoPaused: boolean
  pauseReason: string | null
  
  // Live Configuration (can be modified during execution)
  liveConfig: {
    targetImages: number
    paused: boolean
  }
  
  // Resolved References (cached after first resolution)
  resolvedReferences: ResolvedReference[] | null
}

type JobState = 
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

interface JobStats {
  totalBatches: number
  successfulBatches: number
  failedBatches: number
  totalImages: number
  
  // For progress calculation
  expectedBatches: number
  expectedImages: number
}

interface JobError {
  message: string
  code: number | null
  timestamp: number
  batchIndex: number
  details: string | null
  hint: string | null
}

interface ResolvedReference {
  originalPattern: ReferencePattern
  resolvedPaths: string[]             // actual file paths
  base64Data: string[]                // loaded and compressed
}
```

### 2.5 Batch Request

```typescript
interface BatchRequest {
  id: string                          // uuid
  jobId: string
  batchIndex: number
  state: BatchState
  
  // Timing
  queuedAt: number
  startedAt: number | null
  completedAt: number | null
  
  // Result
  imageCount: number
  savedFiles: SavedFile[]
  error: JobError | null
  
  // Request Details (for debugging/retry)
  promptUsed: string
  referencesUsed: string[]
  modelUsed: string
}

type BatchState = 'queued' | 'in-flight' | 'completed' | 'failed'

interface SavedFile {
  filename: string
  path: string
  size: number
}
```

---

## 3. API Integration

### 3.1 Endpoint

```
POST https://nano-gpt.com/api/generate-image
Headers:
  Content-Type: application/json
  x-api-key: <API_KEY>
```

### 3.2 Request Payload

#### Standard Models (width/height based)

```typescript
interface StandardPayload {
  prompt: string
  model: string
  width: number
  height: number
  nImages: number                     // 1-10
  responseFormat: 'b64_json'
  showExplicitContent: boolean
  
  // Optional
  imageDataUrls?: string[]            // data:image/png;base64,<data>
  style?: string
  
  // Model-specific (seedream)
  guidance_scale?: number
  enable_safety_checker?: boolean
}
```

#### Resolution-Based Models

Models: `nano-banana-pro-ultra`, `nano-banana-pro`, `riverflow-2-max`, `wan-2.6-image-edit`

```typescript
interface ResolutionPayload {
  prompt: string
  model: string
  resolution: string                  // "1k", "2k", "4k", "8k", "auto"
  aspect_ratio?: AspectRatio
  nImages: number
  responseFormat: 'b64_json'
  showExplicitContent: boolean
  
  // Optional
  imageDataUrls?: string[]
  style?: string
  
  // riverflow-specific
  steps?: number
  CFGScale?: number
  strength?: number
  
  // wan-specific
  seed?: number
}
```

### 3.3 Response Format

```typescript
interface APIResponse {
  data: ImageResult[]
}

interface ImageResult {
  b64_json?: string
  image?: string                      // alternate field name
}
```

### 3.4 Error Responses

| Status | Meaning | Handling |
|--------|---------|----------|
| 400 | Bad request / Invalid params | Don't retry, surface error |
| 401 | Invalid API key | Pause all, prompt for key |
| 413 | Payload too large | Reduce references, compress |
| 429 | Rate limited | Back off, adjust rate limiter |
| 500+ | Server error | Retry with backoff |

### 3.5 Model Registry

```typescript
const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'seedream-v4': {
    payloadType: 'standard',
    maxResolution: 4096,
    supports8k: false,
    defaultParams: {}
  },
  'seedream-v3': {
    payloadType: 'standard',
    maxResolution: 4096,
    supports8k: false,
    defaultParams: {
      guidance_scale: 7.5,
      enable_safety_checker: false
    }
  },
  'nano-banana-pro-ultra': {
    payloadType: 'resolution',
    maxResolution: '8k',
    supports8k: true,
    defaultParams: {
      resolution: 'auto',
      aspect_ratio: 'auto'
    }
  },
  'nano-banana-pro': {
    payloadType: 'resolution',
    maxResolution: '4k',
    supports8k: false,
    defaultParams: {
      resolution: 'auto',
      aspect_ratio: 'auto'
    }
  },
  'riverflow-2-max': {
    payloadType: 'resolution',
    maxResolution: '4k',
    supports8k: false,
    defaultParams: {
      steps: 30,
      CFGScale: 7,
      strength: 0.8
    }
  },
  'wan-2.6-image-edit': {
    payloadType: 'resolution',
    maxResolution: '4k',
    supports8k: false,
    defaultParams: {}
  }
}

interface ModelConfig {
  payloadType: 'standard' | 'resolution'
  maxResolution: number | string
  supports8k: boolean
  defaultParams: Record<string, any>
}
```

---

## 4. Request Pipeline

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          REQUEST PIPELINE                               │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Jobs       │    │   Batch      │    │   Request    │              │
│  │   Queue      │───▶│   Queue      │───▶│   Queue      │              │
│  │              │    │              │    │              │              │
│  │  QueueEntry  │    │ BatchRequest │    │ HTTPRequest  │              │
│  │  → Job       │    │              │    │              │              │
│  └──────────────┘    └──────────────┘    └──────┬───────┘              │
│                                                 │                       │
│                                                 ▼                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        DISPATCHER                                 │  │
│  │                                                                   │  │
│  │   ┌─────────────────┐      ┌─────────────────┐                   │  │
│  │   │  Rate Limiter   │      │  Concurrency    │                   │  │
│  │   │                 │      │  Controller     │                   │  │
│  │   │  Tokens: 25     │      │                 │                   │  │
│  │   │  Window: 2.5s   │      │  Max: 75        │                   │  │
│  │   │  Available: 18  │      │  Active: 12     │                   │  │
│  │   └─────────────────┘      └─────────────────┘                   │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│                         ┌──────────────┐                               │
│                         │  In-Flight   │                               │
│                         │  Requests    │                               │
│                         │  Map         │                               │
│                         └──────────────┘                               │
│                                  │                                      │
│                                  ▼                                      │
│                            HTTP/SOCKS                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Rate Limiter

```typescript
interface RateLimiterConfig {
  maxTokens: number                   // max calls in window
  windowMs: number                    // time window in ms
  minDelayMs: number                  // minimum delay between calls
}

interface RateLimiterState {
  tokens: number                      // available tokens
  lastRefill: number                  // timestamp of last refill
  callTimestamps: number[]            // recent call timestamps
}

// Default configuration
const DEFAULT_RATE_LIMIT: RateLimiterConfig = {
  maxTokens: 25,
  windowMs: 2500,
  minDelayMs: 50
}

// Rate limiter interface
interface RateLimiter {
  // Check if call can be made immediately
  canMakeCall(): boolean
  
  // Record a call (consume token)
  recordCall(): void
  
  // Get ms until next available slot
  getNextAvailableTime(): number
  
  // Get current state for UI
  getState(): {
    available: number
    max: number
    windowMs: number
    nextAvailableIn: number
  }
  
  // Live configuration update
  updateConfig(config: Partial<RateLimiterConfig>): void
}
```

### 4.3 Concurrency Controller

```typescript
interface ConcurrencyConfig {
  maxConcurrent: number               // max simultaneous requests
}

interface ConcurrencyController {
  // Check if new request can start
  canStart(): boolean
  
  // Increment active count
  acquire(): void
  
  // Decrement active count
  release(): void
  
  // Get current state
  getState(): {
    active: number
    max: number
    available: number
  }
  
  // Live configuration update
  updateConfig(config: Partial<ConcurrencyConfig>): void
  
  // Event emitter for slot availability
  on(event: 'slot-available', handler: () => void): void
}

// Default configuration
const DEFAULT_CONCURRENCY: ConcurrencyConfig = {
  maxConcurrent: 75
}
```

### 4.4 Request Queue

```typescript
interface QueuedRequest {
  id: string
  jobId: string
  batchRequest: BatchRequest
  priority: number                    // lower = higher priority
  queuedAt: number
  
  // Promise resolution
  resolve: (result: BatchResult) => void
  reject: (error: Error) => void
  
  // Cancellation
  cancelled: boolean
  abortController: AbortController
}

interface RequestQueue {
  // Add request to queue
  enqueue(request: QueuedRequest): void
  
  // Get next request (respects priority)
  dequeue(): QueuedRequest | null
  
  // Cancel specific request
  cancel(requestId: string): boolean
  
  // Cancel all requests for a job
  cancelJob(jobId: string): number
  
  // Cancel all requests
  cancelAll(): number
  
  // Get queue state
  getState(): {
    queued: number
    inFlight: number
    byJob: Record<string, { queued: number, inFlight: number }>
  }
}
```

### 4.5 Dispatcher

```typescript
interface Dispatcher {
  // Start processing queue
  start(): void
  
  // Stop processing (let in-flight complete)
  stop(): Promise<void>
  
  // Force stop (abort in-flight)
  forceStop(): Promise<void>
  
  // Get pipeline state
  getState(): {
    running: boolean
    rateLimiter: RateLimiterState
    concurrency: ConcurrencyState
    queue: QueueState
  }
  
  // Events
  on(event: 'request-start', handler: (req: QueuedRequest) => void): void
  on(event: 'request-complete', handler: (req: QueuedRequest, result: BatchResult) => void): void
  on(event: 'request-error', handler: (req: QueuedRequest, error: Error) => void): void
  on(event: 'rate-limited', handler: (waitMs: number) => void): void
}
```

### 4.6 Failure Handling

```typescript
interface FailurePolicy {
  // Consecutive failure threshold before auto-pause
  consecutiveFailureThreshold: number   // default: 5
  
  // Retry policy for transient errors
  retryPolicy: {
    maxRetries: number                  // default: 3
    backoffMs: number                   // default: 1000
    backoffMultiplier: number           // default: 2
    maxBackoffMs: number                // default: 30000
  }
  
  // Errors that should trigger retry
  retryableErrors: number[]             // [429, 500, 502, 503, 504]
  
  // Errors that should immediately fail (no retry)
  fatalErrors: number[]                 // [400, 401, 413]
}

const DEFAULT_FAILURE_POLICY: FailurePolicy = {
  consecutiveFailureThreshold: 5,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000
  },
  retryableErrors: [429, 500, 502, 503, 504],
  fatalErrors: [400, 401, 413]
}
```

---

## 5. Queue System

### 5.1 Queue Operations

```typescript
interface QueueManager {
  // Group operations
  createGroup(name: string): QueueGroup
  updateGroup(id: string, updates: Partial<QueueGroup>): QueueGroup
  deleteGroup(id: string): void
  reorderGroups(orderedIds: string[]): void
  
  // Entry operations
  createEntry(groupId: string, entry: Partial<QueueEntry>): QueueEntry
  updateEntry(id: string, updates: Partial<QueueEntry>): QueueEntry
  deleteEntry(id: string): void
  duplicateEntry(id: string): QueueEntry
  moveEntry(id: string, targetGroupId: string, index: number): void
  reorderEntries(groupId: string, orderedIds: string[]): void
  
  // Bulk operations
  enableEntries(ids: string[]): void
  disableEntries(ids: string[]): void
  deleteEntries(ids: string[]): void
  
  // Query
  getGroup(id: string): QueueGroup | null
  getEntry(id: string): QueueEntry | null
  getAllGroups(): QueueGroup[]
  getEnabledEntries(): QueueEntry[]
  
  // Execution
  startQueue(): void
  stopQueue(): Promise<void>
  
  // Import/Export
  exportToText(): string              // legacy queue.txt format
  importFromText(text: string): void
}
```

### 5.2 Queue Text Format (Import/Export Compatibility)

```
# Lines starting with # are comments
# Format: [prompt][resolution][numImages][numBatches][model][refs][style][extParams]
# Prefix with ? to disable

[portrait_v2][4096x4096][1][25][seedream-v4][!!faces][none][aspect_ratio=auto]
[landscape_{a|b|c}][4k][2][10][nano-banana-pro][!#3,!poses][cinematic][]
?[test_prompt][2k][1][5][riverflow-2-max][none][none][steps=40,CFGScale=8]
```

### 5.3 Wildcard Resolution

```typescript
// Prompt wildcards - resolved per-batch
function resolvePromptWildcard(config: PromptConfig): string {
  if (config.type === 'wildcard') {
    const options = config.value as string[]
    const selected = options[Math.floor(Math.random() * options.length)]
    return loadPromptFile(selected)
  }
  // ... handle other types
}

// Reference wildcards - resolved per-batch (allows variation)
async function resolveReferencePatterns(
  patterns: ReferencePattern[],
  cacheHint: boolean = false
): Promise<ResolvedReference[]> {
  // Implementation handles:
  // - !folder → pick one random
  // - !!folder → pick one random from tree
  // - !!folder!! → load all
  // - !#N → pick N random from entire tree
  // - {a|b|c} → pick one option
  // - $alias expansion
}

// In-prompt wildcards - resolved per-batch
function processPromptText(text: string, references: ResolvedReference[]): string {
  // Handle:
  // - {option1|option2|option3} random selection
  // - {option1<tag>|option2<tag>} tagged selection (consistent within prompt)
  // - <tag:conditional text> conditional inclusion
  // - %img2img.filename% reference variable substitution
  // - %img2img[0].name% indexed reference
}
```

---

## 6. Reference System

### 6.1 Path Aliases

```typescript
interface PathAliases {
  [alias: string]: string
}

// Default aliases (user-configurable)
const DEFAULT_ALIASES: PathAliases = {
  home: '/home/user',
  img2img: '/home/user/app/img2img',    // default reference root
  output: '/home/user/app/generated',    // default output
}

// Expand $alias in path
function expandPath(inputPath: string, aliases: PathAliases): string {
  return inputPath.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
    return aliases[name.toLowerCase()] || match
  })
}
```

### 6.2 Reference Browser Service

```typescript
interface ReferenceBrowserService {
  // Get root folders (including aliases)
  getRoots(): Promise<FolderNode[]>
  
  // Get folder contents (lazy load)
  getFolder(path: string): Promise<FolderContents>
  
  // Get thumbnail (generated on demand, cached)
  getThumbnail(path: string, size: number): Promise<string>  // base64
  
  // Search
  search(query: string, rootPath?: string): Promise<SearchResult[]>
  
  // Stats
  getFolderStats(path: string): Promise<FolderStats>
}

interface FolderNode {
  name: string
  path: string
  isAlias: boolean
  aliasName?: string
  hasChildren: boolean
}

interface FolderContents {
  path: string
  folders: FolderNode[]
  images: ImageNode[]
  totalImages: number                 // including nested
}

interface ImageNode {
  name: string
  path: string
  size: number
  dimensions?: { width: number, height: number }
}

interface FolderStats {
  totalImages: number
  totalSize: number
  deepestLevel: number
}
```

### 6.3 Image Processing

See `SPEC_COMPRESSION.md` for full compression pipeline specification.
See `SPEC_PAYLOAD_CONFIG.md` for configurable limits.

```typescript
interface ImageProcessor {
  // Load and optionally compress image
  loadImage(path: string, budget: number, config: CompressionSettings): Promise<ProcessedImage>
  
  // Generate thumbnail (for UI, separate from payload compression)
  generateThumbnail(path: string, size: number): Promise<string>
  
  // Estimate base64 size
  estimateBase64Size(base64: string): number
  
  // Compress to target size with full pipeline
  compressToSize(buffer: Buffer, targetBytes: number, config: CompressionSettings): Promise<CompressionResult>
}

interface ProcessedImage {
  base64: string
  originalSize: number
  compressedSize: number
  originalDimensions: { width: number, height: number }
  finalDimensions: { width: number, height: number }
  finalQuality: number
  compressionRatio: number
}

// Budget is calculated dynamically based on:
// - User's PayloadConstraints settings
// - Number of images selected
// See SPEC_PAYLOAD_CONFIG.md for calculatePerImageBudget()
```

---

## 7. Prompt System

### 7.1 Prompt Library

```typescript
interface PromptLibrary {
  // List all prompts
  list(): Promise<PromptFile[]>
  
  // Load prompt content
  load(name: string): Promise<string>
  
  // Save prompt
  save(name: string, content: string): Promise<void>
  
  // Delete prompt
  delete(name: string): Promise<void>
  
  // Rename prompt
  rename(oldName: string, newName: string): Promise<void>
  
  // Watch for changes (live reload)
  watch(callback: (event: PromptChangeEvent) => void): () => void
}

interface PromptFile {
  name: string                        // filename without .txt
  path: string
  size: number
  modifiedAt: number
}

interface PromptChangeEvent {
  type: 'created' | 'modified' | 'deleted'
  name: string
  path: string
}
```

### 7.2 Prompt Processing Pipeline

```
Raw Prompt Text
       │
       ▼
┌──────────────────┐
│ Variable         │  %img2img.filename% → "portrait_001.jpg"
│ Substitution     │  %img2img[0].name% → "portrait_001"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Tagged Wildcard  │  {blonde<hair>|brunette<hair>|redhead<hair>}
│ Resolution       │  → picks one, stores tag for consistency
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Conditional      │  <hair:with flowing hair>
│ Inclusion        │  → includes if "hair" tag was set
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Simple Wildcard  │  {sitting|standing|walking}
│ Resolution       │  → random pick (no tag)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Safety           │  Append img2img instructions
│ Instructions     │  (watermark removal, face preservation)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Whitespace       │  Collapse multiple spaces
│ Normalization    │  Trim
└────────┬─────────┘
         │
         ▼
  Final Prompt
```

### 7.3 Safety Instructions (Img2Img)

```typescript
const IMG2IMG_SAFETY_SUFFIX = `

[follow the user prompt exactly, do not deviate from the words stated. In the reference images, if there are any watermarks/logos always remove them / do not render them at all unless explicitly asked to do so. Never try and merge together faces and traits unless it is the same person stated by the following prompt or asked to do so explicitly, otherwise, always acknowledge that the reference images have multiple people with distinct key features that need to be retained in the generated image]
prompt:`

function addSafetyInstructions(prompt: string, hasReferences: boolean): string {
  if (!hasReferences) return prompt
  return prompt + IMG2IMG_SAFETY_SUFFIX
}
```

---

## 8. UI Components

### 8.1 Component Tree

> **Design Principle**: No modals for core workflow. Everything needed for generation  
> is visible and interactive. Modals only for settings, confirmations, and lightbox.  
> See `SPEC_MEDIA_PANEL.md` for full media panel specification.

```
App
├── TitleBar (electron custom)
│
├── Header
│   ├── GlobalStats
│   │   ├── JobCounter (total/running/completed/failed)
│   │   ├── ImageCounter
│   │   └── ApiStatus (live/queued requests)
│   │
│   ├── PipelineControls
│   │   ├── RateLimitDisplay (with edit popover)
│   │   ├── ConcurrencyDisplay (with edit popover)
│   │   └── PipelineToggle (start/stop all)
│   │
│   └── QueueControls
│       ├── StartQueueButton
│       ├── StopQueueButton
│       └── CancelAllButton
│
├── MainLayout (resizable panels)
│   │
│   ├── LeftSidebar (collapsible)
│   │   ├── PromptBrowser
│   │   │   ├── SearchInput
│   │   │   ├── PromptList (virtualized)
│   │   │   └── NewPromptButton
│   │   │
│   │   ├── FolderTree (reference directories)
│   │   │   ├── AliasShortcuts ($home, $img2img, etc.)
│   │   │   └── TreeView (lazy-loaded)
│   │   │
│   │   └── QuickActions
│   │       └── SavedGroupsList
│   │
│   ├── CenterContent
│   │   ├── TabBar [Queue | Jobs]
│   │   │
│   │   ├── QueueTab
│   │   │   ├── QueueToolbar
│   │   │   │   ├── AddEntryButton
│   │   │   │   ├── AddGroupButton
│   │   │   │   ├── ImportButton
│   │   │   │   └── ExportButton
│   │   │   │
│   │   │   └── QueueTable
│   │   │       ├── GroupRow (collapsible header)
│   │   │       └── EntryRow (inline-editable cells)
│   │   │           ├── EnableCheckbox
│   │   │           ├── PromptCell (dropdown + custom)
│   │   │           ├── ResolutionCell
│   │   │           ├── ImagesCell
│   │   │           ├── BatchesCell
│   │   │           ├── ModelCell (dropdown)
│   │   │           ├── ReferencesCell (click to link panel)
│   │   │           ├── StatusCell (during execution)
│   │   │           └── ActionsMenu
│   │   │
│   │   ├── JobsTab
│   │   │   └── JobList
│   │   │       └── JobCard (expandable)
│   │   │           ├── ProgressBar
│   │   │           ├── StatsRow
│   │   │           ├── ControlButtons [pause/resume/cancel]
│   │   │           ├── TargetAdjuster (live edit)
│   │   │           └── ErrorDisplay
│   │   │
│   │   └── PromptEditor (bottom panel, when prompt selected)
│   │       ├── EditorToolbar
│   │       │   ├── SaveButton
│   │       │   ├── RevertButton
│   │       │   └── WildcardHelper
│   │       └── CodeEditor (monaco or codemirror)
│   │
│   └── RightPanel (MediaPanel - always visible)
│       ├── TabBar [References | Output]
│       │
│       ├── ReferencesTab
│       │   ├── LinkedEntryHeader
│       │   ├── SelectionArray (with indices, compression badges)
│       │   ├── SavedGroups
│       │   └── ImageBrowser (virtual grid)
│       │
│       └── OutputTab
│           ├── MainViewer (current image)
│           ├── ActionBar (use as ref, copy, rename, delete, etc.)
│           ├── ThumbnailStrip (horizontal scroll)
│           └── FilterBar
│
├── LogDrawer (bottom, collapsible)
│   ├── LogToolbar
│   │   ├── FilterDropdown (info/warn/error)
│   │   ├── SearchInput
│   │   └── ClearButton
│   └── LogList (virtualized)
│
├── QuickGenerateBar (above log drawer)
│   │  See `SPEC_QUICK_GENERATE.md` for full specification
│   ├── ReferenceStrip (inline thumbnails)
│   ├── PromptInput (auto-resize textarea)
│   ├── SettingsButton (popover, not modal)
│   │   └── SettingsPopover
│   │       ├── ModelSelect
│   │       ├── ResolutionSelect
│   │       ├── ImageCountToggle
│   │       └── AdvancedOptions (collapsible)
│   ├── GenerateButton
│   └── ResultPreview (inline, expandable)
│
├── Lightbox (overlay, not blocking modal)
│   ├── ImageViewer (pan/zoom)
│   ├── InfoPanel (toggle)
│   ├── NavArrows
│   └── ThumbnailStrip
│
├── Modals (settings/confirmations only)
│   ├── SettingsModal
│   │   ├── GeneralSettings
│   │   ├── PathAliases
│   │   ├── ApiSettings
│   │   ├── PipelineSettings
│   │   ├── PayloadConstraints
│   │   └── CompressionSettings
│   │
│   └── ConfirmationDialogs (delete, destructive actions)
│
└── ToastContainer
    └── Toast (auto-pause warnings, errors, completions)
```

### 8.2 Key Component Specifications

#### QueueTable

```typescript
interface QueueTableProps {
  groups: QueueGroup[]
  entries: Record<string, QueueEntry>
  jobs: Record<string, Job>           // for status display
  
  // Callbacks
  onEntryChange: (id: string, updates: Partial<QueueEntry>) => void
  onEntryDelete: (id: string) => void
  onEntryDuplicate: (id: string) => void
  onEntryMove: (id: string, groupId: string, index: number) => void
  onGroupToggle: (id: string) => void
  onGroupCreate: (name: string) => void
  onReorder: (groupId: string, orderedIds: string[]) => void
}

// Cell types
type CellType = 
  | 'checkbox'      // enabled toggle
  | 'prompt'        // dropdown + custom input
  | 'resolution'    // preset dropdown or WxH input
  | 'number'        // numeric input with +/- buttons
  | 'model'         // dropdown from MODEL_REGISTRY
  | 'references'    // display + click to open picker
  | 'status'        // read-only progress/state
  | 'actions'       // menu button
```

#### JobCard

```typescript
interface JobCardProps {
  job: Job
  entry: QueueEntry
  expanded: boolean
  
  onToggleExpand: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onRetryFailed: () => void
  onTargetChange: (newTarget: number) => void
}

// Visual states
type JobVisualState = 
  | 'queued'        // gray, waiting
  | 'running'       // blue, animated progress
  | 'paused'        // yellow, static progress
  | 'auto-paused'   // orange, with warning icon
  | 'completed'     // green
  | 'failed'        // red
  | 'cancelled'     // gray, strikethrough
```

#### MediaPanel

See `SPEC_MEDIA_PANEL.md` for complete specification.

```typescript
interface MediaPanelProps {
  // Which queue entry is linked (for reference editing)
  linkedEntryId: string | null
  onLinkEntry: (entryId: string | null) => void
  
  // Reference selection (synced with linked entry)
  selection: SelectedImage[]
  onSelectionChange: (selection: SelectedImage[]) => void
  
  // Output gallery state
  galleryImages: GeneratedImage[]
  galleryFilters: GalleryFilters
  onGalleryFiltersChange: (filters: GalleryFilters) => void
  
  // Actions
  onUseAsReference: (imagePath: string) => void
  onDeleteImage: (imagePath: string) => void
  // ... other image actions
}
```

### 8.3 Layout Specifications

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Header (48px fixed)                                                             │
├────────────────┬────────────────────────────────────┬───────────────────────────┤
│                │                                    │                           │
│  Left Sidebar  │   Center Content                   │   Media Panel             │
│  (200px, min)  │   (flex: 1, min: 400px)            │   (320px, resizable)      │
│  (resizable)   │                                    │                           │
│                │   ┌────────────────────────────┐   │   ┌───────────────────┐   │
│  ┌──────────┐  │   │ Tab Bar (36px)             │   │   │ Tab: Refs/Output  │   │
│  │ Prompts  │  │   ├────────────────────────────┤   │   ├───────────────────┤   │
│  │          │  │   │                            │   │   │                   │   │
│  ├──────────┤  │   │ Queue / Jobs               │   │   │ Selection Array   │   │
│  │ Folders  │  │   │ (flex: 1)                  │   │   │ or                │   │
│  │          │  │   │                            │   │   │ Image Viewer      │   │
│  ├──────────┤  │   │                            │   │   │                   │   │
│  │ Quick    │  │   │                            │   │   ├───────────────────┤   │
│  │ Actions  │  │   ├────────────────────────────┤   │   │                   │   │
│  └──────────┘  │   │ Prompt Editor (200px)      │   │   │ Browser Grid      │   │
│                │   │ (collapsible)              │   │   │ or                │   │
│                │   │                            │   │   │ Thumbnail Strip   │   │
│                │   └────────────────────────────┘   │   │                   │   │
│                │                                    │   └───────────────────┘   │
│                │                                    │                           │
├────────────────┴────────────────────────────────────┴───────────────────────────┤
│ Quick Generate Bar (56px, expands with results)     See SPEC_QUICK_GENERATE.md │
│ ┌─────┐ ┌────────────────────────────────────────────────────┐  ⚙  [Generate]  │
│ │+ref │ │ Quick generate: enter prompt...                    │                  │
│ └─────┘ └────────────────────────────────────────────────────┘                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Log Drawer (collapsed: 32px, expanded: 200px, resizable)                        │
└─────────────────────────────────────────────────────────────────────────────────┘

Panel Constraints:
- Left Sidebar:      min 160px, max 300px, default 200px
- Center:            min 400px, flex: 1
- Media Panel:       min 280px, max 500px, default 320px
- Quick Generate:    56px collapsed, up to 300px with result preview
- Log Drawer:        min 100px (expanded), max 400px
```

### 8.4 Responsive Behavior

```typescript
// At narrow widths, panels can collapse
interface ResponsiveBreakpoints {
  // Below this, left sidebar auto-collapses
  collapseSidebar: 1200,
  
  // Below this, media panel becomes overlay/drawer
  collapseMediaPanel: 1000,
  
  // Below this, single-column layout
  mobileLayout: 768
}

// User can manually collapse any panel regardless of width
interface PanelState {
  leftSidebar: 'expanded' | 'collapsed'
  mediaPanel: 'expanded' | 'collapsed' | 'floating'
  logDrawer: 'expanded' | 'collapsed'
  promptEditor: 'expanded' | 'collapsed'
}
```

---

## 9. State Management

### 9.1 Store Structure (Zustand)

```typescript
interface AppStore {
  // Queue State
  queue: {
    groups: Record<string, QueueGroup>
    groupOrder: string[]
    entries: Record<string, QueueEntry>
  }
  
  // Job State (runtime)
  jobs: {
    active: Record<string, Job>
    history: Job[]                    // recent completed/failed
    historyLimit: number              // default 100
  }
  
  // Pipeline State
  pipeline: {
    running: boolean
    rateLimiter: {
      config: RateLimiterConfig
      state: RateLimiterState
    }
    concurrency: {
      config: ConcurrencyConfig
      state: ConcurrencyState
    }
    queue: {
      queued: number
      inFlight: number
    }
  }
  
  // UI State
  ui: {
    activeTab: 'queue' | 'jobs' | 'editor'
    selectedPrompt: string | null
    selectedEntry: string | null
    expandedGroups: Set<string>
    expandedJobs: Set<string>
    sidebarWidth: number
    logDrawerHeight: number
    logDrawerOpen: boolean
  }
  
  // Settings
  settings: {
    apiKey: string
    apiUrl: string
    pathAliases: PathAliases
    outputDir: string
    promptsDir: string
    img2imgDir: string
    compression: LoadOptions
    failurePolicy: FailurePolicy
    proxy: ProxyConfig | null
  }
}

// Actions are defined per-slice
interface QueueActions {
  createGroup: (name: string) => string
  deleteGroup: (id: string) => void
  // ... etc
}

interface JobActions {
  createJob: (entryId: string) => string
  pauseJob: (id: string) => void
  resumeJob: (id: string) => void
  cancelJob: (id: string) => void
  updateJobTarget: (id: string, target: number) => void
  // ... etc
}

interface PipelineActions {
  startPipeline: () => void
  stopPipeline: () => Promise<void>
  updateRateLimitConfig: (config: Partial<RateLimiterConfig>) => void
  updateConcurrencyConfig: (config: Partial<ConcurrencyConfig>) => void
  // ... etc
}
```

### 9.2 WebSocket Communication

```typescript
// Main → Renderer channels
type MainToRendererChannel =
  | 'pipeline:state-update'
  | 'job:update'
  | 'batch:start'
  | 'batch:complete'
  | 'batch:error'
  | 'rate-limited'
  | 'prompt:changed'
  | 'settings:updated'

// Renderer → Main channels
type RendererToMainChannel =
  | 'queue:start'
  | 'queue:stop'
  | 'job:pause'
  | 'job:resume'
  | 'job:cancel'
  | 'job:update-target'
  | 'pipeline:update-rate-limit'
  | 'pipeline:update-concurrency'
  | 'prompt:load'
  | 'prompt:save'
  | 'references:get-folder'
  | 'references:get-thumbnail'
  | 'settings:update'
  | 'settings:get'

// Typed WebSocket API
interface WSApi {
  // Send (request/response)
  send<T>(channel: RendererToMainChannel, ...args: any[]): Promise<T>
  
  // Listen (push from main)
  on(channel: MainToRendererChannel, handler: (...args: any[]) => void): () => void
}
```

---

## 10. Storage & Persistence

### 10.1 File Structure

```
app-data/
├── config.json                       # settings, aliases
├── queue.json                        # queue groups and entries
├── history.json                      # recent job history (optional)
│
├── prompts/                          # prompt library
│   ├── portrait_v1.txt
│   ├── landscape_dramatic.txt
│   └── ...
│
├── img2img/                          # default reference root
│   ├── faces/
│   │   ├── female/
│   │   └── male/
│   ├── poses/
│   └── ...
│
├── generated/                        # output directory
│   └── ...
│
├── cache/
│   └── thumbnails/                   # thumbnail cache
│       └── ...
│
└── logs/
    └── app.log                       # application log
```

### 10.2 Config Schema

```typescript
interface ConfigFile {
  version: number                     // schema version for migrations
  
  api: {
    key: string
    url: string
    proxy: ProxyConfig | null
  }
  
  paths: {
    prompts: string
    img2img: string
    output: string
    aliases: PathAliases
  }
  
  pipeline: {
    rateLimit: RateLimiterConfig
    concurrency: ConcurrencyConfig
    failurePolicy: FailurePolicy
  }
  
  // Payload constraints - user configurable
  // See SPEC_PAYLOAD_CONFIG.md for full specification
  payload: PayloadConstraints
  
  // Compression settings - user configurable  
  // See SPEC_COMPRESSION.md for full specification
  compression: CompressionSettings
  
  ui: {
    theme: 'light' | 'dark' | 'system'
    sidebarWidth: number
    logDrawerHeight: number
  }
}

interface ProxyConfig {
  type: 'socks' | 'http'
  host: string
  port: number
}

// See SPEC_PAYLOAD_CONFIG.md for PayloadConstraints and CompressionSettings interfaces
```

### 10.3 Queue Schema

```typescript
interface QueueFile {
  version: number
  groups: QueueGroup[]
  entries: QueueEntry[]
}
```

---

## 11. Libraries & Dependencies

### 11.1 Core

| Package | Purpose | Notes |
|---------|---------|-------|
| `electron` | Desktop app framework | Latest stable |
| `electron-builder` | Packaging | |
| `react` | UI framework | 18.x |
| `typescript` | Type safety | 5.x |

### 11.2 State & Data

| Package | Purpose | Notes |
|---------|---------|-------|
| `zustand` | State management | Lightweight, no boilerplate |
| `immer` | Immutable updates | Used with zustand |
| `zod` | Schema validation | Config/payload validation |

### 11.3 UI Components

| Package | Purpose | Notes |
|---------|---------|-------|
| `@radix-ui/*` | Headless primitives | Dropdowns, dialogs, popovers |
| `tailwindcss` | Styling | Utility-first |
| `lucide-react` | Icons | |
| `@tanstack/react-virtual` | Virtualization | Lists, grids |
| `@tanstack/react-table` | Table | Queue table |
| `react-resizable-panels` | Layout panels | Sidebar, log drawer |
| `@dnd-kit/core` | Drag and drop | Row reordering |
| `sonner` | Toasts | |
| `cmdk` | Command palette | Quick actions |
| `monaco-editor` | Code editor | Prompt editing |

### 11.4 Backend/Utilities

| Package | Purpose | Notes |
|---------|---------|-------|
| `sharp` | Image processing | Compression, thumbnails |
| `chokidar` | File watching | Prompt hot-reload |
| `socks-proxy-agent` | SOCKS proxy | Tor routing |
| `electron-store` | Settings persistence | |
| `uuid` | ID generation | |
| `date-fns` | Date formatting | |

### 11.5 Development

| Package | Purpose | Notes |
|---------|---------|-------|
| `vite` | Build tool | Fast HMR |
| `vitest` | Testing | |
| `eslint` | Linting | |
| `prettier` | Formatting | |

---

## 12. Configuration

### 12.1 Default Values

```typescript
const DEFAULTS = {
  // Generation
  model: 'seedream-v4',
  width: 4096,
  height: 4096,
  imagesPerBatch: 1,
  batchCount: 25,
  
  // Pipeline
  rateLimit: {
    maxTokens: 25,
    windowMs: 2500,
    minDelayMs: 50
  },
  concurrency: {
    maxConcurrent: 75
  },
  
  // Failure
  consecutiveFailureThreshold: 5,
  retryMaxAttempts: 3,
  
  // Execution
  tolerance: 3,                       // for target mode
}

// See SPEC_PAYLOAD_CONFIG.md for full payload/compression configuration
// All payload limits are user-configurable via Settings
```

### 12.2 Payload Constraints (User Configurable)

All payload and compression limits are configurable at runtime. See `SPEC_PAYLOAD_CONFIG.md` for complete specification.

```typescript
// Quick reference - these are defaults, user can change
const DEFAULT_PAYLOAD_CONSTRAINTS = {
  maxPayloadBytes: 4 * 1024 * 1024,    // 4 MB - adjustable
  maxReferenceImages: 10,               // adjustable
  promptReserveBytes: 50 * 1024,        // 50 KB
  metadataReserveBytes: 20 * 1024,      // 20 KB
  safetyMarginPercent: 10,
  minPerImageBytes: 100 * 1024,         // 100 KB floor
  maxPerImageBytes: 800 * 1024,         // 800 KB ceiling
}

const DEFAULT_COMPRESSION_SETTINGS = {
  maxDimension: 1440,                   // adjustable
  initialQuality: 87,                   // adjustable
  minQuality: 50,                       // adjustable
  qualityStep: 10,
  maxAttempts: 5,
  autoCompress: true,
  warnOnHeavyCompression: true,
  heavyCompressionThreshold: 60,
  showCompressionDetails: true,
}
```

### 12.2 Environment Variables (Optional Overrides)

```bash
# API
NANO_API_KEY=<key>
NANO_API_URL=https://nano-gpt.com/api/generate-image

# Paths
NANO_PROMPTS_DIR=./prompts
NANO_IMG2IMG_DIR=./img2img
NANO_OUTPUT_DIR=./generated

# Pipeline
NANO_MAX_CONCURRENT=75
NANO_RATE_LIMIT_TOKENS=25
NANO_RATE_LIMIT_WINDOW=2500

# Proxy
NANO_PROXY_HOST=127.0.0.1
NANO_PROXY_PORT=9050
NANO_PROXY_TYPE=socks
```

---

## Appendix A: Migration from queue.txt

```typescript
function parseQueueTxt(content: string): { groups: QueueGroup[], entries: QueueEntry[] } {
  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
  
  const defaultGroup: QueueGroup = {
    id: generateId(),
    name: 'Imported',
    collapsed: false,
    sortOrder: 0,
    entries: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  const entries: QueueEntry[] = []
  
  for (const line of lines) {
    const entry = parseQueueLine(line)  // existing parser
    if (entry) {
      const queueEntry = convertToQueueEntry(entry)
      entries.push(queueEntry)
      defaultGroup.entries.push(queueEntry.id)
    }
  }
  
  return { groups: [defaultGroup], entries }
}
```

---

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New queue entry |
| `Ctrl+G` | New group |
| `Ctrl+S` | Save prompt |
| `Ctrl+Enter` | Start queue / Generate (context-dependent) |
| `Ctrl+.` | Stop queue |
| `Ctrl+K` | Command palette |
| `Ctrl+Shift+G` | Focus quick generate input |
| `Escape` | Close modal/drawer / Cancel generation |
| `Delete` | Delete selected |
| `Ctrl+D` | Duplicate selected |
| `Space` | Toggle enable/disable |

### Quick Generate Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Generate (when input focused) |
| `↑` / `↓` | Navigate prompt history |
| `Ctrl+R` | Add media panel selection as refs |

### Media Panel Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` | Switch to References tab |
| `2` | Switch to Output tab |
| `←` / `→` | Navigate gallery |
| `Enter` | Open lightbox |
| `R` | Use current as reference |

See `SPEC_MEDIA_PANEL.md` and `SPEC_QUICK_GENERATE.md` for complete keyboard navigation.

---

*End of specification.*