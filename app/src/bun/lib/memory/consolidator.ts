// =============================================================================
// CONSOLIDATOR (SHADOW CURATOR)
// =============================================================================
// Consolidates evicted L1 entries and maintains memory coherence.

import { Result, logger, generateId } from '../core'
import type { ChatId } from '../core/types'
import { MemoryStore } from './memory-store'
import type { L1RiverEntry, ConsolidationRun } from './types'

const log = logger.child({ module: 'consolidator' })

// =============================================================================
// CONSOLIDATION
// =============================================================================

/**
 * Run consolidation for a chat.
 * Called when L1 overflows or on schedule.
 */
export async function consolidate(
  chatId: ChatId,
  triggerType: 'overflow' | 'scheduled' | 'manual',
  maxTokens?: number
): Promise<Result<ConsolidationRun>> {
  const runId = generateId()
  const startedAt = new Date().toISOString()

  log.info('Starting consolidation', { chatId, triggerType, runId })

  try {
    // 1. Evict oldest entries from L1 if needed
    let evictedItems: L1RiverEntry[] = []
    if (maxTokens) {
      const evictResult = MemoryStore.evictFromRiver(chatId, maxTokens)
      if (evictResult.ok) {
        evictedItems = evictResult.value
      } else {
        log.error('Failed to evict from L1', evictResult.error)
      }
    }

    if (evictedItems.length === 0 && triggerType === 'overflow') {
      // Nothing to consolidate
      const run: ConsolidationRun = {
        id: runId,
        chatId,
        triggerType,
        itemsProcessed: 0,
        summariesCreated: 0,
        conflictsDetected: 0,
        startedAt,
        completedAt: new Date().toISOString()
      }
      MemoryStore.recordConsolidationRun(run)
      return Result.ok(run)
    }

    let summariesCreated = 0
    let conflictsDetected = 0

    // 2. Summarize evicted items (if we have LLM access)
    // For now, skip summarization - can be added later with LLM call
    // The evicted items are still in L3 via FTS5, so they're searchable

    // 3. Retroactive salience extraction
    // Check if any evicted items had high impact on subsequent conversation
    // This would require analyzing the conversation flow - simplified for now
    for (const item of evictedItems) {
      // Check if this message was referenced or led to important outcomes
      // For MVP, we'll rely on the initial salience scoring during write pipeline
    }

    // 4. Conflict detection in L3
    // Look for contradictory information in the knowledge graph
    // Simplified: check for entities with conflicting relations
    const conflicts = await detectConflicts(chatId)
    conflictsDetected = conflicts.length

    // 5. L5 edge pruning
    const config = MemoryStore.getConfig()
    const decayRate = config.ok ? config.value.l5TemporalDecayRate : 0.98

    // Apply decay to all edges
    MemoryStore.decayEdges(decayRate)

    // Prune weak edges
    const pruned = MemoryStore.pruneWeakEdges(0.1)
    if (pruned.ok) {
      log.debug('Pruned L5 edges', { count: pruned.value })
    }

    // 6. L2 affect decay
    const l2DecayRate = config.ok ? config.value.l2DecayRate : 0.95
    MemoryStore.decayAffectEntries(chatId, l2DecayRate)

    const completedAt = new Date().toISOString()

    const run: ConsolidationRun = {
      id: runId,
      chatId,
      triggerType,
      itemsProcessed: evictedItems.length,
      summariesCreated,
      conflictsDetected,
      startedAt,
      completedAt
    }

    // Record the run
    MemoryStore.recordConsolidationRun(run)

    log.info('Consolidation completed', {
      chatId,
      runId,
      itemsProcessed: evictedItems.length,
      summariesCreated,
      conflictsDetected,
      duration: Date.now() - new Date(startedAt).getTime()
    })

    return Result.ok(run)
  } catch (error) {
    log.error('Consolidation failed', error as Error)

    // Record failed run
    const run: ConsolidationRun = {
      id: runId,
      chatId,
      triggerType,
      itemsProcessed: 0,
      summariesCreated: 0,
      conflictsDetected: 0,
      startedAt,
      completedAt: new Date().toISOString()
    }
    MemoryStore.recordConsolidationRun(run)

    return Result.err(error as Error)
  }
}

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

interface Conflict {
  entityValue: string
  conflictType: 'contradictory_relations' | 'duplicate_entities' | 'temporal_inconsistency'
  details: string
}

/**
 * Detect conflicts in the L3 knowledge graph.
 */
async function detectConflicts(chatId: ChatId): Promise<Conflict[]> {
  const conflicts: Conflict[] = []

  // This is a simplified conflict detection
  // Full implementation would involve:
  // 1. Checking for contradictory relations (A USES B vs A DEPENDS_ON C where B and C are alternatives)
  // 2. Detecting semantic duplicates (React.js vs React)
  // 3. Temporal inconsistencies (old information contradicting new)

  // For MVP, we just log that conflict detection ran
  log.debug('Conflict detection completed', { chatId, conflicts: conflicts.length })

  return conflicts
}

// =============================================================================
// SCHEDULED CONSOLIDATION
// =============================================================================

let consolidationInterval: Timer | null = null

/**
 * Start scheduled consolidation for all active chats.
 */
export function startScheduledConsolidation(intervalSeconds: number = 3600): void {
  if (consolidationInterval) {
    clearInterval(consolidationInterval)
  }

  consolidationInterval = setInterval(async () => {
    log.debug('Running scheduled consolidation')

    // Get chats with recent activity
    // In production, this would query for chats with activity since last consolidation
    // For now, this is a placeholder

    // const activeChats = await getActiveChats()
    // for (const chatId of activeChats) {
    //   await consolidate(chatId, 'scheduled')
    // }
  }, intervalSeconds * 1000)

  log.info('Started scheduled consolidation', { intervalSeconds })
}

/**
 * Stop scheduled consolidation.
 */
export function stopScheduledConsolidation(): void {
  if (consolidationInterval) {
    clearInterval(consolidationInterval)
    consolidationInterval = null
    log.info('Stopped scheduled consolidation')
  }
}

// =============================================================================
// SUMMARIZATION (FUTURE)
// =============================================================================

/**
 * Summarize a batch of messages into a dense representation.
 * Requires LLM call - placeholder for future implementation.
 */
async function summarizeMessages(
  messages: L1RiverEntry[],
  llmCall?: (prompt: string) => Promise<Result<string>>
): Promise<Result<string[]>> {
  if (!llmCall) {
    return Result.ok([])
  }

  // Group messages by topic/thread
  // Generate concise summaries
  // This would use prompts like:
  // "Summarize the following conversation messages into 2-3 key points..."

  return Result.ok([])
}

// =============================================================================
// MAINTENANCE
// =============================================================================

/**
 * Run full maintenance on memory system.
 * Call during low-activity periods.
 */
export async function runMaintenance(chatId: ChatId): Promise<void> {
  log.info('Running memory maintenance', { chatId })

  // 1. Run consolidation
  await consolidate(chatId, 'manual')

  // 2. Clean up orphaned entities
  // Entities not referenced by any relations

  // 3. Optimize FTS5 index
  // SQLite FTS5 has a 'optimize' command

  // 4. Update statistics

  log.info('Memory maintenance completed', { chatId })
}

/**
 * Clear all memory for a chat.
 * Use with caution - this is destructive.
 */
export function clearChatMemory(chatId: ChatId): Result<void> {
  try {
    // This would need direct SQL access to delete across all tables
    // For safety, leaving as placeholder
    log.warn('clearChatMemory called', { chatId })

    return Result.ok(undefined)
  } catch (error) {
    log.error('Failed to clear chat memory', error as Error)
    return Result.err(error as Error)
  }
}
