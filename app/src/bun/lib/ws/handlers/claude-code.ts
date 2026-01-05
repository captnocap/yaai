// =============================================================================
// CLAUDE CODE WEBSOCKET HANDLERS
// =============================================================================
// WebSocket handlers for Claude Code integration.
// Provides access to Claude's session files and our archived transcripts.

import type { WSServer } from '../server';
import { getClaudeCodeReader } from '../../claude-code-reader';
import { getClaudeSessionArchiver } from '../../claude-session-archiver';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface ListSessionsPayload {
  projectPath: string;
}

interface GetTranscriptPayload {
  projectPath: string;
  sessionId: string;
  fromArchive?: boolean; // If true, use our archive instead of Claude's file
}

interface TranscriptSincePayload {
  projectPath: string;
  sessionId: string;
  sinceTimestamp: string;
  fromArchive?: boolean;
}

interface WatchSessionPayload {
  projectPath: string;
  sessionId: string;
}

interface GetPlanPayload {
  slug: string;
}

interface ValidateCLIPathPayload {
  path: string;
}

// -----------------------------------------------------------------------------
// HANDLER REGISTRATION
// -----------------------------------------------------------------------------

export function registerClaudeCodeHandlers(wsServer: WSServer): void {
  const reader = getClaudeCodeReader();
  const archiver = getClaudeSessionArchiver();

  // ---------------------------------------------------------------------------
  // INITIALIZATION CHECK
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:is-installed', async () => {
    return await reader.isClaudeCodeInstalled();
  });

  wsServer.onRequest('claude-code:get-version', async () => {
    return await reader.getClaudeVersion();
  });

  wsServer.onRequest('claude-code:get-claude-settings', async () => {
    return await reader.getClaudeSettings();
  });

  // ---------------------------------------------------------------------------
  // PROJECT LISTING
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:list-projects', async () => {
    return await reader.listProjects();
  });

  // ---------------------------------------------------------------------------
  // SESSION LISTING
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:list-sessions', async (payload) => {
    const data = payload as ListSessionsPayload;
    return await reader.getSessions(data.projectPath);
  });

  wsServer.onRequest('claude-code:list-archived-sessions', async () => {
    return archiver.listArchivedSessions();
  });

  wsServer.onRequest('claude-code:get-archive-info', async (payload) => {
    return archiver.getArchiveInfo(payload as string);
  });

  // ---------------------------------------------------------------------------
  // TRANSCRIPT READING
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:get-transcript', async (payload) => {
    const data = payload as GetTranscriptPayload;

    if (data.fromArchive) {
      // Read from our preserved archive
      return await archiver.getFullTranscript(data.sessionId);
    } else {
      // Read from Claude's current file
      return await reader.getTranscript(data.projectPath, data.sessionId);
    }
  });

  wsServer.onRequest('claude-code:get-transcript-since', async (payload) => {
    const data = payload as TranscriptSincePayload;

    if (data.fromArchive) {
      return await archiver.getTranscriptSince(data.sessionId, data.sinceTimestamp);
    } else {
      return await reader.getTranscriptSince(data.projectPath, data.sessionId, data.sinceTimestamp);
    }
  });

  // ---------------------------------------------------------------------------
  // SESSION WATCHING (for live updates)
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:watch-session', async (payload) => {
    const data = payload as WatchSessionPayload;
    archiver.watch(data.projectPath, data.sessionId);
    return { watching: true, sessionId: data.sessionId };
  });

  wsServer.onRequest('claude-code:unwatch-session', async (payload) => {
    archiver.unwatch(payload as string);
    return { watching: false };
  });

  wsServer.onRequest('claude-code:sync-session', async (payload) => {
    const data = payload as WatchSessionPayload;
    await archiver.syncSession(data.projectPath, data.sessionId);
    return { synced: true };
  });

  // ---------------------------------------------------------------------------
  // ARCHIVER EVENTS (forward to WebSocket)
  // ---------------------------------------------------------------------------

  archiver.on('entry-archived', (data) => {
    wsServer.emit('claude-code:entry-archived', data);
  });

  archiver.on('session-compacted', (data) => {
    wsServer.emit('claude-code:session-compacted', data);
  });

  archiver.on('error', (data) => {
    wsServer.emit('claude-code:error', data);
  });

  // ---------------------------------------------------------------------------
  // PLANS
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:list-plans', async () => {
    return await reader.getPlans();
  });

  wsServer.onRequest('claude-code:get-plan', async (payload) => {
    const data = payload as GetPlanPayload;
    return await reader.getPlan(data.slug);
  });

  // ---------------------------------------------------------------------------
  // HISTORY
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:get-history', async (payload) => {
    const limit = (payload as { limit?: number })?.limit || 100;
    return await reader.getHistory(limit);
  });

  wsServer.onRequest('claude-code:get-history-for-project', async (payload) => {
    const data = payload as { projectPath: string; limit?: number };
    return await reader.getHistoryForProject(data.projectPath, data.limit || 100);
  });

  // ---------------------------------------------------------------------------
  // CLI PATH VALIDATION
  // ---------------------------------------------------------------------------

  wsServer.onRequest('claude-code:validate-cli-path', async (payload) => {
    const data = payload as ValidateCLIPathPayload;
    const path = data.path;

    if (!path) {
      // Empty means auto-detect, which is valid
      return { valid: true };
    }

    // Expand ~ to home directory
    const expandedPath = path.startsWith('~')
      ? join(homedir(), path.slice(1))
      : path;

    // Check if file exists and is executable
    if (!existsSync(expandedPath)) {
      return { valid: false, error: 'Path does not exist' };
    }

    try {
      const stats = await stat(expandedPath);
      if (!stats.isFile()) {
        return { valid: false, error: 'Path is not a file' };
      }

      // Check if executable (Unix)
      if (process.platform !== 'win32') {
        const mode = stats.mode;
        const isExecutable = (mode & 0o111) !== 0;
        if (!isExecutable) {
          return { valid: false, error: 'File is not executable' };
        }
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: (err as Error).message };
    }
  });
}
