// =============================================================================
// MODEL HANDLERS
// =============================================================================
// WebSocket handlers for model management.

import { CredentialStore, AppStore } from '../../stores'
import { fetchAvailableModels, getAvailableModels, getProviderConfig } from '../../ai'
import { logger, type ProviderType, type ModelInfo, isProviderType } from '../../core'

const log = logger.child({ module: 'ws-models' })

interface WSServer {
  onRequest(channel: string, handler: (payload: unknown) => Promise<unknown>): void
}

/**
 * Register model handlers with the WebSocket server
 */
export function registerModelHandlers(wsServer: WSServer): void {
  // Check if provider has credentials
  wsServer.onRequest('ai:has-credentials', async (payload) => {
    const { provider } = payload as { provider: string }
    return CredentialStore.hasCredential(provider)
  })

  // Fetch available models from provider API (requires valid credentials)
  wsServer.onRequest('ai:fetch-models', async (payload) => {
    const { provider } = payload as { provider: string }

    if (!isProviderType(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }

    log.info('Fetching models from provider', { provider })

    const result = await fetchAvailableModels(provider)
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Get available models for a provider (from config, no API call)
  wsServer.onRequest('ai:available-models', async (payload) => {
    const { provider } = payload as { provider: string }

    if (!isProviderType(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }

    return getAvailableModels(provider)
  })

  // Get user's added models
  wsServer.onRequest('ai:models', async (payload) => {
    const data = payload as { provider?: string } | undefined
    return AppStore.getUserModels(data?.provider)
  })

  // Add a model to user's list
  wsServer.onRequest('ai:add-model', async (payload) => {
    const { provider, model } = payload as { provider: string; model: ModelInfo }

    if (!isProviderType(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }

    log.info('Adding model to user list', { provider, modelId: model.id })

    const result = AppStore.addUserModel({ ...model, provider })
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result.value
  })

  // Remove a model from user's list
  wsServer.onRequest('ai:remove-model', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }

    log.info('Removing model from user list', { provider, modelId })

    const result = AppStore.removeUserModel(provider, modelId)
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Set default model for a provider
  wsServer.onRequest('ai:set-default', async (payload) => {
    const { provider, modelId } = payload as { provider: string; modelId: string }

    log.info('Setting default model', { provider, modelId })

    const result = AppStore.setDefaultModel(provider, modelId)
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Get default model for a provider
  wsServer.onRequest('ai:get-default', async (payload) => {
    const { provider } = payload as { provider: string }
    return AppStore.getDefaultModel(provider)
  })

  // Toggle model enabled state
  wsServer.onRequest('ai:toggle-model', async (payload) => {
    const { provider, modelId, enabled } = payload as { provider: string; modelId: string; enabled: boolean }

    const result = AppStore.toggleModelEnabled(provider, modelId, enabled)
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return { success: true }
  })

  // Get provider config with credential status
  wsServer.onRequest('ai:provider-status', async (payload) => {
    const { provider } = payload as { provider: string }

    if (!isProviderType(provider)) {
      throw new Error(`Invalid provider: ${provider}`)
    }

    const hasCredential = CredentialStore.hasCredential(provider)
    const config = getProviderConfig(provider)
    const userModels = AppStore.getUserModels(provider)
    const defaultModel = AppStore.getDefaultModel(provider)

    return {
      provider,
      hasCredential,
      defaultModel: defaultModel?.id ?? config.defaultModel,
      modelCount: userModels.length,
      enabledModelCount: userModels.filter(m => m.enabled).length,
    }
  })

  log.info('Model handlers registered')
}
