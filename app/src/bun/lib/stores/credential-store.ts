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
import type { ImageModelConfig } from '../../../mainview/types/image-model-config'
import type { EmbeddingModelInfo } from '../../../mainview/types/embedding-model-config'
import type { VideoModelConfig } from '../../../mainview/types/video-model-config'
import type { TTSModelConfig } from '../../../mainview/types/tts-model-config'
import type { TEEModelInfo } from '../../../mainview/types/tee-model-config'

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
  image_endpoint: string | null
  image_models: string | null
  embedding_endpoint: string | null
  embedding_models: string | null
  video_endpoint: string | null
  video_models: string | null
  tts_endpoint: string | null
  tts_models: string | null
  tee_endpoint: string | null
  tee_models: string | null
  created_at: string
  updated_at: string
}

function parseJsonArray<T>(json: string | null): T[] | undefined {
  if (!json) return undefined
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as T[]
    }
  } catch {
    // Invalid JSON, ignore
  }
  return undefined
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
    // Image models
    imageEndpoint: row.image_endpoint || undefined,
    imageModels: parseJsonArray<ImageModelConfig>(row.image_models),
    // Embedding models
    embeddingEndpoint: row.embedding_endpoint || undefined,
    embeddingModels: parseJsonArray<EmbeddingModelInfo>(row.embedding_models),
    // Video models
    videoEndpoint: row.video_endpoint || undefined,
    videoModels: parseJsonArray<VideoModelConfig>(row.video_models),
    // TTS models
    ttsEndpoint: row.tts_endpoint || undefined,
    ttsModels: parseJsonArray<TTSModelConfig>(row.tts_models),
    // TEE models
    teeEndpoint: row.tee_endpoint || undefined,
    teeModels: parseJsonArray<TEEModelInfo>(row.tee_models),
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
  },

  // ---------------------------------------------------------------------------
  // IMAGE MODEL METHODS
  // ---------------------------------------------------------------------------

  /**
   * Set the image API endpoint path for a provider
   */
  setImageEndpoint(providerId: string, endpoint: string | null): Result<void> {
    try {
      const now = new Date().toISOString()

      const result = db.app.prepare(`
        UPDATE credentials
        SET image_endpoint = ?, updated_at = ?
        WHERE id = ?
      `).run(endpoint, now, providerId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      log.info('Image endpoint updated', { providerId, endpoint })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update image endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get the image API endpoint path for a provider
   */
  getImageEndpoint(providerId: string): Result<string | null> {
    try {
      const row = db.app
        .prepare('SELECT image_endpoint FROM credentials WHERE id = ?')
        .get(providerId) as { image_endpoint: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(row.image_endpoint)
    } catch (error) {
      log.error('Failed to get image endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Get all image models for a provider
   */
  getImageModels(providerId: string): Result<ImageModelConfig[]> {
    try {
      const row = db.app
        .prepare('SELECT image_models FROM credentials WHERE id = ?')
        .get(providerId) as { image_models: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      if (!row.image_models) {
        return Result.ok([])
      }

      try {
        const models = JSON.parse(row.image_models) as ImageModelConfig[]
        return Result.ok(models)
      } catch {
        return Result.ok([])
      }
    } catch (error) {
      log.error('Failed to get image models', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Add an image model to a provider
   */
  addImageModel(providerId: string, model: ImageModelConfig): Result<void> {
    try {
      const modelsResult = this.getImageModels(providerId)
      if (!modelsResult.ok) {
        return modelsResult
      }

      const models = modelsResult.value

      // Check for duplicate ID
      if (models.some(m => m.id === model.id)) {
        return Result.err(Errors.store.duplicate('image model', model.id))
      }

      models.push(model)

      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials
        SET image_models = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Image model added', { providerId, modelId: model.id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to add image model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Update an image model
   */
  updateImageModel(providerId: string, modelId: string, model: ImageModelConfig): Result<void> {
    try {
      const modelsResult = this.getImageModels(providerId)
      if (!modelsResult.ok) {
        return modelsResult
      }

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)

      if (index === -1) {
        return Result.err(Errors.store.notFound('image model', modelId))
      }

      models[index] = model

      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials
        SET image_models = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Image model updated', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update image model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  /**
   * Remove an image model from a provider
   */
  removeImageModel(providerId: string, modelId: string): Result<void> {
    try {
      const modelsResult = this.getImageModels(providerId)
      if (!modelsResult.ok) {
        return modelsResult
      }

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)

      if (index === -1) {
        return Result.err(Errors.store.notFound('image model', modelId))
      }

      models.splice(index, 1)

      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials
        SET image_models = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Image model removed', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to remove image model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // EMBEDDING MODEL METHODS
  // ---------------------------------------------------------------------------

  setEmbeddingEndpoint(providerId: string, endpoint: string | null): Result<void> {
    try {
      const now = new Date().toISOString()
      const result = db.app.prepare(`
        UPDATE credentials SET embedding_endpoint = ?, updated_at = ? WHERE id = ?
      `).run(endpoint, now, providerId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      log.info('Embedding endpoint updated', { providerId, endpoint })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update embedding endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  getEmbeddingEndpoint(providerId: string): Result<string | null> {
    try {
      const row = db.app
        .prepare('SELECT embedding_endpoint FROM credentials WHERE id = ?')
        .get(providerId) as { embedding_endpoint: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(row.embedding_endpoint)
    } catch (error) {
      log.error('Failed to get embedding endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  getEmbeddingModels(providerId: string): Result<EmbeddingModelInfo[]> {
    try {
      const row = db.app
        .prepare('SELECT embedding_models FROM credentials WHERE id = ?')
        .get(providerId) as { embedding_models: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(parseJsonArray<EmbeddingModelInfo>(row.embedding_models) || [])
    } catch (error) {
      log.error('Failed to get embedding models', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  addEmbeddingModel(providerId: string, model: EmbeddingModelInfo): Result<void> {
    try {
      const modelsResult = this.getEmbeddingModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      if (models.some(m => m.id === model.id)) {
        return Result.err(Errors.store.duplicate('embedding model', model.id))
      }

      models.push(model)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET embedding_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Embedding model added', { providerId, modelId: model.id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to add embedding model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  updateEmbeddingModel(providerId: string, modelId: string, model: EmbeddingModelInfo): Result<void> {
    try {
      const modelsResult = this.getEmbeddingModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('embedding model', modelId))
      }

      models[index] = model
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET embedding_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Embedding model updated', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update embedding model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  removeEmbeddingModel(providerId: string, modelId: string): Result<void> {
    try {
      const modelsResult = this.getEmbeddingModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('embedding model', modelId))
      }

      models.splice(index, 1)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET embedding_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Embedding model removed', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to remove embedding model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // VIDEO MODEL METHODS
  // ---------------------------------------------------------------------------

  setVideoEndpoint(providerId: string, endpoint: string | null): Result<void> {
    try {
      const now = new Date().toISOString()
      const result = db.app.prepare(`
        UPDATE credentials SET video_endpoint = ?, updated_at = ? WHERE id = ?
      `).run(endpoint, now, providerId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      log.info('Video endpoint updated', { providerId, endpoint })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update video endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  getVideoEndpoint(providerId: string): Result<string | null> {
    try {
      const row = db.app
        .prepare('SELECT video_endpoint FROM credentials WHERE id = ?')
        .get(providerId) as { video_endpoint: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(row.video_endpoint)
    } catch (error) {
      log.error('Failed to get video endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  getVideoModels(providerId: string): Result<VideoModelConfig[]> {
    try {
      const row = db.app
        .prepare('SELECT video_models FROM credentials WHERE id = ?')
        .get(providerId) as { video_models: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(parseJsonArray<VideoModelConfig>(row.video_models) || [])
    } catch (error) {
      log.error('Failed to get video models', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  addVideoModel(providerId: string, model: VideoModelConfig): Result<void> {
    try {
      const modelsResult = this.getVideoModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      if (models.some(m => m.id === model.id)) {
        return Result.err(Errors.store.duplicate('video model', model.id))
      }

      models.push(model)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET video_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Video model added', { providerId, modelId: model.id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to add video model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  updateVideoModel(providerId: string, modelId: string, model: VideoModelConfig): Result<void> {
    try {
      const modelsResult = this.getVideoModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('video model', modelId))
      }

      models[index] = model
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET video_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Video model updated', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update video model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  removeVideoModel(providerId: string, modelId: string): Result<void> {
    try {
      const modelsResult = this.getVideoModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('video model', modelId))
      }

      models.splice(index, 1)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET video_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('Video model removed', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to remove video model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // TTS MODEL METHODS
  // ---------------------------------------------------------------------------

  setTTSEndpoint(providerId: string, endpoint: string | null): Result<void> {
    try {
      const now = new Date().toISOString()
      const result = db.app.prepare(`
        UPDATE credentials SET tts_endpoint = ?, updated_at = ? WHERE id = ?
      `).run(endpoint, now, providerId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      log.info('TTS endpoint updated', { providerId, endpoint })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update TTS endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  getTTSEndpoint(providerId: string): Result<string | null> {
    try {
      const row = db.app
        .prepare('SELECT tts_endpoint FROM credentials WHERE id = ?')
        .get(providerId) as { tts_endpoint: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(row.tts_endpoint)
    } catch (error) {
      log.error('Failed to get TTS endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  getTTSModels(providerId: string): Result<TTSModelConfig[]> {
    try {
      const row = db.app
        .prepare('SELECT tts_models FROM credentials WHERE id = ?')
        .get(providerId) as { tts_models: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(parseJsonArray<TTSModelConfig>(row.tts_models) || [])
    } catch (error) {
      log.error('Failed to get TTS models', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  addTTSModel(providerId: string, model: TTSModelConfig): Result<void> {
    try {
      const modelsResult = this.getTTSModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      if (models.some(m => m.id === model.id)) {
        return Result.err(Errors.store.duplicate('TTS model', model.id))
      }

      models.push(model)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET tts_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('TTS model added', { providerId, modelId: model.id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to add TTS model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  updateTTSModel(providerId: string, modelId: string, model: TTSModelConfig): Result<void> {
    try {
      const modelsResult = this.getTTSModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('TTS model', modelId))
      }

      models[index] = model
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET tts_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('TTS model updated', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update TTS model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  removeTTSModel(providerId: string, modelId: string): Result<void> {
    try {
      const modelsResult = this.getTTSModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('TTS model', modelId))
      }

      models.splice(index, 1)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET tts_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('TTS model removed', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to remove TTS model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  // ---------------------------------------------------------------------------
  // TEE MODEL METHODS
  // ---------------------------------------------------------------------------

  setTEEEndpoint(providerId: string, endpoint: string | null): Result<void> {
    try {
      const now = new Date().toISOString()
      const result = db.app.prepare(`
        UPDATE credentials SET tee_endpoint = ?, updated_at = ? WHERE id = ?
      `).run(endpoint, now, providerId)

      if (result.changes === 0) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      log.info('TEE endpoint updated', { providerId, endpoint })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update TEE endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  getTEEEndpoint(providerId: string): Result<string | null> {
    try {
      const row = db.app
        .prepare('SELECT tee_endpoint FROM credentials WHERE id = ?')
        .get(providerId) as { tee_endpoint: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(row.tee_endpoint)
    } catch (error) {
      log.error('Failed to get TEE endpoint', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  getTEEModels(providerId: string): Result<TEEModelInfo[]> {
    try {
      const row = db.app
        .prepare('SELECT tee_models FROM credentials WHERE id = ?')
        .get(providerId) as { tee_models: string | null } | undefined

      if (!row) {
        return Result.err(Errors.store.notFound('credential', providerId))
      }

      return Result.ok(parseJsonArray<TEEModelInfo>(row.tee_models) || [])
    } catch (error) {
      log.error('Failed to get TEE models', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('SELECT credentials', error instanceof Error ? error : undefined))
    }
  },

  addTEEModel(providerId: string, model: TEEModelInfo): Result<void> {
    try {
      const modelsResult = this.getTEEModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      if (models.some(m => m.id === model.id)) {
        return Result.err(Errors.store.duplicate('TEE model', model.id))
      }

      models.push(model)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET tee_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('TEE model added', { providerId, modelId: model.id })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to add TEE model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  updateTEEModel(providerId: string, modelId: string, model: TEEModelInfo): Result<void> {
    try {
      const modelsResult = this.getTEEModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('TEE model', modelId))
      }

      models[index] = model
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET tee_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('TEE model updated', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to update TEE model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  },

  removeTEEModel(providerId: string, modelId: string): Result<void> {
    try {
      const modelsResult = this.getTEEModels(providerId)
      if (!modelsResult.ok) return modelsResult

      const models = modelsResult.value
      const index = models.findIndex(m => m.id === modelId)
      if (index === -1) {
        return Result.err(Errors.store.notFound('TEE model', modelId))
      }

      models.splice(index, 1)
      const now = new Date().toISOString()
      db.app.prepare(`
        UPDATE credentials SET tee_models = ?, updated_at = ? WHERE id = ?
      `).run(JSON.stringify(models), now, providerId)

      log.info('TEE model removed', { providerId, modelId })
      return Result.ok(undefined)
    } catch (error) {
      log.error('Failed to remove TEE model', error instanceof Error ? error : undefined, { providerId })
      return Result.err(Errors.db.queryFailed('UPDATE credentials', error instanceof Error ? error : undefined))
    }
  }
}
