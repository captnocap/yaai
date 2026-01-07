// =============================================================================
// CODE SESSION MANAGER
// =============================================================================
// Core orchestrator for Claude Code CLI integration.
// Spawns processes, manages I/O, emits structured events.

import { EventEmitter } from 'events';
import type { Subprocess } from 'bun';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

import { OutputParser, isWaitingForInput } from './output-parser';
import { codeSessionStore, CodeSessionStore } from './code-session-store';
import { snapshotManager, SnapshotManager } from './snapshot-manager';
import { getSettingsStore } from './settings-store';
import { getClaudeSessionArchiver } from './claude-session-archiver';

import type {
  CodeSession,
  CodeSessionStatus,
  SessionOptions,
  TranscriptEntry,
  TranscriptEntryType,
  InputPrompt,
  ParsedOutput,
  FileEditData,
  CompactMarkerData,
} from '../../mainview/types/code-session';

import type { RestorePoint } from '../../mainview/types/snapshot';
import type { Plan } from '../../mainview/types/plan';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface CodeSessionManagerEvents {
  output: (data: { sessionId: string; content: string; parsed: ParsedOutput }) => void;
  prompt: (data: { sessionId: string; prompt: InputPrompt }) => void;
  fileEdit: (data: { sessionId: string; edit: FileEditData; restorePointId: string }) => void;
  compact: (data: { sessionId: string; marker: CompactMarkerData }) => void;
  planUpdate: (data: { sessionId: string; plan: Plan }) => void;
  statusChange: (data: { sessionId: string; status: CodeSessionStatus }) => void;
  error: (data: { sessionId: string; error: string }) => void;
  ended: (data: { sessionId: string; exitCode: number }) => void;
}

interface ManagedSession {
  session: CodeSession;
  process: Subprocess<'pipe', 'pipe', 'pipe'> | null;
  parser: OutputParser;
  currentPrompt: InputPrompt | null;
  pendingFileEdits: Set<string>;
  outputBuffer?: string; // Buffer for incomplete JSON lines
}

// -----------------------------------------------------------------------------
// CODE SESSION MANAGER
// -----------------------------------------------------------------------------

export class CodeSessionManager extends EventEmitter {
  private sessions: Map<string, ManagedSession> = new Map();
  private store: CodeSessionStore;
  private snapshots: SnapshotManager;

  constructor(store?: CodeSessionStore, snapshots?: SnapshotManager) {
    super();
    this.store = store || codeSessionStore;
    this.snapshots = snapshots || snapshotManager;
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    await this.store.initialize();
    await this.snapshots.initialize();
  }

  // ---------------------------------------------------------------------------
  // SESSION LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Start a new Claude Code session
   */
  async startSession(projectPath: string, options: SessionOptions = {}): Promise<CodeSession> {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const session: CodeSession = {
      id,
      projectPath,
      status: 'starting',
      createdAt: now,
      updatedAt: now,
    };

    // Save to store
    await this.store.createSession(session);

    // Create managed session
    const managed: ManagedSession = {
      session,
      process: null,
      parser: new OutputParser(),
      currentPrompt: null,
      pendingFileEdits: new Set(),
    };

    this.sessions.set(id, managed);

    // Spawn Claude Code process
    try {
      await this.spawnProcess(managed, options);
      await this.updateStatus(id, 'running');
    } catch (error) {
      await this.updateStatus(id, 'stopped');
      this.emit('error', {
        sessionId: id,
        error: error instanceof Error ? error.message : 'Failed to start Claude Code',
      });
    }

    return session;
  }

  /**
   * Get the Claude Code executable path from settings or use default
   */
  private getExecutablePath(): string {
    try {
      const settings = getSettingsStore().getAll();
      const configuredPath = settings.claudeCode?.cli?.executablePath;
      if (configuredPath && configuredPath.trim()) {
        // Expand ~ to home directory if needed
        if (configuredPath.startsWith('~')) {
          const homedir = require('os').homedir();
          return join(homedir, configuredPath.slice(1));
        }
        return configuredPath;
      }
    } catch {
      // Settings not available, use default
    }
    return 'claude'; // Default to PATH lookup
  }

  /**
   * Spawn the Claude Code CLI process
   */
  private async spawnProcess(managed: ManagedSession, options: SessionOptions): Promise<void> {
    const { session } = managed;
    const cwd = options.cwd || session.projectPath;

    // Get executable path from settings
    const executablePath = this.getExecutablePath();

    // Build command arguments for stream-json mode
    const args: string[] = [
      '-p',                           // Print mode (required for stream-json)
      '--output-format', 'stream-json',  // JSON output for easy parsing
      '--input-format', 'stream-json',   // JSON input for structured messages
      '--include-partial-messages',      // Get partial responses as they stream
    ];

    // Add initial prompt if provided (as first message, will be sent via stdin)
    const initialPrompt = options.initialPrompt;

    console.log(`[CodeSessionManager] Spawning Claude Code: ${executablePath} ${args.join(' ')}`);
    console.log(`[CodeSessionManager] Working directory: ${cwd}`);

    // Clean environment - remove Electrobun/CEF-specific variables that would break child processes
    const cleanEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      // Skip LD_PRELOAD and LD_LIBRARY_PATH which are set by Electrobun for CEF
      if (key === 'LD_PRELOAD' || key === 'LD_LIBRARY_PATH') {
        continue;
      }
      if (value !== undefined) {
        cleanEnv[key] = value;
      }
    }

    // Spawn process
    const proc = Bun.spawn([executablePath, ...args], {
      cwd,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...cleanEnv,
        ...options.env,
        // Ensure Claude Code knows it's in a non-interactive wrapper
        CLAUDE_CODE_WRAPPER: 'yaai',
        // Provide terminal type for proper output formatting
        TERM: cleanEnv.TERM || 'xterm-256color',
        // Force color output even when not in a TTY
        FORCE_COLOR: '1',
        // Disable pager for continuous output
        PAGER: '',
        GIT_PAGER: '',
      },
    });

    console.log(`[CodeSessionManager] Process spawned with PID: ${proc.pid}`);

    managed.process = proc;

    // Start archiving this session's transcript
    try {
      const archiver = getClaudeSessionArchiver();
      archiver.watch(session.projectPath, session.id);
    } catch (err) {
      console.warn('[CodeSessionManager] Failed to start archiver:', err);
    }

    // Handle stdout
    this.pipeOutput(managed, proc.stdout, 'stdout');

    // Handle stderr
    this.pipeOutput(managed, proc.stderr, 'stderr');

    // Handle process exit
    proc.exited.then((exitCode) => {
      console.log(`[CodeSessionManager] Process exited for session ${session.id} with code ${exitCode}`);
      managed.process = null;
      this.updateStatus(session.id, 'stopped');
      this.emit('ended', { sessionId: session.id, exitCode });
    });
  }

  /**
   * Pipe process output through parser
   */
  private async pipeOutput(
    managed: ManagedSession,
    stream: ReadableStream<Uint8Array>,
    source: 'stdout' | 'stderr'
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    console.log(`[CodeSessionManager] Started reading ${source} for session ${managed.session.id}`);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[CodeSessionManager] ${source} stream ended for session ${managed.session.id}`);
          break;
        }

        const text = decoder.decode(value, { stream: true });
        console.log(`[CodeSessionManager] Received ${source} (${text.length} chars):`, text.slice(0, 200));
        await this.handleOutput(managed, text);
      }

      // Flush remaining buffer
      const remaining = managed.parser.flush();
      for (const parsed of remaining) {
        await this.processParsedOutput(managed, parsed);
      }
    } catch (error) {
      if (managed.process) {
        this.emit('error', {
          sessionId: managed.session.id,
          error: error instanceof Error ? error.message : 'Stream error',
        });
      }
    }
  }

  /**
   * Handle raw output text (stream-json format - one JSON object per line)
   */
  private async handleOutput(managed: ManagedSession, text: string): Promise<void> {
    // Buffer for incomplete lines
    if (!managed.outputBuffer) {
      managed.outputBuffer = '';
    }
    managed.outputBuffer += text;

    // Process complete lines
    const lines = managed.outputBuffer.split('\n');
    // Keep the last incomplete line in the buffer
    managed.outputBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const json = JSON.parse(trimmed);
        await this.handleJsonOutput(managed, json);
      } catch (e) {
        // Not valid JSON - might be debug output, log it
        console.log(`[CodeSessionManager] Non-JSON output: ${trimmed.slice(0, 200)}`);
      }
    }
  }

  /**
   * Handle a parsed JSON message from Claude Code
   */
  private async handleJsonOutput(managed: ManagedSession, json: any): Promise<void> {
    const { session } = managed;
    console.log(`[CodeSessionManager] JSON message type: ${json.type}`);

    switch (json.type) {
      case 'assistant': {
        // Assistant message with content blocks
        const message = json.message;
        if (message?.content) {
          for (const block of message.content) {
            if (block.type === 'text') {
              // Text content from assistant
              const parsed: ParsedOutput = {
                type: 'text',
                content: block.text || '',
              };
              await this.processParsedOutput(managed, parsed);
            } else if (block.type === 'tool_use') {
              // Tool being called
              const parsed: ParsedOutput = {
                type: 'tool_start',
                content: `Using tool: ${block.name}`,
                toolCall: {
                  name: block.name,
                  status: 'running',
                  input: block.input,
                },
              };
              await this.processParsedOutput(managed, parsed);
            }
          }
        }
        break;
      }

      case 'content_block_start': {
        // Start of a content block (streaming)
        if (json.content_block?.type === 'text') {
          const parsed: ParsedOutput = {
            type: 'text',
            content: json.content_block.text || '',
          };
          await this.processParsedOutput(managed, parsed);
        }
        break;
      }

      case 'content_block_delta': {
        // Delta update to content block (streaming text)
        if (json.delta?.type === 'text_delta' && json.delta?.text) {
          const parsed: ParsedOutput = {
            type: 'text',
            content: json.delta.text,
          };
          await this.processParsedOutput(managed, parsed);
        }
        break;
      }

      case 'tool_use': {
        // Tool execution result
        const parsed: ParsedOutput = {
          type: 'tool_end',
          content: `Tool ${json.name} completed`,
          toolCall: {
            name: json.name,
            status: json.error ? 'error' : 'success',
            output: json.output,
          },
        };
        await this.processParsedOutput(managed, parsed);
        break;
      }

      case 'result': {
        // Conversation result/end
        console.log(`[CodeSessionManager] Result received, session may be ending`);
        // Result indicates the response is complete, could trigger waiting_input status
        await this.updateStatus(session.id, 'waiting_input');
        break;
      }

      case 'error': {
        // Error from Claude Code
        this.emit('error', {
          sessionId: session.id,
          error: json.error?.message || json.message || 'Unknown error',
        });
        break;
      }

      case 'system': {
        // System message (info, warnings, etc.)
        console.log(`[CodeSessionManager] System message: ${json.message}`);
        break;
      }

      default:
        console.log(`[CodeSessionManager] Unhandled message type: ${json.type}`, json);
    }
  }

  /**
   * Process a single parsed output
   */
  private async processParsedOutput(managed: ManagedSession, parsed: ParsedOutput): Promise<void> {
    const { session } = managed;

    // Add to transcript
    const entryType = this.mapOutputTypeToEntryType(parsed.type);
    await this.addTranscriptEntry(session.id, entryType, parsed.content, {
      toolCall: parsed.toolCall,
      fileEdit: parsed.fileEdit,
    });

    // Emit raw output event
    this.emit('output', {
      sessionId: session.id,
      content: parsed.content,
      parsed,
    });

    // Handle specific output types
    switch (parsed.type) {
      case 'prompt':
        if (parsed.prompt) {
          managed.currentPrompt = {
            ...parsed.prompt,
            sessionId: session.id,
          };
          await this.updateStatus(session.id, 'waiting_input');
          this.emit('prompt', {
            sessionId: session.id,
            prompt: managed.currentPrompt,
          });
        }
        break;

      case 'file_edit':
        if (parsed.fileEdit) {
          await this.handleFileEdit(managed, parsed.fileEdit);
        }
        break;

      case 'compact_notice':
        await this.handleCompact(managed, parsed.content);
        break;

      case 'tool_start':
        await this.updateStatus(session.id, 'running');
        break;

      case 'tool_end':
        // Could update status based on next output
        break;
    }
  }

  /**
   * Map parsed output type to transcript entry type
   */
  private mapOutputTypeToEntryType(type: ParsedOutput['type']): TranscriptEntryType {
    switch (type) {
      case 'prompt':
        return 'assistant_output';
      case 'tool_start':
      case 'tool_end':
        return 'tool_call';
      case 'file_edit':
        return 'file_edit';
      case 'compact_notice':
        return 'compact_marker';
      default:
        return 'assistant_output';
    }
  }

  /**
   * Handle file edit - create restore point
   */
  private async handleFileEdit(managed: ManagedSession, edit: FileEditData): Promise<void> {
    const { session } = managed;

    // Avoid duplicate restore points for same file in same edit batch
    if (managed.pendingFileEdits.has(edit.path)) {
      return;
    }
    managed.pendingFileEdits.add(edit.path);

    // Create entry first to get ID for linking
    const entryId = await this.addTranscriptEntry(session.id, 'file_edit', edit.path, {
      fileEdit: edit,
    });

    // Create restore point before the edit
    const fullPath = join(session.projectPath, edit.path);
    if (existsSync(fullPath) && edit.operation !== 'create') {
      try {
        const content = await readFile(fullPath);
        const restorePoint = await this.snapshots.createRestorePoint(
          session.id,
          `Before editing ${edit.path}`,
          [{ path: edit.path, content }],
          entryId
        );

        // Link entry to restore point
        await this.store.linkToRestorePoint(session.id, entryId, restorePoint.id);

        this.emit('fileEdit', {
          sessionId: session.id,
          edit,
          restorePointId: restorePoint.id,
        });
      } catch (error) {
        // Still emit the edit event without restore point
        this.emit('fileEdit', {
          sessionId: session.id,
          edit,
          restorePointId: '',
        });
      }
    } else {
      this.emit('fileEdit', {
        sessionId: session.id,
        edit,
        restorePointId: '',
      });
    }

    // Clear pending after a short delay (batch multiple edits)
    setTimeout(() => {
      managed.pendingFileEdits.delete(edit.path);
    }, 1000);
  }

  /**
   * Handle context compaction
   */
  private async handleCompact(managed: ManagedSession, content: string): Promise<void> {
    const { session } = managed;

    // Get transcript to count compacted entries
    const transcript = await this.store.getTranscript(session.id);
    const nonCompactedCount = transcript.filter(e => !e.isCompacted).length;

    const marker: CompactMarkerData = {
      compactedCount: nonCompactedCount,
      summary: content,
      timestamp: new Date().toISOString(),
    };

    // Add compact marker entry
    const entryId = await this.addTranscriptEntry(session.id, 'compact_marker', content, {
      compactMarker: marker,
    });

    // Mark previous entries as compacted
    await this.store.markCompacted(session.id, entryId);

    this.emit('compact', {
      sessionId: session.id,
      marker,
    });
  }

  /**
   * Stop a session
   */
  async stopSession(sessionId: string): Promise<void> {
    const managed = this.sessions.get(sessionId);
    if (!managed) return;

    if (managed.process) {
      managed.process.kill();
      managed.process = null;
    }

    await this.updateStatus(sessionId, 'stopped');
  }

  /**
   * Pause a session (send Ctrl+C)
   */
  async pauseSession(sessionId: string): Promise<void> {
    const managed = this.sessions.get(sessionId);
    if (!managed?.process) return;

    // Send interrupt signal
    managed.process.kill('SIGINT');
    await this.updateStatus(sessionId, 'paused');
  }

  /**
   * Resume a session by restarting with context
   */
  async resumeSession(sessionId: string): Promise<void> {
    const managed = this.sessions.get(sessionId);
    if (!managed) return;

    // If process is still running, just update status
    if (managed.process) {
      await this.updateStatus(sessionId, 'running');
      return;
    }

    // Otherwise restart
    const session = await this.store.getSession(sessionId);
    if (session) {
      await this.spawnProcess(managed, {});
      await this.updateStatus(sessionId, 'running');
    }
  }

  // ---------------------------------------------------------------------------
  // INPUT HANDLING
  // ---------------------------------------------------------------------------

  /**
   * Send raw input to the session (in stream-json format)
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const managed = this.sessions.get(sessionId);
    if (!managed?.process) {
      throw new Error('Session not running');
    }

    // Add to transcript
    await this.addTranscriptEntry(sessionId, 'user_input', input);

    // Format as JSON for stream-json input format
    const jsonMessage = JSON.stringify({
      type: 'user',
      content: input,
    });

    console.log(`[CodeSessionManager] Sending input: ${jsonMessage}`);

    // Write to stdin
    const writer = managed.process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(jsonMessage + '\n'));
    writer.releaseLock();

    // Clear current prompt
    managed.currentPrompt = null;
    managed.parser.reset();

    // Update status
    await this.updateStatus(sessionId, 'running');
  }

  /**
   * Send Yes/No answer
   */
  async sendYesNo(sessionId: string, answer: boolean): Promise<void> {
    await this.sendInput(sessionId, answer ? 'y' : 'n');
  }

  /**
   * Send numbered selection
   */
  async sendSelection(sessionId: string, index: number): Promise<void> {
    await this.sendInput(sessionId, String(index));
  }

  // ---------------------------------------------------------------------------
  // RESTORE POINTS
  // ---------------------------------------------------------------------------

  /**
   * Manually create a restore point
   */
  async createRestorePoint(sessionId: string, description: string): Promise<RestorePoint> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get recent file edits from transcript
    const transcript = await this.store.getTranscript(sessionId);
    const editedFiles = new Set<string>();

    for (const entry of transcript) {
      if (entry.fileEdit?.path) {
        editedFiles.add(entry.fileEdit.path);
      }
    }

    // Create restore point with current state of edited files
    const files: { path: string; content: Buffer }[] = [];
    for (const filePath of editedFiles) {
      const fullPath = join(session.projectPath, filePath);
      if (existsSync(fullPath)) {
        try {
          const content = await readFile(fullPath);
          files.push({ path: filePath, content });
        } catch {
          // Skip
        }
      }
    }

    // Create entry and link
    const entryId = await this.addTranscriptEntry(sessionId, 'system_message', `Checkpoint: ${description}`);

    return this.snapshots.createRestorePoint(sessionId, description, files, entryId);
  }

  /**
   * Restore to a restore point
   */
  async restoreToPoint(sessionId: string, restorePointId: string): Promise<void> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Pause session during restore
    const managed = this.sessions.get(sessionId);
    const wasRunning = managed?.process !== null;
    if (wasRunning) {
      await this.pauseSession(sessionId);
    }

    // Perform restore with backup
    const result = await this.snapshots.restore(restorePointId, session.projectPath, {
      backup: true,
    });

    if (!result.success) {
      throw new Error(result.error || 'Restore failed');
    }

    // Add transcript entry
    await this.addTranscriptEntry(
      sessionId,
      'system_message',
      `Restored to checkpoint. Files: ${result.restoredFiles.join(', ')}`
    );

    // Resume if was running
    if (wasRunning) {
      await this.resumeSession(sessionId);
    }
  }

  /**
   * Get restore points for a session
   */
  async getRestorePoints(sessionId: string): Promise<RestorePoint[]> {
    return this.snapshots.listRestorePoints(sessionId);
  }

  // ---------------------------------------------------------------------------
  // TRANSCRIPT
  // ---------------------------------------------------------------------------

  /**
   * Add a transcript entry
   */
  private async addTranscriptEntry(
    sessionId: string,
    type: TranscriptEntryType,
    content: string,
    extra?: Partial<TranscriptEntry>
  ): Promise<string> {
    const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const entry: TranscriptEntry = {
      id,
      sessionId,
      type,
      content,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    await this.store.addTranscriptEntry(entry);
    return id;
  }

  /**
   * Get full transcript
   */
  async getTranscript(sessionId: string): Promise<TranscriptEntry[]> {
    return this.store.getTranscript(sessionId);
  }

  /**
   * Get transcript since a specific entry
   */
  async getTranscriptSince(sessionId: string, entryId: string): Promise<TranscriptEntry[]> {
    return this.store.getTranscriptSince(sessionId, entryId);
  }

  // ---------------------------------------------------------------------------
  // STATUS & QUERIES
  // ---------------------------------------------------------------------------

  /**
   * Update session status
   */
  private async updateStatus(sessionId: string, status: CodeSessionStatus): Promise<void> {
    const managed = this.sessions.get(sessionId);
    if (managed) {
      managed.session.status = status;
    }

    await this.store.updateSession(sessionId, { status });
    this.emit('statusChange', { sessionId, status });
  }

  /**
   * Get a session
   */
  getSession(sessionId: string): CodeSession | null {
    return this.sessions.get(sessionId)?.session || null;
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<CodeSession[]> {
    return this.store.listSessions();
  }

  /**
   * Get current prompt for a session
   */
  getCurrentPrompt(sessionId: string): InputPrompt | null {
    return this.sessions.get(sessionId)?.currentPrompt || null;
  }

  /**
   * Check if session is running
   */
  isRunning(sessionId: string): boolean {
    const managed = this.sessions.get(sessionId);
    return managed?.process !== null;
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  /**
   * Stop all sessions
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(id => this.stopSession(id));
    await Promise.all(promises);
  }

  /**
   * Delete a session and all its data
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    // Stop if running
    await this.stopSession(sessionId);

    // Remove from memory
    this.sessions.delete(sessionId);

    // Delete from store
    return this.store.deleteSession(sessionId);
  }
}

// -----------------------------------------------------------------------------
// SINGLETON INSTANCE
// -----------------------------------------------------------------------------

export const codeSessionManager = new CodeSessionManager();
