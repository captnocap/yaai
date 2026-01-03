// =============================================================================
// MODEL FETCHER
// =============================================================================
// Fetch available models from provider APIs.

import { Result, Errors, logger, type ProviderType, type ModelInfo } from '../core'
import { CredentialStore } from '../stores'
import { PROVIDER_CONFIGS, getProviderConfig } from './provider-configs'

const log = logger.child({ module: 'model-fetcher' })

/**
 * Fetch available models from a provider's API
 * Uses the provider's format to determine how to fetch models
 */
export async function fetchAvailableModels(providerId: string): Promise<Result<ModelInfo[]>> {
  // Get full credential including format and baseUrl
  const credResult = CredentialStore.getCredential(providerId)
  if (!credResult.ok || !credResult.value) {
    return Result.err(Errors.store.notFound('credential', providerId))
  }

  const credential = credResult.value
  const format = credential.format
  const baseUrl = credential.baseUrl

  try {
    switch (format) {
      case 'anthropic':
        // Anthropic doesn't have a models endpoint - use hardcoded list
        log.debug('Using hardcoded models for Anthropic format', { providerId })
        return Result.ok(PROVIDER_CONFIGS.anthropic.models.map(m => ({ ...m, provider: providerId as ProviderType })))

      case 'openai':
        return await fetchOpenAIModels(credential.apiKey, baseUrl, providerId)

      case 'google':
        return await fetchGoogleModels(credential.apiKey, baseUrl, providerId)

      default:
        // Unknown format - try OpenAI-compatible
        return await fetchOpenAIModels(credential.apiKey, baseUrl, providerId)
    }
  } catch (error) {
    log.warn('Failed to fetch models from API', { providerId, format, error })
    // Return empty array for custom providers, built-in defaults for known formats
    if (format in PROVIDER_CONFIGS) {
      return Result.ok(PROVIDER_CONFIGS[format as ProviderType].models)
    }
    return Result.ok([])
  }
}

/**
 * Fetch models from OpenAI API (or OpenAI-compatible endpoint)
 */
async function fetchOpenAIModels(apiKey: string, baseUrl: string, providerId: string): Promise<Result<ModelInfo[]>> {
  const isCustomEndpoint = baseUrl !== PROVIDER_CONFIGS.openai.baseUrl

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      log.warn('OpenAI models API failed', { status: response.status, baseUrl })
      // Only return OpenAI defaults for the actual OpenAI provider
      if (providerId === 'openai') {
        return Result.ok(PROVIDER_CONFIGS.openai.models)
      }
      return Result.ok([])
    }

    const data = await response.json() as { data: Array<{ id: string; created?: number; owned_by?: string }> }

    // For custom endpoints, include all models; for OpenAI, filter to GPT/o1
    const filteredModels = isCustomEndpoint
      ? data.data
      : data.data.filter(m => m.id.startsWith('gpt-') || m.id.startsWith('o1'))

    const models = filteredModels.map(m => {
      // Try to find in our configs for full details (only for built-in OpenAI)
      if (providerId === 'openai') {
        const known = PROVIDER_CONFIGS.openai.models.find(km => km.id === m.id)
        if (known) return known
      }

      // Unknown model - provide basic info
      return {
        id: m.id,
        provider: providerId as ProviderType,
        displayName: m.id,
        contextWindow: 128000,
        maxOutput: 16384,
        supportsVision: m.id.includes('vision') || m.id.includes('4o') || m.id.includes('o1'),
        supportsTools: true,
      }
    })

    log.info('Fetched OpenAI-compatible models', { count: models.length, providerId, baseUrl, isCustomEndpoint })
    return Result.ok(models)
  } catch (error) {
    log.warn('Error fetching OpenAI models', { error, providerId, baseUrl })
    if (providerId === 'openai') {
      return Result.ok(PROVIDER_CONFIGS.openai.models)
    }
    return Result.ok([])
  }
}

/**
 * Fetch models from Google AI API
 */
async function fetchGoogleModels(apiKey: string, baseUrl: string, providerId: string): Promise<Result<ModelInfo[]>> {
  try {
    const response = await fetch(`${baseUrl}/models?key=${apiKey}`)

    if (!response.ok) {
      log.warn('Google models API failed', { status: response.status })
      if (providerId === 'google') {
        return Result.ok(PROVIDER_CONFIGS.google.models)
      }
      return Result.ok([])
    }

    const data = await response.json() as {
      models: Array<{
        name: string
        displayName: string
        inputTokenLimit?: number
        outputTokenLimit?: number
      }>
    }

    // Filter to Gemini models
    const geminiModels = data.models
      .filter(m => m.name.includes('gemini'))
      .map(m => {
        const modelId = m.name.replace('models/', '')

        // Try to find in our configs for full details (only for built-in Google)
        if (providerId === 'google') {
          const known = PROVIDER_CONFIGS.google.models.find(km => km.id === modelId)
          if (known) return known
        }

        // Unknown model - provide basic info
        return {
          id: modelId,
          provider: providerId as ProviderType,
          displayName: m.displayName || modelId,
          contextWindow: m.inputTokenLimit || 1000000,
          maxOutput: m.outputTokenLimit || 8192,
          supportsVision: true,
          supportsTools: true,
        }
      })

    log.info('Fetched Google models', { count: geminiModels.length, providerId })
    return Result.ok(geminiModels)
  } catch (error) {
    log.warn('Error fetching Google models', { error, providerId })
    if (providerId === 'google') {
      return Result.ok(PROVIDER_CONFIGS.google.models)
    }
    return Result.ok([])
  }
}

/**
 * Get available models for a built-in provider (from hardcoded config)
 * Use this when you don't need to validate credentials
 */
export function getAvailableModels(providerId: string): ModelInfo[] {
  if (providerId in PROVIDER_CONFIGS) {
    return PROVIDER_CONFIGS[providerId as ProviderType].models
  }
  return []
}
