// =============================================================================
// PATHS
// =============================================================================
// Path constants and utilities for the application data directory.

import { homedir } from 'os'
import { join } from 'path'
import { mkdir } from 'fs/promises'

const DATA_ROOT = join(homedir(), '.yaai')

export const paths = {
  // Root
  root: DATA_ROOT,

  // Databases
  db: {
    root: join(DATA_ROOT, 'db'),
    chat: join(DATA_ROOT, 'db', 'chat.sqlite'),
    code: join(DATA_ROOT, 'db', 'code.sqlite'),
    imagegen: join(DATA_ROOT, 'db', 'imagegen.sqlite'),
    app: join(DATA_ROOT, 'db', 'app.sqlite')
  },

  // Artifacts
  artifacts: {
    root: join(DATA_ROOT, 'artifacts'),
    byId: (id: string) => join(DATA_ROOT, 'artifacts', id),
    manifest: (id: string) => join(DATA_ROOT, 'artifacts', id, 'manifest.json'),
    handler: (id: string) => join(DATA_ROOT, 'artifacts', id, 'handler.ts'),
    ui: (id: string) => join(DATA_ROOT, 'artifacts', id, 'ui'),
    storage: (id: string) => join(DATA_ROOT, 'artifacts', id, '.storage')
  },

  // Snapshots (content-addressed storage)
  snapshots: {
    root: join(DATA_ROOT, 'snapshots'),
    objects: join(DATA_ROOT, 'snapshots', 'objects'),
    manifests: join(DATA_ROOT, 'snapshots', 'manifests'),
    object: (hash: string) => join(DATA_ROOT, 'snapshots', 'objects', hash.slice(0, 2), hash)
  },

  // Image generation
  imageGen: {
    root: join(DATA_ROOT, 'image-gen'),
    outputs: join(DATA_ROOT, 'image-gen', 'outputs'),
    references: join(DATA_ROOT, 'image-gen', 'references'),
    prompts: join(DATA_ROOT, 'image-gen', 'prompts'),
    thumbnails: join(DATA_ROOT, 'image-gen', 'thumbnails'),
    output: (filename: string) => join(DATA_ROOT, 'image-gen', 'outputs', filename),
    reference: (filename: string) => join(DATA_ROOT, 'image-gen', 'references', filename),
    prompt: (name: string) => join(DATA_ROOT, 'image-gen', 'prompts', `${name}.txt`),
    thumbnail: (hash: string) => join(DATA_ROOT, 'image-gen', 'thumbnails', `${hash}.jpg`)
  },

  // Cache
  cache: {
    root: join(DATA_ROOT, 'cache'),
    uiBundles: join(DATA_ROOT, 'cache', 'ui-bundles'),
    uiBundle: (artifactId: string) => join(DATA_ROOT, 'cache', 'ui-bundles', `${artifactId}.js`)
  },

  // Logs
  logs: {
    root: join(DATA_ROOT, 'logs'),
    file: (filename: string) => join(DATA_ROOT, 'logs', filename)
  },

  // Temp
  temp: {
    root: join(DATA_ROOT, 'temp'),
    file: (filename: string) => join(DATA_ROOT, 'temp', filename)
  },

  // Secrets (encryption keys, sensitive config)
  secrets: {
    root: join(DATA_ROOT, 'secrets'),
    encryptionKey: join(DATA_ROOT, 'secrets', 'encryption.key')
  }
} as const

// -----------------------------------------------------------------------------
// Directory Initialization
// -----------------------------------------------------------------------------

/**
 * Ensure all required directories exist.
 * Called once at application startup.
 */
export async function initializeDirectories(): Promise<void> {
  const dirs = [
    paths.db.root,
    paths.artifacts.root,
    paths.snapshots.objects,
    paths.snapshots.manifests,
    paths.imageGen.outputs,
    paths.imageGen.references,
    paths.imageGen.prompts,
    paths.imageGen.thumbnails,
    paths.cache.uiBundles,
    paths.logs.root,
    paths.temp.root,
    paths.secrets.root
  ]

  await Promise.all(
    dirs.map(dir => mkdir(dir, { recursive: true }))
  )

  // Clear temp directory on startup
  await clearTempDirectory()
}

/**
 * Clear temporary files on startup
 */
async function clearTempDirectory(): Promise<void> {
  try {
    const glob = new Bun.Glob('*')
    const tempFiles = await Array.fromAsync(glob.scan(paths.temp.root))

    for (const file of tempFiles) {
      if (file !== '.gitkeep') {
        await Bun.file(join(paths.temp.root, file)).delete?.()
      }
    }
  } catch {
    // Temp directory might not exist yet, that's fine
  }
}

/**
 * Ensure a specific artifact directory exists
 */
export async function ensureArtifactDir(artifactId: string): Promise<string> {
  const dir = paths.artifacts.byId(artifactId)
  const storageDir = paths.artifacts.storage(artifactId)

  await mkdir(dir, { recursive: true })
  await mkdir(storageDir, { recursive: true })

  return dir
}

/**
 * Ensure snapshot object directory exists for a given hash
 */
export async function ensureSnapshotObjectDir(hash: string): Promise<string> {
  const dir = join(paths.snapshots.objects, hash.slice(0, 2))
  await mkdir(dir, { recursive: true })
  return dir
}
