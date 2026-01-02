// =============================================================================
// ARTIFACT REGISTRY
// =============================================================================
// Manages artifact lifecycle: install, uninstall, update, enable/disable.
// Stores artifacts on disk at ~/.yaai/artifacts/{artifact-id}/

import { readdir, readFile, writeFile, rm, watch } from 'fs/promises';
import { join } from 'path';
import { EventEmitter } from 'events';
import type {
  ArtifactManifest,
  ArtifactFiles,
  ArtifactQuery,
  ArtifactRegistry as IArtifactRegistry,
  ArtifactRegistryEvent,
} from '../../mainview/types';
import {
  ARTIFACTS_DIR,
  getArtifactDir,
  getArtifactManifestPath,
  ensureArtifactDir,
} from './paths';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface RegistryState {
  manifests: Map<string, ArtifactManifest>;
  loading: boolean;
  initialized: boolean;
}

type EventHandler = (manifest: ArtifactManifest) => void;

// -----------------------------------------------------------------------------
// IMPLEMENTATION
// -----------------------------------------------------------------------------

export class ArtifactRegistry implements IArtifactRegistry {
  private state: RegistryState = {
    manifests: new Map(),
    loading: false,
    initialized: false,
  };

  private events = new EventEmitter();
  private watcher: AsyncIterable<{ eventType: string; filename: string }> | null = null;
  private watcherAbort: AbortController | null = null;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize the registry by loading all manifests from disk
   */
  async initialize(): Promise<void> {
    if (this.state.initialized) return;

    this.state.loading = true;

    try {
      // Ensure artifacts directory exists
      const { mkdir } = await import('fs/promises');
      await mkdir(ARTIFACTS_DIR, { recursive: true });

      // Load all artifact manifests
      await this.loadAllManifests();

      this.state.initialized = true;
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Load all manifests from the artifacts directory
   */
  private async loadAllManifests(): Promise<void> {
    try {
      const entries = await readdir(ARTIFACTS_DIR, { withFileTypes: true });

      const loadPromises = entries
        .filter(entry => entry.isDirectory())
        .map(async entry => {
          try {
            const manifest = await this.loadManifest(entry.name);
            if (manifest) {
              this.state.manifests.set(manifest.id, manifest);
            }
          } catch (err) {
            console.error(`Failed to load artifact ${entry.name}:`, err);
          }
        });

      await Promise.all(loadPromises);
    } catch (err) {
      // Directory might not exist yet
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Load a single manifest from disk
   */
  private async loadManifest(artifactId: string): Promise<ArtifactManifest | null> {
    const manifestPath = getArtifactManifestPath(artifactId);

    try {
      const content = await readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as ArtifactManifest;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // DISCOVERY
  // ---------------------------------------------------------------------------

  /**
   * List artifacts matching the query
   */
  async list(query?: ArtifactQuery): Promise<ArtifactManifest[]> {
    await this.ensureInitialized();

    let manifests = Array.from(this.state.manifests.values());

    if (query) {
      // Filter by type
      if (query.type) {
        manifests = manifests.filter(m => m.type === query.type);
      }

      // Filter by tags
      if (query.tags && query.tags.length > 0) {
        manifests = manifests.filter(m =>
          query.tags!.some(tag => m.tags?.includes(tag))
        );
      }

      // Filter by enabled status
      if (query.enabled !== undefined) {
        manifests = manifests.filter(m => (m.enabled ?? true) === query.enabled);
      }

      // Filter by origin
      if (query.origin) {
        manifests = manifests.filter(m => m.createdBy.type === query.origin);
      }

      // Search by name/description
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        manifests = manifests.filter(m =>
          m.name.toLowerCase().includes(searchLower) ||
          m.description.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      if (query.offset) {
        manifests = manifests.slice(query.offset);
      }
      if (query.limit) {
        manifests = manifests.slice(0, query.limit);
      }
    }

    // Sort by updatedAt (most recent first)
    manifests.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return manifests;
  }

  /**
   * Get a single artifact by ID
   */
  async get(id: string): Promise<ArtifactManifest | null> {
    await this.ensureInitialized();
    return this.state.manifests.get(id) ?? null;
  }

  /**
   * Check if an artifact exists
   */
  async exists(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.state.manifests.has(id);
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Install a new artifact
   */
  async install(manifest: ArtifactManifest, files: ArtifactFiles): Promise<void> {
    await this.ensureInitialized();

    // Validate ID format (slug)
    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error(`Invalid artifact ID: ${manifest.id}. Must be lowercase alphanumeric with hyphens.`);
    }

    // Check for existing
    if (this.state.manifests.has(manifest.id)) {
      throw new Error(`Artifact ${manifest.id} already exists. Use update() instead.`);
    }

    // Create directory structure
    const artifactDir = await ensureArtifactDir(manifest.id);

    // Write files
    await this.writeArtifactFiles(artifactDir, manifest, files);

    // Update state
    this.state.manifests.set(manifest.id, manifest);

    // Emit event
    this.events.emit('installed', manifest);
  }

  /**
   * Uninstall an artifact
   */
  async uninstall(id: string): Promise<void> {
    await this.ensureInitialized();

    const manifest = this.state.manifests.get(id);
    if (!manifest) {
      throw new Error(`Artifact ${id} not found`);
    }

    // Remove directory
    const artifactDir = getArtifactDir(id);
    await rm(artifactDir, { recursive: true, force: true });

    // Update state
    this.state.manifests.delete(id);

    // Emit event
    this.events.emit('uninstalled', manifest);
  }

  /**
   * Update an existing artifact
   */
  async update(
    id: string,
    manifestUpdate: Partial<ArtifactManifest>,
    files?: Partial<ArtifactFiles>
  ): Promise<void> {
    await this.ensureInitialized();

    const existing = this.state.manifests.get(id);
    if (!existing) {
      throw new Error(`Artifact ${id} not found`);
    }

    // Merge manifest
    const updatedManifest: ArtifactManifest = {
      ...existing,
      ...manifestUpdate,
      updatedAt: new Date().toISOString(),
    };

    const artifactDir = getArtifactDir(id);

    // Write updated manifest
    await writeFile(
      getArtifactManifestPath(id),
      JSON.stringify(updatedManifest, null, 2)
    );

    // Write updated files if provided
    if (files) {
      if (files.handler) {
        await writeFile(
          join(artifactDir, updatedManifest.entry),
          files.handler
        );
      }
      if (files.ui && updatedManifest.ui) {
        await writeFile(
          join(artifactDir, updatedManifest.ui),
          files.ui
        );
      }
      if (files.schema) {
        await writeFile(
          join(artifactDir, 'schema.ts'),
          files.schema
        );
      }
    }

    // Update state
    this.state.manifests.set(id, updatedManifest);

    // Emit event
    this.events.emit('updated', updatedManifest);
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Enable an artifact
   */
  async enable(id: string): Promise<void> {
    await this.update(id, { enabled: true });
    const manifest = this.state.manifests.get(id)!;
    this.events.emit('enabled', manifest);
  }

  /**
   * Disable an artifact
   */
  async disable(id: string): Promise<void> {
    await this.update(id, { enabled: false });
    const manifest = this.state.manifests.get(id)!;
    this.events.emit('disabled', manifest);
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to registry events
   */
  on(event: ArtifactRegistryEvent, handler: EventHandler): () => void {
    this.events.on(event, handler);
    return () => this.events.off(event, handler);
  }

  // ---------------------------------------------------------------------------
  // FILE WATCHING
  // ---------------------------------------------------------------------------

  /**
   * Start watching for file changes (for hot reload)
   */
  async startWatching(): Promise<void> {
    if (this.watcher) return;

    this.watcherAbort = new AbortController();

    try {
      // Note: Bun's watch is slightly different, this is Node-style
      // In Bun, we might use Bun.file().watch() or similar
      const watcher = watch(ARTIFACTS_DIR, {
        recursive: true,
        signal: this.watcherAbort.signal,
      });

      // Process changes
      (async () => {
        try {
          for await (const event of watcher) {
            await this.handleFileChange(event);
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Watcher error:', err);
          }
        }
      })();
    } catch (err) {
      console.error('Failed to start watcher:', err);
    }
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watcherAbort) {
      this.watcherAbort.abort();
      this.watcherAbort = null;
    }
  }

  /**
   * Handle a file change event
   */
  private async handleFileChange(event: { eventType: string; filename: string | null }): Promise<void> {
    if (!event.filename) return;

    // Skip hidden files and node_modules
    if (event.filename.includes('node_modules') || event.filename.startsWith('.')) {
      return;
    }

    // Extract artifact ID from path
    const parts = event.filename.split('/');
    if (parts.length < 1) return;

    const artifactId = parts[0];

    // Check if artifact exists
    if (!this.state.manifests.has(artifactId)) return;

    console.log(`[Registry] File changed: ${artifactId}/${event.filename}`);

    // Reload manifest if it changed
    if (event.filename.endsWith('manifest.json')) {
      const manifest = await this.loadManifest(artifactId);
      if (manifest) {
        this.state.manifests.set(artifactId, manifest);
        this.events.emit('updated', manifest);
      }
    }

    // Invalidate loader cache for code file changes
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
    if (codeExtensions.some(ext => event.filename!.endsWith(ext))) {
      // Get loader and invalidate cache
      const { getLoader } = await import('./artifact-loader');
      const loader = getLoader();
      await loader.invalidateCache(artifactId);

      // Emit file-changed event for UI updates
      const manifest = this.state.manifests.get(artifactId);
      if (manifest) {
        this.events.emit('file-changed', { artifactId, filename: event.filename });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Ensure registry is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.state.initialized) {
      await this.initialize();
    }
  }

  /**
   * Write artifact files to disk
   */
  private async writeArtifactFiles(
    dir: string,
    manifest: ArtifactManifest,
    files: ArtifactFiles
  ): Promise<void> {
    // Write manifest
    await writeFile(
      join(dir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Write handler
    await writeFile(
      join(dir, manifest.entry),
      files.handler
    );

    // Write UI component if present
    if (files.ui && manifest.ui) {
      await writeFile(
        join(dir, manifest.ui),
        files.ui
      );
    }

    // Write schema if present
    if (files.schema) {
      await writeFile(
        join(dir, 'schema.ts'),
        files.schema
      );
    }

    // Write assets if present
    if (files.assets) {
      const assetsDir = join(dir, 'assets');
      const { mkdir } = await import('fs/promises');
      await mkdir(assetsDir, { recursive: true });

      for (const [name, content] of Object.entries(files.assets)) {
        const assetPath = join(assetsDir, name);
        if (typeof content === 'string') {
          await writeFile(assetPath, content);
        } else {
          await writeFile(assetPath, Buffer.from(content));
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  /**
   * Get count of artifacts by type
   */
  async getStats(): Promise<Record<string, number>> {
    await this.ensureInitialized();

    const stats: Record<string, number> = {
      total: this.state.manifests.size,
      tool: 0,
      view: 0,
      service: 0,
      prompt: 0,
      enabled: 0,
      disabled: 0,
    };

    for (const manifest of this.state.manifests.values()) {
      stats[manifest.type]++;
      if (manifest.enabled === false) {
        stats.disabled++;
      } else {
        stats.enabled++;
      }
    }

    return stats;
  }

  /**
   * Get all artifact IDs
   */
  async getIds(): Promise<string[]> {
    await this.ensureInitialized();
    return Array.from(this.state.manifests.keys());
  }

  /**
   * Reload a specific artifact from disk
   */
  async reload(id: string): Promise<ArtifactManifest | null> {
    const manifest = await this.loadManifest(id);
    if (manifest) {
      this.state.manifests.set(id, manifest);
    } else {
      this.state.manifests.delete(id);
    }
    return manifest;
  }

  /**
   * Reload all artifacts from disk
   */
  async reloadAll(): Promise<void> {
    this.state.manifests.clear();
    await this.loadAllManifests();
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let registryInstance: ArtifactRegistry | null = null;

/**
 * Get the singleton registry instance
 */
export function getRegistry(): ArtifactRegistry {
  if (!registryInstance) {
    registryInstance = new ArtifactRegistry();
  }
  return registryInstance;
}
