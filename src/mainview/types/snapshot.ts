// =============================================================================
// SNAPSHOT TYPES
// =============================================================================
// Types for git-style content-addressed file snapshots and restore points.

// -----------------------------------------------------------------------------
// CONTENT-ADDRESSED STORAGE
// -----------------------------------------------------------------------------

export interface SnapshotObject {
  /** SHA-256 hash of content */
  hash: string;
  /** Size in bytes */
  size: number;
  /** When the object was stored */
  createdAt: string;
}

// -----------------------------------------------------------------------------
// RESTORE POINTS
// -----------------------------------------------------------------------------

export interface RestorePoint {
  id: string;
  sessionId: string;
  description: string;
  timestamp: string;

  /** Files captured at this point */
  files: RestorePointFile[];

  /** Transcript entry that triggered this restore point */
  transcriptEntryId: string;

  /** Metadata */
  totalSize: number;
  fileCount: number;
}

export interface RestorePointFile {
  /** Relative path from project root */
  path: string;
  /** Reference to object in snapshots/objects/ */
  hash: string;
  /** File permissions */
  mode: number;
  /** Size in bytes */
  size: number;
}

// -----------------------------------------------------------------------------
// RESTORE OPERATIONS
// -----------------------------------------------------------------------------

export interface RestoreOptions {
  /** Only restore specific files */
  files?: string[];
  /** Create backup before restoring */
  backup?: boolean;
  /** Dry run - don't actually write files */
  dryRun?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: string[];
  skippedFiles: string[];
  backupId?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// DIFF
// -----------------------------------------------------------------------------

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

export interface FileDiff {
  path: string;
  oldHash?: string;
  newHash?: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
}
