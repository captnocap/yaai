// =============================================================================
// WORKBENCH STORE
// =============================================================================
// Manages workbench session persistence on disk.
// Stores sessions at ~/.yaai/workbench/prompts/{session-id}.json

import { readdir, readFile, writeFile, rm, mkdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { EventEmitter } from 'events';
import {
  WORKBENCH_PROMPTS_DIR,
  getWorkbenchSessionPath,
  ensureWorkbenchDirs,
} from './paths';

// -----------------------------------------------------------------------------
// TYPES (re-export from frontend for backend use)
// -----------------------------------------------------------------------------

export type PromptType = 'text' | 'image' | 'tool';
export type MessageRole = 'system' | 'user' | 'assistant';

export interface MessageBlock {
  id: string;
  role: MessageRole;
  content: string;
  isPrefill?: boolean;
}

export interface VariableDefinition {
  name: string;
  currentValue: string;
  description?: string;
}

export interface WorkbenchModelConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
}

export interface ImagePromptConfig {
  prompt: string;
  negativePrompt?: string;
  model: string;
  wildcardSources?: string[];
}

export interface ToolPromptConfig {
  name: string;
  description: string;
  inputSchema: string;
  instructions?: string;
}

export interface WorkbenchSession {
  id: string;
  name: string;
  type: PromptType;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  modelConfig?: WorkbenchModelConfig;
  messages?: MessageBlock[];
  variables?: VariableDefinition[];
  imageConfig?: ImagePromptConfig;
  toolConfig?: ToolPromptConfig;
}

export interface PromptLibraryItem {
  id: string;
  name: string;
  type: PromptType;
  description?: string;
  updatedAt: string;
  tags?: string[];
}

export type WorkbenchStoreEvent =
  | 'session-created'
  | 'session-updated'
  | 'session-deleted';

// -----------------------------------------------------------------------------
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class WorkbenchStore {
  private events = new EventEmitter();
  private initialized = false;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await ensureWorkbenchDirs();
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ---------------------------------------------------------------------------
  // EVENT HANDLING
  // ---------------------------------------------------------------------------

  on(event: WorkbenchStoreEvent, listener: (data: unknown) => void): void {
    this.events.on(event, listener);
  }

  off(event: WorkbenchStoreEvent, listener: (data: unknown) => void): void {
    this.events.off(event, listener);
  }

  private emit(event: WorkbenchStoreEvent, data: unknown): void {
    this.events.emit(event, data);
  }

  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * List all sessions (lightweight - returns PromptLibraryItem[])
   */
  async list(): Promise<PromptLibraryItem[]> {
    await this.ensureInitialized();

    try {
      const files = await readdir(WORKBENCH_PROMPTS_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      const items: PromptLibraryItem[] = [];

      for (const file of jsonFiles) {
        try {
          const filePath = join(WORKBENCH_PROMPTS_DIR, file);
          const content = await readFile(filePath, 'utf-8');
          const session: WorkbenchSession = JSON.parse(content);

          items.push({
            id: session.id,
            name: session.name,
            type: session.type,
            description: session.description,
            updatedAt: session.updatedAt,
            tags: session.tags,
          });
        } catch (err) {
          console.error(`Error reading session file ${file}:`, err);
        }
      }

      // Sort by updatedAt descending
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return items;
    } catch (err) {
      // Directory doesn't exist yet
      return [];
    }
  }

  /**
   * Get a single session by ID
   */
  async get(id: string): Promise<WorkbenchSession | null> {
    await this.ensureInitialized();

    try {
      const filePath = getWorkbenchSessionPath(id);
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      return null;
    }
  }

  /**
   * Create a new session
   */
  async create(session: Omit<WorkbenchSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkbenchSession> {
    await this.ensureInitialized();

    const id = this.generateId();
    const now = new Date().toISOString();

    const newSession: WorkbenchSession = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const filePath = getWorkbenchSessionPath(id);
    await writeFile(filePath, JSON.stringify(newSession, null, 2));

    this.emit('session-created', newSession);
    return newSession;
  }

  /**
   * Update an existing session
   */
  async update(id: string, updates: Partial<Omit<WorkbenchSession, 'id' | 'createdAt'>>): Promise<WorkbenchSession | null> {
    await this.ensureInitialized();

    const existing = await this.get(id);
    if (!existing) return null;

    const updatedSession: WorkbenchSession = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const filePath = getWorkbenchSessionPath(id);
    await writeFile(filePath, JSON.stringify(updatedSession, null, 2));

    this.emit('session-updated', updatedSession);
    return updatedSession;
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const filePath = getWorkbenchSessionPath(id);
      await rm(filePath);
      this.emit('session-deleted', { id });
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Duplicate a session with a new name
   */
  async duplicate(id: string, newName?: string): Promise<WorkbenchSession | null> {
    await this.ensureInitialized();

    const existing = await this.get(id);
    if (!existing) return null;

    const { id: _oldId, createdAt: _oldCreated, updatedAt: _oldUpdated, ...sessionData } = existing;

    return this.create({
      ...sessionData,
      name: newName || `${existing.name} (copy)`,
    });
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private generateId(): string {
    // Generate a URL-safe ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}

// -----------------------------------------------------------------------------
// SINGLETON EXPORT
// -----------------------------------------------------------------------------

export const workbenchStore = new WorkbenchStore();
