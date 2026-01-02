// =============================================================================
// CODE SESSION TYPES
// =============================================================================
// Types for Claude Code CLI integration - sessions, transcripts, and prompts.

import type { ToolStatus } from './tool';

// -----------------------------------------------------------------------------
// SESSION
// -----------------------------------------------------------------------------

export type CodeSessionStatus =
  | 'starting'
  | 'running'
  | 'waiting_input'
  | 'paused'
  | 'stopped';

export interface CodeSession {
  id: string;
  projectPath: string;
  status: CodeSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionOptions {
  /** Initial prompt to send on start */
  initialPrompt?: string;
  /** Working directory override */
  cwd?: string;
  /** Environment variables to pass */
  env?: Record<string, string>;
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

export interface TranscriptEntry {
  id: string;
  sessionId: string;
  type: TranscriptEntryType;
  content: string;
  timestamp: string;

  // Type-specific metadata
  toolCall?: ToolCallData;
  fileEdit?: FileEditData;
  compactMarker?: CompactMarkerData;

  // Linking
  restorePointId?: string;
  planItemId?: string;

  // Display state
  isCompacted?: boolean;
}

// -----------------------------------------------------------------------------
// TOOL CALLS
// -----------------------------------------------------------------------------

export interface ToolCallData {
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: ToolStatus;
  duration?: number;
}

// -----------------------------------------------------------------------------
// FILE EDITS
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// COMPACT MARKER
// -----------------------------------------------------------------------------

export interface CompactMarkerData {
  compactedCount: number;
  summary?: string;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// INPUT PROMPTS
// -----------------------------------------------------------------------------

export type PromptType =
  | 'yes_no'
  | 'numbered'
  | 'freeform'
  | 'confirmation';

export interface InputPrompt {
  id: string;
  sessionId: string;
  type: PromptType;
  message: string;
  options?: string[];
  default?: string | number;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// PARSED OUTPUT
// -----------------------------------------------------------------------------

export type ParsedOutputType =
  | 'text'
  | 'prompt'
  | 'tool_start'
  | 'tool_end'
  | 'file_edit'
  | 'compact_notice';

export interface ParsedOutput {
  type: ParsedOutputType;
  content: string;
  prompt?: InputPrompt;
  toolCall?: Partial<ToolCallData>;
  fileEdit?: FileEditData;
}

// -----------------------------------------------------------------------------
// STREAMING
// -----------------------------------------------------------------------------

export interface CodeSessionChunk {
  sessionId: string;
  content: string;
  parsed?: ParsedOutput;
}

// -----------------------------------------------------------------------------
// IPC EVENTS
// -----------------------------------------------------------------------------

export interface CodeSessionOutputEvent {
  sessionId: string;
  content: string;
  parsed: ParsedOutput;
}

export interface CodeSessionPromptEvent {
  sessionId: string;
  prompt: InputPrompt;
}

export interface CodeSessionFileEditEvent {
  sessionId: string;
  edit: FileEditData;
  restorePointId: string;
}

export interface CodeSessionCompactEvent {
  sessionId: string;
  marker: CompactMarkerData;
}

export interface CodeSessionStatusEvent {
  sessionId: string;
  status: CodeSessionStatus;
}

export interface CodeSessionErrorEvent {
  sessionId: string;
  error: string;
}

export interface CodeSessionEndedEvent {
  sessionId: string;
  exitCode: number;
}
