// =============================================================================
// CREDENTIAL STORE
// =============================================================================
// SQLite-backed credential storage for API keys and custom providers.

import { db } from '../db'
import {
  Result,
  Errors,
  logger,
  type ProviderFormat,
  type Credential,
  isProviderFormat
} from '../core'

const log = logger.child({ module: 'credential-store' })

// Default base URLs for built-in formats
const DEFAULT_BASE_URLS: Record<ProviderFormat, string> = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
}

// Built-in provider defaults
const BUILT_IN_PROVIDERS: Record<string, { name: string; format: ProviderFormat; brandColor: string }> = {
  anthropic: { name: 'Anthropic', format: 'anthropic', brandColor: '#d4a27f' },
  openai: { name: 'OpenAI', format: 'openai', brandColor: '#10a37f' },
  google: { name: 'Google', format: 'google', brandColor: '#4285F4' },
}

interface CredentialRow {
  id: string
  name: string | null
  format: string
  api_key_encrypted: string
  base_url: string | null
  brand_color: string | null
  metadata: string | null
  created_at: string
  updated_at: string
}

function rowToCredential(row: CredentialRow): Credential {
  const builtIn = BUILT_IN_PROVIDERS[row.id]
  const format = (isProviderFormat(row.format) ? row.format : 'openai') as ProviderFormat

  return {
    id: row.id,
    name: row.name || builtIn?.name || row.id,
    format,
    apiKey: row.api_key_encrypted, // TODO: decrypt when encryption is added
    baseUrl: row.base_url || DEFAULT_BASE_URLS[format],
    brandColor: row.brand_color || builtIn?.brandColor,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export interface CreateProviderInput {
  id: string           // unique id like 'together-ai' or 'my-ollama'
  name: string         // display name
  format: ProviderFormat
  apiKey: string
  baseUrl: string
  brandColor?: string
  metadata?: Record<string, unknown>
}

export const CredentialStore = {
  /**
   * Create or update a provider with credentials
   */
  setCredential(
    providerId: string,
    apiKey: string,
    options?: {
      name?: string
      format?: ProviderFormat
      baseUrl?: string
      brandColor?: string
      metadata?: Record<string, unknown>
    }
  ): Result<Credential> {
    try {
      const now = new Date().toISOString()
      const builtIn = BUILT_IN_PROVIDERS[providerId]

      // For built-in providers, use their defaults
      const name = options?.name || builtIn?.name || providerId
      const format = options?.format || builtIn?.format || 'openai'
      const baseUrl = options?.baseUrl || DEFAULT_BASE_URLS[format]
      const brandColor = options?.brandColor || builtIn?.brandColor || null
      const metadata = options?.metadata ? JSON.stringify(options.metadata) : null

      // Upsert credential
      db.app.prepare(`
        INSERT INTO credentials (id, name, format, api_key_encrypted, base_url, brand_color, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          format = excluded.format,
          api_key_encrypted = excluded.api_key_encrypted,
          base_url = excluded.base_url,
          brand_color = excluded.brand_color,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `).run(providerId, name, format, apiKey, baseUrl, brandColor, metadata, now, now)

      // Also ensure provider_configs entry exists
      db.app.prepare(`
        INSERT INTO provider_configs (id, enabled, created_at, updated_at)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `).run(providerId, now, now)

      log.info('Credential set', { providerId, name, format })

      // Return the created credential
      const credential: Credential = {
        id: providerId,
        name,
        format,
        apiKey,
        baseUrl,
        brandColor: brandColor || undefined,
        metadata: options?.metadata,
        createdAt: now,
        updatedAt: now,
      }
      return Result.ok(credential)
    } catch (error) {
      log.error('Failed to set credential', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('INSERT credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get a credential by provider ID
   */
  getCredential(providerId: string): Result<Credential | null> {
    try {
      const row = db.app
        .prepare('SELECT * FROM credentials WHERE id = ?')
        .get(providerId) as CredentialRow | null

      if (!row) {
        return Result.ok(null)
      }

      return Result.ok(rowToCredential(row))
    } catch (error) {
      log.error('Failed to get credential', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get all configured providers (credentials)
   */
  getAllCredentials(): Result<Credential[]> {
    try {
      const rows = db.app
        .prepare('SELECT * FROM credentials ORDER BY id')
        .all() as CredentialRow[]

      return Result.ok(rows.map(rowToCredential))
    } catch (error) {
      log.error('Failed to get all credentials', error instanceof Error ? error : undefined)
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Check if a provider has credentials
   */
  hasCredential(providerId: string): boolean {
    try {
      const row = db.app
        .prepare('SELECT 1 FROM credentials WHERE id = ?')
        .get(providerId)

      return row !== null
    } catch {
      return false
    }
  },

  /**
   * Delete a credential/provider
   */
  deleteCredential(providerId: string): Result<void> {
    try {
      db.app
        .prepare('DELETE FROM credentials WHERE id = ?')
        .run(providerId)

      // Also delete associated models
      db.app
        .prepare('DELETE FROM user_models WHERE provider = ?')
        .run(providerId)

      log.info('Credential deleted', { providerId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to delete credential', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('DELETE credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * List all provider IDs with credentials
   */
  listProviders(): string[] {
    try {
      const rows = db.app
        .prepare('SELECT id FROM credentials ORDER BY id')
        .all() as { id: string }[]

      return rows.map(r => r.id)
    } catch {
      return []
    }
  },

  /**
   * Get API key for a provider (convenience method)
   */
  getApiKey(providerId: string): string | null {
    const result = this.getCredential(providerId)
    if (result.ok && result.value) {
      return result.value.apiKey
    }
    return null
  },

  /**
   * Validate that a credential exists and has an API key
   */
  validateCredential(providerId: string): Result<string> {
    const result = this.getCredential(providerId)

    if (!result.ok) {
      return result
    }

    if (!result.value) {
      return Result.err(Errors.store.notFound('credential', providerId))
    }

    if (!result.value.apiKey) {
      return Result.err(Errors.ai.invalidCredentials(providerId))
    }

    return Result.ok(result.value.apiKey)
  },

  /**
   * Update just the base URL for an existing credential
   */
  updateBaseUrl(providerId: string, baseUrl: string | null): Result<void> {
    try {
      const now = new Date().toISOString()

      const result = db.app.prepare(`
        UPDATE credentials
        SET base_url = ?, updated_at = ?
        WHERE id = ?
      `).run(baseUrl, now, providerId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      log.info('Base URL updated', { providerId, baseUrl })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update base URL', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Check if a provider ID is a built-in provider
   */
  isBuiltIn(providerId: string): boolean {
    return providerId in BUILT_IN_PROVIDERS
  },

  /**
   * Get built-in provider info
   */
  getBuiltInInfo(providerId: string) {
    return BUILT_IN_PROVIDERS[providerId]
  }
}
