// =============================================================================
// REFERENCE RESOLVER
// =============================================================================
// Resolves reference patterns (wildcards, aliases) to actual file paths.
// Handles: !folder, !!folder, !!folder!!, !#N, {a|b|c}, $aliases

import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import type {
  ReferencePattern,
  ReferenceType,
  ResolvedReference,
  PathAliases,
} from '../../../mainview/types/image-gen';

// -----------------------------------------------------------------------------
// SUPPORTED EXTENSIONS
// -----------------------------------------------------------------------------

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif',
]);

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());
}

// -----------------------------------------------------------------------------
// PATH ALIAS EXPANSION
// -----------------------------------------------------------------------------

/**
 * Expand $alias references in a path.
 */
export function expandPath(inputPath: string, aliases: PathAliases): string {
  return inputPath.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
    const alias = aliases[name.toLowerCase()];
    return alias || match;
  });
}

// -----------------------------------------------------------------------------
// REFERENCE PATTERN PARSING
// -----------------------------------------------------------------------------

/**
 * Parse a reference string into a ReferencePattern.
 * Formats:
 *   - /path/to/file.jpg → explicit
 *   - !folder → random (one from folder)
 *   - !!folder → random-recursive (one from folder tree)
 *   - !!folder!! → all (all from folder)
 *   - !#N → random-global (N random from entire tree)
 *   - {a|b|c} → wildcard (pick one option)
 */
export function parseReferencePattern(input: string, aliases: PathAliases): ReferencePattern {
  const id = crypto.randomUUID();
  const expanded = expandPath(input.trim(), aliases);

  // !#N - Random global
  const globalMatch = expanded.match(/^!#(\d+)$/);
  if (globalMatch) {
    return {
      id,
      type: 'random-global',
      path: '',
      count: parseInt(globalMatch[1], 10),
    };
  }

  // !!folder!! - All from folder
  if (expanded.startsWith('!!') && expanded.endsWith('!!') && expanded.length > 4) {
    return {
      id,
      type: 'all',
      path: expanded.slice(2, -2),
    };
  }

  // !!folder - Random recursive
  if (expanded.startsWith('!!')) {
    return {
      id,
      type: 'random-recursive',
      path: expanded.slice(2),
    };
  }

  // !folder - Random from folder
  if (expanded.startsWith('!')) {
    return {
      id,
      type: 'random',
      path: expanded.slice(1),
    };
  }

  // {a|b|c} - Wildcard
  if (expanded.startsWith('{') && expanded.endsWith('}')) {
    return {
      id,
      type: 'wildcard',
      path: expanded,
    };
  }

  // Explicit path
  return {
    id,
    type: 'explicit',
    path: expanded,
  };
}

// -----------------------------------------------------------------------------
// FILE SCANNING
// -----------------------------------------------------------------------------

/**
 * Get all image files in a directory (non-recursive).
 */
async function getImagesInFolder(folderPath: string): Promise<string[]> {
  try {
    const entries = await readdir(folderPath, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && isImageFile(e.name))
      .map(e => join(folderPath, e.name));
  } catch {
    return [];
  }
}

/**
 * Get all image files in a directory tree (recursive).
 */
async function getImagesRecursive(folderPath: string): Promise<string[]> {
  const images: string[] = [];

  async function scan(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && isImageFile(entry.name)) {
          images.push(fullPath);
        }
      }
    } catch {
      // Ignore errors (permission issues, etc.)
    }
  }

  await scan(folderPath);
  return images;
}

/**
 * Get random items from an array.
 */
function getRandomItems<T>(items: T[], count: number): T[] {
  if (count >= items.length) {
    return [...items];
  }

  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// -----------------------------------------------------------------------------
// PATTERN RESOLUTION
// -----------------------------------------------------------------------------

/**
 * Resolve a reference pattern to actual file paths.
 */
export async function resolvePattern(
  pattern: ReferencePattern,
  globalRootPath?: string
): Promise<string[]> {
  switch (pattern.type) {
    case 'explicit': {
      // Verify file exists
      try {
        const stats = await stat(pattern.path);
        if (stats.isFile() && isImageFile(pattern.path)) {
          return [pattern.path];
        }
      } catch {
        // File doesn't exist
      }
      return [];
    }

    case 'random': {
      const images = await getImagesInFolder(pattern.path);
      if (images.length === 0) return [];
      return [images[Math.floor(Math.random() * images.length)]];
    }

    case 'random-recursive': {
      const images = await getImagesRecursive(pattern.path);
      if (images.length === 0) return [];
      return [images[Math.floor(Math.random() * images.length)]];
    }

    case 'all': {
      return getImagesInFolder(pattern.path);
    }

    case 'random-global': {
      if (!globalRootPath) return [];
      const images = await getImagesRecursive(globalRootPath);
      return getRandomItems(images, pattern.count || 1);
    }

    case 'wildcard': {
      // {a|b|c} - Pick one option
      const inner = pattern.path.slice(1, -1);
      const options = inner.split('|').map(s => s.trim());
      if (options.length === 0) return [];
      const selected = options[Math.floor(Math.random() * options.length)];
      // The selected value might be a path - try to resolve it
      try {
        const stats = await stat(selected);
        if (stats.isFile() && isImageFile(selected)) {
          return [selected];
        }
      } catch {
        // Not a valid path
      }
      return [];
    }

    default:
      return [];
  }
}

/**
 * Resolve multiple reference patterns.
 */
export async function resolvePatterns(
  patterns: ReferencePattern[],
  globalRootPath?: string
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  await Promise.all(
    patterns.map(async pattern => {
      const resolved = await resolvePattern(pattern, globalRootPath);
      results.set(pattern.id, resolved);
    })
  );

  return results;
}

// -----------------------------------------------------------------------------
// FOLDER BROWSER
// -----------------------------------------------------------------------------

export interface FolderNode {
  name: string;
  path: string;
  isAlias: boolean;
  aliasName?: string;
  hasChildren: boolean;
}

export interface FolderContents {
  path: string;
  folders: FolderNode[];
  images: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  totalImages: number;
}

/**
 * Get root folders (aliases as shortcuts).
 */
export function getRoots(aliases: PathAliases): FolderNode[] {
  const roots: FolderNode[] = [];

  for (const [name, path] of Object.entries(aliases)) {
    roots.push({
      name: `$${name}`,
      path,
      isAlias: true,
      aliasName: name,
      hasChildren: true, // Assume aliases point to directories
    });
  }

  return roots;
}

/**
 * Get contents of a folder.
 */
export async function getFolderContents(folderPath: string): Promise<FolderContents> {
  const folders: FolderNode[] = [];
  const images: Array<{ name: string; path: string; size: number }> = [];

  try {
    const entries = await readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(folderPath, entry.name);

      if (entry.isDirectory()) {
        // Check if folder has children
        const subEntries = await readdir(fullPath, { withFileTypes: true }).catch(() => []);
        const hasChildren = subEntries.some(e => e.isDirectory() || (e.isFile() && isImageFile(e.name)));

        folders.push({
          name: entry.name,
          path: fullPath,
          isAlias: false,
          hasChildren,
        });
      } else if (entry.isFile() && isImageFile(entry.name)) {
        const stats = await stat(fullPath);
        images.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
        });
      }
    }
  } catch {
    // Permission error or folder doesn't exist
  }

  // Sort folders and images alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name));
  images.sort((a, b) => a.name.localeCompare(b.name));

  return {
    path: folderPath,
    folders,
    images,
    totalImages: images.length,
  };
}

/**
 * Get folder stats (recursive count).
 */
export async function getFolderStats(folderPath: string): Promise<{
  totalImages: number;
  totalSize: number;
  deepestLevel: number;
}> {
  let totalImages = 0;
  let totalSize = 0;
  let deepestLevel = 0;

  async function scan(dir: string, level: number): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, level + 1);
        } else if (entry.isFile() && isImageFile(entry.name)) {
          totalImages++;
          const stats = await stat(fullPath);
          totalSize += stats.size;
          deepestLevel = Math.max(deepestLevel, level);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  await scan(folderPath, 0);

  return { totalImages, totalSize, deepestLevel };
}

// -----------------------------------------------------------------------------
// CACHE
// -----------------------------------------------------------------------------

// Simple in-memory cache for folder scans
const folderCache = new Map<string, { images: string[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get cached images for folder (recursive), or scan if not cached.
 */
export async function getCachedFolderImages(
  folderPath: string,
  recursive: boolean = false
): Promise<string[]> {
  const cacheKey = `${folderPath}:${recursive}`;
  const cached = folderCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.images;
  }

  const images = recursive
    ? await getImagesRecursive(folderPath)
    : await getImagesInFolder(folderPath);

  folderCache.set(cacheKey, { images, timestamp: Date.now() });
  return images;
}

/**
 * Invalidate cache for a folder.
 */
export function invalidateFolderCache(folderPath: string): void {
  for (const key of folderCache.keys()) {
    if (key.startsWith(folderPath)) {
      folderCache.delete(key);
    }
  }
}

/**
 * Clear entire cache.
 */
export function clearFolderCache(): void {
  folderCache.clear();
}
