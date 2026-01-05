// =============================================================================
// CLAUDE CODE READER
// =============================================================================
// Reads Claude Code's files from ~/.claude/ to display in the UI.
// This is read-only - we never write to Claude's files.

import { readFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SessionInfo {
  id: string;
  projectPath: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isAgent: boolean;
}

export interface TranscriptEntry {
  uuid: string;
  parentUuid: string | null;
  type: 'user' | 'assistant';
  message: {
    role: string;
    content: any[];
  };
  sessionId: string;
  timestamp: string;
  slug?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  toolUseResult?: {
    stdout: string;
    stderr: string;
    interrupted: boolean;
    isImage: boolean;
  };
}

export interface PlanInfo {
  slug: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
}

export interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  pastedContents?: Record<string, { id: number; type: string; content: string }>;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const CLAUDE_HOME = join(homedir(), '.claude');
const CLAUDE_PROJECTS = join(CLAUDE_HOME, 'projects');
const CLAUDE_PLANS = join(CLAUDE_HOME, 'plans');
const CLAUDE_HISTORY = join(CLAUDE_HOME, 'history.jsonl');
const CLAUDE_TODOS = join(CLAUDE_HOME, 'todos');

// -----------------------------------------------------------------------------
// CLAUDE CODE READER
// -----------------------------------------------------------------------------

export class ClaudeCodeReader {
  /**
   * Encode a project path to Claude's directory name format
   * /home/siah/creative/ai -> -home-siah-creative-ai
   */
  encodeProjectPath(projectPath: string): string {
    return projectPath.replace(/\//g, '-');
  }

  /**
   * Decode a Claude directory name back to a project path
   * -home-siah-creative-ai -> /home/siah/creative/ai
   */
  decodeProjectPath(encoded: string): string {
    // First char is always '-', representing the root '/'
    return encoded.replace(/-/g, '/');
  }

  /**
   * Get the path to a project's session directory
   */
  getProjectDir(projectPath: string): string {
    return join(CLAUDE_PROJECTS, this.encodeProjectPath(projectPath));
  }

  /**
   * Check if Claude Code home directory exists
   */
  async isClaudeCodeInstalled(): Promise<boolean> {
    return existsSync(CLAUDE_HOME);
  }

  // ---------------------------------------------------------------------------
  // SESSION LISTING
  // ---------------------------------------------------------------------------

  /**
   * List all projects that have Claude sessions
   */
  async listProjects(): Promise<string[]> {
    if (!existsSync(CLAUDE_PROJECTS)) return [];

    try {
      const entries = await readdir(CLAUDE_PROJECTS, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => this.decodeProjectPath(e.name));
    } catch {
      return [];
    }
  }

  /**
   * Get sessions for a specific project
   */
  async getSessions(projectPath: string): Promise<SessionInfo[]> {
    const projectDir = this.getProjectDir(projectPath);
    if (!existsSync(projectDir)) return [];

    try {
      const files = await readdir(projectDir);
      const sessions: SessionInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = join(projectDir, file);
        const isAgent = file.startsWith('agent-');
        const sessionId = file.replace('.jsonl', '');

        try {
          const stats = await stat(filePath);
          const info = await this.getSessionInfo(filePath, sessionId, projectPath, isAgent);

          sessions.push({
            ...info,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
          });
        } catch {
          // Skip files we can't read
        }
      }

      // Sort by most recent first
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return sessions;
    } catch {
      return [];
    }
  }

  /**
   * Get basic info about a session by reading first and last entries
   */
  private async getSessionInfo(
    filePath: string,
    sessionId: string,
    projectPath: string,
    isAgent: boolean
  ): Promise<Omit<SessionInfo, 'createdAt' | 'updatedAt'>> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let slug = sessionId;
      let messageCount = 0;

      // Try to get slug from first message
      if (lines.length > 0) {
        try {
          const first = JSON.parse(lines[0]);
          if (first.slug) slug = first.slug;
        } catch { }
      }

      // Count user/assistant messages (not tool results, snapshots, etc.)
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'user' || entry.type === 'assistant') {
            messageCount++;
          }
        } catch { }
      }

      return {
        id: sessionId,
        projectPath,
        slug,
        messageCount,
        isAgent,
      };
    } catch {
      return {
        id: sessionId,
        projectPath,
        slug: sessionId,
        messageCount: 0,
        isAgent,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSCRIPT READING
  // ---------------------------------------------------------------------------

  /**
   * Read full transcript for a session
   */
  async getTranscript(projectPath: string, sessionId: string): Promise<TranscriptEntry[]> {
    const projectDir = this.getProjectDir(projectPath);
    const filePath = join(projectDir, `${sessionId}.jsonl`);

    if (!existsSync(filePath)) return [];

    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries: TranscriptEntry[] = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);

          // Only include user and assistant messages, not file-history-snapshot etc.
          if (parsed.type === 'user' || parsed.type === 'assistant') {
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
          }
        } catch {
          // Skip malformed lines
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Read transcript entries since a given timestamp (for incremental updates)
   */
  async getTranscriptSince(
    projectPath: string,
    sessionId: string,
    sinceTimestamp: string
  ): Promise<TranscriptEntry[]> {
    const all = await this.getTranscript(projectPath, sessionId);
    const sinceDate = new Date(sinceTimestamp).getTime();

    return all.filter(e => new Date(e.timestamp).getTime() > sinceDate);
  }

  // ---------------------------------------------------------------------------
  // PLANS
  // ---------------------------------------------------------------------------

  /**
   * List all plan files
   */
  async getPlans(): Promise<PlanInfo[]> {
    if (!existsSync(CLAUDE_PLANS)) return [];

    try {
      const files = await readdir(CLAUDE_PLANS);
      const plans: PlanInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = join(CLAUDE_PLANS, file);
        const slug = file.replace('.md', '');

        try {
          const stats = await stat(filePath);
          plans.push({
            slug,
            path: filePath,
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            sizeBytes: stats.size,
          });
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort by most recent first
      plans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return plans;
    } catch {
      return [];
    }
  }

  /**
   * Read a specific plan file
   */
  async getPlan(slug: string): Promise<string | null> {
    const filePath = join(CLAUDE_PLANS, `${slug}.md`);

    if (!existsSync(filePath)) return null;

    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // HISTORY
  // ---------------------------------------------------------------------------

  /**
   * Get user input history (history.jsonl)
   */
  async getHistory(limit = 100): Promise<HistoryEntry[]> {
    if (!existsSync(CLAUDE_HISTORY)) return [];

    try {
      const content = await readFile(CLAUDE_HISTORY, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries: HistoryEntry[] = [];

      // Read from end (most recent) first
      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          entries.push({
            display: parsed.display,
            timestamp: parsed.timestamp,
            project: parsed.project,
            pastedContents: parsed.pastedContents,
          });
        } catch {
          // Skip malformed lines
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Get history filtered by project
   */
  async getHistoryForProject(projectPath: string, limit = 100): Promise<HistoryEntry[]> {
    const all = await this.getHistory(limit * 2); // Get more in case of filtering
    return all.filter(e => e.project === projectPath).slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // CLAUDE CODE SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Read Claude Code's own settings.json
   */
  async getClaudeSettings(): Promise<Record<string, any> | null> {
    const filePath = join(CLAUDE_HOME, 'settings.json');

    if (!existsSync(filePath)) return null;

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get Claude Code version from a recent session
   */
  async getClaudeVersion(): Promise<string | null> {
    const projects = await this.listProjects();
    if (projects.length === 0) return null;

    const sessions = await this.getSessions(projects[0]);
    if (sessions.length === 0) return null;

    const transcript = await this.getTranscript(projects[0], sessions[0].id);
    if (transcript.length === 0) return null;

    return transcript[0].version || null;
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let readerInstance: ClaudeCodeReader | null = null;

export function getClaudeCodeReader(): ClaudeCodeReader {
  if (!readerInstance) {
    readerInstance = new ClaudeCodeReader();
  }
  return readerInstance;
}
