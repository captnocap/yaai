// =============================================================================
// UI BUNDLER
// =============================================================================
// Compiles artifact UI components (React/TSX) into browser-ready JavaScript
// using Bun.build for sandboxed iframe rendering.

import { join, dirname } from 'path';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import { CACHE_DIR } from './paths';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface BundleOptions {
  /** Entry point file path */
  entryPoint: string;

  /** Artifact ID for caching */
  artifactId: string;

  /** Skip cache and rebuild */
  forceRebuild?: boolean;

  /** Enable minification */
  minify?: boolean;

  /** Enable source maps */
  sourceMaps?: boolean;
}

export interface BundleResult {
  /** Compiled JavaScript code */
  code: string;

  /** Whether the result was from cache */
  fromCache: boolean;

  /** Bundle size in bytes */
  size: number;

  /** Build duration in ms */
  duration: number;
}

// -----------------------------------------------------------------------------
// BUNDLER
// -----------------------------------------------------------------------------

const UI_CACHE_DIR = join(CACHE_DIR, 'ui-bundles');

/**
 * Bundle an artifact UI component
 */
export async function bundleUIComponent(options: BundleOptions): Promise<BundleResult> {
  const startTime = Date.now();
  const { entryPoint, artifactId, forceRebuild = false, minify = true, sourceMaps = false } = options;

  // Cache paths
  const cacheKey = `${artifactId}-${hashPath(entryPoint)}`;
  const cachePath = join(UI_CACHE_DIR, `${cacheKey}.js`);
  const metaPath = join(UI_CACHE_DIR, `${cacheKey}.meta.json`);

  // Check cache
  if (!forceRebuild) {
    try {
      const [cachedCode, metaJson] = await Promise.all([
        readFile(cachePath, 'utf-8'),
        readFile(metaPath, 'utf-8'),
      ]);

      const meta = JSON.parse(metaJson);
      const sourceStats = await Bun.file(entryPoint).stat();

      // Validate cache - check if source is newer
      if (sourceStats.mtime.getTime() <= meta.sourceModified) {
        return {
          code: cachedCode,
          fromCache: true,
          size: cachedCode.length,
          duration: Date.now() - startTime,
        };
      }
    } catch {
      // Cache miss or invalid, proceed with build
    }
  }

  // Ensure cache directory exists
  await mkdir(UI_CACHE_DIR, { recursive: true });

  // Build with Bun
  const buildResult = await Bun.build({
    entrypoints: [entryPoint],
    target: 'browser',
    format: 'iife',
    minify,
    sourcemap: sourceMaps ? 'inline' : 'none',

    // Externalize React - will be provided by the iframe environment
    external: ['react', 'react-dom', 'react-dom/client'],

    // Define globals for the IIFE
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },

    // Naming convention for output
    naming: {
      entry: '[name].js',
    },
  });

  if (!buildResult.success) {
    const errors = buildResult.logs
      .filter(log => log.level === 'error')
      .map(log => log.message)
      .join('\n');
    throw new Error(`Build failed: ${errors}`);
  }

  // Get the output
  const output = buildResult.outputs[0];
  const code = await output.text();

  // Wrap the code to export the default component
  const wrappedCode = wrapComponentCode(code, artifactId);

  // Cache the result
  const sourceStats = await Bun.file(entryPoint).stat();
  await Promise.all([
    writeFile(cachePath, wrappedCode),
    writeFile(metaPath, JSON.stringify({
      artifactId,
      entryPoint,
      sourceModified: sourceStats.mtime.getTime(),
      builtAt: Date.now(),
      size: wrappedCode.length,
    })),
  ]);

  return {
    code: wrappedCode,
    fromCache: false,
    size: wrappedCode.length,
    duration: Date.now() - startTime,
  };
}

/**
 * Wrap the bundled code to make the component accessible
 * The iframe environment expects: window.ArtifactComponent = <React.FC>
 */
function wrapComponentCode(code: string, artifactId: string): string {
  // The IIFE format from Bun.build should return the module exports
  // We need to extract the default export and assign it to window
  return `
(function() {
  // Provide React globals from parent
  const React = window.React;
  const ReactDOM = window.ReactDOM;

  // Module scope
  const module = { exports: {} };
  const exports = module.exports;

  // Define require for externals
  function require(id) {
    switch(id) {
      case 'react': return React;
      case 'react-dom': return ReactDOM;
      case 'react-dom/client': return ReactDOM;
      default: throw new Error('Unknown module: ' + id);
    }
  }

  // Execute bundle
  try {
    ${code}

    // Extract default export
    if (module.exports.default) {
      window.ArtifactComponent = module.exports.default;
    } else if (typeof module.exports === 'function') {
      window.ArtifactComponent = module.exports;
    } else {
      // Find first function export
      for (const key in module.exports) {
        if (typeof module.exports[key] === 'function') {
          window.ArtifactComponent = module.exports[key];
          break;
        }
      }
    }

    // Signal ready
    window.dispatchEvent(new CustomEvent('artifact-component-ready', {
      detail: { artifactId: '${artifactId}' }
    }));
  } catch (error) {
    console.error('Failed to load artifact component:', error);
    window.dispatchEvent(new CustomEvent('artifact-component-error', {
      detail: { artifactId: '${artifactId}', error: error.message }
    }));
  }
})();
`;
}

/**
 * Invalidate cache for an artifact
 */
export async function invalidateUICache(artifactId: string): Promise<void> {
  try {
    const files = await Bun.file(UI_CACHE_DIR).text().catch(() => '');
    // Remove all cache files for this artifact
    const dir = await import('fs/promises').then(fs => fs.readdir(UI_CACHE_DIR).catch(() => []));
    for (const file of dir) {
      if (file.startsWith(`${artifactId}-`)) {
        await rm(join(UI_CACHE_DIR, file)).catch(() => {});
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all UI cache
 */
export async function clearUICache(): Promise<void> {
  try {
    await rm(UI_CACHE_DIR, { recursive: true, force: true });
    await mkdir(UI_CACHE_DIR, { recursive: true });
  } catch {
    // Ignore errors
  }
}

/**
 * Get cache statistics
 */
export async function getUICacheStats(): Promise<{
  totalSize: number;
  entryCount: number;
  entries: Array<{ artifactId: string; size: number; builtAt: number }>;
}> {
  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(UI_CACHE_DIR);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));

    let totalSize = 0;
    const entries: Array<{ artifactId: string; size: number; builtAt: number }> = [];

    for (const metaFile of metaFiles) {
      const meta = JSON.parse(await readFile(join(UI_CACHE_DIR, metaFile), 'utf-8'));
      totalSize += meta.size || 0;
      entries.push({
        artifactId: meta.artifactId,
        size: meta.size || 0,
        builtAt: meta.builtAt || 0,
      });
    }

    return {
      totalSize,
      entryCount: entries.length,
      entries,
    };
  } catch {
    return { totalSize: 0, entryCount: 0, entries: [] };
  }
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function hashPath(path: string): string {
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
