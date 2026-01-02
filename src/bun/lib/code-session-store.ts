// =============================================================================
// CODE SESSION STORE
// =============================================================================
// Persistence layer for Claude Code sessions and transcripts.
// Sessions stored as JSON, transcripts as JSONL (one entry per line).

import { readFile, writeFile, readdir, rm, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import {
  CODE_SESSIONS_DIR,
  getCodeSessionDir,
  getCodeSessionPath,
  getCodeSessionTranscriptPath,
  ensureCodeSessionDir,
} from './paths';

import type {
  CodeSession,
  TranscriptEntry,
} from '../../mainview/types/code-session';

// -----------------------------------------------------------------------------
// CODE SESSION STORE
// -----------------------------------------------------------------------------

export class CodeSessionStore {
  /**
   * Initialize the store (ensure directories exist)
   */
  async initialize(): Promise<void> {
    const { mkdir } = await import('fs/promises');
    await mkdir(CODE_SESSIONS_DIR, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // SESSION CRUD
  // ---------------------------------------------------------------------------

  /**
   * Create a new session
   */
  async createSession(session: CodeSession): Promise<void> {
    await ensureCodeSessionDir(session.id);
    const path = getCodeSessionPath(session.id);
    await writeFile(path, JSON.stringify(session, null, 2));
  }

  /**
   * Update an existing session
   */
  async updateSession(sessionId: string, updates: Partial<CodeSession>): Promise<CodeSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const updated = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const path = getCodeSessionPath(sessionId);
    await writeFile(path, JSON.stringify(updated, null, 2));
    return updated;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<CodeSession | null> {
    const path = getCodeSessionPath(sessionId);
    if (!existsSync(path)) return null;

    try {
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<CodeSession[]> {
    if (!existsSync(CODE_SESSIONS_DIR)) return [];

    try {
      const entries = await readdir(CODE_SESSIONS_DIR, { withFileTypes: true });
      const sessions: CodeSession[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const session = await this.getSession(entry.name);
          if (session) {
            sessions.push(session);
          }
        }
      }

      // Sort by most recent first
      return sessions.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Delete a session and all its data
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const dir = getCodeSessionDir(sessionId);
    if (!existsSync(dir)) return false;

    try {
      await rm(dir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSCRIPT OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Add a transcript entry (appends to JSONL file)
   */
  async addTranscriptEntry(entry: TranscriptEntry): Promise<void> {
    await ensureCodeSessionDir(entry.sessionId);
    const path = getCodeSessionTranscriptPath(entry.sessionId);
    const line = JSON.stringify(entry) + '\n';
    await appendFile(path, line);
  }

  /**
   * Get all transcript entries for a session
   */
  async getTranscript(sessionId: string): Promise<TranscriptEntry[]> {
    const path = getCodeSessionTranscriptPath(sessionId);
    if (!existsSync(path)) return [];

    const entries: TranscriptEntry[] = [];

    return new Promise((resolve, reject) => {
      const stream = createReadStream(path);
      const rl = createInterface({ input: stream });

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            entries.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }
      });

      rl.on('close', () => resolve(entries));
      rl.on('error', reject);
    });
  }

  /**
   * Get transcript entries since a specific entry ID
   */
  async getTranscriptSince(sessionId: string, sinceEntryId: string): Promise<TranscriptEntry[]> {
    const entries = await this.getTranscript(sessionId);
    const idx = entries.findIndex(e => e.id === sinceEntryId);
    if (idx === -1) return entries;
    return entries.slice(idx + 1);
  }

  /**
   * Update a specific transcript entry
   * Note: This is expensive as it requires rewriting the entire file
   */
  async updateTranscriptEntry(
    sessionId: string,
    entryId: string,
    updates: Partial<TranscriptEntry>
  ): Promise<boolean> {
    const entries = await this.getTranscript(sessionId);
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx === -1) return false;

    entries[idx] = { ...entries[idx], ...updates };

    const path = getCodeSessionTranscriptPath(sessionId);
    const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    await writeFile(path, content);

    return true;
  }

  /**
   * Mark all entries before a specific entry as compacted
   */
  async markCompacted(sessionId: string, beforeEntryId: string): Promise<number> {
    const entries = await this.getTranscript(sessionId);
    const idx = entries.findIndex(e => e.id === beforeEntryId);
    if (idx === -1) return 0;

    let count = 0;
    for (let i = 0; i < idx; i++) {
      if (!entries[i].isCompacted) {
        entries[i].isCompacted = true;
        count++;
      }
    }

    if (count > 0) {
      const path = getCodeSessionTranscriptPath(sessionId);
      const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
      await writeFile(path, content);
    }

    return count;
  }

  /**
   * Get the last N transcript entries
   */
  async getRecentTranscript(sessionId: string, limit: number = 50): Promise<TranscriptEntry[]> {
    const entries = await this.getTranscript(sessionId);
    return entries.slice(-limit);
  }

  /**
   * Count transcript entries for a session
   */
  async countTranscriptEntries(sessionId: string): Promise<number> {
    const entries = await this.getTranscript(sessionId);
    return entries.length;
  }

  /**
   * Search transcript entries by content
   */
  async searchTranscript(sessionId: string, query: string): Promise<TranscriptEntry[]> {
    const entries = await this.getTranscript(sessionId);
    const lowerQuery = query.toLowerCase();
    return entries.filter(e =>
      e.content.toLowerCase().includes(lowerQuery)
    );
  }

  // ---------------------------------------------------------------------------
  // LINKING OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Link a transcript entry to a restore point
   */
  async linkToRestorePoint(
    sessionId: string,
    entryId: string,
    restorePointId: string
  ): Promise<boolean> {
    return this.updateTranscriptEntry(sessionId, entryId, { restorePointId });
  }

  /**
   * Link a transcript entry to a plan item
   */
  async linkToPlanItem(
    sessionId: string,
    entryId: string,
    planItemId: string
  ): Promise<boolean> {
    return this.updateTranscriptEntry(sessionId, entryId, { planItemId });
  }

  /**
   * Get entries linked to a specific restore point
   */
  async getEntriesForRestorePoint(
    sessionId: string,
    restorePointId: string
  ): Promise<TranscriptEntry[]> {
    const entries = await this.getTranscript(sessionId);
    return entries.filter(e => e.restorePointId === restorePointId);
  }

  /**
   * Get entries linked to a specific plan item
   */
  async getEntriesForPlanItem(
    sessionId: string,
    planItemId: string
  ): Promise<TranscriptEntry[]> {
    const entries = await this.getTranscript(sessionId);
    return entries.filter(e => e.planItemId === planItemId);
  }
}

// -----------------------------------------------------------------------------
// SINGLETON INSTANCE
// -----------------------------------------------------------------------------

export const codeSessionStore = new CodeSessionStore();
