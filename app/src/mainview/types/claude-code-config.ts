/**
 * Persistent configuration for Claude Code integration
 * These are deeper settings that require app restart or are rarely changed
 */

// -----------------------------------------------------------------------------
// STORAGE & ARCHIVAL
// -----------------------------------------------------------------------------

export type StorageStrategy = 'local' | 'project' | 'custom';
export type ArchivePolicy = 'never' | 'daily' | 'weekly' | 'monthly' | 'on_session_end';
export type LogLevel = 'none' | 'errors' | 'warnings' | 'info' | 'debug' | 'verbose';

export interface StorageConfig {
  /** Where to store session data: local (~/.yaai), project (.yaai in project), or custom path */
  strategy: StorageStrategy;
  /** Custom storage path when strategy is 'custom' */
  customPath: string;
  /** Maximum sessions to keep before auto-pruning (0 = unlimited) */
  maxSessions: number;
  /** Maximum total storage size in MB (0 = unlimited) */
  maxStorageMB: number;
}

export interface ArchiveConfig {
  /** When to archive old sessions */
  policy: ArchivePolicy;
  /** Compress archived sessions */
  compress: boolean;
  /** Archive location (empty = same as storage) */
  archivePath: string;
  /** Days to keep before archiving (for daily/weekly/monthly policies) */
  retentionDays: number;
  /** Include full transcript in archives */
  includeTranscripts: boolean;
  /** Include restore point snapshots in archives */
  includeSnapshots: boolean;
}

// -----------------------------------------------------------------------------
// CLI CONFIGURATION
// -----------------------------------------------------------------------------

export interface CLIConfig {
  /** Path to Claude Code CLI executable (empty = auto-detect from PATH) */
  executablePath: string;
  /** Additional CLI arguments to pass on every invocation */
  defaultArgs: string[];
  /** Environment variables to set for CLI process */
  environment: Record<string, string>;
  /** Working directory override (empty = use project path) */
  workingDirectory: string;
  /** Timeout for CLI startup in milliseconds */
  startupTimeoutMs: number;
  /** Timeout for individual operations in milliseconds */
  operationTimeoutMs: number;
}

// -----------------------------------------------------------------------------
// LOGGING & DEBUGGING
// -----------------------------------------------------------------------------

export interface LoggingConfig {
  /** Log level for Claude Code operations */
  level: LogLevel;
  /** Log to file */
  logToFile: boolean;
  /** Log file path (empty = default location) */
  logFilePath: string;
  /** Maximum log file size in MB before rotation */
  maxLogFileMB: number;
  /** Number of rotated log files to keep */
  logRotationCount: number;
  /** Include timestamps in logs */
  includeTimestamps: boolean;
  /** Include process output in logs */
  captureStdout: boolean;
  /** Include error output in logs */
  captureStderr: boolean;
}

// -----------------------------------------------------------------------------
// RESTORE POINTS & SNAPSHOTS
// -----------------------------------------------------------------------------

export interface SnapshotConfig {
  /** Enable automatic restore points */
  autoSnapshot: boolean;
  /** Create snapshot before every file edit */
  snapshotOnFileEdit: boolean;
  /** Create snapshot before tool execution */
  snapshotOnToolCall: boolean;
  /** Maximum snapshots per session (0 = unlimited) */
  maxSnapshotsPerSession: number;
  /** Maximum total snapshot storage in MB (0 = unlimited) */
  maxSnapshotStorageMB: number;
  /** File patterns to exclude from snapshots (gitignore style) */
  excludePatterns: string[];
  /** Maximum file size to include in snapshots (MB) */
  maxFileSizeMB: number;
}

// -----------------------------------------------------------------------------
// SESSION BEHAVIOR
// -----------------------------------------------------------------------------

export interface SessionConfig {
  /** Auto-start last session on app launch */
  autoStartLastSession: boolean;
  /** Remember window layout per project */
  rememberLayout: boolean;
  /** Default model to use (empty = CLI default) */
  defaultModel: string;
  /** Enable multi-agent orchestration features */
  enableMultiAgent: boolean;
  /** Maximum concurrent agent tasks */
  maxConcurrentTasks: number;
  /** Auto-approve certain tool calls */
  autoApproveTools: string[];
  /** Require confirmation for file writes */
  confirmFileWrites: boolean;
  /** Require confirmation for shell commands */
  confirmShellCommands: boolean;
}

// -----------------------------------------------------------------------------
// MAIN CONFIG TYPE
// -----------------------------------------------------------------------------

export interface ClaudeCodeConfig {
  storage: StorageConfig;
  archive: ArchiveConfig;
  cli: CLIConfig;
  logging: LoggingConfig;
  snapshot: SnapshotConfig;
  session: SessionConfig;
}

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const DEFAULT_CLAUDE_CODE_CONFIG: ClaudeCodeConfig = {
  storage: {
    strategy: 'local',
    customPath: '',
    maxSessions: 50,
    maxStorageMB: 1024, // 1GB
  },

  archive: {
    policy: 'monthly',
    compress: true,
    archivePath: '',
    retentionDays: 30,
    includeTranscripts: true,
    includeSnapshots: false,
  },

  cli: {
    executablePath: '', // Auto-detect
    defaultArgs: [],
    environment: {},
    workingDirectory: '',
    startupTimeoutMs: 30000,
    operationTimeoutMs: 300000, // 5 minutes
  },

  logging: {
    level: 'info',
    logToFile: true,
    logFilePath: '',
    maxLogFileMB: 50,
    logRotationCount: 5,
    includeTimestamps: true,
    captureStdout: true,
    captureStderr: true,
  },

  snapshot: {
    autoSnapshot: true,
    snapshotOnFileEdit: true,
    snapshotOnToolCall: false,
    maxSnapshotsPerSession: 100,
    maxSnapshotStorageMB: 512,
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.log',
      '.env*',
    ],
    maxFileSizeMB: 10,
  },

  session: {
    autoStartLastSession: false,
    rememberLayout: true,
    defaultModel: '',
    enableMultiAgent: false,
    maxConcurrentTasks: 3,
    autoApproveTools: [],
    confirmFileWrites: true,
    confirmShellCommands: true,
  },
};
