// =============================================================================
// SIMILARITY
// =============================================================================
// Vector math utilities for embedding similarity calculations.

import { createHash } from 'crypto'

/**
 * Compute cosine similarity between two embeddings.
 * Returns value in range [-1, 1] where 1 means identical direction.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimensions mismatch: ${a.length} vs ${b.length}`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * Compute Euclidean distance between two embeddings.
 * Lower values mean more similar.
 */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimensions mismatch: ${a.length} vs ${b.length}`)
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }

  return Math.sqrt(sum)
}

/**
 * Compute dot product between two embeddings.
 * Works well for normalized embeddings.
 */
export function dotProduct(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimensions mismatch: ${a.length} vs ${b.length}`)
  }

  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }

  return sum
}

/**
 * Normalize a vector to unit length.
 */
export function normalize(embedding: Float32Array): Float32Array {
  let norm = 0
  for (let i = 0; i < embedding.length; i++) {
    norm += embedding[i] * embedding[i]
  }
  norm = Math.sqrt(norm)

  if (norm === 0) return embedding

  const result = new Float32Array(embedding.length)
  for (let i = 0; i < embedding.length; i++) {
    result[i] = embedding[i] / norm
  }

  return result
}

/**
 * Serialize Float32Array to Buffer for SQLite storage.
 */
export function serializeEmbedding(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer)
}

/**
 * Deserialize Buffer back to Float32Array.
 */
export function deserializeEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4)
}

/**
 * Compute SHA-256 hash of content for caching.
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Find top-k most similar embeddings using brute-force search.
 * Returns indices and scores sorted by similarity (highest first).
 */
export function findTopKSimilar(
  query: Float32Array,
  embeddings: Float32Array[],
  k: number
): Array<{ index: number; score: number }> {
  const scores = embeddings.map((embedding, index) => ({
    index,
    score: cosineSimilarity(query, embedding)
  }))

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  return scores.slice(0, k)
}

/**
 * Batch similarity computation for efficiency.
 * Computes similarity between query and all candidates.
 */
export function batchCosineSimilarity(
  query: Float32Array,
  candidates: Float32Array[]
): number[] {
  return candidates.map(candidate => cosineSimilarity(query, candidate))
}

/**
 * Compute average embedding from multiple embeddings.
 * Useful for representing a concept from multiple mentions.
 */
export function averageEmbedding(embeddings: Float32Array[]): Float32Array {
  if (embeddings.length === 0) {
    throw new Error('Cannot compute average of empty embedding array')
  }

  const dimensions = embeddings[0].length
  const result = new Float32Array(dimensions)

  for (const embedding of embeddings) {
    if (embedding.length !== dimensions) {
      throw new Error('All embeddings must have the same dimensions')
    }
    for (let i = 0; i < dimensions; i++) {
      result[i] += embedding[i]
    }
  }

  // Divide by count
  for (let i = 0; i < dimensions; i++) {
    result[i] /= embeddings.length
  }

  return result
}

/**
 * Estimate token count for content.
 * Simple approximation: ~4 characters per token for English.
 */
export function estimateTokens(content: string): number {
  // This is a rough estimate. For more accuracy, use a proper tokenizer.
  return Math.ceil(content.length / 4)
}

/**
 * Compute prediction error as 1 - cosine_similarity.
 * Higher values indicate more surprising content.
 */
export function predictionError(predicted: Float32Array, actual: Float32Array): number {
  return 1 - cosineSimilarity(predicted, actual)
}
