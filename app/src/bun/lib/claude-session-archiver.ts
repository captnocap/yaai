// =============================================================================
// CLAUDE SESSION ARCHIVER
// =============================================================================
// Watches Claude Code session files and archives them to our storage.
// Preserves full conversation history even when Claude's /compact wipes data.

import { watch, type FSWatcher } from 'fs';
import { readFile, writeFile, appendFile, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { EventEmitter } from 'events';
import { CLAUDE_ARCHIVE_DIR, CLAUDE_ARCHIVE_INDEX } from './paths';
import type { TranscriptEntry } from './claude-code-reader';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArchivedSession {
  sessionId: string;
  projectPath: string;
  slug: string;
  createdAt: string;
  lastArchivedAt: string;
  entryCount: number;
  lastEntryUuid: string | null;
}

export interface ArchiveIndex {
  sessions: Record<string, ArchivedSession>;
  lastUpdated: string;
}

interface WatchedSession {
  projectPath: string;
  sessionId: string;
  watcher: FSWatcher | null;
  lastSize: number;
  lastEntryUuid: string | null;
}

export interface ClaudeSessionArchiverEvents {
  'entry-archived': (data: { sessionId: string; entry: TranscriptEntry }) => void;
  'session-compacted': (data: { sessionId: string; entriesLost: number }) => void;
  'error': (data: { sessionId: string; error: string }) => void;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const CLAUDE_HOME = join(homedir(), '.claude');
const CLAUDE_PROJECTS = join(CLAUDE_HOME, 'projects');

// Debounce file change events (Claude writes frequently)
const DEBOUNCE_MS = 500;

// -----------------------------------------------------------------------------
// CLAUDE SESSION ARCHIVER
// -----------------------------------------------------------------------------

export class ClaudeSessionArchiver extends EventEmitter {
  private index: ArchiveIndex = { sessions: {}, lastUpdated: '' };
  private watchers: Map<string, WatchedSession> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private initialized = false;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure archive directory exists
    await mkdir(CLAUDE_ARCHIVE_DIR, { recursive: true });

    // Load existing index
    await this.loadIndex();

    this.initialized = true;
  }

  private async loadIndex(): Promise<void> {
    if (existsSync(CLAUDE_ARCHIVE_INDEX)) {
      try {
        const content = await readFile(CLAUDE_ARCHIVE_INDEX, 'utf-8');
        this.index = JSON.parse(content);
      } catch {
        this.index = { sessions: {}, lastUpdated: '' };
      }
    }
  }

  private async saveIndex(): Promise<void> {
    this.index.lastUpdated = new Date().toISOString();
    await writeFile(CLAUDE_ARCHIVE_INDEX, JSON.stringify(this.index, null, 2));
  }

  // ---------------------------------------------------------------------------
  // ARCHIVE PATHS
  // ---------------------------------------------------------------------------

  /**
   * Get the archive file path for a session
   */
  getArchivePath(sessionId: string): string {
    return join(CLAUDE_ARCHIVE_DIR, `${sessionId}.jsonl`);
  }

  /**
   * Encode project path to Claude's directory format
   */
  private encodeProjectPath(projectPath: string): string {
    return projectPath.replace(/\//g, '-');
  }

  /**
   * Get Claude's session file path
   */
  private getClaudeSessionPath(projectPath: string, sessionId: string): string {
    const projectDir = join(CLAUDE_PROJECTS, this.encodeProjectPath(projectPath));
    return join(projectDir, `${sessionId}.jsonl`);
  }

  // ---------------------------------------------------------------------------
  // WATCHING
  // ---------------------------------------------------------------------------

  /**
   * Start watching a session file for changes
   */
  watch(projectPath: string, sessionId: string): void {
    const key = sessionId;
    if (this.watchers.has(key)) return;

    const claudePath = this.getClaudeSessionPath(projectPath, sessionId);
    if (!existsSync(claudePath)) {
      console.warn(`[Archiver] Session file not found: ${claudePath}`);
      return;
    }

    const watched: WatchedSession = {
      projectPath,
      sessionId,
      watcher: null,
      lastSize: 0,
      lastEntryUuid: this.index.sessions[sessionId]?.lastEntryUuid || null,
    };

    try {
      // Get initial file size
      stat(claudePath).then(s => {
        watched.lastSize = s.size;
      });

      // Set up file watcher
      watched.watcher = watch(claudePath, (event) => {
        if (event === 'change') {
          this.debouncedOnChange(sessionId, watched);
        }
      });

      this.watchers.set(key, watched);

      // Do initial sync
      this.syncSession(projectPath, sessionId).catch(err => {
        console.error(`[Archiver] Initial sync failed for ${sessionId}:`, err);
      });
    } catch (err) {
      console.error(`[Archiver] Failed to watch ${sessionId}:`, err);
    }
  }

  /**
   * Stop watching a session
   */
  unwatch(sessionId: string): void {
    const watched = this.watchers.get(sessionId);
    if (watched?.watcher) {
      watched.watcher.close();
    }
    this.watchers.delete(sessionId);

    const timer = this.debounceTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionId);
    }
  }

  /**
   * Stop all watchers
   */
  unwatchAll(): void {
    for (const sessionId of this.watchers.keys()) {
      this.unwatch(sessionId);
    }
  }

  private debouncedOnChange(sessionId: string, watched: WatchedSession): void {
    // Clear existing timer
    const existing = this.debounceTimers.get(sessionId);
    if (existing) clearTimeout(existing);

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(sessionId);
      this.syncSession(watched.projectPath, sessionId).catch(err => {
        console.error(`[Archiver] Sync failed for ${sessionId}:`, err);
        this.emit('error', { sessionId, error: (err as Error).message });
      });
    }, DEBOUNCE_MS);

    this.debounceTimers.set(sessionId, timer);
  }

  // ---------------------------------------------------------------------------
  // SYNCING
  // ---------------------------------------------------------------------------

  /**
   * Sync a session - read new entries from Claude's file, append to archive
   */
  async syncSession(projectPath: string, sessionId: string): Promise<void> {
    const claudePath = this.getClaudeSessionPath(projectPath, sessionId);
    const archivePath = this.getArchivePath(sessionId);

    if (!existsSync(claudePath)) return;

    try {
      // Read Claude's current file
      const claudeContent = await readFile(claudePath, 'utf-8');
      const claudeLines = claudeContent.trim().split('\n').filter(Boolean);

      // Read our archive (if exists)
      let archivedUuids = new Set<string>();
      let lastArchivedUuid: string | null = null;

      if (existsSync(archivePath)) {
        const archiveContent = await readFile(archivePath, 'utf-8');
        const archiveLines = archiveContent.trim().split('\n').filter(Boolean);

        for (const line of archiveLines) {
          try {
            const entry = JSON.parse(line);
            if (entry.uuid) {
              archivedUuids.add(entry.uuid);
              lastArchivedUuid = entry.uuid;
            }
          } catch { }
        }
      }

      // Find new entries to archive
      const newEntries: string[] = [];
      let slug = sessionId;

      for (const line of claudeLines) {
        try {
          const entry = JSON.parse(line);

          // Skip if already archived
          if (entry.uuid && archivedUuids.has(entry.uuid)) continue;

          // Only archive user/assistant messages (not snapshots, etc.)
          if (entry.type === 'user' || entry.type === 'assistant') {
            newEntries.push(line);
            if (entry.slug) slug = entry.slug;
            if (entry.uuid) lastArchivedUuid = entry.uuid;

            // Emit event for real-time updates
            this.emit('entry-archived', { sessionId, entry });
          }
        } catch { }
      }

      // Append new entries to archive
      if (newEntries.length > 0) {
        await appendFile(archivePath, newEntries.join('\n') + '\n');
      }

      // Detect compaction: if Claude's file has fewer entries than our archive
      const claudeEntryCount = claudeLines.filter(line => {
        try {
          const e = JSON.parse(line);
          return e.type === 'user' || e.type === 'assistant';
        } catch {
          return false;
        }
      }).length;

      if (archivedUuids.size > 0 && claudeEntryCount < archivedUuids.size) {
        const entriesLost = archivedUuids.size - claudeEntryCount;
        this.emit('session-compacted', { sessionId, entriesLost });
      }

      // Update index
      this.index.sessions[sessionId] = {
        sessionId,
        projectPath,
        slug,
        createdAt: this.index.sessions[sessionId]?.createdAt || new Date().toISOString(),
        lastArchivedAt: new Date().toISOString(),
        entryCount: archivedUuids.size + newEntries.length,
        lastEntryUuid: lastArchivedUuid,
      };

      await this.saveIndex();
    } catch (err) {
      console.error(`[Archiver] Failed to sync ${sessionId}:`, err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // READING FROM ARCHIVE
  // ---------------------------------------------------------------------------

  /**
   * Get full transcript from our archive (preserved history)
   */
  async getFullTranscript(sessionId: string): Promise<TranscriptEntry[]> {
    const archivePath = this.getArchivePath(sessionId);

    if (!existsSync(archivePath)) return [];

    try {
      const content = await readFile(archivePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries: TranscriptEntry[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          entries.push({
            uuid: parsed.uuid,
            parentUuid: parsed.parentUuid || null,
            type: parsed.type,
            message: parsed.message,
            sessionId: parsed.sessionId,
            timestamp: parsed.timestamp,
            slug: parsed.slug,
            cwd: parsed.cwd,
            gitBranch: parsed.gitBranch,
            version: parsed.version,
            toolUseResult: parsed.toolUseResult,
          });
        } catch { }
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Get transcript since a specific timestamp
   */
  async getTranscriptSince(sessionId: string, sinceTimestamp: string): Promise<TranscriptEntry[]> {
    const all = await this.getFullTranscript(sessionId);
    const sinceDate = new Date(sinceTimestamp).getTime();
    return all.filter(e => new Date(e.timestamp).getTime() > sinceDate);
  }

  /**
   * List all archived sessions
   */
  listArchivedSessions(): ArchivedSession[] {
    return Object.values(this.index.sessions).sort(
      (a, b) => new Date(b.lastArchivedAt).getTime() - new Date(a.lastArchivedAt).getTime()
    );
  }

  /**
   * Get archive info for a specific session
   */
  getArchiveInfo(sessionId: string): ArchivedSession | null {
    return this.index.sessions[sessionId] || null;
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let archiverInstance: ClaudeSessionArchiver | null = null;

export function getClaudeSessionArchiver(): ClaudeSessionArchiver {
  if (!archiverInstance) {
    archiverInstance = new ClaudeSessionArchiver();
  }
  return archiverInstance;
}
