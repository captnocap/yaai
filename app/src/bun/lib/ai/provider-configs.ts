// =============================================================================
// PROVIDER CONFIGS
// =============================================================================
// Default provider configurations and model definitions.

import type { ProviderType, ModelInfo } from '../core'

export interface ProviderConfig {
  type: ProviderType
  enabled: boolean
  baseUrl: string
  apiVersion?: string
  defaultModel: string
  models: ModelInfo[]
}

export const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  anthropic: {
    type: 'anthropic',
    enabled: true,
    baseUrl: 'https://api.anthropic.com/v1',
    apiVersion: '2023-06-01',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      {
        id: 'claude-opus-4-20250514',
        provider: 'anthropic',
        displayName: 'Claude Opus 4',
        contextWindow: 200000,
        maxOutput: 32000,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 15,
        outputPrice: 75,
      },
      {
        id: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        displayName: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutput: 64000,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 3,
        outputPrice: 15,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        provider: 'anthropic',
        displayName: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        maxOutput: 8192,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 0.25,
        outputPrice: 1.25,
      },
    ],
  },
  openai: {
    type: 'openai',
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        provider: 'openai',
        displayName: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 2.5,
        outputPrice: 10,
      },
      {
        id: 'gpt-4o-mini',
        provider: 'openai',
        displayName: 'GPT-4o Mini',
        contextWindow: 128000,
        maxOutput: 16384,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 0.15,
        outputPrice: 0.6,
      },
      {
        id: 'o1',
        provider: 'openai',
        displayName: 'o1',
        contextWindow: 200000,
        maxOutput: 100000,
        supportsVision: true,
        supportsTools: false,
        inputPrice: 15,
        outputPrice: 60,
      },
    ],
  },
  google: {
    type: 'google',
    enabled: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: [
      {
        id: 'gemini-2.0-flash',
        provider: 'google',
        displayName: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 0.075,
        outputPrice: 0.3,
      },
      {
        id: 'gemini-1.5-pro',
        provider: 'google',
        displayName: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        supportsVision: true,
        supportsTools: true,
        inputPrice: 1.25,
        outputPrice: 5,
      },
    ],
  },
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: ProviderType): ProviderConfig {
  return PROVIDER_CONFIGS[provider]
}

/**
 * Get available models for a provider
 */
export function getProviderModels(provider: ProviderType): ModelInfo[] {
  return PROVIDER_CONFIGS[provider].models
}

/**
 * Get a specific model configuration
 */
export function getModelConfig(provider: ProviderType, modelId: string): ModelInfo | undefined {
  return PROVIDER_CONFIGS[provider].models.find(m => m.id === modelId)
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: ProviderType): string {
  return PROVIDER_CONFIGS[provider].defaultModel
}
