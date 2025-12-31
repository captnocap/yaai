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
  ];

  await Promise.all(
    dirs.map(dir => mkdir(dir, { recursive: true }))
  );
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
