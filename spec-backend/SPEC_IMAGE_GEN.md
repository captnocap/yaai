# SPEC_IMAGE_GEN.md

Image generation queue, jobs, and metadata storage with SQLite persistence.

**Database File**: `~/.yaai/db/imagegen.sqlite`

---

## Overview

The image generation system manages:
- **Queue entries** - Configuration for generation jobs (prompt, model, references, settings)
- **Queue groups** - Organizational containers for queue entries
- **Jobs** - Runtime execution state and progress tracking
- **Generated images** - Metadata for output images (files stay on disk)
- **Prompt library** - Saved prompts (files stay on disk, metadata in SQLite)
- **Reference groups** - Saved reference image selections

Current implementation uses JSON files for queue persistence. This spec migrates to SQLite while keeping large files (prompts, images) on disk.

---

## Schema

### Queue Groups Table

```sql
CREATE TABLE queue_groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  collapsed   INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_groups_order ON queue_groups(sort_order);
```

### Queue Entries Table

```sql
CREATE TABLE queue_entries (
  id                TEXT PRIMARY KEY,
  group_id          TEXT NOT NULL REFERENCES queue_groups(id) ON DELETE CASCADE,
  enabled           INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),

  -- Prompt configuration
  prompt_type       TEXT NOT NULL CHECK (prompt_type IN ('library', 'inline', 'wildcard')),
  prompt_value      TEXT NOT NULL,  -- filename, text, or JSON array

  -- Resolution configuration
  resolution_type   TEXT NOT NULL CHECK (resolution_type IN ('dimensions', 'preset')),
  resolution_width  INTEGER,
  resolution_height INTEGER,
  resolution_preset TEXT,
  aspect_ratio      TEXT,

  -- Generation settings
  model             TEXT NOT NULL,
  style             TEXT,
  images_per_batch  INTEGER NOT NULL DEFAULT 1,
  batch_count       INTEGER NOT NULL DEFAULT 25,

  -- References (JSON array of ReferencePattern)
  references        TEXT NOT NULL DEFAULT '[]',

  -- Extended parameters (model-specific, JSON object)
  ext_params        TEXT NOT NULL DEFAULT '{}',

  -- Execution mode
  execution_mode    TEXT NOT NULL DEFAULT 'fixed' CHECK (execution_mode IN ('fixed', 'target')),
  target_images     INTEGER,
  tolerance         INTEGER DEFAULT 3
);

CREATE INDEX idx_entries_group ON queue_entries(group_id, sort_order);
CREATE INDEX idx_entries_enabled ON queue_entries(enabled) WHERE enabled = 1;
```

### Jobs Table

```sql
CREATE TABLE jobs (
  id                      TEXT PRIMARY KEY,
  queue_entry_id          TEXT NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  state                   TEXT NOT NULL CHECK (state IN ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),

  -- Timing
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  started_at              TEXT,
  finished_at             TEXT,

  -- Progress stats
  total_batches           INTEGER NOT NULL DEFAULT 0,
  successful_batches      INTEGER NOT NULL DEFAULT 0,
  failed_batches          INTEGER NOT NULL DEFAULT 0,
  total_images            INTEGER NOT NULL DEFAULT 0,
  expected_batches        INTEGER NOT NULL DEFAULT 0,
  expected_images         INTEGER NOT NULL DEFAULT 0,

  -- Failure tracking
  consecutive_failures    INTEGER NOT NULL DEFAULT 0,
  last_error              TEXT,  -- JSON: { message, code, timestamp, batchIndex, details, hint }
  auto_paused             INTEGER NOT NULL DEFAULT 0,
  pause_reason            TEXT,

  -- Live configuration
  live_target_images      INTEGER,
  live_paused             INTEGER NOT NULL DEFAULT 0,

  -- Resolved references (cached JSON)
  resolved_references     TEXT
);

CREATE INDEX idx_jobs_entry ON jobs(queue_entry_id);
CREATE INDEX idx_jobs_state ON jobs(state);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
```

### Batch Requests Table

```sql
CREATE TABLE batch_requests (
  id              TEXT PRIMARY KEY,
  job_id          TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  batch_index     INTEGER NOT NULL,
  state           TEXT NOT NULL CHECK (state IN ('queued', 'in_flight', 'completed', 'failed')),

  -- Timing
  queued_at       TEXT NOT NULL DEFAULT (datetime('now')),
  started_at      TEXT,
  completed_at    TEXT,

  -- Result
  image_count     INTEGER NOT NULL DEFAULT 0,
  error           TEXT,  -- JSON: { message, code, ... }

  -- Request details (for debugging/retry)
  prompt_used     TEXT NOT NULL,
  references_used TEXT NOT NULL DEFAULT '[]',  -- JSON array of paths
  model_used      TEXT NOT NULL
);

CREATE INDEX idx_batches_job ON batch_requests(job_id, batch_index);
CREATE INDEX idx_batches_state ON batch_requests(state);
```

### Generated Images Table

```sql
CREATE TABLE generated_images (
  id            TEXT PRIMARY KEY,
  job_id        TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  batch_id      TEXT REFERENCES batch_requests(id) ON DELETE SET NULL,

  -- File info (actual file on disk)
  path          TEXT NOT NULL UNIQUE,
  filename      TEXT NOT NULL,
  size          INTEGER NOT NULL,

  -- Generation metadata
  model         TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  references    TEXT NOT NULL DEFAULT '[]',  -- JSON array of reference paths used

  -- Timestamps
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),

  -- User metadata
  favorite      INTEGER NOT NULL DEFAULT 0,
  rating        INTEGER CHECK (rating >= 1 AND rating <= 5),
  tags          TEXT NOT NULL DEFAULT '[]',  -- JSON array
  notes         TEXT
);

CREATE INDEX idx_images_job ON generated_images(job_id);
CREATE INDEX idx_images_model ON generated_images(model);
CREATE INDEX idx_images_created ON generated_images(created_at DESC);
CREATE INDEX idx_images_favorite ON generated_images(favorite) WHERE favorite = 1;
CREATE INDEX idx_images_rating ON generated_images(rating) WHERE rating IS NOT NULL;
```

### Generated Images FTS

```sql
-- FTS5 for searching prompts and notes
CREATE VIRTUAL TABLE images_fts USING fts5(
  prompt,
  notes,
  content=generated_images,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Sync triggers
CREATE TRIGGER images_fts_insert
AFTER INSERT ON generated_images
BEGIN
  INSERT INTO images_fts(rowid, prompt, notes) VALUES (NEW.rowid, NEW.prompt, NEW.notes);
END;

CREATE TRIGGER images_fts_update
AFTER UPDATE OF prompt, notes ON generated_images
BEGIN
  INSERT INTO images_fts(images_fts, rowid, prompt, notes) VALUES ('delete', OLD.rowid, OLD.prompt, OLD.notes);
  INSERT INTO images_fts(rowid, prompt, notes) VALUES (NEW.rowid, NEW.prompt, NEW.notes);
END;

CREATE TRIGGER images_fts_delete
AFTER DELETE ON generated_images
BEGIN
  INSERT INTO images_fts(images_fts, rowid, prompt, notes) VALUES ('delete', OLD.rowid, OLD.prompt, OLD.notes);
END;
```

### Prompt Library Table

```sql
-- Metadata for prompt files (files stay on disk)
CREATE TABLE prompts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,  -- filename without .txt
  path          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  modified_at   TEXT NOT NULL,

  -- Derived/cached metadata
  preview       TEXT,  -- First 200 chars for UI preview
  char_count    INTEGER,
  word_count    INTEGER,
  has_wildcards INTEGER NOT NULL DEFAULT 0,

  -- User metadata
  favorite      INTEGER NOT NULL DEFAULT 0,
  tags          TEXT NOT NULL DEFAULT '[]',  -- JSON array
  use_count     INTEGER NOT NULL DEFAULT 0,
  last_used_at  TEXT
);

CREATE INDEX idx_prompts_name ON prompts(name);
CREATE INDEX idx_prompts_favorite ON prompts(favorite) WHERE favorite = 1;
CREATE INDEX idx_prompts_use_count ON prompts(use_count DESC);
```

### Reference Groups Table

```sql
-- Saved reference selections (reusable)
CREATE TABLE reference_groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ref_groups_name ON reference_groups(name);
```

### Reference Group Items Table

```sql
CREATE TABLE reference_group_items (
  id                TEXT PRIMARY KEY,
  group_id          TEXT NOT NULL REFERENCES reference_groups(id) ON DELETE CASCADE,
  sort_order        INTEGER NOT NULL DEFAULT 0,

  -- Reference pattern (same as queue entry references)
  type              TEXT NOT NULL CHECK (type IN ('explicit', 'random', 'random_recursive', 'all', 'random_global', 'wildcard')),
  path              TEXT NOT NULL,
  count             INTEGER  -- for random_global type
);

CREATE INDEX idx_ref_items_group ON reference_group_items(group_id, sort_order);
```

### Settings Table

```sql
-- Image gen specific settings
CREATE TABLE imagegen_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default settings populated on init
INSERT OR IGNORE INTO imagegen_settings (key, value) VALUES
  ('default_model', '"seedream-v4"'),
  ('default_images_per_batch', '1'),
  ('default_batch_count', '25'),
  ('default_execution_mode', '"fixed"'),
  ('default_tolerance', '3'),
  ('rate_limit', '{"maxTokens":25,"windowMs":2500,"minDelayMs":50}'),
  ('concurrency', '{"maxConcurrent":75}'),
  ('failure_policy', '{"consecutiveFailureThreshold":5,"retryPolicy":{"maxRetries":3,"backoffMs":1000,"backoffMultiplier":2,"maxBackoffMs":30000},"retryableErrors":[429,500,502,503,504],"fatalErrors":[400,401,413]}'),
  ('payload_constraints', '{"maxPayloadBytes":4194304,"maxReferenceImages":10,"promptReserveBytes":51200,"metadataReserveBytes":20480,"safetyMarginPercent":10,"minPerImageBytes":102400,"maxPerImageBytes":819200}'),
  ('compression_settings', '{"maxDimension":1440,"emergencyDimensionFactor":0.8,"initialQuality":87,"minQuality":50,"qualityStep":10,"maxAttempts":5,"autoCompress":true,"warnOnHeavyCompression":true,"heavyCompressionThreshold":60,"showCompressionDetails":true}');
```

---

## TypeScript Interfaces

```typescript
// =============================================================================
// IMAGE GEN TYPES (SQLite-backed)
// =============================================================================

import type {
  QueueGroupId,
  QueueEntryId,
  JobId,
  BatchRequestId,
  GeneratedImageId,
  PromptId,
  ReferenceGroupId,
} from './branded';

// -----------------------------------------------------------------------------
// QUEUE GROUP
// -----------------------------------------------------------------------------

export interface QueueGroup {
  id: QueueGroupId;
  name: string;
  collapsed: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQueueGroupInput {
  name: string;
  collapsed?: boolean;
}

// -----------------------------------------------------------------------------
// QUEUE ENTRY
// -----------------------------------------------------------------------------

export type PromptType = 'library' | 'inline' | 'wildcard';

export interface PromptConfig {
  type: PromptType;
  value: string | string[];  // filename, text, or array of filenames
}

export type ResolutionType = 'dimensions' | 'preset';

export interface ResolutionConfig {
  type: ResolutionType;
  width?: number;
  height?: number;
  preset?: string;  // "1k", "2k", "4k", "8k", "auto"
  aspectRatio?: AspectRatio | null;
}

export type AspectRatio =
  | '21:9' | '16:9' | '9:16' | '5:4' | '4:3'
  | '3:4' | '2:3' | '3:2' | 'square' | 'auto';

export type ReferenceType =
  | 'explicit'        // specific file path
  | 'random'          // !folder - one random from folder
  | 'random_recursive' // !!folder - one random from folder + subdirs
  | 'all'             // !!folder!! - all from folder
  | 'random_global'   // !#N - N random from entire tree
  | 'wildcard';       // {a|b|c} - pick one option

export interface ReferencePattern {
  id: string;
  type: ReferenceType;
  path: string;
  count?: number;  // for random_global type
}

export interface ExtendedParams {
  aspectRatio?: AspectRatio;
  steps?: number;
  cfgScale?: number;
  strength?: number;
  seed?: number | null;
  guidanceScale?: number;
  safetyChecker?: boolean;
}

export type ExecutionMode = 'fixed' | 'target';

export interface QueueEntry {
  id: QueueEntryId;
  groupId: QueueGroupId;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  prompt: PromptConfig;
  resolution: ResolutionConfig;
  model: string;
  style: string | null;
  imagesPerBatch: number;
  batchCount: number;
  references: ReferencePattern[];
  extParams: ExtendedParams;
  executionMode: ExecutionMode;
  targetImages: number | null;
  tolerance: number;
}

export interface CreateQueueEntryInput {
  groupId: QueueGroupId;
  prompt: PromptConfig;
  resolution?: ResolutionConfig;
  model?: string;
  style?: string;
  imagesPerBatch?: number;
  batchCount?: number;
  references?: ReferencePattern[];
  extParams?: ExtendedParams;
  executionMode?: ExecutionMode;
  targetImages?: number;
  tolerance?: number;
}

export interface UpdateQueueEntryInput extends Partial<Omit<CreateQueueEntryInput, 'groupId'>> {
  enabled?: boolean;
}

// -----------------------------------------------------------------------------
// JOB
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
  timestamp: Date;
  batchIndex: number;
  details: string | null;
  hint: string | null;
}

export interface Job {
  id: JobId;
  queueEntryId: QueueEntryId;
  state: JobState;

  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;

  stats: JobStats;

  consecutiveFailures: number;
  lastError: JobError | null;
  autoPaused: boolean;
  pauseReason: string | null;

  liveTargetImages: number | null;
  livePaused: boolean;

  resolvedReferences: ResolvedReference[] | null;
}

export interface ResolvedReference {
  originalPattern: ReferencePattern;
  resolvedPaths: string[];
  base64Data?: string[];  // loaded and compressed
}

// -----------------------------------------------------------------------------
// BATCH REQUEST
// -----------------------------------------------------------------------------

export type BatchState = 'queued' | 'in_flight' | 'completed' | 'failed';

export interface BatchRequest {
  id: BatchRequestId;
  jobId: JobId;
  batchIndex: number;
  state: BatchState;

  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;

  imageCount: number;
  error: JobError | null;

  promptUsed: string;
  referencesUsed: string[];
  modelUsed: string;
}

// -----------------------------------------------------------------------------
// GENERATED IMAGE
// -----------------------------------------------------------------------------

export interface GeneratedImage {
  id: GeneratedImageId;
  jobId: JobId | null;
  batchId: BatchRequestId | null;

  path: string;
  filename: string;
  size: number;

  model: string;
  prompt: string;
  references: string[];

  createdAt: Date;

  favorite: boolean;
  rating: number | null;
  tags: string[];
  notes: string | null;
}

export interface UpdateImageInput {
  favorite?: boolean;
  rating?: number | null;
  tags?: string[];
  notes?: string | null;
}

// -----------------------------------------------------------------------------
// PROMPT
// -----------------------------------------------------------------------------

export interface Prompt {
  id: PromptId;
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;

  preview: string | null;
  charCount: number;
  wordCount: number;
  hasWildcards: boolean;

  favorite: boolean;
  tags: string[];
  useCount: number;
  lastUsedAt: Date | null;
}

// -----------------------------------------------------------------------------
// REFERENCE GROUP
// -----------------------------------------------------------------------------

export interface ReferenceGroup {
  id: ReferenceGroupId;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: ReferencePattern[];
}

// -----------------------------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------------------------

export interface RateLimiterConfig {
  maxTokens: number;
  windowMs: number;
  minDelayMs: number;
}

export interface ConcurrencyConfig {
  maxConcurrent: number;
}

export interface FailurePolicy {
  consecutiveFailureThreshold: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
  };
  retryableErrors: number[];
  fatalErrors: number[];
}

export interface PayloadConstraints {
  maxPayloadBytes: number;
  maxReferenceImages: number;
  promptReserveBytes: number;
  metadataReserveBytes: number;
  safetyMarginPercent: number;
  minPerImageBytes: number;
  maxPerImageBytes: number;
}

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

export interface ImageGenSettings {
  defaultModel: string;
  defaultImagesPerBatch: number;
  defaultBatchCount: number;
  defaultExecutionMode: ExecutionMode;
  defaultTolerance: number;
  rateLimit: RateLimiterConfig;
  concurrency: ConcurrencyConfig;
  failurePolicy: FailurePolicy;
  payloadConstraints: PayloadConstraints;
  compressionSettings: CompressionSettings;
}

// -----------------------------------------------------------------------------
// GALLERY
// -----------------------------------------------------------------------------

export interface GalleryFilters {
  models?: string[];
  dateRange?: { start: Date; end: Date };
  favorite?: boolean;
  minRating?: number;
  tags?: string[];
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'name' | 'rating';
}

export interface GalleryPage {
  images: GeneratedImage[];
  total: number;
  hasMore: boolean;
}

// -----------------------------------------------------------------------------
// QUICK GENERATE
// -----------------------------------------------------------------------------

export interface QuickGenerateRequest {
  prompt: string;
  model: string;
  resolution: ResolutionConfig;
  imagesPerBatch: number;
  references: string[];  // file paths
  style?: string;
  extParams?: ExtendedParams;
}

export interface QuickGenerateResult {
  id: string;
  images: GeneratedImage[];
  prompt: string;
  model: string;
  createdAt: Date;
}
```

---

## ImageGenStore Implementation

```typescript
// =============================================================================
// IMAGE GEN STORE
// =============================================================================

import { Database } from 'bun:sqlite';
import { Result, ok, err } from '../utils/result';
import { generateId } from '../utils/id';
import { AppError } from '../utils/errors';
import { IMAGEGEN_DB_PATH } from '../utils/paths';
import type {
  QueueGroup,
  QueueGroupId,
  CreateQueueGroupInput,
  QueueEntry,
  QueueEntryId,
  CreateQueueEntryInput,
  UpdateQueueEntryInput,
  Job,
  JobId,
  JobState,
  JobStats,
  JobError,
  BatchRequest,
  BatchRequestId,
  BatchState,
  GeneratedImage,
  GeneratedImageId,
  UpdateImageInput,
  Prompt,
  PromptId,
  ReferenceGroup,
  ReferenceGroupId,
  ReferencePattern,
  ImageGenSettings,
  GalleryFilters,
  GalleryPage,
} from '../types';

// -----------------------------------------------------------------------------
// ROW TYPES
// -----------------------------------------------------------------------------

interface QueueGroupRow {
  id: string;
  name: string;
  collapsed: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface QueueEntryRow {
  id: string;
  group_id: string;
  enabled: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  prompt_type: string;
  prompt_value: string;
  resolution_type: string;
  resolution_width: number | null;
  resolution_height: number | null;
  resolution_preset: string | null;
  aspect_ratio: string | null;
  model: string;
  style: string | null;
  images_per_batch: number;
  batch_count: number;
  references: string;
  ext_params: string;
  execution_mode: string;
  target_images: number | null;
  tolerance: number;
}

interface JobRow {
  id: string;
  queue_entry_id: string;
  state: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  total_batches: number;
  successful_batches: number;
  failed_batches: number;
  total_images: number;
  expected_batches: number;
  expected_images: number;
  consecutive_failures: number;
  last_error: string | null;
  auto_paused: number;
  pause_reason: string | null;
  live_target_images: number | null;
  live_paused: number;
  resolved_references: string | null;
}

interface GeneratedImageRow {
  id: string;
  job_id: string | null;
  batch_id: string | null;
  path: string;
  filename: string;
  size: number;
  model: string;
  prompt: string;
  references: string;
  created_at: string;
  favorite: number;
  rating: number | null;
  tags: string;
  notes: string | null;
}

// -----------------------------------------------------------------------------
// IMAGE GEN STORE
// -----------------------------------------------------------------------------

export class ImageGenStore {
  private db: Database;

  constructor(dbPath: string = IMAGEGEN_DB_PATH) {
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  // ---------------------------------------------------------------------------
  // QUEUE GROUP OPERATIONS
  // ---------------------------------------------------------------------------

  createGroup(input: CreateQueueGroupInput): Result<QueueGroup, AppError> {
    const id = generateId('qg') as QueueGroupId;
    const now = new Date().toISOString();

    try {
      // Get max sort order
      const maxOrder = this.db.prepare<{ max: number | null }, []>(`
        SELECT MAX(sort_order) as max FROM queue_groups
      `).get()?.max ?? -1;

      const stmt = this.db.prepare(`
        INSERT INTO queue_groups (id, name, collapsed, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `);

      const row = stmt.get(
        id, input.name, input.collapsed ? 1 : 0, maxOrder + 1, now, now
      ) as QueueGroupRow;

      return ok(this.mapGroup(row));
    } catch (e) {
      return err(AppError.internal('Failed to create queue group', e));
    }
  }

  getGroup(id: QueueGroupId): Result<QueueGroup | null, AppError> {
    try {
      const stmt = this.db.prepare<QueueGroupRow, [string]>(`
        SELECT * FROM queue_groups WHERE id = ?
      `);
      const row = stmt.get(id);
      return ok(row ? this.mapGroup(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get queue group', e));
    }
  }

  listGroups(): Result<QueueGroup[], AppError> {
    try {
      const stmt = this.db.prepare<QueueGroupRow, []>(`
        SELECT * FROM queue_groups ORDER BY sort_order ASC
      `);
      return ok(stmt.all().map(row => this.mapGroup(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list queue groups', e));
    }
  }

  updateGroup(
    id: QueueGroupId,
    updates: Partial<Pick<QueueGroup, 'name' | 'collapsed'>>
  ): Result<QueueGroup | null, AppError> {
    try {
      const sets: string[] = ['updated_at = datetime(\'now\')'];
      const params: unknown[] = [];

      if (updates.name !== undefined) {
        sets.push('name = ?');
        params.push(updates.name);
      }
      if (updates.collapsed !== undefined) {
        sets.push('collapsed = ?');
        params.push(updates.collapsed ? 1 : 0);
      }

      params.push(id);

      const stmt = this.db.prepare(`
        UPDATE queue_groups SET ${sets.join(', ')} WHERE id = ?
        RETURNING *
      `);
      const row = stmt.get(...params) as QueueGroupRow | undefined;

      return ok(row ? this.mapGroup(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to update queue group', e));
    }
  }

  reorderGroups(orderedIds: QueueGroupId[]): Result<void, AppError> {
    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          UPDATE queue_groups SET sort_order = ?, updated_at = datetime('now') WHERE id = ?
        `);
        orderedIds.forEach((id, index) => {
          stmt.run(index, id);
        });
      })();
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to reorder groups', e));
    }
  }

  deleteGroup(id: QueueGroupId): Result<boolean, AppError> {
    try {
      const stmt = this.db.prepare('DELETE FROM queue_groups WHERE id = ?');
      const result = stmt.run(id);
      return ok(result.changes > 0);
    } catch (e) {
      return err(AppError.internal('Failed to delete queue group', e));
    }
  }

  // ---------------------------------------------------------------------------
  // QUEUE ENTRY OPERATIONS
  // ---------------------------------------------------------------------------

  createEntry(input: CreateQueueEntryInput): Result<QueueEntry, AppError> {
    const id = generateId('qe') as QueueEntryId;
    const now = new Date().toISOString();

    try {
      // Get max sort order within group
      const maxOrder = this.db.prepare<{ max: number | null }, [string]>(`
        SELECT MAX(sort_order) as max FROM queue_entries WHERE group_id = ?
      `).get(input.groupId)?.max ?? -1;

      const resolution = input.resolution ?? { type: 'dimensions', width: 4096, height: 4096 };

      const stmt = this.db.prepare(`
        INSERT INTO queue_entries (
          id, group_id, enabled, sort_order, created_at, updated_at,
          prompt_type, prompt_value, resolution_type, resolution_width, resolution_height,
          resolution_preset, aspect_ratio, model, style, images_per_batch, batch_count,
          references, ext_params, execution_mode, target_images, tolerance
        )
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `);

      const row = stmt.get(
        id,
        input.groupId,
        maxOrder + 1,
        now,
        now,
        input.prompt.type,
        typeof input.prompt.value === 'string' ? input.prompt.value : JSON.stringify(input.prompt.value),
        resolution.type,
        resolution.width ?? null,
        resolution.height ?? null,
        resolution.preset ?? null,
        resolution.aspectRatio ?? null,
        input.model ?? 'seedream-v4',
        input.style ?? null,
        input.imagesPerBatch ?? 1,
        input.batchCount ?? 25,
        JSON.stringify(input.references ?? []),
        JSON.stringify(input.extParams ?? {}),
        input.executionMode ?? 'fixed',
        input.targetImages ?? null,
        input.tolerance ?? 3
      ) as QueueEntryRow;

      return ok(this.mapEntry(row));
    } catch (e) {
      return err(AppError.internal('Failed to create queue entry', e));
    }
  }

  getEntry(id: QueueEntryId): Result<QueueEntry | null, AppError> {
    try {
      const stmt = this.db.prepare<QueueEntryRow, [string]>(`
        SELECT * FROM queue_entries WHERE id = ?
      `);
      const row = stmt.get(id);
      return ok(row ? this.mapEntry(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get queue entry', e));
    }
  }

  listEntriesInGroup(groupId: QueueGroupId): Result<QueueEntry[], AppError> {
    try {
      const stmt = this.db.prepare<QueueEntryRow, [string]>(`
        SELECT * FROM queue_entries WHERE group_id = ? ORDER BY sort_order ASC
      `);
      return ok(stmt.all(groupId).map(row => this.mapEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list queue entries', e));
    }
  }

  listEnabledEntries(): Result<QueueEntry[], AppError> {
    try {
      const stmt = this.db.prepare<QueueEntryRow, []>(`
        SELECT e.* FROM queue_entries e
        JOIN queue_groups g ON e.group_id = g.id
        WHERE e.enabled = 1
        ORDER BY g.sort_order ASC, e.sort_order ASC
      `);
      return ok(stmt.all().map(row => this.mapEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list enabled entries', e));
    }
  }

  updateEntry(id: QueueEntryId, input: UpdateQueueEntryInput): Result<QueueEntry | null, AppError> {
    try {
      const sets: string[] = ['updated_at = datetime(\'now\')'];
      const params: unknown[] = [];

      if (input.enabled !== undefined) {
        sets.push('enabled = ?');
        params.push(input.enabled ? 1 : 0);
      }
      if (input.prompt !== undefined) {
        sets.push('prompt_type = ?', 'prompt_value = ?');
        params.push(
          input.prompt.type,
          typeof input.prompt.value === 'string' ? input.prompt.value : JSON.stringify(input.prompt.value)
        );
      }
      if (input.resolution !== undefined) {
        sets.push('resolution_type = ?', 'resolution_width = ?', 'resolution_height = ?', 'resolution_preset = ?', 'aspect_ratio = ?');
        params.push(
          input.resolution.type,
          input.resolution.width ?? null,
          input.resolution.height ?? null,
          input.resolution.preset ?? null,
          input.resolution.aspectRatio ?? null
        );
      }
      if (input.model !== undefined) {
        sets.push('model = ?');
        params.push(input.model);
      }
      if (input.style !== undefined) {
        sets.push('style = ?');
        params.push(input.style);
      }
      if (input.imagesPerBatch !== undefined) {
        sets.push('images_per_batch = ?');
        params.push(input.imagesPerBatch);
      }
      if (input.batchCount !== undefined) {
        sets.push('batch_count = ?');
        params.push(input.batchCount);
      }
      if (input.references !== undefined) {
        sets.push('references = ?');
        params.push(JSON.stringify(input.references));
      }
      if (input.extParams !== undefined) {
        sets.push('ext_params = ?');
        params.push(JSON.stringify(input.extParams));
      }
      if (input.executionMode !== undefined) {
        sets.push('execution_mode = ?');
        params.push(input.executionMode);
      }
      if (input.targetImages !== undefined) {
        sets.push('target_images = ?');
        params.push(input.targetImages);
      }
      if (input.tolerance !== undefined) {
        sets.push('tolerance = ?');
        params.push(input.tolerance);
      }

      params.push(id);

      const stmt = this.db.prepare(`
        UPDATE queue_entries SET ${sets.join(', ')} WHERE id = ?
        RETURNING *
      `);
      const row = stmt.get(...params) as QueueEntryRow | undefined;

      return ok(row ? this.mapEntry(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to update queue entry', e));
    }
  }

  moveEntry(id: QueueEntryId, targetGroupId: QueueGroupId, index: number): Result<void, AppError> {
    try {
      this.db.transaction(() => {
        // Update entries in target group to make room
        this.db.prepare(`
          UPDATE queue_entries SET sort_order = sort_order + 1
          WHERE group_id = ? AND sort_order >= ?
        `).run(targetGroupId, index);

        // Move entry
        this.db.prepare(`
          UPDATE queue_entries SET group_id = ?, sort_order = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(targetGroupId, index, id);
      })();
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to move queue entry', e));
    }
  }

  reorderEntries(groupId: QueueGroupId, orderedIds: QueueEntryId[]): Result<void, AppError> {
    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          UPDATE queue_entries SET sort_order = ?, updated_at = datetime('now')
          WHERE id = ? AND group_id = ?
        `);
        orderedIds.forEach((id, index) => {
          stmt.run(index, id, groupId);
        });
      })();
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to reorder entries', e));
    }
  }

  duplicateEntry(id: QueueEntryId): Result<QueueEntry, AppError> {
    const entryResult = this.getEntry(id);
    if (!entryResult.ok) return entryResult;
    if (!entryResult.value) return err(AppError.notFound('Queue entry not found'));

    const entry = entryResult.value;
    return this.createEntry({
      groupId: entry.groupId,
      prompt: entry.prompt,
      resolution: entry.resolution,
      model: entry.model,
      style: entry.style ?? undefined,
      imagesPerBatch: entry.imagesPerBatch,
      batchCount: entry.batchCount,
      references: entry.references,
      extParams: entry.extParams,
      executionMode: entry.executionMode,
      targetImages: entry.targetImages ?? undefined,
      tolerance: entry.tolerance,
    });
  }

  deleteEntry(id: QueueEntryId): Result<boolean, AppError> {
    try {
      const stmt = this.db.prepare('DELETE FROM queue_entries WHERE id = ?');
      const result = stmt.run(id);
      return ok(result.changes > 0);
    } catch (e) {
      return err(AppError.internal('Failed to delete queue entry', e));
    }
  }

  enableEntries(ids: QueueEntryId[]): Result<number, AppError> {
    try {
      const stmt = this.db.prepare(`
        UPDATE queue_entries SET enabled = 1, updated_at = datetime('now')
        WHERE id IN (${ids.map(() => '?').join(',')})
      `);
      const result = stmt.run(...ids);
      return ok(result.changes);
    } catch (e) {
      return err(AppError.internal('Failed to enable entries', e));
    }
  }

  disableEntries(ids: QueueEntryId[]): Result<number, AppError> {
    try {
      const stmt = this.db.prepare(`
        UPDATE queue_entries SET enabled = 0, updated_at = datetime('now')
        WHERE id IN (${ids.map(() => '?').join(',')})
      `);
      const result = stmt.run(...ids);
      return ok(result.changes);
    } catch (e) {
      return err(AppError.internal('Failed to disable entries', e));
    }
  }

  // ---------------------------------------------------------------------------
  // JOB OPERATIONS
  // ---------------------------------------------------------------------------

  createJob(queueEntryId: QueueEntryId, expectedBatches: number, expectedImages: number): Result<Job, AppError> {
    const id = generateId('job') as JobId;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO jobs (id, queue_entry_id, state, expected_batches, expected_images)
        VALUES (?, ?, 'queued', ?, ?)
        RETURNING *
      `);
      const row = stmt.get(id, queueEntryId, expectedBatches, expectedImages) as JobRow;
      return ok(this.mapJob(row));
    } catch (e) {
      return err(AppError.internal('Failed to create job', e));
    }
  }

  getJob(id: JobId): Result<Job | null, AppError> {
    try {
      const stmt = this.db.prepare<JobRow, [string]>('SELECT * FROM jobs WHERE id = ?');
      const row = stmt.get(id);
      return ok(row ? this.mapJob(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get job', e));
    }
  }

  listActiveJobs(): Result<Job[], AppError> {
    try {
      const stmt = this.db.prepare<JobRow, []>(`
        SELECT * FROM jobs WHERE state IN ('queued', 'running', 'paused')
        ORDER BY created_at ASC
      `);
      return ok(stmt.all().map(row => this.mapJob(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list active jobs', e));
    }
  }

  listJobHistory(limit: number = 100): Result<Job[], AppError> {
    try {
      const stmt = this.db.prepare<JobRow, [number]>(`
        SELECT * FROM jobs WHERE state IN ('completed', 'failed', 'cancelled')
        ORDER BY finished_at DESC LIMIT ?
      `);
      return ok(stmt.all(limit).map(row => this.mapJob(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list job history', e));
    }
  }

  updateJobState(id: JobId, state: JobState): Result<Job | null, AppError> {
    try {
      const updates: string[] = ['state = ?'];
      const params: unknown[] = [state];

      if (state === 'running') {
        updates.push('started_at = COALESCE(started_at, datetime(\'now\'))');
      }
      if (['completed', 'failed', 'cancelled'].includes(state)) {
        updates.push('finished_at = datetime(\'now\')');
      }

      params.push(id);

      const stmt = this.db.prepare(`
        UPDATE jobs SET ${updates.join(', ')} WHERE id = ?
        RETURNING *
      `);
      const row = stmt.get(...params) as JobRow | undefined;
      return ok(row ? this.mapJob(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to update job state', e));
    }
  }

  updateJobStats(id: JobId, stats: Partial<JobStats>): Result<void, AppError> {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];

      if (stats.totalBatches !== undefined) {
        sets.push('total_batches = ?');
        params.push(stats.totalBatches);
      }
      if (stats.successfulBatches !== undefined) {
        sets.push('successful_batches = ?');
        params.push(stats.successfulBatches);
      }
      if (stats.failedBatches !== undefined) {
        sets.push('failed_batches = ?');
        params.push(stats.failedBatches);
      }
      if (stats.totalImages !== undefined) {
        sets.push('total_images = ?');
        params.push(stats.totalImages);
      }

      if (sets.length === 0) return ok(undefined);

      params.push(id);
      this.db.prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to update job stats', e));
    }
  }

  recordJobFailure(id: JobId, error: JobError): Result<void, AppError> {
    try {
      this.db.prepare(`
        UPDATE jobs SET
          consecutive_failures = consecutive_failures + 1,
          last_error = ?
        WHERE id = ?
      `).run(JSON.stringify(error), id);
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to record job failure', e));
    }
  }

  autoPauseJob(id: JobId, reason: string): Result<void, AppError> {
    try {
      this.db.prepare(`
        UPDATE jobs SET state = 'paused', auto_paused = 1, pause_reason = ?
        WHERE id = ?
      `).run(reason, id);
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to auto-pause job', e));
    }
  }

  updateJobTarget(id: JobId, target: number): Result<void, AppError> {
    try {
      this.db.prepare(`
        UPDATE jobs SET live_target_images = ? WHERE id = ?
      `).run(target, id);
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to update job target', e));
    }
  }

  // ---------------------------------------------------------------------------
  // GENERATED IMAGES
  // ---------------------------------------------------------------------------

  addGeneratedImage(
    jobId: JobId | null,
    batchId: BatchRequestId | null,
    path: string,
    filename: string,
    size: number,
    model: string,
    prompt: string,
    references: string[]
  ): Result<GeneratedImage, AppError> {
    const id = generateId('img') as GeneratedImageId;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO generated_images (id, job_id, batch_id, path, filename, size, model, prompt, references)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `);
      const row = stmt.get(
        id, jobId, batchId, path, filename, size, model, prompt, JSON.stringify(references)
      ) as GeneratedImageRow;

      return ok(this.mapImage(row));
    } catch (e) {
      return err(AppError.internal('Failed to add generated image', e));
    }
  }

  getImage(id: GeneratedImageId): Result<GeneratedImage | null, AppError> {
    try {
      const stmt = this.db.prepare<GeneratedImageRow, [string]>(`
        SELECT * FROM generated_images WHERE id = ?
      `);
      const row = stmt.get(id);
      return ok(row ? this.mapImage(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get image', e));
    }
  }

  listImages(filters: GalleryFilters, limit: number = 50, offset: number = 0): Result<GalleryPage, AppError> {
    try {
      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];

      if (filters.models && filters.models.length > 0) {
        conditions.push(`model IN (${filters.models.map(() => '?').join(',')})`);
        params.push(...filters.models);
      }
      if (filters.dateRange) {
        conditions.push('created_at >= ? AND created_at <= ?');
        params.push(filters.dateRange.start.toISOString(), filters.dateRange.end.toISOString());
      }
      if (filters.favorite !== undefined) {
        conditions.push('favorite = ?');
        params.push(filters.favorite ? 1 : 0);
      }
      if (filters.minRating !== undefined) {
        conditions.push('rating >= ?');
        params.push(filters.minRating);
      }
      if (filters.tags && filters.tags.length > 0) {
        // JSON array contains any of the tags
        const tagConditions = filters.tags.map(() => 'tags LIKE ?');
        conditions.push(`(${tagConditions.join(' OR ')})`);
        params.push(...filters.tags.map(t => `%"${t}"%`));
      }

      // Sort
      let orderBy = 'created_at DESC';
      switch (filters.sortBy) {
        case 'oldest':
          orderBy = 'created_at ASC';
          break;
        case 'name':
          orderBy = 'filename ASC';
          break;
        case 'rating':
          orderBy = 'rating DESC NULLS LAST, created_at DESC';
          break;
      }

      // Get total count
      const countStmt = this.db.prepare<{ count: number }, unknown[]>(`
        SELECT COUNT(*) as count FROM generated_images WHERE ${conditions.join(' AND ')}
      `);
      const total = countStmt.get(...params)?.count ?? 0;

      // Get page
      params.push(limit + 1, offset);
      const stmt = this.db.prepare<GeneratedImageRow, unknown[]>(`
        SELECT * FROM generated_images
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(...params);

      const hasMore = rows.length > limit;
      const images = rows.slice(0, limit).map(row => this.mapImage(row));

      return ok({ images, total, hasMore });
    } catch (e) {
      return err(AppError.internal('Failed to list images', e));
    }
  }

  searchImages(query: string, limit: number = 50): Result<GeneratedImage[], AppError> {
    try {
      const stmt = this.db.prepare<GeneratedImageRow, [string, number]>(`
        SELECT gi.* FROM images_fts
        JOIN generated_images gi ON gi.rowid = images_fts.rowid
        WHERE images_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      const rows = stmt.all(query, limit);
      return ok(rows.map(row => this.mapImage(row)));
    } catch (e) {
      return err(AppError.internal('Failed to search images', e));
    }
  }

  updateImage(id: GeneratedImageId, updates: UpdateImageInput): Result<GeneratedImage | null, AppError> {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];

      if (updates.favorite !== undefined) {
        sets.push('favorite = ?');
        params.push(updates.favorite ? 1 : 0);
      }
      if (updates.rating !== undefined) {
        sets.push('rating = ?');
        params.push(updates.rating);
      }
      if (updates.tags !== undefined) {
        sets.push('tags = ?');
        params.push(JSON.stringify(updates.tags));
      }
      if (updates.notes !== undefined) {
        sets.push('notes = ?');
        params.push(updates.notes);
      }

      if (sets.length === 0) return this.getImage(id);

      params.push(id);
      const stmt = this.db.prepare(`
        UPDATE generated_images SET ${sets.join(', ')} WHERE id = ?
        RETURNING *
      `);
      const row = stmt.get(...params) as GeneratedImageRow | undefined;
      return ok(row ? this.mapImage(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to update image', e));
    }
  }

  deleteImage(id: GeneratedImageId): Result<string | null, AppError> {
    try {
      // Get path before deletion
      const img = this.db.prepare<{ path: string }, [string]>(`
        SELECT path FROM generated_images WHERE id = ?
      `).get(id);

      if (!img) return ok(null);

      this.db.prepare('DELETE FROM generated_images WHERE id = ?').run(id);
      return ok(img.path);  // Return path so caller can delete file
    } catch (e) {
      return err(AppError.internal('Failed to delete image', e));
    }
  }

  // ---------------------------------------------------------------------------
  // REFERENCE GROUPS
  // ---------------------------------------------------------------------------

  createReferenceGroup(name: string, items: ReferencePattern[], description?: string): Result<ReferenceGroup, AppError> {
    const id = generateId('rg') as ReferenceGroupId;

    try {
      this.db.transaction(() => {
        // Create group
        this.db.prepare(`
          INSERT INTO reference_groups (id, name, description)
          VALUES (?, ?, ?)
        `).run(id, name, description ?? null);

        // Add items
        const itemStmt = this.db.prepare(`
          INSERT INTO reference_group_items (id, group_id, sort_order, type, path, count)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        items.forEach((item, index) => {
          itemStmt.run(generateId('rgi'), id, index, item.type, item.path, item.count ?? null);
        });
      })();

      return this.getReferenceGroup(id);
    } catch (e) {
      return err(AppError.internal('Failed to create reference group', e));
    }
  }

  getReferenceGroup(id: ReferenceGroupId): Result<ReferenceGroup | null, AppError> {
    try {
      const groupRow = this.db.prepare<{
        id: string;
        name: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }, [string]>(`
        SELECT * FROM reference_groups WHERE id = ?
      `).get(id);

      if (!groupRow) return ok(null);

      const itemRows = this.db.prepare<{
        id: string;
        type: string;
        path: string;
        count: number | null;
      }, [string]>(`
        SELECT id, type, path, count FROM reference_group_items
        WHERE group_id = ? ORDER BY sort_order ASC
      `).all(id);

      return ok({
        id: groupRow.id as ReferenceGroupId,
        name: groupRow.name,
        description: groupRow.description,
        createdAt: new Date(groupRow.created_at),
        updatedAt: new Date(groupRow.updated_at),
        items: itemRows.map(row => ({
          id: row.id,
          type: row.type as ReferencePattern['type'],
          path: row.path,
          count: row.count ?? undefined,
        })),
      });
    } catch (e) {
      return err(AppError.internal('Failed to get reference group', e));
    }
  }

  listReferenceGroups(): Result<ReferenceGroup[], AppError> {
    try {
      const groupRows = this.db.prepare<{ id: string }, []>(`
        SELECT id FROM reference_groups ORDER BY name ASC
      `).all();

      const groups: ReferenceGroup[] = [];
      for (const row of groupRows) {
        const result = this.getReferenceGroup(row.id as ReferenceGroupId);
        if (result.ok && result.value) {
          groups.push(result.value);
        }
      }
      return ok(groups);
    } catch (e) {
      return err(AppError.internal('Failed to list reference groups', e));
    }
  }

  deleteReferenceGroup(id: ReferenceGroupId): Result<boolean, AppError> {
    try {
      const stmt = this.db.prepare('DELETE FROM reference_groups WHERE id = ?');
      const result = stmt.run(id);
      return ok(result.changes > 0);
    } catch (e) {
      return err(AppError.internal('Failed to delete reference group', e));
    }
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  getSetting<T>(key: string): Result<T | null, AppError> {
    try {
      const row = this.db.prepare<{ value: string }, [string]>(`
        SELECT value FROM imagegen_settings WHERE key = ?
      `).get(key);
      return ok(row ? JSON.parse(row.value) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get setting', e));
    }
  }

  setSetting<T>(key: string, value: T): Result<void, AppError> {
    try {
      this.db.prepare(`
        INSERT INTO imagegen_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(key, JSON.stringify(value));
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to set setting', e));
    }
  }

  getAllSettings(): Result<ImageGenSettings, AppError> {
    try {
      const rows = this.db.prepare<{ key: string; value: string }, []>(`
        SELECT key, value FROM imagegen_settings
      `).all();

      const settings: Record<string, unknown> = {};
      for (const row of rows) {
        // Convert snake_case to camelCase
        const key = row.key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        settings[key] = JSON.parse(row.value);
      }

      return ok(settings as ImageGenSettings);
    } catch (e) {
      return err(AppError.internal('Failed to get all settings', e));
    }
  }

  // ---------------------------------------------------------------------------
  // MAPPERS
  // ---------------------------------------------------------------------------

  private mapGroup(row: QueueGroupRow): QueueGroup {
    return {
      id: row.id as QueueGroupId,
      name: row.name,
      collapsed: row.collapsed === 1,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapEntry(row: QueueEntryRow): QueueEntry {
    return {
      id: row.id as QueueEntryId,
      groupId: row.group_id as QueueGroupId,
      enabled: row.enabled === 1,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      prompt: {
        type: row.prompt_type as any,
        value: row.prompt_type === 'wildcard' ? JSON.parse(row.prompt_value) : row.prompt_value,
      },
      resolution: {
        type: row.resolution_type as any,
        width: row.resolution_width ?? undefined,
        height: row.resolution_height ?? undefined,
        preset: row.resolution_preset ?? undefined,
        aspectRatio: row.aspect_ratio as any ?? undefined,
      },
      model: row.model,
      style: row.style,
      imagesPerBatch: row.images_per_batch,
      batchCount: row.batch_count,
      references: JSON.parse(row.references),
      extParams: JSON.parse(row.ext_params),
      executionMode: row.execution_mode as any,
      targetImages: row.target_images,
      tolerance: row.tolerance,
    };
  }

  private mapJob(row: JobRow): Job {
    return {
      id: row.id as JobId,
      queueEntryId: row.queue_entry_id as QueueEntryId,
      state: row.state as JobState,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : null,
      finishedAt: row.finished_at ? new Date(row.finished_at) : null,
      stats: {
        totalBatches: row.total_batches,
        successfulBatches: row.successful_batches,
        failedBatches: row.failed_batches,
        totalImages: row.total_images,
        expectedBatches: row.expected_batches,
        expectedImages: row.expected_images,
      },
      consecutiveFailures: row.consecutive_failures,
      lastError: row.last_error ? JSON.parse(row.last_error) : null,
      autoPaused: row.auto_paused === 1,
      pauseReason: row.pause_reason,
      liveTargetImages: row.live_target_images,
      livePaused: row.live_paused === 1,
      resolvedReferences: row.resolved_references ? JSON.parse(row.resolved_references) : null,
    };
  }

  private mapImage(row: GeneratedImageRow): GeneratedImage {
    return {
      id: row.id as GeneratedImageId,
      jobId: row.job_id as JobId | null,
      batchId: row.batch_id as BatchRequestId | null,
      path: row.path,
      filename: row.filename,
      size: row.size,
      model: row.model,
      prompt: row.prompt,
      references: JSON.parse(row.references),
      createdAt: new Date(row.created_at),
      favorite: row.favorite === 1,
      rating: row.rating,
      tags: JSON.parse(row.tags),
      notes: row.notes,
    };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  close(): void {
    this.db.close();
  }
}
```

---

## Migration from JSON

```typescript
// =============================================================================
// IMAGE GEN MIGRATION
// =============================================================================

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import type { ImageGenStore } from './imagegen-store';
import { IMAGE_GEN_QUEUE_FILE_LEGACY } from '../utils/paths';

interface LegacyQueueFile {
  version: number;
  groups: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    sortOrder: number;
    entries: string[];
    createdAt: number;
    updatedAt: number;
  }>;
  entries: Array<{
    id: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
    prompt: { type: string; value: string | string[] };
    resolution: { type: string; width?: number; height?: number; preset?: string; aspectRatio?: string };
    imagesPerBatch: number;
    batchCount: number;
    model: string;
    style: string | null;
    references: Array<{ id: string; type: string; path: string; count?: number }>;
    extParams: Record<string, unknown>;
    executionMode: string;
    targetImages: number | null;
    tolerance: number;
  }>;
}

/**
 * Migrate image gen queue from JSON to SQLite
 */
export async function migrateImageGenQueue(
  store: ImageGenStore
): Promise<{ groups: number; entries: number; errors: string[] }> {
  const stats = { groups: 0, entries: 0, errors: [] as string[] };

  if (!existsSync(IMAGE_GEN_QUEUE_FILE_LEGACY)) {
    return stats;
  }

  try {
    const content = await readFile(IMAGE_GEN_QUEUE_FILE_LEGACY, 'utf-8');
    const legacy: LegacyQueueFile = JSON.parse(content);

    // Create ID mapping for entries
    const entryIdMap = new Map<string, string>();

    // Migrate groups
    for (const legacyGroup of legacy.groups) {
      const result = store.createGroup({ name: legacyGroup.name, collapsed: legacyGroup.collapsed });
      if (!result.ok) {
        stats.errors.push(`Group ${legacyGroup.name}: ${result.error.message}`);
        continue;
      }

      stats.groups++;
      const newGroupId = result.value.id;

      // Migrate entries in this group
      for (const entryId of legacyGroup.entries) {
        const legacyEntry = legacy.entries.find(e => e.id === entryId);
        if (!legacyEntry) continue;

        const entryResult = store.createEntry({
          groupId: newGroupId,
          prompt: legacyEntry.prompt as any,
          resolution: legacyEntry.resolution as any,
          model: legacyEntry.model,
          style: legacyEntry.style ?? undefined,
          imagesPerBatch: legacyEntry.imagesPerBatch,
          batchCount: legacyEntry.batchCount,
          references: legacyEntry.references as any,
          extParams: legacyEntry.extParams as any,
          executionMode: legacyEntry.executionMode as any,
          targetImages: legacyEntry.targetImages ?? undefined,
          tolerance: legacyEntry.tolerance,
        });

        if (entryResult.ok) {
          entryIdMap.set(entryId, entryResult.value.id);

          // Set enabled state
          if (!legacyEntry.enabled) {
            store.updateEntry(entryResult.value.id, { enabled: false });
          }

          stats.entries++;
        } else {
          stats.errors.push(`Entry ${entryId}: ${entryResult.error.message}`);
        }
      }
    }
  } catch (e) {
    stats.errors.push(`Failed to read queue file: ${e}`);
  }

  return stats;
}
```

---

## WebSocket Handlers

```typescript
// =============================================================================
// IMAGE GEN WEBSOCKET HANDLERS
// =============================================================================

import type { WebSocketServer } from '../ws/server';
import type { ImageGenStore } from '../stores/imagegen-store';
import type {
  QueueGroupId,
  QueueEntryId,
  JobId,
  GeneratedImageId,
  ReferenceGroupId,
  CreateQueueGroupInput,
  CreateQueueEntryInput,
  UpdateQueueEntryInput,
  UpdateImageInput,
  GalleryFilters,
  ReferencePattern,
} from '../types';

export function registerImageGenHandlers(
  ws: WebSocketServer,
  store: ImageGenStore
): void {
  // ---------------------------------------------------------------------------
  // QUEUE GROUPS
  // ---------------------------------------------------------------------------

  ws.onRequest('imagegen:list-groups', async () => {
    const result = store.listGroups();
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:create-group', async ({ name, collapsed }: CreateQueueGroupInput) => {
    const result = store.createGroup({ name, collapsed });
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:update-group', async ({
    id,
    name,
    collapsed,
  }: {
    id: QueueGroupId;
    name?: string;
    collapsed?: boolean;
  }) => {
    const result = store.updateGroup(id, { name, collapsed });
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:reorder-groups', async ({ ids }: { ids: QueueGroupId[] }) => {
    const result = store.reorderGroups(ids);
    if (!result.ok) throw result.error;
  });

  ws.onRequest('imagegen:delete-group', async ({ id }: { id: QueueGroupId }) => {
    const result = store.deleteGroup(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  // ---------------------------------------------------------------------------
  // QUEUE ENTRIES
  // ---------------------------------------------------------------------------

  ws.onRequest('imagegen:list-entries', async ({ groupId }: { groupId: QueueGroupId }) => {
    const result = store.listEntriesInGroup(groupId);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:list-enabled-entries', async () => {
    const result = store.listEnabledEntries();
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:create-entry', async (input: CreateQueueEntryInput) => {
    const result = store.createEntry(input);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:update-entry', async ({
    id,
    ...updates
  }: { id: QueueEntryId } & UpdateQueueEntryInput) => {
    const result = store.updateEntry(id, updates);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:move-entry', async ({
    id,
    targetGroupId,
    index,
  }: {
    id: QueueEntryId;
    targetGroupId: QueueGroupId;
    index: number;
  }) => {
    const result = store.moveEntry(id, targetGroupId, index);
    if (!result.ok) throw result.error;
  });

  ws.onRequest('imagegen:reorder-entries', async ({
    groupId,
    ids,
  }: {
    groupId: QueueGroupId;
    ids: QueueEntryId[];
  }) => {
    const result = store.reorderEntries(groupId, ids);
    if (!result.ok) throw result.error;
  });

  ws.onRequest('imagegen:duplicate-entry', async ({ id }: { id: QueueEntryId }) => {
    const result = store.duplicateEntry(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:delete-entry', async ({ id }: { id: QueueEntryId }) => {
    const result = store.deleteEntry(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:enable-entries', async ({ ids }: { ids: QueueEntryId[] }) => {
    const result = store.enableEntries(ids);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:disable-entries', async ({ ids }: { ids: QueueEntryId[] }) => {
    const result = store.disableEntries(ids);
    if (!result.ok) throw result.error;
    return result.value;
  });

  // ---------------------------------------------------------------------------
  // JOBS
  // ---------------------------------------------------------------------------

  ws.onRequest('imagegen:get-job', async ({ id }: { id: JobId }) => {
    const result = store.getJob(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:list-active-jobs', async () => {
    const result = store.listActiveJobs();
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:list-job-history', async ({ limit }: { limit?: number }) => {
    const result = store.listJobHistory(limit);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:update-job-target', async ({
    id,
    target,
  }: {
    id: JobId;
    target: number;
  }) => {
    const result = store.updateJobTarget(id, target);
    if (!result.ok) throw result.error;
  });

  // ---------------------------------------------------------------------------
  // GALLERY
  // ---------------------------------------------------------------------------

  ws.onRequest('imagegen:list-images', async ({
    filters,
    limit,
    offset,
  }: {
    filters?: GalleryFilters;
    limit?: number;
    offset?: number;
  }) => {
    const result = store.listImages(filters ?? {}, limit, offset);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:search-images', async ({
    query,
    limit,
  }: {
    query: string;
    limit?: number;
  }) => {
    const result = store.searchImages(query, limit);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:update-image', async ({
    id,
    ...updates
  }: { id: GeneratedImageId } & UpdateImageInput) => {
    const result = store.updateImage(id, updates);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:delete-image', async ({ id }: { id: GeneratedImageId }) => {
    const result = store.deleteImage(id);
    if (!result.ok) throw result.error;
    return result.value;  // Returns file path for caller to delete
  });

  // ---------------------------------------------------------------------------
  // REFERENCE GROUPS
  // ---------------------------------------------------------------------------

  ws.onRequest('imagegen:list-reference-groups', async () => {
    const result = store.listReferenceGroups();
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:create-reference-group', async ({
    name,
    items,
    description,
  }: {
    name: string;
    items: ReferencePattern[];
    description?: string;
  }) => {
    const result = store.createReferenceGroup(name, items, description);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:delete-reference-group', async ({ id }: { id: ReferenceGroupId }) => {
    const result = store.deleteReferenceGroup(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  ws.onRequest('imagegen:get-settings', async () => {
    const result = store.getAllSettings();
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('imagegen:update-setting', async ({
    key,
    value,
  }: {
    key: string;
    value: unknown;
  }) => {
    const result = store.setSetting(key, value);
    if (!result.ok) throw result.error;
  });
}
```

---

## File Layout

```
~/.yaai/
├── db/
│   └── imagegen.sqlite         # Queue, jobs, images metadata
├── imagegen/
│   ├── prompts/                # Prompt .txt files
│   │   ├── portrait_v1.txt
│   │   └── landscape.txt
│   ├── references/             # Default reference root
│   │   ├── faces/
│   │   └── poses/
│   └── output/                 # Generated images
│       ├── job_abc123/
│       │   ├── batch_001_img_001.png
│       │   └── batch_001_img_002.png
│       └── quick_1704067200/
│           └── quick_001.png
└── cache/
    └── thumbnails/             # Thumbnail cache
```

---

## Key Features

1. **Queue Persistence** - Groups and entries survive restarts
2. **Job History** - Track completed/failed jobs for analytics
3. **Image Metadata** - Favorites, ratings, tags, search via FTS
4. **Reference Groups** - Reusable reference selections
5. **Configurable Settings** - Rate limits, compression, payload constraints
6. **Migration Support** - Import from legacy JSON queue format

---

## Performance Considerations

1. **Lazy Loading** - Don't load all entries at once, paginate
2. **Index Usage** - Use indexes for common filters (model, date, favorite)
3. **FTS for Search** - Porter stemming for prompt/notes search
4. **Batch Inserts** - Use transactions when importing multiple images
5. **Image Files on Disk** - Only metadata in SQLite, actual files stay on disk

---

## Analytics Integration

The Image Generation system integrates with the Analytics system to track generation metrics. See `SPEC_ANALYTICS.md` for full analytics specification.

### Event Emission

Image generation events are captured by listening to existing ImageGenStore events and job lifecycle:

| Event Source | Analytics Event | Data Captured |
|--------------|-----------------|---------------|
| `batch:completed` | `imagegen_event` | jobId, model, imageCount, duration, success=true |
| `batch:failed` | `imagegen_event` | jobId, model, errorCode, duration, success=false |
| Job completion | Aggregated stats | totalImages, successRate, avgDuration |

### Hook Implementation

```typescript
// lib/stores/imagegen-analytics.ts

import { analyticsStore } from './analytics-store'
import type { ImageGenStore } from './imagegen-store'
import type { JobId, BatchRequest } from '../types'

/**
 * Hook into ImageGenStore to emit analytics events
 */
export function hookImageGenStore(store: ImageGenStore): void {
  // Listen to batch completion events
  // These are emitted by the job executor, not the store directly
}

/**
 * Record batch result (called by job executor)
 */
export function recordBatchResult(
  batch: BatchRequest,
  durationMs: number
): void {
  analyticsStore.recordImageGenEvent({
    jobId: batch.jobId,
    batchId: batch.id,
    model: batch.modelUsed,
    imageCount: batch.imageCount,
    durationMs,
    success: batch.state === 'completed',
    errorCode: batch.error?.code ?? null
  })
}

/**
 * Record job summary (called when job finishes)
 */
export function recordJobSummary(
  jobId: JobId,
  stats: {
    totalBatches: number
    successfulBatches: number
    failedBatches: number
    totalImages: number
    totalDurationMs: number
  }
): void {
  // Job summaries are derived from batch events during aggregation
  // No separate event needed - aggregation handles rollup
}
```

### Metrics Available

After integration, the following metrics become available:

- **Total images generated**: Lifetime and per-period counts
- **Success/failure rates**: By model, over time
- **Average generation duration**: Performance tracking
- **Model usage distribution**: Which models are used most
- **Error breakdown**: Common failure modes
