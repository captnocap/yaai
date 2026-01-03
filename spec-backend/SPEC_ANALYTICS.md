# Analytics & Statistics — Specification

> Version: 1.0.0
> Last Updated: 2026-01-02

Comprehensive stats and analytics system for tracking usage, costs, errors, and engagement metrics.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [TypeScript Interfaces](#3-typescript-interfaces)
4. [AnalyticsStore Implementation](#4-analyticsstore-implementation)
5. [Event Collection](#5-event-collection)
6. [Aggregation System](#6-aggregation-system)
7. [WebSocket Handlers](#7-websocket-handlers)
8. [Frontend Dashboard](#8-frontend-dashboard)
9. [Data Retention](#9-data-retention)
10. [Privacy Considerations](#10-privacy-considerations)

---

## 1. Overview

### 1.1 What We Track

| Category | Metrics |
|----------|---------|
| **Cost** | Per-request cost, daily/weekly/monthly totals, by provider/model |
| **Errors** | Count by code (400, 403, 429, 500), rate over time, retryable vs fatal |
| **Tokens** | Average input/output per request, lifetime totals, cache hits |
| **Model Usage** | Request count by model, most/least used, switching patterns |
| **Sessions** | Active time, idle time (5+ min no activity), sessions per day |
| **Image Gen** | Total images, success/failure rates, by model |
| **Tools** | Invocation counts, success rates, execution times |
| **Engagement** | Messages per day, chat creation, likes, search usage |

### 1.2 Design Principles

1. **Separate Database**: `~/.yaai/db/analytics.sqlite` — isolated from core functionality
2. **Event-Driven**: Hooks into existing systems via function wrapping
3. **Pre-Aggregated**: Raw events → hourly → daily → monthly for fast queries
4. **Privacy-First**: No message content, only metadata
5. **Efficient**: Buffered writes, batched flushes, minimal main-thread impact

### 1.3 Database Location

```
~/.yaai/db/
├── chat.sqlite
├── code.sqlite
├── imagegen.sqlite
├── app.sqlite
└── analytics.sqlite    # NEW
```

---

## 2. Database Schema

### 2.1 Raw Event Tables

These store individual events with 7-day default retention.

```sql
-- migrations/analytics/001_raw_events.sql

-- Up

-- =============================================================================
-- AI REQUEST EVENTS
-- =============================================================================

CREATE TABLE ai_request_events (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id          TEXT NOT NULL,
  timestamp           TEXT NOT NULL DEFAULT (datetime('now')),

  -- Request metadata
  provider            TEXT NOT NULL,  -- 'anthropic' | 'openai' | 'google'
  model               TEXT NOT NULL,
  chat_id             TEXT,           -- Optional link to chat

  -- Token usage
  input_tokens        INTEGER NOT NULL DEFAULT 0,
  output_tokens       INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens   INTEGER DEFAULT 0,
  cache_write_tokens  INTEGER DEFAULT 0,

  -- Cost (in microcents = 1/10000 of a cent for precision)
  cost_microcents     INTEGER NOT NULL DEFAULT 0,

  -- Performance
  duration_ms         INTEGER,        -- Total request time
  time_to_first_token INTEGER,        -- TTFT for streaming

  -- Status
  success             INTEGER NOT NULL DEFAULT 1,
  error_code          TEXT,           -- AIErrorCode if failed
  retry_count         INTEGER DEFAULT 0,

  -- Features used
  is_streaming        INTEGER NOT NULL DEFAULT 0,
  has_tools           INTEGER NOT NULL DEFAULT 0,
  has_images          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_ai_events_timestamp ON ai_request_events(timestamp);
CREATE INDEX idx_ai_events_provider ON ai_request_events(provider, timestamp);
CREATE INDEX idx_ai_events_model ON ai_request_events(model, timestamp);
CREATE INDEX idx_ai_events_chat ON ai_request_events(chat_id) WHERE chat_id IS NOT NULL;
CREATE INDEX idx_ai_events_errors ON ai_request_events(error_code, timestamp) WHERE error_code IS NOT NULL;


-- =============================================================================
-- ERROR EVENTS
-- =============================================================================

CREATE TABLE error_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now')),

  -- Error details
  error_code      TEXT NOT NULL,      -- AIErrorCode or HTTP status
  error_type      TEXT NOT NULL,      -- 'ai' | 'ws' | 'db' | 'fs' | 'validation'
  message         TEXT NOT NULL,

  -- Context
  provider        TEXT,
  model           TEXT,
  endpoint        TEXT,               -- API endpoint or WS channel

  -- Classification
  http_status     INTEGER,
  is_retryable    INTEGER NOT NULL DEFAULT 0,
  is_fatal        INTEGER NOT NULL DEFAULT 0,

  -- Recovery
  was_retried     INTEGER NOT NULL DEFAULT 0,
  retry_succeeded INTEGER DEFAULT NULL
);

CREATE INDEX idx_error_events_timestamp ON error_events(timestamp);
CREATE INDEX idx_error_events_code ON error_events(error_code, timestamp);
CREATE INDEX idx_error_events_type ON error_events(error_type, timestamp);


-- =============================================================================
-- IMAGE GENERATION EVENTS
-- =============================================================================

CREATE TABLE imagegen_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now')),

  -- Job context
  job_id          TEXT NOT NULL,
  batch_index     INTEGER NOT NULL,

  -- Generation details
  model           TEXT NOT NULL,
  image_count     INTEGER NOT NULL DEFAULT 0,

  -- Status
  success         INTEGER NOT NULL DEFAULT 1,
  error_code      TEXT,

  -- Performance
  duration_ms     INTEGER,

  -- Metadata
  reference_count INTEGER DEFAULT 0,
  prompt_length   INTEGER DEFAULT 0
);

CREATE INDEX idx_imagegen_events_timestamp ON imagegen_events(timestamp);
CREATE INDEX idx_imagegen_events_model ON imagegen_events(model, timestamp);
CREATE INDEX idx_imagegen_events_job ON imagegen_events(job_id);


-- =============================================================================
-- TOOL INVOCATION EVENTS
-- =============================================================================

CREATE TABLE tool_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now')),

  -- Tool details
  tool_name       TEXT NOT NULL,
  session_id      TEXT,               -- Code session if applicable
  message_id      TEXT,               -- Chat message if applicable

  -- Status
  success         INTEGER NOT NULL DEFAULT 1,
  error_message   TEXT,

  -- Performance
  duration_ms     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tool_events_timestamp ON tool_events(timestamp);
CREATE INDEX idx_tool_events_name ON tool_events(tool_name, timestamp);
CREATE INDEX idx_tool_events_session ON tool_events(session_id) WHERE session_id IS NOT NULL;


-- =============================================================================
-- USER ENGAGEMENT EVENTS
-- =============================================================================

CREATE TABLE engagement_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now')),

  -- Event type: 'message_sent' | 'chat_created' | 'message_liked' | 'search_performed' | 'model_switched'
  event_type      TEXT NOT NULL,

  -- Context
  chat_id         TEXT,
  message_id      TEXT,

  -- Additional data (JSON)
  metadata        TEXT DEFAULT '{}'
);

CREATE INDEX idx_engagement_events_timestamp ON engagement_events(timestamp);
CREATE INDEX idx_engagement_events_type ON engagement_events(event_type, timestamp);
CREATE INDEX idx_engagement_events_chat ON engagement_events(chat_id) WHERE chat_id IS NOT NULL;


-- =============================================================================
-- APP SESSION EVENTS
-- =============================================================================

CREATE TABLE session_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id      TEXT NOT NULL,
  event_type      TEXT NOT NULL,      -- 'start' | 'end' | 'active' | 'idle' | 'resume'
  timestamp       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_session_events_session ON session_events(session_id, timestamp);
CREATE INDEX idx_session_events_type ON session_events(event_type, timestamp);

-- Down
DROP TABLE IF EXISTS session_events;
DROP TABLE IF EXISTS engagement_events;
DROP TABLE IF EXISTS tool_events;
DROP TABLE IF EXISTS imagegen_events;
DROP TABLE IF EXISTS error_events;
DROP TABLE IF EXISTS ai_request_events;
```

### 2.2 Aggregation Tables

Pre-computed aggregates for fast dashboard queries.

```sql
-- migrations/analytics/002_aggregates.sql

-- Up

-- =============================================================================
-- HOURLY AI USAGE AGGREGATES
-- =============================================================================

CREATE TABLE ai_usage_hourly (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  hour                TEXT NOT NULL,  -- ISO timestamp truncated to hour
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,

  -- Counts
  request_count       INTEGER NOT NULL DEFAULT 0,
  success_count       INTEGER NOT NULL DEFAULT 0,
  error_count         INTEGER NOT NULL DEFAULT 0,

  -- Tokens
  input_tokens_total  INTEGER NOT NULL DEFAULT 0,
  output_tokens_total INTEGER NOT NULL DEFAULT 0,
  cache_tokens_total  INTEGER NOT NULL DEFAULT 0,

  -- Cost
  cost_microcents     INTEGER NOT NULL DEFAULT 0,

  -- Performance (sums for averaging: divide by request_count)
  duration_ms_sum     INTEGER NOT NULL DEFAULT 0,
  ttft_ms_sum         INTEGER DEFAULT 0,

  -- Features
  streaming_count     INTEGER NOT NULL DEFAULT 0,
  tool_use_count      INTEGER NOT NULL DEFAULT 0,
  image_request_count INTEGER NOT NULL DEFAULT 0,

  UNIQUE(hour, provider, model)
);

CREATE INDEX idx_ai_hourly_hour ON ai_usage_hourly(hour);
CREATE INDEX idx_ai_hourly_provider ON ai_usage_hourly(provider, hour);


-- =============================================================================
-- DAILY AI USAGE AGGREGATES
-- =============================================================================

CREATE TABLE ai_usage_daily (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  date                TEXT NOT NULL,  -- YYYY-MM-DD
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,

  request_count       INTEGER NOT NULL DEFAULT 0,
  success_count       INTEGER NOT NULL DEFAULT 0,
  error_count         INTEGER NOT NULL DEFAULT 0,
  input_tokens_total  INTEGER NOT NULL DEFAULT 0,
  output_tokens_total INTEGER NOT NULL DEFAULT 0,
  cache_tokens_total  INTEGER NOT NULL DEFAULT 0,
  cost_microcents     INTEGER NOT NULL DEFAULT 0,
  duration_ms_sum     INTEGER NOT NULL DEFAULT 0,
  ttft_ms_sum         INTEGER DEFAULT 0,
  streaming_count     INTEGER NOT NULL DEFAULT 0,
  tool_use_count      INTEGER NOT NULL DEFAULT 0,
  image_request_count INTEGER NOT NULL DEFAULT 0,

  UNIQUE(date, provider, model)
);

CREATE INDEX idx_ai_daily_date ON ai_usage_daily(date);
CREATE INDEX idx_ai_daily_provider ON ai_usage_daily(provider, date);


-- =============================================================================
-- MONTHLY AI USAGE AGGREGATES
-- =============================================================================

CREATE TABLE ai_usage_monthly (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  month               TEXT NOT NULL,  -- YYYY-MM
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,

  request_count       INTEGER NOT NULL DEFAULT 0,
  success_count       INTEGER NOT NULL DEFAULT 0,
  error_count         INTEGER NOT NULL DEFAULT 0,
  input_tokens_total  INTEGER NOT NULL DEFAULT 0,
  output_tokens_total INTEGER NOT NULL DEFAULT 0,
  cache_tokens_total  INTEGER NOT NULL DEFAULT 0,
  cost_microcents     INTEGER NOT NULL DEFAULT 0,
  duration_ms_sum     INTEGER NOT NULL DEFAULT 0,
  streaming_count     INTEGER NOT NULL DEFAULT 0,
  tool_use_count      INTEGER NOT NULL DEFAULT 0,
  image_request_count INTEGER NOT NULL DEFAULT 0,

  UNIQUE(month, provider, model)
);

CREATE INDEX idx_ai_monthly_month ON ai_usage_monthly(month);


-- =============================================================================
-- ERROR AGGREGATES
-- =============================================================================

CREATE TABLE error_hourly (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  hour            TEXT NOT NULL,
  error_code      TEXT NOT NULL,
  error_type      TEXT NOT NULL,

  total_count     INTEGER NOT NULL DEFAULT 0,
  retryable_count INTEGER NOT NULL DEFAULT 0,
  fatal_count     INTEGER NOT NULL DEFAULT 0,
  retry_success_count INTEGER NOT NULL DEFAULT 0,

  UNIQUE(hour, error_code, error_type)
);

CREATE INDEX idx_error_hourly_hour ON error_hourly(hour);
CREATE INDEX idx_error_hourly_code ON error_hourly(error_code, hour);

CREATE TABLE error_daily (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  error_code      TEXT NOT NULL,
  error_type      TEXT NOT NULL,

  total_count     INTEGER NOT NULL DEFAULT 0,
  retryable_count INTEGER NOT NULL DEFAULT 0,
  fatal_count     INTEGER NOT NULL DEFAULT 0,
  retry_success_count INTEGER NOT NULL DEFAULT 0,

  UNIQUE(date, error_code, error_type)
);

CREATE INDEX idx_error_daily_date ON error_daily(date);


-- =============================================================================
-- IMAGE GENERATION AGGREGATES
-- =============================================================================

CREATE TABLE imagegen_hourly (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  hour            TEXT NOT NULL,
  model           TEXT NOT NULL,

  batch_count     INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  image_count     INTEGER NOT NULL DEFAULT 0,
  duration_ms_sum INTEGER NOT NULL DEFAULT 0,

  UNIQUE(hour, model)
);

CREATE INDEX idx_imagegen_hourly_hour ON imagegen_hourly(hour);

CREATE TABLE imagegen_daily (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  model           TEXT NOT NULL,

  batch_count     INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  failure_count   INTEGER NOT NULL DEFAULT 0,
  image_count     INTEGER NOT NULL DEFAULT 0,
  duration_ms_sum INTEGER NOT NULL DEFAULT 0,

  UNIQUE(date, model)
);

CREATE INDEX idx_imagegen_daily_date ON imagegen_daily(date);


-- =============================================================================
-- TOOL USAGE AGGREGATES
-- =============================================================================

CREATE TABLE tool_usage_hourly (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  hour            TEXT NOT NULL,
  tool_name       TEXT NOT NULL,

  invocation_count INTEGER NOT NULL DEFAULT 0,
  success_count    INTEGER NOT NULL DEFAULT 0,
  failure_count    INTEGER NOT NULL DEFAULT 0,
  duration_ms_sum  INTEGER NOT NULL DEFAULT 0,

  UNIQUE(hour, tool_name)
);

CREATE INDEX idx_tool_hourly_hour ON tool_usage_hourly(hour);

CREATE TABLE tool_usage_daily (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL,
  tool_name       TEXT NOT NULL,

  invocation_count INTEGER NOT NULL DEFAULT 0,
  success_count    INTEGER NOT NULL DEFAULT 0,
  failure_count    INTEGER NOT NULL DEFAULT 0,
  duration_ms_sum  INTEGER NOT NULL DEFAULT 0,

  UNIQUE(date, tool_name)
);

CREATE INDEX idx_tool_daily_date ON tool_usage_daily(date);


-- =============================================================================
-- ENGAGEMENT AGGREGATES
-- =============================================================================

CREATE TABLE engagement_daily (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  date                TEXT NOT NULL UNIQUE,

  messages_sent       INTEGER NOT NULL DEFAULT 0,
  chats_created       INTEGER NOT NULL DEFAULT 0,
  messages_liked      INTEGER NOT NULL DEFAULT 0,
  searches_performed  INTEGER NOT NULL DEFAULT 0,
  model_switches      INTEGER NOT NULL DEFAULT 0,
  unique_chats_active INTEGER NOT NULL DEFAULT 0,

  -- Messages per chat stats (JSON: {min, max, avg, median})
  messages_per_chat   TEXT DEFAULT '{}'
);

CREATE INDEX idx_engagement_daily_date ON engagement_daily(date);


-- =============================================================================
-- SESSION AGGREGATES
-- =============================================================================

CREATE TABLE session_daily (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  date                TEXT NOT NULL UNIQUE,

  session_count       INTEGER NOT NULL DEFAULT 0,
  active_time_seconds INTEGER NOT NULL DEFAULT 0,
  idle_time_seconds   INTEGER NOT NULL DEFAULT 0,
  total_time_seconds  INTEGER NOT NULL DEFAULT 0,
  avg_session_seconds INTEGER NOT NULL DEFAULT 0,
  max_session_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_session_daily_date ON session_daily(date);

-- Down
DROP TABLE IF EXISTS session_daily;
DROP TABLE IF EXISTS engagement_daily;
DROP TABLE IF EXISTS tool_usage_daily;
DROP TABLE IF EXISTS tool_usage_hourly;
DROP TABLE IF EXISTS imagegen_daily;
DROP TABLE IF EXISTS imagegen_hourly;
DROP TABLE IF EXISTS error_daily;
DROP TABLE IF EXISTS error_hourly;
DROP TABLE IF EXISTS ai_usage_monthly;
DROP TABLE IF EXISTS ai_usage_daily;
DROP TABLE IF EXISTS ai_usage_hourly;
```

### 2.3 Lifetime Totals & Model Tracking

```sql
-- migrations/analytics/003_lifetime_totals.sql

-- Up

-- =============================================================================
-- LIFETIME TOTALS (Single row, updated incrementally)
-- =============================================================================

CREATE TABLE lifetime_totals (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),

  -- AI Usage
  total_ai_requests     INTEGER NOT NULL DEFAULT 0,
  total_input_tokens    INTEGER NOT NULL DEFAULT 0,
  total_output_tokens   INTEGER NOT NULL DEFAULT 0,
  total_cost_microcents INTEGER NOT NULL DEFAULT 0,

  -- Image Generation
  total_images_generated INTEGER NOT NULL DEFAULT 0,
  total_imagegen_batches INTEGER NOT NULL DEFAULT 0,

  -- Engagement
  total_messages_sent   INTEGER NOT NULL DEFAULT 0,
  total_chats_created   INTEGER NOT NULL DEFAULT 0,
  total_searches        INTEGER NOT NULL DEFAULT 0,

  -- Tool Usage
  total_tool_invocations INTEGER NOT NULL DEFAULT 0,

  -- Sessions
  total_session_count   INTEGER NOT NULL DEFAULT 0,
  total_active_seconds  INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  first_event_at        TEXT,
  last_event_at         TEXT,
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initialize single row
INSERT INTO lifetime_totals (id) VALUES (1);


-- =============================================================================
-- MODEL USAGE TRACKING
-- =============================================================================

-- Model switching history
CREATE TABLE model_switches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT NOT NULL DEFAULT (datetime('now')),

  from_provider   TEXT NOT NULL,
  from_model      TEXT NOT NULL,
  to_provider     TEXT NOT NULL,
  to_model        TEXT NOT NULL,

  chat_id         TEXT,
  session_id      TEXT
);

CREATE INDEX idx_model_switches_timestamp ON model_switches(timestamp);
CREATE INDEX idx_model_switches_from ON model_switches(from_model, timestamp);
CREATE INDEX idx_model_switches_to ON model_switches(to_model, timestamp);


-- Model first/last use summary
CREATE TABLE model_usage_summary (
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,

  first_used_at   TEXT NOT NULL,
  last_used_at    TEXT NOT NULL,
  total_requests  INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (provider, model)
);


-- =============================================================================
-- RETENTION CONFIGURATION
-- =============================================================================

CREATE TABLE analytics_config (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default retention policies
INSERT INTO analytics_config (key, value) VALUES
  ('retention_raw_events_days', '7'),
  ('retention_hourly_aggregates_days', '30'),
  ('retention_daily_aggregates_days', '365'),
  ('retention_monthly_aggregates_days', '0'),  -- 0 = forever
  ('aggregation_interval_minutes', '5'),
  ('last_aggregation_run', ''),
  ('last_cleanup_run', '');

-- Down
DROP TABLE IF EXISTS analytics_config;
DROP TABLE IF EXISTS model_usage_summary;
DROP TABLE IF EXISTS model_switches;
DROP TABLE IF EXISTS lifetime_totals;
```

---

## 3. TypeScript Interfaces

### 3.1 Event Types

```typescript
// lib/analytics/types.ts

import type { ProviderType } from '../ai/types'

// =============================================================================
// RAW EVENT TYPES
// =============================================================================

export interface AIRequestEvent {
  requestId: string
  timestamp: Date
  provider: ProviderType
  model: string
  chatId?: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  costMicrocents: number
  durationMs?: number
  timeToFirstToken?: number
  success: boolean
  errorCode?: string
  retryCount?: number
  isStreaming: boolean
  hasTools: boolean
  hasImages: boolean
}

export interface ErrorEvent {
  timestamp: Date
  errorCode: string
  errorType: 'ai' | 'ws' | 'db' | 'fs' | 'validation'
  message: string
  provider?: string
  model?: string
  endpoint?: string
  httpStatus?: number
  isRetryable: boolean
  isFatal: boolean
  wasRetried?: boolean
  retrySucceeded?: boolean
}

export interface ImageGenEvent {
  timestamp: Date
  jobId: string
  batchIndex: number
  model: string
  imageCount: number
  success: boolean
  errorCode?: string
  durationMs?: number
  referenceCount?: number
  promptLength?: number
}

export interface ToolEvent {
  timestamp: Date
  toolName: string
  sessionId?: string
  messageId?: string
  success: boolean
  errorMessage?: string
  durationMs: number
}

export type EngagementEventType =
  | 'message_sent'
  | 'chat_created'
  | 'message_liked'
  | 'search_performed'
  | 'model_switched'

export interface EngagementEvent {
  timestamp: Date
  eventType: EngagementEventType
  chatId?: string
  messageId?: string
  metadata?: Record<string, unknown>
}

export type SessionEventType = 'start' | 'end' | 'active' | 'idle' | 'resume'

export interface SessionEvent {
  sessionId: string
  eventType: SessionEventType
  timestamp: Date
}
```

### 3.2 Aggregate Types

```typescript
// =============================================================================
// AGGREGATE TYPES
// =============================================================================

export interface AIUsageAggregate {
  period: string  // hour, date, or month depending on granularity
  provider: string
  model: string
  requestCount: number
  successCount: number
  errorCount: number
  inputTokensTotal: number
  outputTokensTotal: number
  cacheTokensTotal: number
  costMicrocents: number
  avgDurationMs: number
  avgTtftMs?: number
  streamingCount: number
  toolUseCount: number
  imageRequestCount: number
}

export interface ErrorAggregate {
  period: string
  errorCode: string
  errorType: string
  totalCount: number
  retryableCount: number
  fatalCount: number
  retrySuccessCount: number
}

export interface ImageGenAggregate {
  period: string
  model: string
  batchCount: number
  successCount: number
  failureCount: number
  imageCount: number
  avgDurationMs: number
}

export interface ToolUsageAggregate {
  period: string
  toolName: string
  invocationCount: number
  successCount: number
  failureCount: number
  avgDurationMs: number
}

export interface EngagementAggregate {
  date: string
  messagesSent: number
  chatsCreated: number
  messagesLiked: number
  searchesPerformed: number
  modelSwitches: number
  uniqueChatsActive: number
  messagesPerChat: {
    min: number
    max: number
    avg: number
    median: number
  }
}

export interface SessionAggregate {
  date: string
  sessionCount: number
  activeTimeSeconds: number
  idleTimeSeconds: number
  totalTimeSeconds: number
  avgSessionSeconds: number
  maxSessionSeconds: number
}
```

### 3.3 Summary Types

```typescript
// =============================================================================
// SUMMARY TYPES (Dashboard views)
// =============================================================================

export interface LifetimeTotals {
  totalAiRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostMicrocents: number
  totalImagesGenerated: number
  totalImagegenBatches: number
  totalMessagesSent: number
  totalChatsCreated: number
  totalSearches: number
  totalToolInvocations: number
  totalSessionCount: number
  totalActiveSeconds: number
  firstEventAt?: Date
  lastEventAt?: Date
}

export interface CostSummary {
  today: number          // In USD
  thisWeek: number
  thisMonth: number
  lifetime: number
  byProvider: Record<string, number>
  byModel: Record<string, number>
}

export interface TokenSummary {
  avgInputPerRequest: number
  avgOutputPerRequest: number
  totalLifetime: number
  byModel: Record<string, {
    input: number
    output: number
    cache: number
  }>
}

export interface ErrorSummary {
  totalToday: number
  totalThisWeek: number
  errorRate: number      // Percentage
  byCode: Record<string, number>
  retryableVsFatal: {
    retryable: number
    fatal: number
  }
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface ModelUsageSummary {
  mostUsed: Array<{ model: string; count: number; percentage: number }>
  leastUsed: Array<{ model: string; count: number; percentage: number }>
  recentSwitches: Array<{
    timestamp: Date
    fromModel: string
    toModel: string
  }>
}

export interface ImageGenSummary {
  totalGenerated: number
  successRate: number
  byModel: Record<string, {
    total: number
    success: number
    failure: number
  }>
  avgDurationMs: number
}

export interface ToolUsageSummary {
  mostUsed: Array<{ tool: string; count: number }>
  successRates: Record<string, number>
  avgDurations: Record<string, number>
}

export interface EngagementSummary {
  messagesPerDay: number
  avgMessagesPerChat: number
  likedMessagesRatio: number
  searchesPerDay: number
  chatCreationRate: number  // Per day
}

export interface SessionSummary {
  avgSessionDuration: number  // Seconds
  avgActiveTime: number
  avgIdleTime: number
  sessionsToday: number
  sessionsThisWeek: number
}
```

### 3.4 Query Types

```typescript
// =============================================================================
// QUERY TYPES
// =============================================================================

export type TimeRange =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | { start: Date; end: Date }

export type Granularity = 'hour' | 'day' | 'week' | 'month'

export interface TimeSeriesPoint<T> {
  timestamp: string
  value: T
}

export interface TimeSeriesQuery {
  metric: 'cost' | 'requests' | 'tokens' | 'errors' | 'images'
  timeRange: TimeRange
  granularity: Granularity
  filters?: {
    provider?: string
    model?: string
    errorCode?: string
    toolName?: string
  }
}

export interface DashboardOverview {
  lifetime: LifetimeTotals
  cost: CostSummary
  tokens: TokenSummary
  errors: ErrorSummary
  models: ModelUsageSummary
  imageGen: ImageGenSummary
  tools: ToolUsageSummary
  engagement: EngagementSummary
  sessions: SessionSummary
}

export interface RetentionConfig {
  rawEventsDays: number
  hourlyAggregatesDays: number
  dailyAggregatesDays: number
  monthlyAggregatesDays: number  // 0 = forever
  aggregationIntervalMinutes: number
}
```

---

## 4. AnalyticsStore Implementation

### 4.1 Core Store Class

```typescript
// lib/analytics/analytics-store.ts

import { Database } from 'bun:sqlite'
import { Result, AppError, logger, paths } from '../core'
import type {
  AIRequestEvent,
  ErrorEvent,
  ImageGenEvent,
  ToolEvent,
  EngagementEvent,
  SessionEvent,
  LifetimeTotals,
  CostSummary,
  ErrorSummary,
  ModelUsageSummary,
  TimeRange,
  Granularity,
  TimeSeriesPoint,
  DashboardOverview,
  RetentionConfig,
} from './types'

const ANALYTICS_DB_PATH = paths.db.root + '/analytics.sqlite'

export class AnalyticsStore {
  private db: Database
  private eventBuffer: {
    ai: AIRequestEvent[]
    error: ErrorEvent[]
    imagegen: ImageGenEvent[]
    tool: ToolEvent[]
    engagement: EngagementEvent[]
    session: SessionEvent[]
  }
  private flushInterval: ReturnType<typeof setInterval> | null = null

  constructor(dbPath: string = ANALYTICS_DB_PATH) {
    this.db = new Database(dbPath, { create: true })
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec('PRAGMA synchronous = NORMAL')
    this.db.exec('PRAGMA cache_size = -32000')  // 32MB cache

    this.eventBuffer = {
      ai: [],
      error: [],
      imagegen: [],
      tool: [],
      engagement: [],
      session: [],
    }
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  start(): void {
    // Flush events every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flushAllEvents()
    }, 5000)

    logger.info('Analytics store started')
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flushAllEvents()
    this.db.close()

    logger.info('Analytics store stopped')
  }

  // ---------------------------------------------------------------------------
  // EVENT RECORDING
  // ---------------------------------------------------------------------------

  recordAIRequest(event: AIRequestEvent): void {
    this.eventBuffer.ai.push(event)
    if (this.eventBuffer.ai.length >= 100) {
      this.flushAIEvents()
    }
  }

  recordError(event: ErrorEvent): void {
    this.eventBuffer.error.push(event)
    if (this.eventBuffer.error.length >= 50) {
      this.flushErrorEvents()
    }
  }

  recordImageGen(event: ImageGenEvent): void {
    this.eventBuffer.imagegen.push(event)
    if (this.eventBuffer.imagegen.length >= 50) {
      this.flushImageGenEvents()
    }
  }

  recordToolInvocation(event: ToolEvent): void {
    this.eventBuffer.tool.push(event)
    if (this.eventBuffer.tool.length >= 50) {
      this.flushToolEvents()
    }
  }

  recordEngagement(event: EngagementEvent): void {
    this.eventBuffer.engagement.push(event)
    if (this.eventBuffer.engagement.length >= 100) {
      this.flushEngagementEvents()
    }
  }

  recordSession(event: SessionEvent): void {
    this.eventBuffer.session.push(event)
    this.flushSessionEvents()  // Immediate flush for session events
  }

  recordModelSwitch(
    fromProvider: string,
    fromModel: string,
    toProvider: string,
    toModel: string,
    chatId?: string,
    sessionId?: string
  ): void {
    try {
      this.db.prepare(`
        INSERT INTO model_switches (from_provider, from_model, to_provider, to_model, chat_id, session_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(fromProvider, fromModel, toProvider, toModel, chatId ?? null, sessionId ?? null)
    } catch (e) {
      logger.error('Failed to record model switch', e instanceof Error ? e : undefined)
    }
  }

  // ---------------------------------------------------------------------------
  // FLUSH OPERATIONS
  // ---------------------------------------------------------------------------

  private flushAllEvents(): void {
    this.flushAIEvents()
    this.flushErrorEvents()
    this.flushImageGenEvents()
    this.flushToolEvents()
    this.flushEngagementEvents()
    this.flushSessionEvents()
  }

  private flushAIEvents(): void {
    if (this.eventBuffer.ai.length === 0) return

    const events = this.eventBuffer.ai.splice(0)

    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO ai_request_events (
            request_id, timestamp, provider, model, chat_id,
            input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
            cost_microcents, duration_ms, time_to_first_token,
            success, error_code, retry_count,
            is_streaming, has_tools, has_images
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const e of events) {
          stmt.run(
            e.requestId,
            e.timestamp.toISOString(),
            e.provider,
            e.model,
            e.chatId ?? null,
            e.inputTokens,
            e.outputTokens,
            e.cacheReadTokens ?? 0,
            e.cacheWriteTokens ?? 0,
            e.costMicrocents,
            e.durationMs ?? null,
            e.timeToFirstToken ?? null,
            e.success ? 1 : 0,
            e.errorCode ?? null,
            e.retryCount ?? 0,
            e.isStreaming ? 1 : 0,
            e.hasTools ? 1 : 0,
            e.hasImages ? 1 : 0
          )
        }

        // Update lifetime totals
        const totals = events.reduce(
          (acc, e) => ({
            requests: acc.requests + 1,
            input: acc.input + e.inputTokens,
            output: acc.output + e.outputTokens,
            cost: acc.cost + e.costMicrocents,
          }),
          { requests: 0, input: 0, output: 0, cost: 0 }
        )

        this.db.prepare(`
          UPDATE lifetime_totals SET
            total_ai_requests = total_ai_requests + ?,
            total_input_tokens = total_input_tokens + ?,
            total_output_tokens = total_output_tokens + ?,
            total_cost_microcents = total_cost_microcents + ?,
            last_event_at = datetime('now'),
            first_event_at = COALESCE(first_event_at, datetime('now')),
            updated_at = datetime('now')
          WHERE id = 1
        `).run(totals.requests, totals.input, totals.output, totals.cost)

        // Update model usage summary
        for (const e of events) {
          this.db.prepare(`
            INSERT INTO model_usage_summary (provider, model, first_used_at, last_used_at, total_requests)
            VALUES (?, ?, datetime('now'), datetime('now'), 1)
            ON CONFLICT(provider, model) DO UPDATE SET
              last_used_at = datetime('now'),
              total_requests = total_requests + 1
          `).run(e.provider, e.model)
        }
      })()
    } catch (e) {
      logger.error('Failed to flush AI events', e instanceof Error ? e : undefined)
      this.eventBuffer.ai.unshift(...events)  // Re-add for retry
    }
  }

  private flushErrorEvents(): void {
    if (this.eventBuffer.error.length === 0) return

    const events = this.eventBuffer.error.splice(0)

    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO error_events (
            timestamp, error_code, error_type, message,
            provider, model, endpoint, http_status,
            is_retryable, is_fatal, was_retried, retry_succeeded
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const e of events) {
          stmt.run(
            e.timestamp.toISOString(),
            e.errorCode,
            e.errorType,
            e.message,
            e.provider ?? null,
            e.model ?? null,
            e.endpoint ?? null,
            e.httpStatus ?? null,
            e.isRetryable ? 1 : 0,
            e.isFatal ? 1 : 0,
            e.wasRetried ? 1 : 0,
            e.retrySucceeded ?? null
          )
        }
      })()
    } catch (e) {
      logger.error('Failed to flush error events', e instanceof Error ? e : undefined)
    }
  }

  private flushImageGenEvents(): void {
    if (this.eventBuffer.imagegen.length === 0) return

    const events = this.eventBuffer.imagegen.splice(0)

    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO imagegen_events (
            timestamp, job_id, batch_index, model, image_count,
            success, error_code, duration_ms, reference_count, prompt_length
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const e of events) {
          stmt.run(
            e.timestamp.toISOString(),
            e.jobId,
            e.batchIndex,
            e.model,
            e.imageCount,
            e.success ? 1 : 0,
            e.errorCode ?? null,
            e.durationMs ?? null,
            e.referenceCount ?? 0,
            e.promptLength ?? 0
          )
        }

        const imageTotal = events.reduce((sum, e) => sum + (e.success ? e.imageCount : 0), 0)

        this.db.prepare(`
          UPDATE lifetime_totals SET
            total_images_generated = total_images_generated + ?,
            total_imagegen_batches = total_imagegen_batches + ?,
            last_event_at = datetime('now'),
            updated_at = datetime('now')
          WHERE id = 1
        `).run(imageTotal, events.length)
      })()
    } catch (e) {
      logger.error('Failed to flush imagegen events', e instanceof Error ? e : undefined)
    }
  }

  private flushToolEvents(): void {
    if (this.eventBuffer.tool.length === 0) return

    const events = this.eventBuffer.tool.splice(0)

    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO tool_events (
            timestamp, tool_name, session_id, message_id,
            success, error_message, duration_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)

        for (const e of events) {
          stmt.run(
            e.timestamp.toISOString(),
            e.toolName,
            e.sessionId ?? null,
            e.messageId ?? null,
            e.success ? 1 : 0,
            e.errorMessage ?? null,
            e.durationMs
          )
        }

        this.db.prepare(`
          UPDATE lifetime_totals SET
            total_tool_invocations = total_tool_invocations + ?,
            last_event_at = datetime('now'),
            updated_at = datetime('now')
          WHERE id = 1
        `).run(events.length)
      })()
    } catch (e) {
      logger.error('Failed to flush tool events', e instanceof Error ? e : undefined)
    }
  }

  private flushEngagementEvents(): void {
    if (this.eventBuffer.engagement.length === 0) return

    const events = this.eventBuffer.engagement.splice(0)

    try {
      this.db.transaction(() => {
        const stmt = this.db.prepare(`
          INSERT INTO engagement_events (
            timestamp, event_type, chat_id, message_id, metadata
          ) VALUES (?, ?, ?, ?, ?)
        `)

        for (const e of events) {
          stmt.run(
            e.timestamp.toISOString(),
            e.eventType,
            e.chatId ?? null,
            e.messageId ?? null,
            JSON.stringify(e.metadata ?? {})
          )
        }

        const counts = events.reduce(
          (acc, e) => {
            if (e.eventType === 'message_sent') acc.messages++
            if (e.eventType === 'chat_created') acc.chats++
            if (e.eventType === 'search_performed') acc.searches++
            return acc
          },
          { messages: 0, chats: 0, searches: 0 }
        )

        this.db.prepare(`
          UPDATE lifetime_totals SET
            total_messages_sent = total_messages_sent + ?,
            total_chats_created = total_chats_created + ?,
            total_searches = total_searches + ?,
            last_event_at = datetime('now'),
            updated_at = datetime('now')
          WHERE id = 1
        `).run(counts.messages, counts.chats, counts.searches)
      })()
    } catch (e) {
      logger.error('Failed to flush engagement events', e instanceof Error ? e : undefined)
    }
  }

  private flushSessionEvents(): void {
    if (this.eventBuffer.session.length === 0) return

    const events = this.eventBuffer.session.splice(0)

    try {
      const stmt = this.db.prepare(`
        INSERT INTO session_events (session_id, event_type, timestamp)
        VALUES (?, ?, ?)
      `)

      for (const e of events) {
        stmt.run(e.sessionId, e.eventType, e.timestamp.toISOString())
      }

      const startCount = events.filter(e => e.eventType === 'start').length
      if (startCount > 0) {
        this.db.prepare(`
          UPDATE lifetime_totals SET
            total_session_count = total_session_count + ?,
            updated_at = datetime('now')
          WHERE id = 1
        `).run(startCount)
      }
    } catch (e) {
      logger.error('Failed to flush session events', e instanceof Error ? e : undefined)
    }
  }

  // ---------------------------------------------------------------------------
  // QUERIES (see Section 4.2)
  // ---------------------------------------------------------------------------
}
```

### 4.2 Query Methods

```typescript
// Continue AnalyticsStore class...

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  getLifetimeTotals(): Result<LifetimeTotals, AppError> {
    try {
      const row = this.db.prepare(`
        SELECT * FROM lifetime_totals WHERE id = 1
      `).get() as any

      return Result.ok({
        totalAiRequests: row.total_ai_requests,
        totalInputTokens: row.total_input_tokens,
        totalOutputTokens: row.total_output_tokens,
        totalCostMicrocents: row.total_cost_microcents,
        totalImagesGenerated: row.total_images_generated,
        totalImagegenBatches: row.total_imagegen_batches,
        totalMessagesSent: row.total_messages_sent,
        totalChatsCreated: row.total_chats_created,
        totalSearches: row.total_searches,
        totalToolInvocations: row.total_tool_invocations,
        totalSessionCount: row.total_session_count,
        totalActiveSeconds: row.total_active_seconds,
        firstEventAt: row.first_event_at ? new Date(row.first_event_at) : undefined,
        lastEventAt: row.last_event_at ? new Date(row.last_event_at) : undefined,
      })
    } catch (e) {
      return Result.err(new AppError({
        code: 'DB_QUERY_FAILED',
        message: 'Failed to get lifetime totals',
        cause: e instanceof Error ? e : undefined
      }))
    }
  }

  getCostSummary(): Result<CostSummary, AppError> {
    try {
      const microcentsToDollars = (mc: number) => mc / 1000000

      // Today
      const today = this.db.prepare(`
        SELECT COALESCE(SUM(cost_microcents), 0) as total
        FROM ai_request_events
        WHERE date(timestamp) = date('now')
      `).get() as { total: number }

      // This week
      const week = this.db.prepare(`
        SELECT COALESCE(SUM(cost_microcents), 0) as total
        FROM ai_usage_daily
        WHERE date >= date('now', '-7 days')
      `).get() as { total: number }

      // This month
      const month = this.db.prepare(`
        SELECT COALESCE(SUM(cost_microcents), 0) as total
        FROM ai_usage_daily
        WHERE date >= date('now', 'start of month')
      `).get() as { total: number }

      // Lifetime
      const lifetime = this.db.prepare(`
        SELECT total_cost_microcents as total
        FROM lifetime_totals WHERE id = 1
      `).get() as { total: number }

      // By provider
      const byProvider = this.db.prepare(`
        SELECT provider, SUM(cost_microcents) as total
        FROM ai_usage_daily
        WHERE date >= date('now', '-30 days')
        GROUP BY provider
      `).all() as Array<{ provider: string; total: number }>

      // By model (top 10)
      const byModel = this.db.prepare(`
        SELECT model, SUM(cost_microcents) as total
        FROM ai_usage_daily
        WHERE date >= date('now', '-30 days')
        GROUP BY model
        ORDER BY total DESC
        LIMIT 10
      `).all() as Array<{ model: string; total: number }>

      return Result.ok({
        today: microcentsToDollars(today.total),
        thisWeek: microcentsToDollars(week.total),
        thisMonth: microcentsToDollars(month.total),
        lifetime: microcentsToDollars(lifetime.total),
        byProvider: Object.fromEntries(
          byProvider.map(r => [r.provider, microcentsToDollars(r.total)])
        ),
        byModel: Object.fromEntries(
          byModel.map(r => [r.model, microcentsToDollars(r.total)])
        ),
      })
    } catch (e) {
      return Result.err(new AppError({
        code: 'DB_QUERY_FAILED',
        message: 'Failed to get cost summary',
        cause: e instanceof Error ? e : undefined
      }))
    }
  }

  getErrorSummary(): Result<ErrorSummary, AppError> {
    try {
      const today = this.db.prepare(`
        SELECT COUNT(*) as total
        FROM error_events
        WHERE date(timestamp) = date('now')
      `).get() as { total: number }

      const week = this.db.prepare(`
        SELECT COALESCE(SUM(total_count), 0) as total
        FROM error_daily
        WHERE date >= date('now', '-7 days')
      `).get() as { total: number }

      const rate = this.db.prepare(`
        SELECT
          COALESCE(SUM(error_count), 0) as errors,
          COALESCE(SUM(request_count), 1) as requests
        FROM ai_usage_daily
        WHERE date >= date('now', '-7 days')
      `).get() as { errors: number; requests: number }

      const byCode = this.db.prepare(`
        SELECT error_code, SUM(total_count) as total
        FROM error_daily
        WHERE date >= date('now', '-7 days')
        GROUP BY error_code
        ORDER BY total DESC
      `).all() as Array<{ error_code: string; total: number }>

      const retryable = this.db.prepare(`
        SELECT
          COALESCE(SUM(retryable_count), 0) as retryable,
          COALESCE(SUM(fatal_count), 0) as fatal
        FROM error_daily
        WHERE date >= date('now', '-7 days')
      `).get() as { retryable: number; fatal: number }

      const lastWeek = this.db.prepare(`
        SELECT COALESCE(SUM(total_count), 0) as total
        FROM error_daily
        WHERE date >= date('now', '-14 days') AND date < date('now', '-7 days')
      `).get() as { total: number }

      const thisWeek = week.total
      const prevWeek = lastWeek.total
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      if (thisWeek > prevWeek * 1.1) trend = 'increasing'
      else if (thisWeek < prevWeek * 0.9) trend = 'decreasing'

      return Result.ok({
        totalToday: today.total,
        totalThisWeek: week.total,
        errorRate: (rate.errors / rate.requests) * 100,
        byCode: Object.fromEntries(byCode.map(r => [r.error_code, r.total])),
        retryableVsFatal: {
          retryable: retryable.retryable,
          fatal: retryable.fatal,
        },
        trend,
      })
    } catch (e) {
      return Result.err(new AppError({
        code: 'DB_QUERY_FAILED',
        message: 'Failed to get error summary',
        cause: e instanceof Error ? e : undefined
      }))
    }
  }

  getModelUsageSummary(): Result<ModelUsageSummary, AppError> {
    try {
      const usage = this.db.prepare(`
        SELECT model, SUM(request_count) as count
        FROM ai_usage_daily
        WHERE date >= date('now', '-30 days')
        GROUP BY model
        ORDER BY count DESC
      `).all() as Array<{ model: string; count: number }>

      const total = usage.reduce((sum, r) => sum + r.count, 0)

      const mostUsed = usage.slice(0, 5).map(r => ({
        model: r.model,
        count: r.count,
        percentage: total > 0 ? (r.count / total) * 100 : 0,
      }))

      const leastUsed = usage.slice(-5).reverse().map(r => ({
        model: r.model,
        count: r.count,
        percentage: total > 0 ? (r.count / total) * 100 : 0,
      }))

      const switches = this.db.prepare(`
        SELECT timestamp, from_model, to_model
        FROM model_switches
        ORDER BY timestamp DESC
        LIMIT 10
      `).all() as Array<{ timestamp: string; from_model: string; to_model: string }>

      return Result.ok({
        mostUsed,
        leastUsed,
        recentSwitches: switches.map(r => ({
          timestamp: new Date(r.timestamp),
          fromModel: r.from_model,
          toModel: r.to_model,
        })),
      })
    } catch (e) {
      return Result.err(new AppError({
        code: 'DB_QUERY_FAILED',
        message: 'Failed to get model usage summary',
        cause: e instanceof Error ? e : undefined
      }))
    }
  }

  getTimeSeries(
    metric: 'cost' | 'requests' | 'tokens' | 'errors' | 'images',
    timeRange: TimeRange,
    granularity: Granularity,
    filters?: { provider?: string; model?: string }
  ): Result<TimeSeriesPoint<number>[], AppError> {
    try {
      const { startDate, endDate } = this.parseTimeRange(timeRange)
      const table = this.getAggregateTable(metric, granularity)
      const dateColumn = granularity === 'hour' ? 'hour' : 'date'
      const valueColumn = this.getValueColumn(metric)

      let sql = `
        SELECT ${dateColumn} as timestamp, COALESCE(SUM(${valueColumn}), 0) as value
        FROM ${table}
        WHERE ${dateColumn} >= ? AND ${dateColumn} <= ?
      `
      const params: unknown[] = [startDate, endDate]

      if (filters?.provider && table.includes('ai_usage')) {
        sql += ' AND provider = ?'
        params.push(filters.provider)
      }
      if (filters?.model && (table.includes('ai_usage') || table.includes('imagegen'))) {
        sql += ' AND model = ?'
        params.push(filters.model)
      }

      sql += ` GROUP BY ${dateColumn} ORDER BY timestamp ASC`

      const rows = this.db.prepare(sql).all(...params) as Array<{
        timestamp: string
        value: number
      }>

      return Result.ok(rows)
    } catch (e) {
      return Result.err(new AppError({
        code: 'DB_QUERY_FAILED',
        message: 'Failed to get time series',
        cause: e instanceof Error ? e : undefined
      }))
    }
  }

  private parseTimeRange(range: TimeRange): { startDate: string; endDate: string } {
    if (typeof range === 'object' && 'start' in range) {
      return {
        startDate: range.start.toISOString().split('T')[0],
        endDate: range.end.toISOString().split('T')[0],
      }
    }

    const now = new Date()
    let start: Date
    let end: Date = now

    switch (range) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'last_7_days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last_30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'all_time':
      default:
        start = new Date(2020, 0, 1)
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  private getAggregateTable(metric: string, granularity: Granularity): string {
    const tables: Record<string, Record<Granularity, string>> = {
      cost: { hour: 'ai_usage_hourly', day: 'ai_usage_daily', week: 'ai_usage_daily', month: 'ai_usage_monthly' },
      requests: { hour: 'ai_usage_hourly', day: 'ai_usage_daily', week: 'ai_usage_daily', month: 'ai_usage_monthly' },
      tokens: { hour: 'ai_usage_hourly', day: 'ai_usage_daily', week: 'ai_usage_daily', month: 'ai_usage_monthly' },
      errors: { hour: 'error_hourly', day: 'error_daily', week: 'error_daily', month: 'error_daily' },
      images: { hour: 'imagegen_hourly', day: 'imagegen_daily', week: 'imagegen_daily', month: 'imagegen_daily' },
    }
    return tables[metric]?.[granularity] ?? 'ai_usage_daily'
  }

  private getValueColumn(metric: string): string {
    const columns: Record<string, string> = {
      cost: 'cost_microcents',
      requests: 'request_count',
      tokens: 'input_tokens_total + output_tokens_total',
      errors: 'total_count',
      images: 'image_count',
    }
    return columns[metric] ?? 'request_count'
  }
```

---

## 5. Event Collection

### 5.1 Hook into AI Provider

```typescript
// lib/analytics/collectors.ts

import { analyticsStore } from './index'
import type { AIProvider, ChatRequest, ChatResponse } from '../ai/types'

export function hookAIProvider(provider: AIProvider): void {
  const originalChat = provider.chat.bind(provider)

  provider.chat = async function(request: ChatRequest, onChunk?: (chunk: any) => void) {
    const startTime = Date.now()
    let timeToFirstToken: number | undefined
    let firstChunkReceived = false

    const wrappedOnChunk = onChunk ? (chunk: any) => {
      if (!firstChunkReceived) {
        timeToFirstToken = Date.now() - startTime
        firstChunkReceived = true
      }
      onChunk(chunk)
    } : undefined

    const result = await originalChat(request, wrappedOnChunk)
    const duration = Date.now() - startTime

    if (result.ok) {
      const response = result.value
      const cost = provider.estimateCost(request.provider, request.model, response.usage)

      analyticsStore.recordAIRequest({
        requestId: request.requestId ?? crypto.randomUUID(),
        timestamp: new Date(),
        provider: request.provider,
        model: request.model,
        chatId: undefined,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cacheReadTokens: response.usage.cacheReadTokens,
        cacheWriteTokens: response.usage.cacheWriteTokens,
        costMicrocents: Math.round(cost.totalCost * 1000000),
        durationMs: duration,
        timeToFirstToken,
        success: true,
        isStreaming: request.stream ?? false,
        hasTools: (request.tools?.length ?? 0) > 0,
        hasImages: hasImageContent(request.messages),
      })
    } else {
      analyticsStore.recordAIRequest({
        requestId: request.requestId ?? crypto.randomUUID(),
        timestamp: new Date(),
        provider: request.provider,
        model: request.model,
        inputTokens: 0,
        outputTokens: 0,
        costMicrocents: 0,
        durationMs: duration,
        success: false,
        errorCode: result.error.code,
        isStreaming: request.stream ?? false,
        hasTools: (request.tools?.length ?? 0) > 0,
        hasImages: hasImageContent(request.messages),
      })

      analyticsStore.recordError({
        timestamp: new Date(),
        errorCode: result.error.code,
        errorType: 'ai',
        message: result.error.message,
        provider: request.provider,
        model: request.model,
        httpStatus: result.error.statusCode,
        isRetryable: result.error.retryable ?? false,
        isFatal: !result.error.retryable,
      })
    }

    return result
  }
}

function hasImageContent(messages: any[]): boolean {
  return messages.some(m => {
    if (Array.isArray(m.content)) {
      return m.content.some((block: any) => block.type === 'image')
    }
    return false
  })
}
```

### 5.2 Hook into Chat Store

```typescript
export function hookChatStore(store: ChatStore): void {
  const originalAddMessage = store.addMessage.bind(store)
  const originalCreateChat = store.createChat.bind(store)
  const originalToggleLike = store.toggleMessageLike.bind(store)
  const originalSearch = store.searchMessages.bind(store)

  store.addMessage = function(input) {
    const result = originalAddMessage(input)

    if (result.ok && input.role === 'user') {
      analyticsStore.recordEngagement({
        timestamp: new Date(),
        eventType: 'message_sent',
        chatId: input.chatId,
        messageId: result.value.id,
      })
    }

    return result
  }

  store.createChat = function(input) {
    const result = originalCreateChat(input)

    if (result.ok) {
      analyticsStore.recordEngagement({
        timestamp: new Date(),
        eventType: 'chat_created',
        chatId: result.value.id,
      })
    }

    return result
  }

  store.toggleMessageLike = function(messageId) {
    const result = originalToggleLike(messageId)

    if (result.ok && result.value) {
      analyticsStore.recordEngagement({
        timestamp: new Date(),
        eventType: 'message_liked',
        messageId,
      })
    }

    return result
  }

  store.searchMessages = function(options) {
    analyticsStore.recordEngagement({
      timestamp: new Date(),
      eventType: 'search_performed',
      chatId: options.chatId,
      metadata: { queryLength: options.query.length },
    })

    return originalSearch(options)
  }
}
```

### 5.3 Session Tracker

```typescript
export class SessionTracker {
  private sessionId: string
  private lastActivityTime: number
  private activityCheckInterval: ReturnType<typeof setInterval> | null = null
  private isIdle = false
  private readonly IDLE_THRESHOLD = 5 * 60 * 1000  // 5 minutes

  constructor() {
    this.sessionId = crypto.randomUUID()
    this.lastActivityTime = Date.now()
  }

  start(): void {
    analyticsStore.recordSession({
      sessionId: this.sessionId,
      eventType: 'start',
      timestamp: new Date(),
    })

    this.activityCheckInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime

      if (timeSinceActivity >= this.IDLE_THRESHOLD && !this.isIdle) {
        this.isIdle = true
        analyticsStore.recordSession({
          sessionId: this.sessionId,
          eventType: 'idle',
          timestamp: new Date(),
        })
      }
    }, 60000)
  }

  recordActivity(): void {
    this.lastActivityTime = Date.now()

    if (this.isIdle) {
      this.isIdle = false
      analyticsStore.recordSession({
        sessionId: this.sessionId,
        eventType: 'resume',
        timestamp: new Date(),
      })
    }
  }

  stop(): void {
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval)
    }

    analyticsStore.recordSession({
      sessionId: this.sessionId,
      eventType: 'end',
      timestamp: new Date(),
    })
  }
}
```

---

## 6. Aggregation System

### 6.1 Aggregation Runner

```typescript
// lib/analytics/aggregation.ts

export function runAggregation(db: Database): Result<{ rowsProcessed: number }, AppError> {
  try {
    let total = 0

    db.transaction(() => {
      // Aggregate AI usage to hourly
      total += db.prepare(`
        INSERT INTO ai_usage_hourly (
          hour, provider, model,
          request_count, success_count, error_count,
          input_tokens_total, output_tokens_total, cache_tokens_total,
          cost_microcents, duration_ms_sum, ttft_ms_sum,
          streaming_count, tool_use_count, image_request_count
        )
        SELECT
          strftime('%Y-%m-%dT%H:00:00', timestamp) as hour,
          provider, model,
          COUNT(*),
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END),
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END),
          SUM(input_tokens),
          SUM(output_tokens),
          SUM(cache_read_tokens + cache_write_tokens),
          SUM(cost_microcents),
          SUM(COALESCE(duration_ms, 0)),
          SUM(COALESCE(time_to_first_token, 0)),
          SUM(is_streaming),
          SUM(has_tools),
          SUM(has_images)
        FROM ai_request_events
        WHERE timestamp < datetime('now', '-5 minutes')
          AND timestamp >= datetime('now', '-1 day')
        GROUP BY hour, provider, model
        ON CONFLICT(hour, provider, model) DO UPDATE SET
          request_count = request_count + excluded.request_count,
          success_count = success_count + excluded.success_count,
          error_count = error_count + excluded.error_count,
          input_tokens_total = input_tokens_total + excluded.input_tokens_total,
          output_tokens_total = output_tokens_total + excluded.output_tokens_total,
          cache_tokens_total = cache_tokens_total + excluded.cache_tokens_total,
          cost_microcents = cost_microcents + excluded.cost_microcents,
          duration_ms_sum = duration_ms_sum + excluded.duration_ms_sum,
          ttft_ms_sum = ttft_ms_sum + excluded.ttft_ms_sum,
          streaming_count = streaming_count + excluded.streaming_count,
          tool_use_count = tool_use_count + excluded.tool_use_count,
          image_request_count = image_request_count + excluded.image_request_count
      `).run().changes

      // Similar aggregations for errors, imagegen, tools...

      // Update last run timestamp
      db.prepare(`
        INSERT INTO analytics_config (key, value, updated_at)
        VALUES ('last_aggregation_run', datetime('now'), datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = datetime('now'), updated_at = datetime('now')
      `).run()
    })()

    return Result.ok({ rowsProcessed: total })
  } catch (e) {
    return Result.err(new AppError({
      code: 'DB_QUERY_FAILED',
      message: 'Aggregation failed',
      cause: e instanceof Error ? e : undefined
    }))
  }
}
```

### 6.2 Daily Rollup

```typescript
export function rollupToDaily(db: Database): Result<{ rowsProcessed: number }, AppError> {
  try {
    let total = 0

    db.transaction(() => {
      total += db.prepare(`
        INSERT INTO ai_usage_daily (
          date, provider, model,
          request_count, success_count, error_count,
          input_tokens_total, output_tokens_total, cache_tokens_total,
          cost_microcents, duration_ms_sum, ttft_ms_sum,
          streaming_count, tool_use_count, image_request_count
        )
        SELECT
          date(hour) as date, provider, model,
          SUM(request_count), SUM(success_count), SUM(error_count),
          SUM(input_tokens_total), SUM(output_tokens_total), SUM(cache_tokens_total),
          SUM(cost_microcents), SUM(duration_ms_sum), SUM(ttft_ms_sum),
          SUM(streaming_count), SUM(tool_use_count), SUM(image_request_count)
        FROM ai_usage_hourly
        WHERE date(hour) < date('now')
        GROUP BY date, provider, model
        ON CONFLICT(date, provider, model) DO UPDATE SET
          request_count = excluded.request_count,
          success_count = excluded.success_count,
          error_count = excluded.error_count,
          input_tokens_total = excluded.input_tokens_total,
          output_tokens_total = excluded.output_tokens_total,
          cache_tokens_total = excluded.cache_tokens_total,
          cost_microcents = excluded.cost_microcents,
          duration_ms_sum = excluded.duration_ms_sum,
          ttft_ms_sum = excluded.ttft_ms_sum,
          streaming_count = excluded.streaming_count,
          tool_use_count = excluded.tool_use_count,
          image_request_count = excluded.image_request_count
      `).run().changes
    })()

    return Result.ok({ rowsProcessed: total })
  } catch (e) {
    return Result.err(new AppError({
      code: 'DB_QUERY_FAILED',
      message: 'Daily rollup failed',
      cause: e instanceof Error ? e : undefined
    }))
  }
}
```

---

## 7. WebSocket Handlers

```typescript
// lib/ws/handlers/analytics-handlers.ts

import type { WSServer } from '../server'
import type { AnalyticsStore } from '../../analytics/analytics-store'
import type { TimeRange, Granularity } from '../../analytics/types'

export function registerAnalyticsHandlers(ws: WSServer, store: AnalyticsStore): void {

  // Dashboard overview
  ws.onRequest('analytics:dashboard', async () => {
    const lifetime = store.getLifetimeTotals()
    const cost = store.getCostSummary()
    const errors = store.getErrorSummary()
    const models = store.getModelUsageSummary()

    if (!lifetime.ok) throw lifetime.error
    if (!cost.ok) throw cost.error
    if (!errors.ok) throw errors.error
    if (!models.ok) throw models.error

    return {
      lifetime: lifetime.value,
      cost: cost.value,
      errors: errors.value,
      models: models.value,
    }
  })

  // Lifetime totals
  ws.onRequest('analytics:lifetime-totals', async () => {
    const result = store.getLifetimeTotals()
    if (!result.ok) throw result.error
    return result.value
  })

  // Cost
  ws.onRequest('analytics:cost-summary', async () => {
    const result = store.getCostSummary()
    if (!result.ok) throw result.error
    return result.value
  })

  ws.onRequest('analytics:cost-timeseries', async (params: {
    timeRange: TimeRange
    granularity: Granularity
    filters?: { provider?: string; model?: string }
  }) => {
    const result = store.getTimeSeries('cost', params.timeRange, params.granularity, params.filters)
    if (!result.ok) throw result.error
    return result.value
  })

  // Errors
  ws.onRequest('analytics:error-summary', async () => {
    const result = store.getErrorSummary()
    if (!result.ok) throw result.error
    return result.value
  })

  ws.onRequest('analytics:error-timeseries', async (params: {
    timeRange: TimeRange
    granularity: Granularity
  }) => {
    const result = store.getTimeSeries('errors', params.timeRange, params.granularity)
    if (!result.ok) throw result.error
    return result.value
  })

  // Tokens
  ws.onRequest('analytics:token-timeseries', async (params: {
    timeRange: TimeRange
    granularity: Granularity
    filters?: { provider?: string; model?: string }
  }) => {
    const result = store.getTimeSeries('tokens', params.timeRange, params.granularity, params.filters)
    if (!result.ok) throw result.error
    return result.value
  })

  // Model usage
  ws.onRequest('analytics:model-usage', async () => {
    const result = store.getModelUsageSummary()
    if (!result.ok) throw result.error
    return result.value
  })

  // Image generation
  ws.onRequest('analytics:imagegen-timeseries', async (params: {
    timeRange: TimeRange
    granularity: Granularity
    filters?: { model?: string }
  }) => {
    const result = store.getTimeSeries('images', params.timeRange, params.granularity, params.filters)
    if (!result.ok) throw result.error
    return result.value
  })

  // Maintenance
  ws.onRequest('analytics:run-aggregation', async () => {
    const result = store.runAggregation()
    if (!result.ok) throw result.error
    return result.value
  })

  ws.onRequest('analytics:run-cleanup', async () => {
    const result = store.runCleanup()
    if (!result.ok) throw result.error
    return result.value
  })
}
```

---

## 8. Frontend Dashboard

### 8.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ANALYTICS                                      [Refresh] [▼ 7d]│
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ $12.45   │  │ 1,234    │  │ 45.2K    │  │ 12       │        │
│  │ Cost     │  │ Requests │  │ Tokens   │  │ Errors   │        │
│  │ ↑ 5%     │  │ ↓ 2%     │  │ ↑ 8%     │  │ → 0%     │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│  Cost Over Time                    │  Model Usage               │
│  ┌─────────────────────────┐      │  ┌───────────────────┐     │
│  │     ╱╲    ╱╲            │      │  │ ████████░░ 65%    │     │
│  │   ╱    ╲╱    ╲          │      │  │ Claude Sonnet     │     │
│  │ ╱                       │      │  │ ███░░░░░░░ 25%    │     │
│  └─────────────────────────┘      │  │ GPT-4o            │     │
│  Jan 1  Jan 3  Jan 5  Jan 7       │  │ █░░░░░░░░░ 10%    │     │
│                                   │  │ Gemini Flash      │     │
│                                   │  └───────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│  Error Breakdown           │  Recent Model Switches            │
│  ┌───────────────────┐    │  ┌─────────────────────────────┐  │
│  │ 429: ████░░░ 45%  │    │  │ Jan 2, 10:30 AM             │  │
│  │ 500: ██░░░░░ 30%  │    │  │ Claude Sonnet → GPT-4o      │  │
│  │ 400: █░░░░░░ 15%  │    │  │ Jan 2, 9:15 AM              │  │
│  │ 403: ░░░░░░░ 10%  │    │  │ GPT-4o → Claude Sonnet      │  │
│  └───────────────────┘    │  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 React Components

```typescript
// src/mainview/components/analytics/AnalyticsDashboard.tsx

import { useState, useEffect } from 'react'
import { MetricCard } from './MetricCard'
import { TimeSeriesChart } from './TimeSeriesChart'
import { UsageBreakdown } from './UsageBreakdown'
import { DateRangePicker } from './DateRangePicker'
import { useAnalyticsDashboard } from '../../hooks/useAnalytics'
import type { TimeRange } from '../../types/analytics'

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('last_7_days')
  const { data, isLoading, error, refresh, lastUpdated } = useAnalyticsDashboard(timeRange)

  if (error) {
    return <div className="analytics-error">{error.message}</div>
  }

  return (
    <div className="analytics-dashboard">
      <header className="analytics-header">
        <h1>Analytics</h1>
        <div className="analytics-controls">
          <button onClick={refresh} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
          <DateRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </header>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <MetricCard
          label="Cost"
          value={data?.cost.thisWeek ?? 0}
          format="currency"
          trend={calculateTrend(data?.cost)}
          sparkline={data?.costTimeSeries}
        />
        <MetricCard
          label="Requests"
          value={data?.lifetime.totalAiRequests ?? 0}
          format="number"
          trend={calculateTrend(data?.requests)}
        />
        <MetricCard
          label="Tokens"
          value={(data?.lifetime.totalInputTokens ?? 0) + (data?.lifetime.totalOutputTokens ?? 0)}
          format="compact"
          trend={calculateTrend(data?.tokens)}
        />
        <MetricCard
          label="Errors"
          value={data?.errors.totalThisWeek ?? 0}
          format="number"
          trend={{ direction: data?.errors.trend ?? 'stable', value: data?.errors.errorRate ?? 0 }}
        />
      </div>

      {/* Charts Row */}
      <div className="analytics-charts">
        <TimeSeriesChart
          title="Cost Over Time"
          data={data?.costTimeSeries ?? []}
          yAxisFormat="currency"
        />
        <UsageBreakdown
          title="Model Usage"
          data={data?.models.mostUsed ?? []}
          labelKey="model"
          valueKey="percentage"
        />
      </div>

      {/* Details Row */}
      <div className="analytics-details">
        <UsageBreakdown
          title="Error Breakdown"
          data={Object.entries(data?.errors.byCode ?? {}).map(([code, count]) => ({
            code,
            count,
            percentage: (count / (data?.errors.totalThisWeek || 1)) * 100
          }))}
          labelKey="code"
          valueKey="percentage"
        />
        <div className="model-switches">
          <h3>Recent Model Switches</h3>
          <ul>
            {data?.models.recentSwitches.map((s, i) => (
              <li key={i}>
                <time>{formatDate(s.timestamp)}</time>
                <span>{s.fromModel} → {s.toModel}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="analytics-footer">
        Last updated: {lastUpdated ? formatDate(lastUpdated) : 'Never'}
      </footer>
    </div>
  )
}
```

### 8.3 MetricCard Component

```typescript
// src/mainview/components/analytics/MetricCard.tsx

interface MetricCardProps {
  label: string
  value: number
  format: 'currency' | 'number' | 'compact' | 'percent'
  trend?: {
    direction: 'up' | 'down' | 'stable'
    value: number
  }
  sparkline?: Array<{ timestamp: string; value: number }>
}

export function MetricCard({ label, value, format, trend, sparkline }: MetricCardProps) {
  const formattedValue = formatValue(value, format)

  return (
    <div className="metric-card">
      <div className="metric-value">{formattedValue}</div>
      <div className="metric-label">{label}</div>

      {trend && (
        <div className={`metric-trend metric-trend--${trend.direction}`}>
          {trend.direction === 'up' && '↑'}
          {trend.direction === 'down' && '↓'}
          {trend.direction === 'stable' && '→'}
          {' '}{Math.abs(trend.value).toFixed(1)}%
        </div>
      )}

      {sparkline && sparkline.length > 0 && (
        <div className="metric-sparkline">
          <Sparkline data={sparkline} />
        </div>
      )}
    </div>
  )
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return `$${value.toFixed(2)}`
    case 'compact':
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
      return value.toString()
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString()
  }
}
```

### 8.4 useAnalyticsDashboard Hook

```typescript
// src/mainview/hooks/useAnalytics.ts

import { useState, useEffect, useCallback } from 'react'
import { sendMessage } from '../lib/websocket'
import type { DashboardOverview, TimeRange, TimeSeriesPoint } from '../types/analytics'

interface DashboardState extends DashboardOverview {
  costTimeSeries: TimeSeriesPoint<number>[]
  errorTimeSeries: TimeSeriesPoint<number>[]
}

export function useAnalyticsDashboard(timeRange: TimeRange) {
  const [data, setData] = useState<DashboardState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [dashboard, costSeries, errorSeries] = await Promise.all([
        sendMessage('analytics:dashboard'),
        sendMessage('analytics:cost-timeseries', {
          timeRange,
          granularity: timeRange === 'today' ? 'hour' : 'day',
        }),
        sendMessage('analytics:error-timeseries', {
          timeRange,
          granularity: timeRange === 'today' ? 'hour' : 'day',
        }),
      ])

      setData({
        ...dashboard,
        costTimeSeries: costSeries,
        errorTimeSeries: errorSeries,
      })
      setLastUpdated(new Date())
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch analytics'))
    } finally {
      setIsLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return { data, isLoading, error, refresh: fetchData, lastUpdated }
}
```

---

## 9. Data Retention

### 9.1 Default Retention Policies

| Data Type | Retention | Rationale |
|-----------|-----------|-----------|
| Raw Events | 7 days | Short-term debugging |
| Hourly Aggregates | 30 days | Detailed trend analysis |
| Daily Aggregates | 365 days | Monthly reports |
| Monthly Aggregates | Forever | Lifetime statistics |
| Lifetime Totals | Forever | Running counters |

### 9.2 Cleanup Implementation

```typescript
// lib/analytics/cleanup.ts

export function runCleanup(db: Database): Result<{ rowsDeleted: number }, AppError> {
  try {
    let total = 0
    const config = getRetentionConfig(db)

    db.transaction(() => {
      // Raw events
      if (config.rawEventsDays > 0) {
        const cutoff = `datetime('now', '-${config.rawEventsDays} days')`
        total += db.prepare(`DELETE FROM ai_request_events WHERE timestamp < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM error_events WHERE timestamp < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM imagegen_events WHERE timestamp < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM tool_events WHERE timestamp < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM engagement_events WHERE timestamp < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM session_events WHERE timestamp < ${cutoff}`).run().changes
      }

      // Hourly aggregates
      if (config.hourlyAggregatesDays > 0) {
        const cutoff = `datetime('now', '-${config.hourlyAggregatesDays} days')`
        total += db.prepare(`DELETE FROM ai_usage_hourly WHERE hour < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM error_hourly WHERE hour < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM imagegen_hourly WHERE hour < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM tool_usage_hourly WHERE hour < ${cutoff}`).run().changes
      }

      // Daily aggregates
      if (config.dailyAggregatesDays > 0) {
        const cutoff = `date('now', '-${config.dailyAggregatesDays} days')`
        total += db.prepare(`DELETE FROM ai_usage_daily WHERE date < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM error_daily WHERE date < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM imagegen_daily WHERE date < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM tool_usage_daily WHERE date < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM engagement_daily WHERE date < ${cutoff}`).run().changes
        total += db.prepare(`DELETE FROM session_daily WHERE date < ${cutoff}`).run().changes
      }

      db.prepare(`
        INSERT INTO analytics_config (key, value, updated_at)
        VALUES ('last_cleanup_run', datetime('now'), datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = datetime('now'), updated_at = datetime('now')
      `).run()
    })()

    return Result.ok({ rowsDeleted: total })
  } catch (e) {
    return Result.err(new AppError({
      code: 'DB_QUERY_FAILED',
      message: 'Cleanup failed',
      cause: e instanceof Error ? e : undefined
    }))
  }
}
```

### 9.3 Storage Estimation

| Table | Rows/Day | Bytes/Row | 7-Day Total |
|-------|----------|-----------|-------------|
| ai_request_events | ~100 | ~200 | ~140 KB |
| error_events | ~10 | ~150 | ~10 KB |
| tool_events | ~500 | ~100 | ~350 KB |
| engagement_events | ~1000 | ~100 | ~700 KB |

**Estimated total after 1 year: 50-100 MB**

---

## 10. Privacy Considerations

### 10.1 Data NOT Collected

- Message content (only counts and token lengths)
- Prompt text (only character count)
- Search queries (only truncated length metadata)
- File contents or paths
- Personal identifiers or IP addresses

### 10.2 Data Minimization

```typescript
// Example: Privacy-safe search tracking
analyticsStore.recordEngagement({
  timestamp: new Date(),
  eventType: 'search_performed',
  metadata: {
    queryLength: query.length,    // NOT the query itself
    resultCount: results.length,  // NOT the results
  },
})
```

### 10.3 Data Export & Deletion

```typescript
// WebSocket handlers for user control
ws.onRequest('analytics:export', async () => {
  // Export all analytics data as JSON
  return store.exportAllData()
})

ws.onRequest('analytics:delete-all', async () => {
  // Delete all analytics data (user's right to be forgotten)
  return store.deleteAllData()
})
```

---

## 11. File Layout

```
app/src/bun/
├── lib/
│   ├── analytics/
│   │   ├── index.ts              # Exports
│   │   ├── analytics-store.ts    # Core store
│   │   ├── collectors.ts         # Event hooks
│   │   ├── aggregation.ts        # Aggregation logic
│   │   ├── cleanup.ts            # Data retention
│   │   └── types.ts              # TypeScript interfaces
│   └── ws/
│       └── handlers/
│           └── analytics-handlers.ts
│
└── migrations/
    └── analytics/
        ├── 001_raw_events.sql
        ├── 002_aggregates.sql
        └── 003_lifetime_totals.sql

app/src/mainview/
├── components/
│   └── analytics/
│       ├── AnalyticsDashboard.tsx
│       ├── MetricCard.tsx
│       ├── TimeSeriesChart.tsx
│       ├── UsageBreakdown.tsx
│       ├── DateRangePicker.tsx
│       └── Sparkline.tsx
│
└── hooks/
    └── useAnalytics.ts
```

---

*End of Analytics & Statistics specification.*
