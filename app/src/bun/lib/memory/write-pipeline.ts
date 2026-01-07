// =============================================================================
// WRITE PIPELINE
// =============================================================================
// Processes messages through all memory layers.

import { Result, logger } from '../core'
import type { ChatId, MessageId } from '../core/types'
import { MemoryStore } from './memory-store'
import { classifyAffect } from './affect-classifier'
import { extractEntities, extractConcepts } from './entity-extractor'
import { generateEmbedding, type ProviderCredentials } from '../ai/embeddings'
import { estimateTokens } from './similarity'
import type { WriteResult, MemoryConfig, AffectClassificationResult } from './types'

const log = logger.child({ module: 'write-pipeline' })

// =============================================================================
// PIPELINE OPTIONS
// =============================================================================

export interface WritePipelineOptions {
  /** Provider credentials for embeddings */
  embeddingCredentials?: ProviderCredentials
  /** Embedding model to use */
  embeddingModel?: string
  /** Function to call LLM for classification/extraction */
  llmCall?: (prompt: string) => Promise<Result<string>>
  /** Skip L2 affect classification */
  skipAffect?: boolean
  /** Skip L3 vector embeddings */
  skipEmbeddings?: boolean
  /** Skip L3 entity extraction */
  skipEntities?: boolean
  /** Skip L4 salience computation */
  skipSalience?: boolean
  /** Skip L5 co-occurrence tracking */
  skipCooccurrence?: boolean
  /** Context messages for better classification */
  contextMessages?: string[]
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

/**
 * Process a message through all memory layers.
 * This is the main entry point for the write pipeline.
 */
export async function processMessage(
  chatId: ChatId,
  messageId: MessageId,
  content: string,
  options: WritePipelineOptions = {}
): Promise<Result<WriteResult>> {
  const startTime = Date.now()
  log.debug('Processing message through write pipeline', { chatId, messageId })

  // Get config
  const configResult = MemoryStore.getConfig()
  const config = configResult.ok ? configResult.value : undefined

  // Check if memory is enabled
  if (config && !config.memoryEnabled) {
    log.debug('Memory system disabled, skipping write pipeline')
    return Result.ok({
      l1: { success: false },
      l2: { success: false, skipped: true },
      l3Vector: { success: false, skipped: true },
      l3Lexical: { success: false },
      l3Graph: { success: false },
      l4: { success: false, skipped: true },
      l5: { success: false },
      consolidationTriggered: false
    })
  }

  const result: WriteResult = {
    l1: { success: false },
    l2: { success: false, skipped: false },
    l3Vector: { success: false, skipped: false },
    l3Lexical: { success: false },
    l3Graph: { success: false },
    l4: { success: false, skipped: false },
    l5: { success: false },
    consolidationTriggered: false
  }

  // L1: Always add to river
  const tokenCount = estimateTokens(content)
  const l1Result = MemoryStore.addToRiver(chatId, messageId, content, tokenCount)
  if (l1Result.ok) {
    result.l1 = { success: true, id: l1Result.value.id }
  } else {
    log.error('Failed to add to L1 river', l1Result.error)
  }

  // Check for overflow and trigger consolidation if needed
  const maxTokens = config?.l1MaxTokens ?? 8000
  const currentTokensResult = MemoryStore.getRiverTokenCount(chatId)
  if (currentTokensResult.ok && currentTokensResult.value > maxTokens) {
    result.consolidationTriggered = true
    // Consolidation is async, don't await
    triggerConsolidation(chatId, maxTokens).catch(err => {
      log.error('Consolidation failed', err as Error)
    })
  }

  // L2: Classify affect
  if (!options.skipAffect && options.llmCall) {
    try {
      const affectResult = await classifyAffect(content, options.llmCall, {
        includeContext: true,
        contextMessages: options.contextMessages
      })

      if (affectResult.ok) {
        const threshold = config?.l2AffectThreshold ?? 0.3
        if (affectResult.value.intensity >= threshold) {
          const l2Entry = MemoryStore.addAffectEntry(
            chatId,
            messageId,
            affectResult.value.category,
            affectResult.value.intensity,
            affectResult.value.reasoning
          )
          if (l2Entry.ok) {
            result.l2 = { success: true, id: l2Entry.value.id }
          }
        } else {
          result.l2.skipped = true
        }
      }
    } catch (error) {
      log.warn('L2 affect classification failed', { error })
    }
  } else if (options.skipAffect) {
    result.l2.skipped = true
  }

  // L3.1: Generate vector embedding
  if (!options.skipEmbeddings && options.embeddingCredentials && options.embeddingModel) {
    try {
      const embeddingResult = await generateEmbedding(
        content,
        options.embeddingCredentials,
        options.embeddingModel
      )

      if (embeddingResult.ok) {
        const l3vResult = MemoryStore.addVectorEmbedding(
          chatId,
          messageId,
          content,
          embeddingResult.value.embedding,
          embeddingResult.value.model
        )
        if (l3vResult.ok) {
          result.l3Vector = {
            success: true,
            id: l3vResult.value.id,
            cached: embeddingResult.value.cached
          }
        }
      }
    } catch (error) {
      log.warn('L3 vector embedding failed', { error })
    }
  } else if (options.skipEmbeddings) {
    result.l3Vector.skipped = true
  }

  // L3.2: Add to lexical FTS index
  const l3lResult = MemoryStore.addToLexicalIndex(chatId, messageId, content)
  if (l3lResult.ok) {
    result.l3Lexical = { success: true }
  }

  // L3.3: Extract entities and build graph
  if (!options.skipEntities && options.llmCall) {
    try {
      const extractionResult = await extractEntities(content, options.llmCall)

      if (extractionResult.ok) {
        let entityCount = 0
        let relationCount = 0

        // Add entities
        const entityIds = new Map<string, string>()
        for (const entity of extractionResult.value.entities) {
          const entityResult = MemoryStore.addEntity(
            entity.type,
            entity.value,
            chatId,
            entity.canonicalForm
          )
          if (entityResult.ok) {
            entityIds.set(entity.value, entityResult.value.id)
            entityCount++
          }
        }

        // Add relations
        for (const relation of extractionResult.value.relations) {
          const sourceId = entityIds.get(relation.sourceEntity.value)
          const targetId = entityIds.get(relation.targetEntity.value)

          if (sourceId && targetId) {
            const relationResult = MemoryStore.addRelation(
              sourceId as any,
              targetId as any,
              relation.relationType,
              messageId,
              relation.confidence
            )
            if (relationResult.ok) {
              relationCount++
            }
          }
        }

        result.l3Graph = {
          success: true,
          entities: entityCount,
          relations: relationCount
        }
      }
    } catch (error) {
      log.warn('L3 entity extraction failed', { error })
    }
  } else if (options.skipEntities) {
    result.l3Graph.skipped = true
  }

  // L4: Compute salience
  if (!options.skipSalience) {
    try {
      const salienceScore = computeSalience(content, {
        affectIntensity: result.l2.success ? undefined : 0.3, // Use L2 if available
        tokenCount
      })

      const threshold = config?.l4SalienceThreshold ?? 0.7
      if (salienceScore >= threshold) {
        const l4Result = MemoryStore.addSalienceEntry(
          chatId,
          messageId,
          content,
          salienceScore
        )
        if (l4Result.ok) {
          result.l4 = { success: true, id: l4Result.value.id }
        }
      } else {
        result.l4.skipped = true
      }
    } catch (error) {
      log.warn('L4 salience computation failed', { error })
    }
  } else {
    result.l4.skipped = true
  }

  // L5: Update co-occurrence graph
  if (!options.skipCooccurrence) {
    try {
      const concepts = extractConcepts(content)

      let nodeCount = 0
      let edgeCount = 0

      // Add nodes
      const nodeIds: string[] = []
      for (const concept of concepts) {
        const nodeResult = MemoryStore.addNode('CONCEPT', concept, chatId)
        if (nodeResult.ok) {
          nodeIds.push(nodeResult.value.id)
          nodeCount++
        }
      }

      // Add edges between all pairs
      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const edgeResult = MemoryStore.addOrReinforceEdge(
            nodeIds[i] as any,
            nodeIds[j] as any,
            1.0
          )
          if (edgeResult.ok) {
            edgeCount++
          }
        }
      }

      result.l5 = {
        success: true,
        nodes: nodeCount,
        edges: edgeCount
      }
    } catch (error) {
      log.warn('L5 co-occurrence tracking failed', { error })
    }
  }

  const duration = Date.now() - startTime
  log.debug('Write pipeline completed', {
    chatId,
    messageId,
    duration,
    l1: result.l1.success,
    l2: result.l2.success,
    l3Vector: result.l3Vector.success,
    l3Lexical: result.l3Lexical.success,
    l3Graph: result.l3Graph.success,
    l4: result.l4.success,
    l5: result.l5.success,
    consolidationTriggered: result.consolidationTriggered
  })

  return Result.ok(result)
}

// =============================================================================
// SALIENCE COMPUTATION
// =============================================================================

interface SalienceFactors {
  affectIntensity?: number
  tokenCount?: number
}

/**
 * Compute salience score for a message.
 * Uses heuristics to estimate how "salient" (important/surprising) a message is.
 */
function computeSalience(content: string, factors: SalienceFactors): number {
  let score = 0
  const lower = content.toLowerCase()

  // Factor 1: Message length (longer = potentially more important)
  const tokenCount = factors.tokenCount ?? estimateTokens(content)
  if (tokenCount > 100) score += 0.1
  if (tokenCount > 500) score += 0.1

  // Factor 2: Questions (indicate uncertainty or exploration)
  const questionCount = (content.match(/\?/g) || []).length
  score += Math.min(questionCount * 0.1, 0.2)

  // Factor 3: Error/problem indicators (high salience)
  if (/\b(error|bug|broken|failed|crash|issue|problem|wrong|fix)\b/.test(lower)) {
    score += 0.3
  }

  // Factor 4: Decision/solution indicators
  if (/\b(decided|solution|solved|fixed|resolved|answer|figured out)\b/.test(lower)) {
    score += 0.25
  }

  // Factor 5: Learning indicators
  if (/\b(learned|realized|discovered|understand|now I know)\b/.test(lower)) {
    score += 0.2
  }

  // Factor 6: Affect intensity (if provided)
  if (factors.affectIntensity && factors.affectIntensity > 0.5) {
    score += factors.affectIntensity * 0.2
  }

  // Factor 7: Code blocks (technical content)
  if (content.includes('```') || content.includes('`')) {
    score += 0.15
  }

  // Factor 8: URLs/references
  if (/https?:\/\//.test(content)) {
    score += 0.1
  }

  // Factor 9: Lists (structured information)
  if (/^[\-\*\d+\.]\s/m.test(content)) {
    score += 0.1
  }

  // Cap at 1.0
  return Math.min(score, 1.0)
}

// =============================================================================
// CONSOLIDATION TRIGGER
// =============================================================================

/**
 * Trigger consolidation when L1 overflows.
 */
async function triggerConsolidation(chatId: ChatId, maxTokens: number): Promise<void> {
  const { consolidate } = await import('./consolidator')
  await consolidate(chatId, 'overflow', maxTokens)
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

/**
 * Process multiple messages in batch.
 * Useful for retroactive processing or migration.
 */
export async function processMessageBatch(
  messages: Array<{ chatId: ChatId; messageId: MessageId; content: string }>,
  options: WritePipelineOptions = {}
): Promise<Result<WriteResult[]>> {
  const results: WriteResult[] = []

  for (const msg of messages) {
    const result = await processMessage(msg.chatId, msg.messageId, msg.content, options)
    if (result.ok) {
      results.push(result.value)
    } else {
      // Continue processing other messages
      log.error('Failed to process message in batch', result.error, { messageId: msg.messageId })
      results.push({
        l1: { success: false },
        l2: { success: false },
        l3Vector: { success: false },
        l3Lexical: { success: false },
        l3Graph: { success: false },
        l4: { success: false },
        l5: { success: false },
        consolidationTriggered: false
      })
    }
  }

  return Result.ok(results)
}
