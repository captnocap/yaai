# SPEC_CODE_SESSIONS.md

Code session management with SQLite persistence and content-addressed snapshots.

**Database File**: `~/.yaai/db/code.sqlite`

---

## Overview

Code sessions track Claude Code CLI interactions. Each session contains:
- Metadata (project path, status, timestamps)
- Transcript entries (user input, assistant output, tool calls, file edits)
- Restore points (content-addressed file snapshots for undo/redo)

Current implementation uses JSON files for sessions and JSONL for transcripts. This spec migrates to SQLite while keeping content-addressed blob storage on disk.

---

## Schema

### Sessions Table

```sql
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  project_path  TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('starting', 'running', 'waiting_input', 'paused', 'stopped')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);
CREATE INDEX idx_sessions_project ON sessions(project_path);
```

### Transcript Entries Table

```sql
CREATE TABLE transcript_entries (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('user_input', 'assistant_output', 'tool_call', 'tool_result', 'file_edit', 'compact_marker', 'system_message')),
  content           TEXT NOT NULL,
  timestamp         TEXT NOT NULL DEFAULT (datetime('now')),

  -- Type-specific JSON data
  tool_call_data    TEXT,  -- JSON: { name, input, output, status, duration }
  file_edit_data    TEXT,  -- JSON: { path, operation, diff, additions, deletions }
  compact_data      TEXT,  -- JSON: { compactedCount, summary }

  -- Linking
  restore_point_id  TEXT REFERENCES restore_points(id) ON DELETE SET NULL,
  plan_item_id      TEXT,

  -- Display state
  is_compacted      INTEGER NOT NULL DEFAULT 0,

  -- Ordering (for fast pagination)
  seq               INTEGER NOT NULL
);

CREATE INDEX idx_transcript_session ON transcript_entries(session_id, seq);
CREATE INDEX idx_transcript_type ON transcript_entries(session_id, type);
CREATE INDEX idx_transcript_restore ON transcript_entries(restore_point_id) WHERE restore_point_id IS NOT NULL;
CREATE INDEX idx_transcript_plan ON transcript_entries(plan_item_id) WHERE plan_item_id IS NOT NULL;

-- Sequence trigger for ordering
CREATE TRIGGER transcript_seq_insert
AFTER INSERT ON transcript_entries
FOR EACH ROW
WHEN NEW.seq = 0
BEGIN
  UPDATE transcript_entries
  SET seq = (SELECT COALESCE(MAX(seq), 0) + 1 FROM transcript_entries WHERE session_id = NEW.session_id)
  WHERE id = NEW.id;
END;
```

### Transcript FTS (Full-Text Search)

```sql
-- FTS5 virtual table for transcript search
CREATE VIRTUAL TABLE transcript_fts USING fts5(
  content,
  content=transcript_entries,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Sync triggers
CREATE TRIGGER transcript_fts_insert
AFTER INSERT ON transcript_entries
BEGIN
  INSERT INTO transcript_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
END;

CREATE TRIGGER transcript_fts_update
AFTER UPDATE OF content ON transcript_entries
BEGIN
  INSERT INTO transcript_fts(transcript_fts, rowid, content) VALUES ('delete', OLD.rowid, OLD.content);
  INSERT INTO transcript_fts(rowid, content) VALUES (NEW.rowid, NEW.content);
END;

CREATE TRIGGER transcript_fts_delete
AFTER DELETE ON transcript_entries
BEGIN
  INSERT INTO transcript_fts(transcript_fts, rowid, content) VALUES ('delete', OLD.rowid, OLD.content);
END;
```

### Restore Points Table

```sql
CREATE TABLE restore_points (
  id                    TEXT PRIMARY KEY,
  session_id            TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  description           TEXT NOT NULL,
  timestamp             TEXT NOT NULL DEFAULT (datetime('now')),
  transcript_entry_id   TEXT REFERENCES transcript_entries(id) ON DELETE SET NULL,
  total_size            INTEGER NOT NULL DEFAULT 0,
  file_count            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_restore_session ON restore_points(session_id, timestamp DESC);
```

### Restore Point Files Table

```sql
CREATE TABLE restore_point_files (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  restore_point_id TEXT NOT NULL REFERENCES restore_points(id) ON DELETE CASCADE,
  path             TEXT NOT NULL,
  object_hash      TEXT NOT NULL,
  mode             INTEGER NOT NULL DEFAULT 420,  -- 0o644
  size             INTEGER NOT NULL
);

CREATE INDEX idx_rpf_restore ON restore_point_files(restore_point_id);
CREATE INDEX idx_rpf_hash ON restore_point_files(object_hash);
CREATE UNIQUE INDEX idx_rpf_unique ON restore_point_files(restore_point_id, path);
```

### Snapshot Objects Registry

```sql
-- Track object metadata (actual blobs stored on disk)
CREATE TABLE snapshot_objects (
  hash       TEXT PRIMARY KEY,
  size       INTEGER NOT NULL,
  ref_count  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_objects_refcount ON snapshot_objects(ref_count) WHERE ref_count = 0;
```

---

## TypeScript Interfaces

```typescript
// =============================================================================
// CODE SESSION TYPES (SQLite-backed)
// =============================================================================

import type { SessionId, RestorePointId, TranscriptEntryId } from './branded';

// -----------------------------------------------------------------------------
// SESSION
// -----------------------------------------------------------------------------

export type SessionStatus =
  | 'starting'
  | 'running'
  | 'waiting_input'
  | 'paused'
  | 'stopped';

export interface Session {
  id: SessionId;
  projectPath: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionInput {
  projectPath: string;
  status?: SessionStatus;
}

export interface UpdateSessionInput {
  status?: SessionStatus;
}

// -----------------------------------------------------------------------------
// TRANSCRIPT
// -----------------------------------------------------------------------------

export type TranscriptEntryType =
  | 'user_input'
  | 'assistant_output'
  | 'tool_call'
  | 'tool_result'
  | 'file_edit'
  | 'compact_marker'
  | 'system_message';

export interface ToolCallData {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
}

export type FileOperation = 'create' | 'modify' | 'delete' | 'rename';

export interface FileEditData {
  path: string;
  operation: FileOperation;
  diff?: string;
  beforeHash?: string;
  afterHash?: string;
  additions?: number;
  deletions?: number;
}

export interface CompactMarkerData {
  compactedCount: number;
  summary?: string;
}

export interface TranscriptEntry {
  id: TranscriptEntryId;
  sessionId: SessionId;
  type: TranscriptEntryType;
  content: string;
  timestamp: Date;
  seq: number;

  // Type-specific data
  toolCallData?: ToolCallData;
  fileEditData?: FileEditData;
  compactData?: CompactMarkerData;

  // Linking
  restorePointId?: RestorePointId;
  planItemId?: string;

  // Display state
  isCompacted: boolean;
}

export interface CreateTranscriptEntryInput {
  sessionId: SessionId;
  type: TranscriptEntryType;
  content: string;
  toolCallData?: ToolCallData;
  fileEditData?: FileEditData;
  compactData?: CompactMarkerData;
  restorePointId?: RestorePointId;
  planItemId?: string;
}

// -----------------------------------------------------------------------------
// RESTORE POINTS
// -----------------------------------------------------------------------------

export interface RestorePoint {
  id: RestorePointId;
  sessionId: SessionId;
  description: string;
  timestamp: Date;
  transcriptEntryId?: TranscriptEntryId;
  totalSize: number;
  fileCount: number;
}

export interface RestorePointFile {
  path: string;
  objectHash: string;
  mode: number;
  size: number;
}

export interface RestorePointWithFiles extends RestorePoint {
  files: RestorePointFile[];
}

export interface CreateRestorePointInput {
  sessionId: SessionId;
  description: string;
  files: Array<{ path: string; content: Buffer }>;
  transcriptEntryId?: TranscriptEntryId;
}

// -----------------------------------------------------------------------------
// PAGINATION
// -----------------------------------------------------------------------------

export interface TranscriptPage {
  entries: TranscriptEntry[];
  hasMore: boolean;
  nextSeq?: number;
}

export interface TranscriptQuery {
  sessionId: SessionId;
  types?: TranscriptEntryType[];
  sinceSeq?: number;
  limit?: number;
  includeCompacted?: boolean;
}

// -----------------------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------------------

export interface TranscriptSearchResult {
  entry: TranscriptEntry;
  snippet: string;
  rank: number;
}

export interface TranscriptSearchQuery {
  sessionId: SessionId;
  query: string;
  limit?: number;
}
```

---

## CodeSessionStore Implementation

```typescript
// =============================================================================
// CODE SESSION STORE
// =============================================================================

import { Database } from 'bun:sqlite';
import { Result, ok, err } from '../utils/result';
import { generateId } from '../utils/id';
import type {
  Session,
  SessionId,
  SessionStatus,
  CreateSessionInput,
  UpdateSessionInput,
  TranscriptEntry,
  TranscriptEntryId,
  TranscriptEntryType,
  CreateTranscriptEntryInput,
  TranscriptPage,
  TranscriptQuery,
  TranscriptSearchResult,
  TranscriptSearchQuery,
  RestorePoint,
  RestorePointId,
  RestorePointWithFiles,
  CreateRestorePointInput,
} from '../types';
import { AppError } from '../utils/errors';
import { CODE_DB_PATH } from '../utils/paths';

// -----------------------------------------------------------------------------
// ROW TYPES (SQLite raw results)
// -----------------------------------------------------------------------------

interface SessionRow {
  id: string;
  project_path: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TranscriptEntryRow {
  id: string;
  session_id: string;
  type: string;
  content: string;
  timestamp: string;
  seq: number;
  tool_call_data: string | null;
  file_edit_data: string | null;
  compact_data: string | null;
  restore_point_id: string | null;
  plan_item_id: string | null;
  is_compacted: number;
}

interface RestorePointRow {
  id: string;
  session_id: string;
  description: string;
  timestamp: string;
  transcript_entry_id: string | null;
  total_size: number;
  file_count: number;
}

interface RestorePointFileRow {
  path: string;
  object_hash: string;
  mode: number;
  size: number;
}

// -----------------------------------------------------------------------------
// CODE SESSION STORE
// -----------------------------------------------------------------------------

export class CodeSessionStore {
  private db: Database;

  constructor(dbPath: string = CODE_DB_PATH) {
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  // ---------------------------------------------------------------------------
  // SESSION CRUD
  // ---------------------------------------------------------------------------

  /**
   * Create a new session
   */
  createSession(input: CreateSessionInput): Result<Session, AppError> {
    const id = generateId('session') as SessionId;
    const now = new Date().toISOString();
    const status = input.status ?? 'starting';

    try {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, project_path, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, input.projectPath, status, now, now);

      return ok({
        id,
        projectPath: input.projectPath,
        status,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    } catch (e) {
      return err(AppError.internal('Failed to create session', e));
    }
  }

  /**
   * Get session by ID
   */
  getSession(id: SessionId): Result<Session | null, AppError> {
    try {
      const stmt = this.db.prepare<SessionRow, [string]>(`
        SELECT * FROM sessions WHERE id = ?
      `);
      const row = stmt.get(id);
      return ok(row ? this.mapSession(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get session', e));
    }
  }

  /**
   * Update session
   */
  updateSession(id: SessionId, input: UpdateSessionInput): Result<Session | null, AppError> {
    try {
      const updates: string[] = ['updated_at = datetime(\'now\')'];
      const params: unknown[] = [];

      if (input.status !== undefined) {
        updates.push('status = ?');
        params.push(input.status);
      }

      params.push(id);

      const stmt = this.db.prepare(`
        UPDATE sessions SET ${updates.join(', ')} WHERE id = ?
        RETURNING *
      `);
      const row = stmt.get(...params) as SessionRow | undefined;

      return ok(row ? this.mapSession(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to update session', e));
    }
  }

  /**
   * List all sessions (most recent first)
   */
  listSessions(limit: number = 100): Result<Session[], AppError> {
    try {
      const stmt = this.db.prepare<SessionRow, [number]>(`
        SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?
      `);
      const rows = stmt.all(limit);
      return ok(rows.map(row => this.mapSession(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list sessions', e));
    }
  }

  /**
   * List sessions by status
   */
  listSessionsByStatus(status: SessionStatus, limit: number = 100): Result<Session[], AppError> {
    try {
      const stmt = this.db.prepare<SessionRow, [string, number]>(`
        SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC LIMIT ?
      `);
      const rows = stmt.all(status, limit);
      return ok(rows.map(row => this.mapSession(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list sessions by status', e));
    }
  }

  /**
   * Delete session and all related data
   */
  deleteSession(id: SessionId): Result<boolean, AppError> {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
      const result = stmt.run(id);
      return ok(result.changes > 0);
    } catch (e) {
      return err(AppError.internal('Failed to delete session', e));
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSCRIPT OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Add transcript entry
   */
  addTranscriptEntry(input: CreateTranscriptEntryInput): Result<TranscriptEntry, AppError> {
    const id = generateId('entry') as TranscriptEntryId;
    const now = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO transcript_entries (
          id, session_id, type, content, timestamp, seq,
          tool_call_data, file_edit_data, compact_data,
          restore_point_id, plan_item_id, is_compacted
        )
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0)
        RETURNING *
      `);

      const row = stmt.get(
        id,
        input.sessionId,
        input.type,
        input.content,
        now,
        input.toolCallData ? JSON.stringify(input.toolCallData) : null,
        input.fileEditData ? JSON.stringify(input.fileEditData) : null,
        input.compactData ? JSON.stringify(input.compactData) : null,
        input.restorePointId ?? null,
        input.planItemId ?? null
      ) as TranscriptEntryRow;

      // Update session timestamp
      this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?')
        .run(now, input.sessionId);

      return ok(this.mapTranscriptEntry(row));
    } catch (e) {
      return err(AppError.internal('Failed to add transcript entry', e));
    }
  }

  /**
   * Get transcript entries with pagination
   */
  getTranscript(query: TranscriptQuery): Result<TranscriptPage, AppError> {
    try {
      const limit = query.limit ?? 50;
      const conditions: string[] = ['session_id = ?'];
      const params: unknown[] = [query.sessionId];

      if (query.types && query.types.length > 0) {
        conditions.push(`type IN (${query.types.map(() => '?').join(', ')})`);
        params.push(...query.types);
      }

      if (query.sinceSeq !== undefined) {
        conditions.push('seq > ?');
        params.push(query.sinceSeq);
      }

      if (!query.includeCompacted) {
        conditions.push('is_compacted = 0');
      }

      params.push(limit + 1); // Fetch one extra to check hasMore

      const stmt = this.db.prepare<TranscriptEntryRow, unknown[]>(`
        SELECT * FROM transcript_entries
        WHERE ${conditions.join(' AND ')}
        ORDER BY seq ASC
        LIMIT ?
      `);

      const rows = stmt.all(...params);
      const hasMore = rows.length > limit;
      const entries = rows.slice(0, limit).map(row => this.mapTranscriptEntry(row));

      return ok({
        entries,
        hasMore,
        nextSeq: hasMore ? entries[entries.length - 1]?.seq : undefined,
      });
    } catch (e) {
      return err(AppError.internal('Failed to get transcript', e));
    }
  }

  /**
   * Get all transcript entries for a session (for export/migration)
   */
  getFullTranscript(sessionId: SessionId): Result<TranscriptEntry[], AppError> {
    try {
      const stmt = this.db.prepare<TranscriptEntryRow, [string]>(`
        SELECT * FROM transcript_entries
        WHERE session_id = ?
        ORDER BY seq ASC
      `);
      const rows = stmt.all(sessionId);
      return ok(rows.map(row => this.mapTranscriptEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to get full transcript', e));
    }
  }

  /**
   * Get recent transcript entries
   */
  getRecentTranscript(sessionId: SessionId, limit: number = 50): Result<TranscriptEntry[], AppError> {
    try {
      const stmt = this.db.prepare<TranscriptEntryRow, [string, number]>(`
        SELECT * FROM (
          SELECT * FROM transcript_entries
          WHERE session_id = ?
          ORDER BY seq DESC
          LIMIT ?
        ) ORDER BY seq ASC
      `);
      const rows = stmt.all(sessionId, limit);
      return ok(rows.map(row => this.mapTranscriptEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to get recent transcript', e));
    }
  }

  /**
   * Update transcript entry
   */
  updateTranscriptEntry(
    id: TranscriptEntryId,
    updates: Partial<Pick<CreateTranscriptEntryInput, 'restorePointId' | 'planItemId'>> & { isCompacted?: boolean }
  ): Result<boolean, AppError> {
    try {
      const sets: string[] = [];
      const params: unknown[] = [];

      if (updates.restorePointId !== undefined) {
        sets.push('restore_point_id = ?');
        params.push(updates.restorePointId);
      }

      if (updates.planItemId !== undefined) {
        sets.push('plan_item_id = ?');
        params.push(updates.planItemId);
      }

      if (updates.isCompacted !== undefined) {
        sets.push('is_compacted = ?');
        params.push(updates.isCompacted ? 1 : 0);
      }

      if (sets.length === 0) {
        return ok(false);
      }

      params.push(id);
      const stmt = this.db.prepare(`
        UPDATE transcript_entries SET ${sets.join(', ')} WHERE id = ?
      `);
      const result = stmt.run(...params);

      return ok(result.changes > 0);
    } catch (e) {
      return err(AppError.internal('Failed to update transcript entry', e));
    }
  }

  /**
   * Mark entries as compacted (before a given seq)
   */
  markCompacted(sessionId: SessionId, beforeSeq: number): Result<number, AppError> {
    try {
      const stmt = this.db.prepare(`
        UPDATE transcript_entries
        SET is_compacted = 1
        WHERE session_id = ? AND seq < ? AND is_compacted = 0
      `);
      const result = stmt.run(sessionId, beforeSeq);
      return ok(result.changes);
    } catch (e) {
      return err(AppError.internal('Failed to mark entries as compacted', e));
    }
  }

  /**
   * Count transcript entries
   */
  countTranscriptEntries(sessionId: SessionId, includeCompacted: boolean = true): Result<number, AppError> {
    try {
      const condition = includeCompacted ? '' : ' AND is_compacted = 0';
      const stmt = this.db.prepare<{ count: number }, [string]>(`
        SELECT COUNT(*) as count FROM transcript_entries WHERE session_id = ?${condition}
      `);
      const row = stmt.get(sessionId);
      return ok(row?.count ?? 0);
    } catch (e) {
      return err(AppError.internal('Failed to count transcript entries', e));
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSCRIPT SEARCH
  // ---------------------------------------------------------------------------

  /**
   * Search transcript entries using FTS
   */
  searchTranscript(query: TranscriptSearchQuery): Result<TranscriptSearchResult[], AppError> {
    try {
      const limit = query.limit ?? 20;
      const stmt = this.db.prepare<
        TranscriptEntryRow & { snippet: string; rank: number },
        [string, string, number]
      >(`
        SELECT
          te.*,
          snippet(transcript_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          rank
        FROM transcript_fts
        JOIN transcript_entries te ON te.rowid = transcript_fts.rowid
        WHERE transcript_fts MATCH ? AND te.session_id = ?
        ORDER BY rank
        LIMIT ?
      `);

      const rows = stmt.all(query.query, query.sessionId, limit);

      return ok(rows.map(row => ({
        entry: this.mapTranscriptEntry(row),
        snippet: row.snippet,
        rank: row.rank,
      })));
    } catch (e) {
      return err(AppError.internal('Failed to search transcript', e));
    }
  }

  /**
   * Search across all sessions
   */
  searchAllTranscripts(query: string, limit: number = 50): Result<TranscriptSearchResult[], AppError> {
    try {
      const stmt = this.db.prepare<
        TranscriptEntryRow & { snippet: string; rank: number },
        [string, number]
      >(`
        SELECT
          te.*,
          snippet(transcript_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
          rank
        FROM transcript_fts
        JOIN transcript_entries te ON te.rowid = transcript_fts.rowid
        WHERE transcript_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `);

      const rows = stmt.all(query, limit);

      return ok(rows.map(row => ({
        entry: this.mapTranscriptEntry(row),
        snippet: row.snippet,
        rank: row.rank,
      })));
    } catch (e) {
      return err(AppError.internal('Failed to search all transcripts', e));
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSCRIPT LINKING QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Get entries linked to a restore point
   */
  getEntriesForRestorePoint(restorePointId: RestorePointId): Result<TranscriptEntry[], AppError> {
    try {
      const stmt = this.db.prepare<TranscriptEntryRow, [string]>(`
        SELECT * FROM transcript_entries
        WHERE restore_point_id = ?
        ORDER BY seq ASC
      `);
      const rows = stmt.all(restorePointId);
      return ok(rows.map(row => this.mapTranscriptEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to get entries for restore point', e));
    }
  }

  /**
   * Get entries linked to a plan item
   */
  getEntriesForPlanItem(sessionId: SessionId, planItemId: string): Result<TranscriptEntry[], AppError> {
    try {
      const stmt = this.db.prepare<TranscriptEntryRow, [string, string]>(`
        SELECT * FROM transcript_entries
        WHERE session_id = ? AND plan_item_id = ?
        ORDER BY seq ASC
      `);
      const rows = stmt.all(sessionId, planItemId);
      return ok(rows.map(row => this.mapTranscriptEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to get entries for plan item', e));
    }
  }

  /**
   * Get file edit entries for a session
   */
  getFileEdits(sessionId: SessionId): Result<TranscriptEntry[], AppError> {
    try {
      const stmt = this.db.prepare<TranscriptEntryRow, [string]>(`
        SELECT * FROM transcript_entries
        WHERE session_id = ? AND type = 'file_edit'
        ORDER BY seq ASC
      `);
      const rows = stmt.all(sessionId);
      return ok(rows.map(row => this.mapTranscriptEntry(row)));
    } catch (e) {
      return err(AppError.internal('Failed to get file edits', e));
    }
  }

  // ---------------------------------------------------------------------------
  // RESTORE POINTS
  // ---------------------------------------------------------------------------

  /**
   * Create restore point (metadata only - files handled by SnapshotStore)
   */
  createRestorePoint(
    sessionId: SessionId,
    description: string,
    transcriptEntryId?: TranscriptEntryId,
    totalSize: number = 0,
    fileCount: number = 0
  ): Result<RestorePoint, AppError> {
    const id = generateId('rp') as RestorePointId;
    const now = new Date().toISOString();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO restore_points (
          id, session_id, description, timestamp,
          transcript_entry_id, total_size, file_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `);

      const row = stmt.get(
        id, sessionId, description, now,
        transcriptEntryId ?? null, totalSize, fileCount
      ) as RestorePointRow;

      return ok(this.mapRestorePoint(row));
    } catch (e) {
      return err(AppError.internal('Failed to create restore point', e));
    }
  }

  /**
   * Add files to restore point
   */
  addRestorePointFiles(
    restorePointId: RestorePointId,
    files: Array<{ path: string; objectHash: string; mode: number; size: number }>
  ): Result<void, AppError> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO restore_point_files (restore_point_id, path, object_hash, mode, size)
        VALUES (?, ?, ?, ?, ?)
      `);

      this.db.transaction(() => {
        let totalSize = 0;
        for (const file of files) {
          stmt.run(restorePointId, file.path, file.objectHash, file.mode, file.size);
          totalSize += file.size;
        }

        // Update restore point totals
        this.db.prepare(`
          UPDATE restore_points
          SET total_size = ?, file_count = ?
          WHERE id = ?
        `).run(totalSize, files.length, restorePointId);
      })();

      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to add restore point files', e));
    }
  }

  /**
   * Get restore point by ID
   */
  getRestorePoint(id: RestorePointId): Result<RestorePoint | null, AppError> {
    try {
      const stmt = this.db.prepare<RestorePointRow, [string]>(`
        SELECT * FROM restore_points WHERE id = ?
      `);
      const row = stmt.get(id);
      return ok(row ? this.mapRestorePoint(row) : null);
    } catch (e) {
      return err(AppError.internal('Failed to get restore point', e));
    }
  }

  /**
   * Get restore point with files
   */
  getRestorePointWithFiles(id: RestorePointId): Result<RestorePointWithFiles | null, AppError> {
    try {
      const rpStmt = this.db.prepare<RestorePointRow, [string]>(`
        SELECT * FROM restore_points WHERE id = ?
      `);
      const rpRow = rpStmt.get(id);
      if (!rpRow) return ok(null);

      const filesStmt = this.db.prepare<RestorePointFileRow, [string]>(`
        SELECT path, object_hash, mode, size FROM restore_point_files WHERE restore_point_id = ?
      `);
      const fileRows = filesStmt.all(id);

      return ok({
        ...this.mapRestorePoint(rpRow),
        files: fileRows.map(f => ({
          path: f.path,
          objectHash: f.object_hash,
          mode: f.mode,
          size: f.size,
        })),
      });
    } catch (e) {
      return err(AppError.internal('Failed to get restore point with files', e));
    }
  }

  /**
   * List restore points for session (newest first)
   */
  listRestorePoints(sessionId: SessionId): Result<RestorePoint[], AppError> {
    try {
      const stmt = this.db.prepare<RestorePointRow, [string]>(`
        SELECT * FROM restore_points
        WHERE session_id = ?
        ORDER BY timestamp DESC
      `);
      const rows = stmt.all(sessionId);
      return ok(rows.map(row => this.mapRestorePoint(row)));
    } catch (e) {
      return err(AppError.internal('Failed to list restore points', e));
    }
  }

  /**
   * Delete restore point
   */
  deleteRestorePoint(id: RestorePointId): Result<boolean, AppError> {
    try {
      const stmt = this.db.prepare('DELETE FROM restore_points WHERE id = ?');
      const result = stmt.run(id);
      return ok(result.changes > 0);
    } catch (e) {
      return err(AppError.internal('Failed to delete restore point', e));
    }
  }

  /**
   * Delete restore points older than date
   */
  deleteOldRestorePoints(olderThan: Date, sessionId?: SessionId): Result<number, AppError> {
    try {
      const conditions = ['timestamp < ?'];
      const params: unknown[] = [olderThan.toISOString()];

      if (sessionId) {
        conditions.push('session_id = ?');
        params.push(sessionId);
      }

      const stmt = this.db.prepare(`
        DELETE FROM restore_points WHERE ${conditions.join(' AND ')}
      `);
      const result = stmt.run(...params);
      return ok(result.changes);
    } catch (e) {
      return err(AppError.internal('Failed to delete old restore points', e));
    }
  }

  // ---------------------------------------------------------------------------
  // SNAPSHOT OBJECT REGISTRY
  // ---------------------------------------------------------------------------

  /**
   * Register a snapshot object
   */
  registerObject(hash: string, size: number): Result<void, AppError> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO snapshot_objects (hash, size, ref_count, created_at)
        VALUES (?, ?, 1, datetime('now'))
        ON CONFLICT(hash) DO UPDATE SET ref_count = ref_count + 1
      `);
      stmt.run(hash, size);
      return ok(undefined);
    } catch (e) {
      return err(AppError.internal('Failed to register object', e));
    }
  }

  /**
   * Decrement object reference count
   */
  dereferenceObject(hash: string): Result<number, AppError> {
    try {
      const stmt = this.db.prepare(`
        UPDATE snapshot_objects SET ref_count = ref_count - 1 WHERE hash = ?
        RETURNING ref_count
      `);
      const row = stmt.get(hash) as { ref_count: number } | undefined;
      return ok(row?.ref_count ?? 0);
    } catch (e) {
      return err(AppError.internal('Failed to dereference object', e));
    }
  }

  /**
   * Get orphaned objects (ref_count = 0)
   */
  getOrphanedObjects(): Result<string[], AppError> {
    try {
      const stmt = this.db.prepare<{ hash: string }, []>(`
        SELECT hash FROM snapshot_objects WHERE ref_count = 0
      `);
      const rows = stmt.all();
      return ok(rows.map(r => r.hash));
    } catch (e) {
      return err(AppError.internal('Failed to get orphaned objects', e));
    }
  }

  /**
   * Delete orphaned object records
   */
  deleteOrphanedObjects(): Result<number, AppError> {
    try {
      const stmt = this.db.prepare('DELETE FROM snapshot_objects WHERE ref_count = 0');
      const result = stmt.run();
      return ok(result.changes);
    } catch (e) {
      return err(AppError.internal('Failed to delete orphaned objects', e));
    }
  }

  // ---------------------------------------------------------------------------
  // MAPPERS
  // ---------------------------------------------------------------------------

  private mapSession(row: SessionRow): Session {
    return {
      id: row.id as SessionId,
      projectPath: row.project_path,
      status: row.status as SessionStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTranscriptEntry(row: TranscriptEntryRow): TranscriptEntry {
    return {
      id: row.id as TranscriptEntryId,
      sessionId: row.session_id as SessionId,
      type: row.type as TranscriptEntryType,
      content: row.content,
      timestamp: new Date(row.timestamp),
      seq: row.seq,
      toolCallData: row.tool_call_data ? JSON.parse(row.tool_call_data) : undefined,
      fileEditData: row.file_edit_data ? JSON.parse(row.file_edit_data) : undefined,
      compactData: row.compact_data ? JSON.parse(row.compact_data) : undefined,
      restorePointId: row.restore_point_id as RestorePointId | undefined,
      planItemId: row.plan_item_id ?? undefined,
      isCompacted: row.is_compacted === 1,
    };
  }

  private mapRestorePoint(row: RestorePointRow): RestorePoint {
    return {
      id: row.id as RestorePointId,
      sessionId: row.session_id as SessionId,
      description: row.description,
      timestamp: new Date(row.timestamp),
      transcriptEntryId: row.transcript_entry_id as TranscriptEntryId | undefined,
      totalSize: row.total_size,
      fileCount: row.file_count,
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

## SnapshotStore (Content-Addressed Storage)

Snapshot object blobs remain file-based for efficiency. Only metadata is in SQLite.

```typescript
// =============================================================================
// SNAPSHOT STORE
// =============================================================================

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { Result, ok, err } from '../utils/result';
import { AppError } from '../utils/errors';
import { SNAPSHOTS_OBJECTS_DIR } from '../utils/paths';
import type { CodeSessionStore } from './code-session-store';
import type { SessionId, RestorePointId, TranscriptEntryId } from '../types';

// -----------------------------------------------------------------------------
// SNAPSHOT STORE
// -----------------------------------------------------------------------------

export class SnapshotStore {
  constructor(
    private sessionStore: CodeSessionStore,
    private objectsDir: string = SNAPSHOTS_OBJECTS_DIR
  ) {}

  /**
   * Initialize object storage directory
   */
  async initialize(): Promise<void> {
    await mkdir(this.objectsDir, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // OBJECT STORAGE
  // ---------------------------------------------------------------------------

  /**
   * Store content and return its hash
   */
  async storeObject(content: Buffer): Promise<Result<string, AppError>> {
    try {
      const hash = this.computeHash(content);
      const path = this.getObjectPath(hash);

      // Only write if not already stored (deduplication)
      if (!existsSync(path)) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content);
      }

      // Register in SQLite
      const result = this.sessionStore.registerObject(hash, content.length);
      if (!result.ok) return result;

      return ok(hash);
    } catch (e) {
      return err(AppError.internal('Failed to store object', e));
    }
  }

  /**
   * Retrieve object content by hash
   */
  async getObject(hash: string): Promise<Result<Buffer | null, AppError>> {
    try {
      const path = this.getObjectPath(hash);
      if (!existsSync(path)) return ok(null);
      const content = await readFile(path);
      return ok(content);
    } catch (e) {
      return err(AppError.internal('Failed to get object', e));
    }
  }

  /**
   * Check if object exists
   */
  hasObject(hash: string): boolean {
    return existsSync(this.getObjectPath(hash));
  }

  /**
   * Get object path from hash (git-style 2-char prefix subdirs)
   */
  private getObjectPath(hash: string): string {
    return join(this.objectsDir, hash.slice(0, 2), hash);
  }

  /**
   * Compute SHA-256 hash
   */
  private computeHash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // ---------------------------------------------------------------------------
  // RESTORE POINT OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create restore point with files
   */
  async createRestorePoint(
    sessionId: SessionId,
    description: string,
    files: Array<{ path: string; content: Buffer }>,
    transcriptEntryId?: TranscriptEntryId
  ): Promise<Result<RestorePointId, AppError>> {
    // Store all objects first
    const fileRecords: Array<{ path: string; objectHash: string; mode: number; size: number }> = [];

    for (const file of files) {
      const hashResult = await this.storeObject(file.content);
      if (!hashResult.ok) return hashResult;

      fileRecords.push({
        path: file.path,
        objectHash: hashResult.value,
        mode: 0o644,
        size: file.content.length,
      });
    }

    // Create restore point record
    const totalSize = fileRecords.reduce((sum, f) => sum + f.size, 0);
    const rpResult = this.sessionStore.createRestorePoint(
      sessionId,
      description,
      transcriptEntryId,
      totalSize,
      fileRecords.length
    );
    if (!rpResult.ok) return rpResult;

    // Add file records
    const filesResult = this.sessionStore.addRestorePointFiles(rpResult.value.id, fileRecords);
    if (!filesResult.ok) return filesResult;

    return ok(rpResult.value.id);
  }

  /**
   * Restore files from restore point
   */
  async restore(
    restorePointId: RestorePointId,
    targetDir: string,
    options: { files?: string[]; dryRun?: boolean } = {}
  ): Promise<Result<{ restoredFiles: string[]; skippedFiles: string[] }, AppError>> {
    const rpResult = this.sessionStore.getRestorePointWithFiles(restorePointId);
    if (!rpResult.ok) return rpResult;
    if (!rpResult.value) {
      return err(AppError.notFound('Restore point not found'));
    }

    const rp = rpResult.value;
    const restoredFiles: string[] = [];
    const skippedFiles: string[] = [];

    // Filter files if specified
    let filesToRestore = rp.files;
    if (options.files && options.files.length > 0) {
      const fileSet = new Set(options.files);
      filesToRestore = rp.files.filter(f => fileSet.has(f.path));
    }

    for (const file of filesToRestore) {
      const contentResult = await this.getObject(file.objectHash);
      if (!contentResult.ok) {
        skippedFiles.push(file.path);
        continue;
      }

      const content = contentResult.value;
      if (!content) {
        skippedFiles.push(file.path);
        continue;
      }

      if (!options.dryRun) {
        const fullPath = join(targetDir, file.path);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, { mode: file.mode });
      }

      restoredFiles.push(file.path);
    }

    return ok({ restoredFiles, skippedFiles });
  }

  /**
   * Get file content at restore point
   */
  async getFileAtRestorePoint(
    restorePointId: RestorePointId,
    filePath: string
  ): Promise<Result<Buffer | null, AppError>> {
    const rpResult = this.sessionStore.getRestorePointWithFiles(restorePointId);
    if (!rpResult.ok) return rpResult;
    if (!rpResult.value) return ok(null);

    const file = rpResult.value.files.find(f => f.path === filePath);
    if (!file) return ok(null);

    return this.getObject(file.objectHash);
  }

  // ---------------------------------------------------------------------------
  // GARBAGE COLLECTION
  // ---------------------------------------------------------------------------

  /**
   * Remove orphaned objects from disk
   */
  async gc(): Promise<Result<{ removed: number; freedBytes: number }, AppError>> {
    try {
      const orphansResult = this.sessionStore.getOrphanedObjects();
      if (!orphansResult.ok) return orphansResult;

      let removed = 0;
      let freedBytes = 0;

      for (const hash of orphansResult.value) {
        const path = this.getObjectPath(hash);
        if (existsSync(path)) {
          const content = await readFile(path);
          freedBytes += content.length;
          await rm(path);
          removed++;
        }
      }

      // Clean up database records
      this.sessionStore.deleteOrphanedObjects();

      return ok({ removed, freedBytes });
    } catch (e) {
      return err(AppError.internal('Failed to run GC', e));
    }
  }
}
```

---

## Migration from JSON/JSONL

```typescript
// =============================================================================
// CODE SESSION MIGRATION
// =============================================================================

import { existsSync } from 'fs';
import { readFile, readdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import type { CodeSessionStore } from './code-session-store';
import type { SnapshotStore } from './snapshot-store';
import { CODE_SESSIONS_DIR_LEGACY, SNAPSHOTS_MANIFESTS_DIR_LEGACY } from '../utils/paths';

interface LegacySession {
  id: string;
  projectPath: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface LegacyTranscriptEntry {
  id: string;
  sessionId: string;
  type: string;
  content: string;
  timestamp: string;
  toolCall?: unknown;
  fileEdit?: unknown;
  compactMarker?: unknown;
  restorePointId?: string;
  planItemId?: string;
  isCompacted?: boolean;
}

interface LegacyRestorePoint {
  id: string;
  sessionId: string;
  description: string;
  timestamp: string;
  files: Array<{ path: string; hash: string; mode: number; size: number }>;
  transcriptEntryId: string;
  totalSize: number;
  fileCount: number;
}

/**
 * Migrate code sessions from JSON/JSONL to SQLite
 */
export async function migrateCodeSessions(
  store: CodeSessionStore,
  snapshotStore: SnapshotStore
): Promise<{ sessions: number; entries: number; restorePoints: number; errors: string[] }> {
  const stats = { sessions: 0, entries: 0, restorePoints: 0, errors: [] as string[] };

  if (!existsSync(CODE_SESSIONS_DIR_LEGACY)) {
    return stats;
  }

  // Migrate sessions
  const entries = await readdir(CODE_SESSIONS_DIR_LEGACY, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionId = entry.name;
    const sessionPath = join(CODE_SESSIONS_DIR_LEGACY, sessionId, 'session.json');
    const transcriptPath = join(CODE_SESSIONS_DIR_LEGACY, sessionId, 'transcript.jsonl');

    // Migrate session
    if (existsSync(sessionPath)) {
      try {
        const content = await readFile(sessionPath, 'utf-8');
        const legacy: LegacySession = JSON.parse(content);

        const result = store.createSession({
          projectPath: legacy.projectPath,
          status: legacy.status as any,
        });

        if (result.ok) {
          stats.sessions++;
        } else {
          stats.errors.push(`Session ${sessionId}: ${result.error.message}`);
        }
      } catch (e) {
        stats.errors.push(`Session ${sessionId}: ${e}`);
      }
    }

    // Migrate transcript
    if (existsSync(transcriptPath)) {
      try {
        const stream = createReadStream(transcriptPath);
        const rl = createInterface({ input: stream });

        for await (const line of rl) {
          if (!line.trim()) continue;

          try {
            const legacy: LegacyTranscriptEntry = JSON.parse(line);

            const result = store.addTranscriptEntry({
              sessionId: legacy.sessionId as any,
              type: legacy.type as any,
              content: legacy.content,
              toolCallData: legacy.toolCall as any,
              fileEditData: legacy.fileEdit as any,
              compactData: legacy.compactMarker as any,
              restorePointId: legacy.restorePointId as any,
              planItemId: legacy.planItemId,
            });

            if (result.ok) {
              stats.entries++;
            }
          } catch {
            // Skip malformed entries
          }
        }
      } catch (e) {
        stats.errors.push(`Transcript ${sessionId}: ${e}`);
      }
    }
  }

  // Migrate restore points
  if (existsSync(SNAPSHOTS_MANIFESTS_DIR_LEGACY)) {
    const manifests = await readdir(SNAPSHOTS_MANIFESTS_DIR_LEGACY);

    for (const manifest of manifests) {
      if (!manifest.endsWith('.json')) continue;

      try {
        const content = await readFile(join(SNAPSHOTS_MANIFESTS_DIR_LEGACY, manifest), 'utf-8');
        const legacy: LegacyRestorePoint = JSON.parse(content);

        // Create restore point
        const rpResult = store.createRestorePoint(
          legacy.sessionId as any,
          legacy.description,
          legacy.transcriptEntryId as any,
          legacy.totalSize,
          legacy.fileCount
        );

        if (rpResult.ok) {
          // Add files
          store.addRestorePointFiles(
            rpResult.value.id,
            legacy.files.map(f => ({
              path: f.path,
              objectHash: f.hash,
              mode: f.mode,
              size: f.size,
            }))
          );

          // Register objects
          for (const file of legacy.files) {
            store.registerObject(file.hash, file.size);
          }

          stats.restorePoints++;
        }
      } catch (e) {
        stats.errors.push(`Restore point ${manifest}: ${e}`);
      }
    }
  }

  return stats;
}
```

---

## WebSocket Handlers

```typescript
// =============================================================================
// CODE SESSION WEBSOCKET HANDLERS
// =============================================================================

import type { WebSocketServer } from '../ws/server';
import type { CodeSessionStore } from '../stores/code-session-store';
import type { SnapshotStore } from '../stores/snapshot-store';
import type { SessionId, RestorePointId, TranscriptEntryType } from '../types';

export function registerCodeSessionHandlers(
  ws: WebSocketServer,
  store: CodeSessionStore,
  snapshots: SnapshotStore
): void {
  // ---------------------------------------------------------------------------
  // SESSION OPERATIONS
  // ---------------------------------------------------------------------------

  ws.onRequest('code:list-sessions', async () => {
    const result = store.listSessions();
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:get-session', async ({ id }: { id: SessionId }) => {
    const result = store.getSession(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:delete-session', async ({ id }: { id: SessionId }) => {
    const result = store.deleteSession(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  // ---------------------------------------------------------------------------
  // TRANSCRIPT OPERATIONS
  // ---------------------------------------------------------------------------

  ws.onRequest('code:get-transcript', async ({
    sessionId,
    types,
    sinceSeq,
    limit,
    includeCompacted,
  }: {
    sessionId: SessionId;
    types?: TranscriptEntryType[];
    sinceSeq?: number;
    limit?: number;
    includeCompacted?: boolean;
  }) => {
    const result = store.getTranscript({
      sessionId,
      types,
      sinceSeq,
      limit,
      includeCompacted,
    });
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:get-recent-transcript', async ({
    sessionId,
    limit,
  }: {
    sessionId: SessionId;
    limit?: number;
  }) => {
    const result = store.getRecentTranscript(sessionId, limit);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:search-transcript', async ({
    sessionId,
    query,
    limit,
  }: {
    sessionId: SessionId;
    query: string;
    limit?: number;
  }) => {
    const result = store.searchTranscript({ sessionId, query, limit });
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:get-file-edits', async ({ sessionId }: { sessionId: SessionId }) => {
    const result = store.getFileEdits(sessionId);
    if (!result.ok) throw result.error;
    return result.value;
  });

  // ---------------------------------------------------------------------------
  // RESTORE POINT OPERATIONS
  // ---------------------------------------------------------------------------

  ws.onRequest('code:list-restore-points', async ({ sessionId }: { sessionId: SessionId }) => {
    const result = store.listRestorePoints(sessionId);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:get-restore-point', async ({ id }: { id: RestorePointId }) => {
    const result = store.getRestorePointWithFiles(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:restore', async ({
    restorePointId,
    targetDir,
    files,
    dryRun,
  }: {
    restorePointId: RestorePointId;
    targetDir: string;
    files?: string[];
    dryRun?: boolean;
  }) => {
    const result = await snapshots.restore(restorePointId, targetDir, { files, dryRun });
    if (!result.ok) throw result.error;
    return result.value;
  });

  ws.onRequest('code:get-file-at-restore-point', async ({
    restorePointId,
    filePath,
  }: {
    restorePointId: RestorePointId;
    filePath: string;
  }) => {
    const result = await snapshots.getFileAtRestorePoint(restorePointId, filePath);
    if (!result.ok) throw result.error;
    // Return base64 for binary safety
    return result.value ? result.value.toString('base64') : null;
  });

  ws.onRequest('code:delete-restore-point', async ({ id }: { id: RestorePointId }) => {
    const result = store.deleteRestorePoint(id);
    if (!result.ok) throw result.error;
    return result.value;
  });

  // ---------------------------------------------------------------------------
  // MAINTENANCE
  // ---------------------------------------------------------------------------

  ws.onRequest('code:gc', async () => {
    const result = await snapshots.gc();
    if (!result.ok) throw result.error;
    return result.value;
  });
}
```

---

## Query Patterns

### Get Active Session

```typescript
const result = store.listSessionsByStatus('running', 1);
if (result.ok && result.value.length > 0) {
  const activeSession = result.value[0];
}
```

### Stream Transcript Updates

```typescript
// Initial load
let lastSeq = 0;
const page = store.getTranscript({ sessionId, limit: 100 });
if (page.ok) {
  renderEntries(page.value.entries);
  lastSeq = page.value.nextSeq ?? 0;
}

// Poll for updates
setInterval(async () => {
  const updates = store.getTranscript({ sessionId, sinceSeq: lastSeq, limit: 50 });
  if (updates.ok && updates.value.entries.length > 0) {
    appendEntries(updates.value.entries);
    lastSeq = updates.value.nextSeq ?? lastSeq;
  }
}, 1000);
```

### Search Across Sessions

```typescript
const results = store.searchAllTranscripts('error handling', 20);
if (results.ok) {
  for (const { entry, snippet, rank } of results.value) {
    console.log(`[${entry.sessionId}] ${snippet}`);
  }
}
```

### Create Checkpoint

```typescript
// Get edited files from transcript
const editsResult = store.getFileEdits(sessionId);
if (!editsResult.ok) return;

const filePaths = [...new Set(editsResult.value.map(e => e.fileEditData?.path).filter(Boolean))];

// Read current file contents
const files: Array<{ path: string; content: Buffer }> = [];
for (const path of filePaths) {
  const fullPath = join(projectPath, path);
  if (existsSync(fullPath)) {
    files.push({ path, content: await readFile(fullPath) });
  }
}

// Create restore point
const rpId = await snapshots.createRestorePoint(sessionId, 'Manual checkpoint', files);
```

---

## File Layout

```
~/.yaai/
├── db/
│   └── code.sqlite           # Sessions, transcripts, restore point metadata
└── snapshots/
    └── objects/              # Content-addressed blobs
        ├── 0a/
        │   └── 0a1b2c3d...   # SHA-256 hash = filename
        ├── 1f/
        │   └── 1f2e3d4c...
        └── ...
```

---

## Performance Considerations

1. **Transcript Pagination**: Use `seq` column for cursor-based pagination, not OFFSET
2. **FTS Queries**: Porter stemming enables "run" to match "running"
3. **Object Deduplication**: Same file content across restore points shares storage
4. **Reference Counting**: Track object usage for safe garbage collection
5. **Batch Inserts**: Use transactions when importing multiple transcript entries

---

## Error Handling

```typescript
const result = store.getSession(sessionId);

if (!result.ok) {
  // Handle specific error types
  switch (result.error.code) {
    case 'NOT_FOUND':
      return res.status(404).json({ error: 'Session not found' });
    case 'DATABASE_ERROR':
      logger.error('Database error', { error: result.error });
      return res.status(500).json({ error: 'Internal error' });
    default:
      return res.status(500).json({ error: result.error.message });
  }
}

// Use result.value safely
const session = result.value;
```

---

## Analytics Integration

The Code Sessions system integrates with the Analytics system to track tool usage metrics. See `SPEC_ANALYTICS.md` for full analytics specification.

### Tool Usage Events

When transcript entries of type `tool_call` are added, analytics events are emitted:

| Event Source | Analytics Event | Data Captured |
|--------------|-----------------|---------------|
| `addTranscriptEntry()` with `type='tool_call'` | `tool_event` | sessionId, toolName, duration, success |

### Hook Implementation

```typescript
// lib/stores/code-session-analytics.ts

import { analyticsStore } from './analytics-store'
import type { CodeSessionStore } from './code-session-store'
import type { CreateTranscriptEntryInput } from '../types'

/**
 * Wrap CodeSessionStore to emit tool usage analytics
 */
export function hookCodeSessionStore(store: CodeSessionStore): void {
  const originalAddEntry = store.addTranscriptEntry.bind(store)

  store.addTranscriptEntry = function(input: CreateTranscriptEntryInput) {
    const result = originalAddEntry(input)

    if (result.ok && input.type === 'tool_call' && input.toolCallData) {
      const { name, status, duration } = input.toolCallData

      analyticsStore.recordToolEvent({
        sessionId: input.sessionId,
        toolName: name,
        durationMs: duration ?? null,
        success: status === 'success',
        errorType: status === 'error' ? 'tool_error' : null
      })
    }

    return result
  }
}
```

### Metrics Available

After integration, the following metrics become available:

- **Tool invocation counts**: Per tool, over time
- **Tool success rates**: Which tools fail most often
- **Average execution time**: Per tool performance
- **Session tool distribution**: Tools used in each session
- **Most/least used tools**: Ranked tool usage
