// =============================================================================
// EMBEDDING MODEL CONFIGURATION TYPES
// =============================================================================
// Types for configuring embedding models. Unlike image/video models, embeddings
// follow a standardized OpenAI-compatible format across providers.

import type { ProviderFormat } from '../hooks/useProviderSettings';

// -----------------------------------------------------------------------------
// EMBEDDING MODEL INFO
// -----------------------------------------------------------------------------

export interface EmbeddingModelInfo {
  /** Model ID (e.g., 'text-embedding-3-small') */
  id: string;
  /** Provider/credential ID this model belongs to */
  provider: string;
  /** API format (openai, google, etc.) */
  format: ProviderFormat;
  /** Human-readable display name */
  displayName: string;
  /** Default embedding vector dimensions */
  dimensions: number;
  /** Maximum input tokens supported */
  maxTokens: number;
  /** Price per million tokens (optional) */
  inputPrice?: number;
  /** Whether this model supports custom dimension reduction */
  supportsDimensions?: boolean;
  /** When this config was created (for custom models) */
  createdAt?: string;
  /** When this config was last updated (for custom models) */
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// BUILT-IN DEFAULTS
// -----------------------------------------------------------------------------

export const EMBEDDING_MODELS: Record<ProviderFormat, EmbeddingModelInfo[]> = {
  openai: [
    {
      id: 'text-embedding-3-small',
      provider: 'openai',
      format: 'openai',
      displayName: 'Text Embedding 3 Small',
      dimensions: 1536,
      maxTokens: 8191,
      inputPrice: 0.02,
      supportsDimensions: true,
    },
    {
      id: 'text-embedding-3-large',
      provider: 'openai',
      format: 'openai',
      displayName: 'Text Embedding 3 Large',
      dimensions: 3072,
      maxTokens: 8191,
      inputPrice: 0.13,
      supportsDimensions: true,
    },
    {
      id: 'text-embedding-ada-002',
      provider: 'openai',
      format: 'openai',
      displayName: 'Text Embedding Ada 002',
      dimensions: 1536,
      maxTokens: 8191,
      inputPrice: 0.10,
      supportsDimensions: false,
    },
  ],
  google: [
    {
      id: 'text-embedding-004',
      provider: 'google',
      format: 'google',
      displayName: 'Text Embedding 004',
      dimensions: 768,
      maxTokens: 2048,
      inputPrice: 0.00,
      supportsDimensions: false,
    },
  ],
  anthropic: [], // No embedding API yet
};

// -----------------------------------------------------------------------------
// DEFAULT ENDPOINT
// -----------------------------------------------------------------------------

export const DEFAULT_EMBEDDING_ENDPOINT = '/v1/embeddings';

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Generate a unique ID for a new custom embedding model config
 */
export function generateEmbeddingModelId(): string {
  return `embmodel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build the payload for an embedding request (OpenAI-compatible format)
 */
export function buildEmbeddingPayload(
  model: string,
  input: string | string[],
  options?: {
    encodingFormat?: 'float' | 'base64';
    dimensions?: number;
    user?: string;
  }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model,
    input,
  };

  if (options?.encodingFormat) {
    payload.encoding_format = options.encodingFormat;
  }
  if (options?.dimensions) {
    payload.dimensions = options.dimensions;
  }
  if (options?.user) {
    payload.user = options.user;
  }

  return payload;
}

/**
 * Get built-in embedding models for a provider format
 */
export function getBuiltInEmbeddingModels(format: ProviderFormat): EmbeddingModelInfo[] {
  return EMBEDDING_MODELS[format] || [];
}
