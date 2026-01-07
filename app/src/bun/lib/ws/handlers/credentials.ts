// =============================================================================
// CREDENTIAL HANDLERS
// =============================================================================
// WebSocket handlers for credential management.

import { CredentialStore } from '../../stores'
import { logger, type ProviderFormat } from '../../core'
import type { ImageModelConfig } from '../../../../mainview/types/image-model-config'
import type { EmbeddingModelInfo } from '../../../../mainview/types/embedding-model-config'
import type { VideoModelConfig } from '../../../../mainview/types/video-model-config'
import type { TTSModelConfig } from '../../../../mainview/types/tts-model-config'
import type { TEEModelInfo } from '../../../../mainview/types/tee-model-config'

const log = logger.child({ module: 'ws-credentials' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
}

/**
 * Register credential handlers with the WebSocket server
 */
export function registerCredentialHandlers(wsServer: WSServer): void {
  // Set/create a credential (supports custom providers)
  wsServer.onRequest('credentials:set', async (payload) => {
    const { provider, apiKey, name, format, baseUrl, brandColor, metadata } = payload as {
      provider: string
      apiKey: string
      name?: string
      format?: ProviderFormat
      baseUrl?: string
      brandColor?: string
      metadata?: Record<string, unknown>
    }

    log.info('Setting credential', { provider, name, format })
    const result = CredentialStore.setCredential(provider, apiKey, {
      name,
      format,
      baseUrl,
      brandColor,
      metadata
    })

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    // Return the created credential (without API key)
    return {
      success: true,
      provider: {
        id: result.value.id,
        name: result.value.name,
        format: result.value.format,
        baseUrl: result.value.baseUrl,
        brandColor: result.value.brandColor,
      }
    }
  })

  // Get credential info (without exposing the key)
  wsServer.onRequest('credentials:get', async (payload) => {
    const { provider } = payload as { provider: string }

    const result = CredentialStore.getCredential(provider)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (!result.value) {
      return { exists: false }
    }

    // Don't expose the actual API key
    return {
      exists: true,
      id: result.value.id,
      name: result.value.name,
      format: result.value.format,
      baseUrl: result.value.baseUrl,
      brandColor: result.value.brandColor,
      metadata: result.value.metadata,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt
    }
  })

  // List provider IDs with credentials
  wsServer.onRequest('credentials:list', async () => {
    return CredentialStore.listProviders()
  })

  // Get all providers with full details (without API keys)
  wsServer.onRequest('credentials:list-all', async () => {
    const result = CredentialStore.getAllCredentials()

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    // Return providers without API keys
    return result.value.map(cred => ({
      id: cred.id,
      name: cred.name,
      format: cred.format,
      baseUrl: cred.baseUrl,
      brandColor: cred.brandColor,
      isBuiltIn: CredentialStore.isBuiltIn(cred.id),
    }))
  })

  // Delete a credential
  wsServer.onRequest('credentials:delete', async (payload) => {
    const { provider } = payload as { provider: string }

    log.info('Deleting credential', { provider })
    const result = CredentialStore.deleteCredential(provider)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Check if provider has credentials
  wsServer.onRequest('credentials:has', async (payload) => {
    const { provider } = payload as { provider: string }
    return CredentialStore.hasCredential(provider)
  })

  // Reveal actual API key (for frontend caching on startup)
  wsServer.onRequest('credentials:reveal', async (payload) => {
    const { provider } = payload as { provider: string }

    const result = CredentialStore.getCredential(provider)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    if (!result.value) {
      return { exists: false }
    }

    return {
      exists: true,
      apiKey: result.value.apiKey
    }
  })

  // Get all API keys for frontend caching on startup
  wsServer.onRequest('credentials:get-all-keys', async () => {
    const result = CredentialStore.getAllCredentials()

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    // Return provider IDs with their API keys
    return result.value.map(cred => ({
      provider: cred.id,
      apiKey: cred.apiKey
    }))
  })

  // Update base URL only (for existing credentials)
  wsServer.onRequest('credentials:update-base-url', async (payload) => {
    const { provider, baseUrl } = payload as { provider: string; baseUrl: string | null }

    log.info('Updating base URL', { provider, baseUrl })
    const result = CredentialStore.updateBaseUrl(provider, baseUrl)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // IMAGE MODEL HANDLERS
  // ---------------------------------------------------------------------------

  // Set image API endpoint path
  wsServer.onRequest('credentials:set-image-endpoint', async (payload) => {
    const { provider, endpoint } = payload as { provider: string; endpoint: string | null }

    log.info('Setting image endpoint', { provider, endpoint })
    const result = CredentialStore.setImageEndpoint(provider, endpoint)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Get image API endpoint path
  wsServer.onRequest('credentials:get-image-endpoint', async (payload) => {
    const { provider } = payload as { provider: string }

    const result = CredentialStore.getImageEndpoint(provider)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { endpoint: result.value }
  })

  // Get all image models for a provider
  wsServer.onRequest('credentials:get-image-models', async (payload) => {
    const { provider } = payload as { provider: string }

    const result = CredentialStore.getImageModels(provider)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { models: result.value }
  })

  // Add an image model
  wsServer.onRequest('credentials:add-image-model', async (payload) => {
    const { provider, model } = payload as { provider: string; model: ImageModelConfig }

    log.info('Adding image model', { provider, modelId: model.id })
    const result = CredentialStore.addImageModel(provider, model)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Update an image model
  wsServer.onRequest('credentials:update-image-model', async (payload) => {
    const { provider, modelId, model } = payload as {
      provider: string
      modelId: string
      model: ImageModelConfig
    }

    log.info('Updating image model', { provider, modelId })
    const result = CredentialStore.updateImageModel(provider, modelId, model)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Remove an image model
  wsServer.onRequest('credentials:remove-image-model', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }

    log.info('Removing image model', { provider, modelId })
    const result = CredentialStore.removeImageModel(provider, modelId)

    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // EMBEDDING MODEL HANDLERS
  // ---------------------------------------------------------------------------

  wsServer.onRequest('credentials:set-embedding-endpoint', async (payload) => {
    const { provider, endpoint } = payload as { provider: string; endpoint: string | null }
    log.info('Setting embedding endpoint', { provider, endpoint })
    const result = CredentialStore.setEmbeddingEndpoint(provider, endpoint)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:get-embedding-endpoint', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getEmbeddingEndpoint(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { endpoint: result.value }
  })

  wsServer.onRequest('credentials:get-embedding-models', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getEmbeddingModels(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { models: result.value }
  })

  wsServer.onRequest('credentials:add-embedding-model', async (payload) => {
    const { provider, model } = payload as { provider: string; model: EmbeddingModelInfo }
    log.info('Adding embedding model', { provider, modelId: model.id })
    const result = CredentialStore.addEmbeddingModel(provider, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:update-embedding-model', async (payload) => {
    const { provider, modelId, model } = payload as { provider: string; modelId: string; model: EmbeddingModelInfo }
    log.info('Updating embedding model', { provider, modelId })
    const result = CredentialStore.updateEmbeddingModel(provider, modelId, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:remove-embedding-model', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }
    log.info('Removing embedding model', { provider, modelId })
    const result = CredentialStore.removeEmbeddingModel(provider, modelId)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // VIDEO MODEL HANDLERS
  // ---------------------------------------------------------------------------

  wsServer.onRequest('credentials:set-video-endpoint', async (payload) => {
    const { provider, endpoint } = payload as { provider: string; endpoint: string | null }
    log.info('Setting video endpoint', { provider, endpoint })
    const result = CredentialStore.setVideoEndpoint(provider, endpoint)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:get-video-endpoint', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getVideoEndpoint(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { endpoint: result.value }
  })

  wsServer.onRequest('credentials:get-video-models', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getVideoModels(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { models: result.value }
  })

  wsServer.onRequest('credentials:add-video-model', async (payload) => {
    const { provider, model } = payload as { provider: string; model: VideoModelConfig }
    log.info('Adding video model', { provider, modelId: model.id })
    const result = CredentialStore.addVideoModel(provider, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:update-video-model', async (payload) => {
    const { provider, modelId, model } = payload as { provider: string; modelId: string; model: VideoModelConfig }
    log.info('Updating video model', { provider, modelId })
    const result = CredentialStore.updateVideoModel(provider, modelId, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:remove-video-model', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }
    log.info('Removing video model', { provider, modelId })
    const result = CredentialStore.removeVideoModel(provider, modelId)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // TTS MODEL HANDLERS
  // ---------------------------------------------------------------------------

  wsServer.onRequest('credentials:set-tts-endpoint', async (payload) => {
    const { provider, endpoint } = payload as { provider: string; endpoint: string | null }
    log.info('Setting TTS endpoint', { provider, endpoint })
    const result = CredentialStore.setTTSEndpoint(provider, endpoint)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:get-tts-endpoint', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getTTSEndpoint(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { endpoint: result.value }
  })

  wsServer.onRequest('credentials:get-tts-models', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getTTSModels(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { models: result.value }
  })

  wsServer.onRequest('credentials:add-tts-model', async (payload) => {
    const { provider, model } = payload as { provider: string; model: TTSModelConfig }
    log.info('Adding TTS model', { provider, modelId: model.id })
    const result = CredentialStore.addTTSModel(provider, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:update-tts-model', async (payload) => {
    const { provider, modelId, model } = payload as { provider: string; modelId: string; model: TTSModelConfig }
    log.info('Updating TTS model', { provider, modelId })
    const result = CredentialStore.updateTTSModel(provider, modelId, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:remove-tts-model', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }
    log.info('Removing TTS model', { provider, modelId })
    const result = CredentialStore.removeTTSModel(provider, modelId)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  // ---------------------------------------------------------------------------
  // TEE MODEL HANDLERS
  // ---------------------------------------------------------------------------

  wsServer.onRequest('credentials:set-tee-endpoint', async (payload) => {
    const { provider, endpoint } = payload as { provider: string; endpoint: string | null }
    log.info('Setting TEE endpoint', { provider, endpoint })
    const result = CredentialStore.setTEEEndpoint(provider, endpoint)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:get-tee-endpoint', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getTEEEndpoint(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { endpoint: result.value }
  })

  wsServer.onRequest('credentials:get-tee-models', async (payload) => {
    const { provider } = payload as { provider: string }
    const result = CredentialStore.getTEEModels(provider)
    if (!result.ok) throw new Error(result.error.message)
    return { models: result.value }
  })

  wsServer.onRequest('credentials:add-tee-model', async (payload) => {
    const { provider, model } = payload as { provider: string; model: TEEModelInfo }
    log.info('Adding TEE model', { provider, modelId: model.id })
    const result = CredentialStore.addTEEModel(provider, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:update-tee-model', async (payload) => {
    const { provider, modelId, model } = payload as { provider: string; modelId: string; model: TEEModelInfo }
    log.info('Updating TEE model', { provider, modelId })
    const result = CredentialStore.updateTEEModel(provider, modelId, model)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  wsServer.onRequest('credentials:remove-tee-model', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }
    log.info('Removing TEE model', { provider, modelId })
    const result = CredentialStore.removeTEEModel(provider, modelId)
    if (!result.ok) throw new Error(result.error.message)
    return { success: true }
  })

  log.info('Credential handlers registered')
}
