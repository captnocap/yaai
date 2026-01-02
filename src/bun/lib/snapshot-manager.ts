// =============================================================================
// SNAPSHOT MANAGER
// =============================================================================
// Git-style content-addressed storage for file snapshots.
// Objects stored by SHA-256 hash, enabling deduplication across restore points.

import { createHash } from 'crypto';
import { readFile, writeFile, readdir, stat, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import {
  SNAPSHOTS_OBJECTS_DIR,
  SNAPSHOTS_MANIFESTS_DIR,
  getSnapshotObjectPath,
  getSnapshotManifestPath,
} from './paths';

import type {
  RestorePoint,
  RestorePointFile,
  RestoreOptions,
  RestoreResult,
} from '../../mainview/types/snapshot';

// -----------------------------------------------------------------------------
// SNAPSHOT MANAGER
// -----------------------------------------------------------------------------

export class SnapshotManager {
  /**
   * Initialize snapshot directories
   */
  async initialize(): Promise<void> {
    await mkdir(SNAPSHOTS_OBJECTS_DIR, { recursive: true });
    await mkdir(SNAPSHOTS_MANIFESTS_DIR, { recursive: true });
  }

  // ---------------------------------------------------------------------------
  // OBJECT STORAGE (Content-Addressed)
  // ---------------------------------------------------------------------------

  /**
   * Store content and return its hash
   * Content-addressed: same content = same hash = stored once
   */
  async storeObject(content: Buffer): Promise<string> {
    const hash = this.computeHash(content);
    const path = getSnapshotObjectPath(hash);

    // Only write if not already stored (deduplication)
    if (!existsSync(path)) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }

    return hash;
  }

  /**
   * Check if an object exists
   */
  async hasObject(hash: string): Promise<boolean> {
    const path = getSnapshotObjectPath(hash);
    return existsSync(path);
  }

  /**
   * Retrieve object content by hash
   */
  async getObject(hash: string): Promise<Buffer | null> {
    const path = getSnapshotObjectPath(hash);
    if (!existsSync(path)) return null;

    try {
      return await readFile(path);
    } catch {
      return null;
    }
  }

  /**
   * Compute SHA-256 hash of content
   */
  private computeHash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // ---------------------------------------------------------------------------
  // RESTORE POINT OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a restore point for multiple files
   */
  async createRestorePoint(
    sessionId: string,
    description: string,
    files: { path: string; content: Buffer }[],
    transcriptEntryId: string
  ): Promise<RestorePoint> {
    const id = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Store all file contents and build manifest
    const restoreFiles: RestorePointFile[] = [];
    let totalSize = 0;

    for (const file of files) {
      const hash = await this.storeObject(file.content);
      const stats = { size: file.content.length, mode: 0o644 }; // Default mode

      restoreFiles.push({
        path: file.path,
        hash,
        mode: stats.mode,
        size: stats.size,
      });

      totalSize += stats.size;
    }

    const restorePoint: RestorePoint = {
      id,
      sessionId,
      description,
      timestamp,
      files: restoreFiles,
      transcriptEntryId,
      totalSize,
      fileCount: restoreFiles.length,
    };

    // Save manifest
    const manifestPath = getSnapshotManifestPath(id);
    await writeFile(manifestPath, JSON.stringify(restorePoint, null, 2));

    return restorePoint;
  }

  /**
   * Create restore point from files on disk
   */
  async createRestorePointFromDisk(
    sessionId: string,
    description: string,
    filePaths: string[],
    projectRoot: string,
    transcriptEntryId: string
  ): Promise<RestorePoint> {
    const files: { path: string; content: Buffer }[] = [];

    for (const filePath of filePaths) {
      const fullPath = join(projectRoot, filePath);
      if (existsSync(fullPath)) {
        try {
          const content = await readFile(fullPath);
          files.push({
            path: filePath,
            content,
          });
        } catch {
          // Skip files we can't read
        }
      }
    }

    return this.createRestorePoint(sessionId, description, files, transcriptEntryId);
  }

  /**
   * Get a restore point by ID
   */
  async getRestorePoint(id: string): Promise<RestorePoint | null> {
    const path = getSnapshotManifestPath(id);
    if (!existsSync(path)) return null;

    try {
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * List all restore points for a session
   */
  async listRestorePoints(sessionId: string): Promise<RestorePoint[]> {
    if (!existsSync(SNAPSHOTS_MANIFESTS_DIR)) return [];

    try {
      const entries = await readdir(SNAPSHOTS_MANIFESTS_DIR);
      const restorePoints: RestorePoint[] = [];

      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const id = entry.replace('.json', '');
          const rp = await this.getRestorePoint(id);
          if (rp && rp.sessionId === sessionId) {
            restorePoints.push(rp);
          }
        }
      }

      // Sort by timestamp (newest first)
      return restorePoints.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Restore files from a restore point
   */
  async restore(
    restorePointId: string,
    targetDir: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const restorePoint = await this.getRestorePoint(restorePointId);
    if (!restorePoint) {
      return {
        success: false,
        restoredFiles: [],
        skippedFiles: [],
        error: 'Restore point not found',
      };
    }

    const restoredFiles: string[] = [];
    const skippedFiles: string[] = [];
    let backupId: string | undefined;

    // Filter files if specific ones requested
    let filesToRestore = restorePoint.files;
    if (options.files && options.files.length > 0) {
      const fileSet = new Set(options.files);
      filesToRestore = restorePoint.files.filter(f => fileSet.has(f.path));
    }

    // Create backup if requested
    if (options.backup) {
      const backupFiles: { path: string; content: Buffer }[] = [];
      for (const file of filesToRestore) {
        const fullPath = join(targetDir, file.path);
        if (existsSync(fullPath)) {
          try {
            const content = await readFile(fullPath);
            backupFiles.push({ path: file.path, content });
          } catch {
            // Skip
          }
        }
      }
      if (backupFiles.length > 0) {
        const backup = await this.createRestorePoint(
          restorePoint.sessionId,
          `Backup before restoring ${restorePointId}`,
          backupFiles,
          restorePoint.transcriptEntryId
        );
        backupId = backup.id;
      }
    }

    // Restore each file
    for (const file of filesToRestore) {
      try {
        const content = await this.getObject(file.hash);
        if (!content) {
          skippedFiles.push(file.path);
          continue;
        }

        if (!options.dryRun) {
          const fullPath = join(targetDir, file.path);
          await mkdir(dirname(fullPath), { recursive: true });
          await writeFile(fullPath, content, { mode: file.mode });
        }

        restoredFiles.push(file.path);
      } catch {
        skippedFiles.push(file.path);
      }
    }

    return {
      success: true,
      restoredFiles,
      skippedFiles,
      backupId,
    };
  }

  /**
   * Delete a restore point (manifest only, objects may be shared)
   */
  async deleteRestorePoint(id: string): Promise<boolean> {
    const path = getSnapshotManifestPath(id);
    if (!existsSync(path)) return false;

    try {
      await rm(path);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // DIFF OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get file content at a restore point
   */
  async getFileAtRestorePoint(restorePointId: string, filePath: string): Promise<Buffer | null> {
    const rp = await this.getRestorePoint(restorePointId);
    if (!rp) return null;

    const file = rp.files.find(f => f.path === filePath);
    if (!file) return null;

    return this.getObject(file.hash);
  }

  /**
   * Compare two restore points
   */
  async compareRestorePoints(
    rpId1: string,
    rpId2: string
  ): Promise<{ added: string[]; removed: string[]; modified: string[] }> {
    const rp1 = await this.getRestorePoint(rpId1);
    const rp2 = await this.getRestorePoint(rpId2);

    if (!rp1 || !rp2) {
      return { added: [], removed: [], modified: [] };
    }

    const files1 = new Map(rp1.files.map(f => [f.path, f.hash]));
    const files2 = new Map(rp2.files.map(f => [f.path, f.hash]));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Files in rp2 but not in rp1
    for (const [path, hash] of files2) {
      if (!files1.has(path)) {
        added.push(path);
      } else if (files1.get(path) !== hash) {
        modified.push(path);
      }
    }

    // Files in rp1 but not in rp2
    for (const path of files1.keys()) {
      if (!files2.has(path)) {
        removed.push(path);
      }
    }

    return { added, removed, modified };
  }

  // ---------------------------------------------------------------------------
  // GARBAGE COLLECTION
  // ---------------------------------------------------------------------------

  /**
   * Remove orphaned objects (not referenced by any manifest)
   */
  async gc(): Promise<{ removed: number; freedBytes: number }> {
    // Get all hashes referenced by manifests
    const referencedHashes = new Set<string>();

    if (existsSync(SNAPSHOTS_MANIFESTS_DIR)) {
      const manifests = await readdir(SNAPSHOTS_MANIFESTS_DIR);
      for (const manifest of manifests) {
        if (manifest.endsWith('.json')) {
          const id = manifest.replace('.json', '');
          const rp = await this.getRestorePoint(id);
          if (rp) {
            for (const file of rp.files) {
              referencedHashes.add(file.hash);
            }
          }
        }
      }
    }

    // Scan objects directory and remove unreferenced
    let removed = 0;
    let freedBytes = 0;

    if (existsSync(SNAPSHOTS_OBJECTS_DIR)) {
      const prefixes = await readdir(SNAPSHOTS_OBJECTS_DIR);
      for (const prefix of prefixes) {
        const prefixDir = join(SNAPSHOTS_OBJECTS_DIR, prefix);
        const stats = await stat(prefixDir);
        if (stats.isDirectory()) {
          const objects = await readdir(prefixDir);
          for (const hash of objects) {
            if (!referencedHashes.has(hash)) {
              const objPath = join(prefixDir, hash);
              const objStats = await stat(objPath);
              freedBytes += objStats.size;
              await rm(objPath);
              removed++;
            }
          }
        }
      }
    }

    return { removed, freedBytes };
  }

  /**
   * Delete restore points older than a date
   */
  async deleteOlderThan(olderThan: Date, sessionId?: string): Promise<number> {
    let deleted = 0;

    if (existsSync(SNAPSHOTS_MANIFESTS_DIR)) {
      const manifests = await readdir(SNAPSHOTS_MANIFESTS_DIR);
      for (const manifest of manifests) {
        if (manifest.endsWith('.json')) {
          const id = manifest.replace('.json', '');
          const rp = await this.getRestorePoint(id);
          if (rp) {
            const rpDate = new Date(rp.timestamp);
            const matchesSession = !sessionId || rp.sessionId === sessionId;
            if (rpDate < olderThan && matchesSession) {
              await this.deleteRestorePoint(id);
              deleted++;
            }
          }
        }
      }
    }

    return deleted;
  }
}

// -----------------------------------------------------------------------------
// SINGLETON INSTANCE
// -----------------------------------------------------------------------------

export const snapshotManager = new SnapshotManager();
