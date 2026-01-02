// =============================================================================
// ARTIFACT WATCHER
// =============================================================================
// Watches artifact directories for changes and triggers hot reload.
// Uses Bun's native file watching capabilities.

import { watch, type WatchEventType } from 'fs';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';
import { ARTIFACTS_DIR } from './paths';
import { getLoader } from './artifact-loader';
import { getRegistry } from './artifact-registry';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WatcherOptions {
  /** Debounce delay in ms (default: 300) */
  debounce?: number;

  /** File patterns to watch (default: all) */
  patterns?: string[];

  /** Whether to watch recursively (default: true) */
  recursive?: boolean;
}

export interface WatchEvent {
  type: 'change' | 'add' | 'remove';
  artifactId: string;
  filePath: string;
  timestamp: number;
}

export type WatchCallback = (event: WatchEvent) => void;

// -----------------------------------------------------------------------------
// ARTIFACT WATCHER
// -----------------------------------------------------------------------------

export class ArtifactWatcher {
  private watchers = new Map<string, ReturnType<typeof watch>>();
  private callbacks = new Set<WatchCallback>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private options: Required<WatcherOptions>;
  private isWatching = false;

  constructor(options: WatcherOptions = {}) {
    this.options = {
      debounce: options.debounce ?? 300,
      patterns: options.patterns ?? ['*.ts', '*.tsx', '*.js', '*.jsx', '*.json', '*.css'],
      recursive: options.recursive ?? true,
    };
  }

  /**
   * Start watching all artifact directories
   */
  async start(): Promise<void> {
    if (this.isWatching) return;
    this.isWatching = true;

    console.log('[ArtifactWatcher] Starting...');

    // Get all artifact directories
    try {
      const entries = await readdir(ARTIFACTS_DIR, { withFileTypes: true });
      const artifactDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

      for (const artifactId of artifactDirs) {
        await this.watchArtifact(artifactId);
      }

      console.log(`[ArtifactWatcher] Watching ${artifactDirs.length} artifacts`);
    } catch (err) {
      // Directory might not exist yet
      console.log('[ArtifactWatcher] Artifacts directory not found, will watch when created');
    }

    // Also watch the artifacts directory itself for new artifacts
    this.watchArtifactsRoot();
  }

  /**
   * Stop all watchers
   */
  stop(): void {
    if (!this.isWatching) return;
    this.isWatching = false;

    console.log('[ArtifactWatcher] Stopping...');

    for (const [id, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Watch a specific artifact directory
   */
  async watchArtifact(artifactId: string): Promise<void> {
    const artifactDir = join(ARTIFACTS_DIR, artifactId);

    // Skip if already watching
    if (this.watchers.has(artifactId)) return;

    try {
      const dirStat = await stat(artifactDir);
      if (!dirStat.isDirectory()) return;

      const watcher = watch(
        artifactDir,
        { recursive: this.options.recursive },
        (eventType, filename) => {
          if (filename && this.shouldWatch(filename)) {
            this.handleFileChange(artifactId, filename, eventType);
          }
        }
      );

      watcher.on('error', (err) => {
        console.error(`[ArtifactWatcher] Error watching ${artifactId}:`, err);
      });

      this.watchers.set(artifactId, watcher);
      console.log(`[ArtifactWatcher] Watching artifact: ${artifactId}`);
    } catch (err) {
      console.error(`[ArtifactWatcher] Failed to watch ${artifactId}:`, err);
    }
  }

  /**
   * Stop watching a specific artifact
   */
  unwatchArtifact(artifactId: string): void {
    const watcher = this.watchers.get(artifactId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(artifactId);
      console.log(`[ArtifactWatcher] Stopped watching: ${artifactId}`);
    }
  }

  /**
   * Register a callback for file changes
   */
  onchange(callback: WatchCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Check if file should be watched based on patterns
   */
  private shouldWatch(filename: string): boolean {
    // Skip hidden files and directories
    if (filename.startsWith('.')) return false;

    // Skip node_modules
    if (filename.includes('node_modules')) return false;

    // Check patterns
    if (this.options.patterns.length === 0) return true;

    return this.options.patterns.some(pattern => {
      if (pattern.startsWith('*')) {
        return filename.endsWith(pattern.slice(1));
      }
      return filename.includes(pattern);
    });
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(
    artifactId: string,
    filename: string,
    eventType: WatchEventType
  ): void {
    const key = `${artifactId}:${filename}`;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.processFileChange(artifactId, filename, eventType);
    }, this.options.debounce);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Process file change after debounce
   */
  private async processFileChange(
    artifactId: string,
    filename: string,
    eventType: WatchEventType
  ): Promise<void> {
    const filePath = join(ARTIFACTS_DIR, artifactId, filename);

    console.log(`[ArtifactWatcher] ${eventType}: ${artifactId}/${filename}`);

    // Invalidate caches
    const loader = getLoader();
    await loader.invalidateCache(artifactId);

    // Determine event type
    let type: WatchEvent['type'] = 'change';
    if (eventType === 'rename') {
      try {
        await stat(filePath);
        type = 'add';
      } catch {
        type = 'remove';
      }
    }

    // Create event
    const event: WatchEvent = {
      type,
      artifactId,
      filePath,
      timestamp: Date.now(),
    };

    // Notify callbacks
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (err) {
        console.error('[ArtifactWatcher] Callback error:', err);
      }
    }
  }

  /**
   * Watch the artifacts root directory for new artifacts
   */
  private watchArtifactsRoot(): void {
    try {
      const watcher = watch(ARTIFACTS_DIR, async (eventType, filename) => {
        if (!filename || filename.startsWith('.')) return;

        const artifactDir = join(ARTIFACTS_DIR, filename);

        try {
          const dirStat = await stat(artifactDir);
          if (dirStat.isDirectory()) {
            // New artifact directory - start watching
            if (!this.watchers.has(filename)) {
              await this.watchArtifact(filename);

              // Notify about new artifact
              for (const callback of this.callbacks) {
                callback({
                  type: 'add',
                  artifactId: filename,
                  filePath: artifactDir,
                  timestamp: Date.now(),
                });
              }
            }
          }
        } catch {
          // Directory was removed - stop watching
          if (this.watchers.has(filename)) {
            this.unwatchArtifact(filename);

            // Notify about removed artifact
            for (const callback of this.callbacks) {
              callback({
                type: 'remove',
                artifactId: filename,
                filePath: artifactDir,
                timestamp: Date.now(),
              });
            }
          }
        }
      });

      watcher.on('error', (err) => {
        console.error('[ArtifactWatcher] Error watching artifacts root:', err);
      });

      this.watchers.set('__root__', watcher);
    } catch (err) {
      console.error('[ArtifactWatcher] Failed to watch artifacts root:', err);
    }
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let watcherInstance: ArtifactWatcher | null = null;

/**
 * Get the singleton watcher instance
 */
export function getWatcher(): ArtifactWatcher {
  if (!watcherInstance) {
    watcherInstance = new ArtifactWatcher();
  }
  return watcherInstance;
}

/**
 * Start the artifact watcher
 */
export async function startWatcher(): Promise<ArtifactWatcher> {
  const watcher = getWatcher();
  await watcher.start();
  return watcher;
}

/**
 * Stop the artifact watcher
 */
export function stopWatcher(): void {
  if (watcherInstance) {
    watcherInstance.stop();
  }
}
