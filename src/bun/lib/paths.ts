// =============================================================================
// PATHS
// =============================================================================
// Centralized path management for YAAI data directories.
// All user data stored in ~/.yaai/

import { homedir } from 'os';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// -----------------------------------------------------------------------------
// BASE PATHS
// -----------------------------------------------------------------------------

/** Root data directory */
export const YAAI_HOME = join(homedir(), '.yaai');

/** Artifact storage */
export const ARTIFACTS_DIR = join(YAAI_HOME, 'artifacts');

/** Credential storage */
export const CREDENTIALS_DIR = join(YAAI_HOME, 'credentials');

/** Chat history */
export const CHATS_DIR = join(YAAI_HOME, 'chats');

/** Application logs */
export const LOGS_DIR = join(YAAI_HOME, 'logs');

/** Cache directory */
export const CACHE_DIR = join(YAAI_HOME, 'cache');

/** Temporary files */
export const TEMP_DIR = join(YAAI_HOME, 'temp');

// -----------------------------------------------------------------------------
// IMAGE GENERATION PATHS
// -----------------------------------------------------------------------------

/** Image generation root directory */
export const IMAGE_GEN_DIR = join(YAAI_HOME, 'image-gen');

/** Prompt library storage */
export const IMAGE_GEN_PROMPTS_DIR = join(IMAGE_GEN_DIR, 'prompts');

/** Reference images root */
export const IMAGE_GEN_REFERENCES_DIR = join(IMAGE_GEN_DIR, 'references');

/** Generated output images */
export const IMAGE_GEN_OUTPUTS_DIR = join(IMAGE_GEN_DIR, 'outputs');

/** Queue persistence file */
export const IMAGE_GEN_QUEUE_FILE = join(IMAGE_GEN_DIR, 'queue.json');

/** Thumbnail cache for references */
export const IMAGE_GEN_THUMBNAILS_DIR = join(CACHE_DIR, 'image-gen-thumbnails');

// -----------------------------------------------------------------------------
// CODE SESSION PATHS
// -----------------------------------------------------------------------------

/** Code session storage */
export const CODE_SESSIONS_DIR = join(YAAI_HOME, 'code-sessions');

/** Snapshots for restore points */
export const SNAPSHOTS_DIR = join(YAAI_HOME, 'snapshots');

/** Content-addressed blob storage */
export const SNAPSHOTS_OBJECTS_DIR = join(SNAPSHOTS_DIR, 'objects');

/** Restore point manifests */
export const SNAPSHOTS_MANIFESTS_DIR = join(SNAPSHOTS_DIR, 'manifests');

// -----------------------------------------------------------------------------
// ARTIFACT PATHS
// -----------------------------------------------------------------------------

/**
 * Get the directory path for a specific artifact
 */
export function getArtifactDir(artifactId: string): string {
  return join(ARTIFACTS_DIR, artifactId);
}

/**
 * Get the manifest file path for an artifact
 */
export function getArtifactManifestPath(artifactId: string): string {
  return join(getArtifactDir(artifactId), 'manifest.json');
}

/**
 * Get the handler file path for an artifact
 */
export function getArtifactHandlerPath(artifactId: string, entry: string = 'handler.ts'): string {
  return join(getArtifactDir(artifactId), entry);
}

/**
 * Get the UI component path for an artifact
 */
export function getArtifactUIPath(artifactId: string, ui: string = 'index.tsx'): string {
  return join(getArtifactDir(artifactId), ui);
}

/**
 * Get the storage directory for an artifact's persistent data
 */
export function getArtifactStorageDir(artifactId: string): string {
  return join(getArtifactDir(artifactId), '.storage');
}

/**
 * Get the cache directory for an artifact
 */
export function getArtifactCacheDir(artifactId: string): string {
  return join(CACHE_DIR, 'artifacts', artifactId);
}

// -----------------------------------------------------------------------------
// CREDENTIAL PATHS
// -----------------------------------------------------------------------------

/**
 * Get the file path for a credential
 */
export function getCredentialPath(credentialKey: string): string {
  return join(CREDENTIALS_DIR, `${credentialKey}.json`);
}

// -----------------------------------------------------------------------------
// CODE SESSION PATHS
// -----------------------------------------------------------------------------

/**
 * Get the directory for a specific code session
 */
export function getCodeSessionDir(sessionId: string): string {
  return join(CODE_SESSIONS_DIR, sessionId);
}

/**
 * Get the session metadata file path
 */
export function getCodeSessionPath(sessionId: string): string {
  return join(getCodeSessionDir(sessionId), 'session.json');
}

/**
 * Get the transcript file path (JSONL format)
 */
export function getCodeSessionTranscriptPath(sessionId: string): string {
  return join(getCodeSessionDir(sessionId), 'transcript.jsonl');
}

/**
 * Get the path for a snapshot object (content-addressed)
 * Uses first 2 chars as subdirectory for filesystem efficiency
 */
export function getSnapshotObjectPath(hash: string): string {
  const prefix = hash.slice(0, 2);
  return join(SNAPSHOTS_OBJECTS_DIR, prefix, hash);
}

/**
 * Get the path for a restore point manifest
 */
export function getSnapshotManifestPath(manifestId: string): string {
  return join(SNAPSHOTS_MANIFESTS_DIR, `${manifestId}.json`);
}

// -----------------------------------------------------------------------------
// CHAT PATHS
// -----------------------------------------------------------------------------

/**
 * Get the directory for a specific chat
 */
export function getChatDir(chatId: string): string {
  return join(CHATS_DIR, chatId);
}

/**
 * Get the messages file for a chat
 */
export function getChatMessagesPath(chatId: string): string {
  return join(getChatDir(chatId), 'messages.json');
}

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------

/**
 * Ensure all required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  const dirs = [
    YAAI_HOME,
    ARTIFACTS_DIR,
    CREDENTIALS_DIR,
    CHATS_DIR,
    LOGS_DIR,
    CACHE_DIR,
    TEMP_DIR,
    CODE_SESSIONS_DIR,
    SNAPSHOTS_DIR,
    SNAPSHOTS_OBJECTS_DIR,
    SNAPSHOTS_MANIFESTS_DIR,
    IMAGE_GEN_DIR,
    IMAGE_GEN_PROMPTS_DIR,
    IMAGE_GEN_REFERENCES_DIR,
    IMAGE_GEN_OUTPUTS_DIR,
    IMAGE_GEN_THUMBNAILS_DIR,
  ];

  await Promise.all(
    dirs.map(dir => mkdir(dir, { recursive: true }))
  );
}

/**
 * Ensure code session directory structure exists
 */
export async function ensureCodeSessionDir(sessionId: string): Promise<string> {
  const dir = getCodeSessionDir(sessionId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Ensure artifact directory structure exists
 */
export async function ensureArtifactDir(artifactId: string): Promise<string> {
  const dir = getArtifactDir(artifactId);
  const storageDir = getArtifactStorageDir(artifactId);

  await mkdir(dir, { recursive: true });
  await mkdir(storageDir, { recursive: true });

  return dir;
}

// -----------------------------------------------------------------------------
// IMAGE GENERATION HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get the path for a prompt file
 */
export function getPromptFilePath(promptName: string): string {
  const name = promptName.endsWith('.txt') ? promptName : `${promptName}.txt`;
  return join(IMAGE_GEN_PROMPTS_DIR, name);
}

/**
 * Get the path for a generated output image
 */
export function getOutputImagePath(filename: string): string {
  return join(IMAGE_GEN_OUTPUTS_DIR, filename);
}

/**
 * Get the path for a reference thumbnail
 */
export function getThumbnailPath(imageHash: string): string {
  return join(IMAGE_GEN_THUMBNAILS_DIR, `${imageHash}.jpg`);
}

/**
 * Ensure image-gen directories exist
 */
export async function ensureImageGenDirs(): Promise<void> {
  const dirs = [
    IMAGE_GEN_DIR,
    IMAGE_GEN_PROMPTS_DIR,
    IMAGE_GEN_REFERENCES_DIR,
    IMAGE_GEN_OUTPUTS_DIR,
    IMAGE_GEN_THUMBNAILS_DIR,
  ];

  await Promise.all(
    dirs.map(dir => mkdir(dir, { recursive: true }))
  );
}
