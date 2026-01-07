// =============================================================================
// EMBEDDINGS
// =============================================================================
// Provider-based embedding generation for the memory system.
// Supports OpenAI, Google, and OpenAI-compatible endpoints (LMStudio, etc.)

import { Result, Errors, logger } from '../core'
import type { ProviderFormat } from '../core/types'
import { hashContent, serializeEmbedding, deserializeEmbedding } from '../memory/similarity'
import { MemoryStore } from '../memory/memory-store'

const log = logger.child({ module: 'embeddings' })

// =============================================================================
// TYPES
// =============================================================================

export interface EmbeddingModelConfig {
  id: string
  provider: string
  format: ProviderFormat
  displayName: string
  dimensions: number
  maxTokens: number
  inputPrice?: number
}

export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: Float32Array
  model: string
  dimensions: number
  cached: boolean
}

export interface ProviderCredentials {
  apiKey: string
  baseUrl: string
  format: ProviderFormat
}

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embedding for text using the specified provider.
 * Automatically caches embeddings to avoid redundant API calls.
 */
export async function generateEmbedding(
  text: string,
  credentials: ProviderCredentials,
  model: string
): Promise<Result<EmbeddingResponse>> {
  const contentHash = hashContent(text)

  // Check cache first
  const cached = MemoryStore.getCachedEmbedding(contentHash, model)
  if (cached.ok && cached.value) {
    log.debug('Embedding cache hit', { model, contentHash: contentHash.slice(0, 8) })
    const embedding = deserializeEmbedding(cached.value)
    return Result.ok({
      embedding,
      model,
      dimensions: embedding.length,
      cached: true
    })
  }

  // Generate embedding based on provider format
  let result: Result<EmbeddingResponse>

  switch (credentials.format) {
    case 'openai':
      result = await generateOpenAIEmbedding(text, credentials, model)
      break
    case 'google':
      result = await generateGoogleEmbedding(text, credentials, model)
      break
    case 'anthropic':
      // Anthropic doesn't have embeddings API yet
      return Result.err(Errors.memory.embeddingFailed(
        'anthropic',
        new Error('Anthropic does not support embeddings')
      ))
    default:
      return Result.err(Errors.memory.embeddingFailed(
        credentials.format,
        new Error(`Unknown provider format: ${credentials.format}`)
      ))
  }

  // Cache successful result
  if (result.ok) {
    MemoryStore.cacheEmbedding(contentHash, result.value.embedding, model)
    log.debug('Cached embedding', { model, contentHash: contentHash.slice(0, 8) })
  }

  return result
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddingBatch(
  texts: string[],
  credentials: ProviderCredentials,
  model: string
): Promise<Result<EmbeddingResponse[]>> {
  // For now, process sequentially with caching
  // TODO: Implement true batch API calls for providers that support it
  const results: EmbeddingResponse[] = []

  for (const text of texts) {
    const result = await generateEmbedding(text, credentials, model)
    if (!result.ok) {
      return Result.err(result.error)
    }
    results.push(result.value)
  }

  return Result.ok(results)
}

// =============================================================================
// PROVIDER IMPLEMENTATIONS
// =============================================================================

/**
 * OpenAI embeddings API (also works with OpenAI-compatible endpoints like LMStudio)
 */
async function generateOpenAIEmbedding(
  text: string,
  credentials: ProviderCredentials,
  model: string
): Promise<Result<EmbeddingResponse>> {
  try {
    const url = `${credentials.baseUrl}/embeddings`

    log.debug('Calling OpenAI embeddings', { url, model })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: model,
        encoding_format: 'float'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      log.error('OpenAI embeddings failed', new Error(error), { status: response.status })
      return Result.err(Errors.memory.embeddingFailed('openai', new Error(error)))
    }

    const data = await response.json() as {
      data: Array<{ embedding: number[]; index: number }>
      model: string
      usage: { prompt_tokens: number; total_tokens: number }
    }

    if (!data.data || data.data.length === 0) {
      return Result.err(Errors.memory.embeddingFailed('openai', new Error('No embedding returned')))
    }

    const embedding = new Float32Array(data.data[0].embedding)

    log.debug('OpenAI embedding generated', {
      model: data.model,
      dimensions: embedding.length,
      tokens: data.usage?.total_tokens
    })

    return Result.ok({
      embedding,
      model: data.model,
      dimensions: embedding.length,
      cached: false
    })
  } catch (error) {
    log.error('OpenAI embeddings error', error as Error)
    return Result.err(Errors.memory.embeddingFailed('openai', error as Error))
  }
}

/**
 * Google Gemini embeddings API
 */
async function generateGoogleEmbedding(
  text: string,
  credentials: ProviderCredentials,
  model: string
): Promise<Result<EmbeddingResponse>> {
  try {
    // Google uses a different URL format: /models/{model}:embedContent
    const url = `${credentials.baseUrl}/models/${model}:embedContent?key=${credentials.apiKey}`

    log.debug('Calling Google embeddings', { model })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }]
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      log.error('Google embeddings failed', new Error(error), { status: response.status })
      return Result.err(Errors.memory.embeddingFailed('google', new Error(error)))
    }

    const data = await response.json() as {
      embedding: { values: number[] }
    }

    if (!data.embedding || !data.embedding.values) {
      return Result.err(Errors.memory.embeddingFailed('google', new Error('No embedding returned')))
    }

    const embedding = new Float32Array(data.embedding.values)

    log.debug('Google embedding generated', {
      model,
      dimensions: embedding.length
    })

    return Result.ok({
      embedding,
      model,
      dimensions: embedding.length,
      cached: false
    })
  } catch (error) {
    log.error('Google embeddings error', error as Error)
    return Result.err(Errors.memory.embeddingFailed('google', error as Error))
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Estimate token count for text (rough approximation for embedding limits).
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to fit within token limit.
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text)
  if (estimatedTokens <= maxTokens) {
    return text
  }

  // Truncate to approximate character limit
  const maxChars = maxTokens * 4
  return text.slice(0, maxChars)
}

/**
 * Split long text into chunks for batch embedding.
 */
export function chunkText(text: string, maxTokensPerChunk: number = 2000): string[] {
  const chunks: string[] = []
  const maxChars = maxTokensPerChunk * 4

  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining)
      break
    }

    // Try to split at sentence boundary
    let splitIndex = maxChars
    const lastSentence = remaining.slice(0, maxChars).lastIndexOf('. ')
    if (lastSentence > maxChars * 0.5) {
      splitIndex = lastSentence + 2
    }

    chunks.push(remaining.slice(0, splitIndex))
    remaining = remaining.slice(splitIndex)
  }

  return chunks
}
