import type { AIModel } from '../components/model-selector/types'
import type { ModelInfo } from '../types'

/**
 * Convert backend ModelInfo to frontend AIModel
 */
export function modelInfoToAIModel(info: Partial<ModelInfo>): AIModel {
  const provider = info.provider || 'unknown'
  const id = info.id || 'unknown'
  const name = info.displayName || id

  return {
    id,
    name,
    provider: {
      id: provider,
      name: capitalizeProvider(provider),
      iconUrl: getProviderIcon(provider),
    },
    group: inferModelGroup(info),
    capabilities: {
      vision: info.supportsVision || false,
      research: false,
      imageGen: false,
      coding: info.supportsTools || false,
    },
    contextWindow: info.contextWindow || 4096,
    formattedContext: formatContextWindow(info.contextWindow || 4096),
    description: undefined,
    isPinned: false,
  }
}

/**
 * Extract provider/model config for API requests
 */
export function aiModelToConfig(model: AIModel): { model: string; provider: string } {
  return {
    model: model.id,
    provider: model.provider.id,
  }
}

/**
 * Capitalize provider name for display
 */
function capitalizeProvider(provider: string): string {
  const map: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    gemini: 'Google',
  }
  return map[provider.toLowerCase()] || provider
}

/**
 * Get provider icon URL
 */
function getProviderIcon(provider: string): string | undefined {
  const map: Record<string, string> = {
    anthropic: '/icons/anthropic.svg',
    openai: '/icons/openai.svg',
    google: '/icons/google.svg',
    gemini: '/icons/google.svg',
  }
  return map[provider.toLowerCase()]
}

/**
 * Infer model group from capabilities
 */
function inferModelGroup(info: Partial<ModelInfo>): string {
  if (info.supportsTools) return 'Coding'
  if (info.supportsVision) return 'Multimodal'
  return 'General'
}

/**
 * Format context window for display
 */
function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) return `${Math.floor(tokens / 1000000)}M`
  if (tokens >= 1000) return `${Math.floor(tokens / 1000)}k`
  return `${tokens}`
}
