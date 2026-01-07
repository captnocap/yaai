// =============================================================================
// AFFECT CLASSIFIER
// =============================================================================
// LLM-based affective state classification for the memory system.

import { Result, Errors, logger } from '../core'
import type { AffectCategory } from '../core/types'
import { isAffectCategory, AFFECT_CATEGORIES } from '../core/types'
import type { AffectClassificationResult } from './types'

const log = logger.child({ module: 'affect-classifier' })

// =============================================================================
// CLASSIFICATION PROMPT
// =============================================================================

const CLASSIFICATION_PROMPT = `You are an expert at detecting emotional and cognitive states in conversation.

Analyze the following message and classify it into ONE of these affective categories:
- FRUSTRATED: User is stuck, expressing annoyance, things aren't working
- CONFUSED: User is uncertain, asking for clarification, doesn't understand
- CURIOUS: User is exploring, interested in learning more, asking questions
- SATISFIED: User achieved their goal, problem solved, expressing thanks
- URGENT: Time-sensitive, needs immediate attention, critical issue
- REFLECTIVE: User is thinking deeply, summarizing, making connections

Message to analyze:
"""
{message}
"""

{context}

Respond ONLY with a valid JSON object (no markdown, no explanation):
{"category": "CATEGORY_NAME", "intensity": 0.0, "reasoning": "brief explanation"}

Rules:
- category must be exactly one of: FRUSTRATED, CONFUSED, CURIOUS, SATISFIED, URGENT, REFLECTIVE
- intensity must be a number between 0.0 and 1.0 (0=weak signal, 1=strong signal)
- reasoning should be 1-2 sentences explaining your classification`

// =============================================================================
// CLASSIFIER
// =============================================================================

export interface ClassifierOptions {
  includeContext?: boolean
  contextMessages?: string[]
}

/**
 * Classify the affective state of a message using LLM.
 *
 * @param messageContent - The message to classify
 * @param llmCall - Function to call the LLM (injected to avoid circular dependencies)
 * @param options - Additional options
 */
export async function classifyAffect(
  messageContent: string,
  llmCall: (prompt: string) => Promise<Result<string>>,
  options?: ClassifierOptions
): Promise<Result<AffectClassificationResult>> {
  try {
    // Build context section
    let contextSection = ''
    if (options?.includeContext && options.contextMessages && options.contextMessages.length > 0) {
      contextSection = `\nRecent conversation context:\n"""\n${options.contextMessages.slice(-3).join('\n---\n')}\n"""`
    }

    // Build prompt
    const prompt = CLASSIFICATION_PROMPT
      .replace('{message}', messageContent)
      .replace('{context}', contextSection)

    // Call LLM
    const llmResult = await llmCall(prompt)
    if (!llmResult.ok) {
      log.error('LLM call failed for affect classification', llmResult.error)
      return Result.err(Errors.memory.classificationFailed(llmResult.error))
    }

    // Parse response
    const parsed = parseClassificationResponse(llmResult.value)
    if (!parsed.ok) {
      log.warn('Failed to parse classification response, using fallback', { response: llmResult.value })
      return Result.ok(fallbackClassification(messageContent))
    }

    log.debug('Classified affect', {
      category: parsed.value.category,
      intensity: parsed.value.intensity
    })

    return Result.ok(parsed.value)
  } catch (error) {
    log.error('Affect classification failed', error as Error)
    // Return fallback instead of failing completely
    return Result.ok(fallbackClassification(messageContent))
  }
}

/**
 * Parse the LLM's JSON response.
 */
function parseClassificationResponse(response: string): Result<AffectClassificationResult> {
  try {
    // Clean up response - remove markdown code blocks if present
    let cleaned = response.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }
    cleaned = cleaned.trim()

    const parsed = JSON.parse(cleaned) as {
      category: string
      intensity: number
      reasoning: string
    }

    // Validate category
    if (!parsed.category || !isAffectCategory(parsed.category)) {
      return Result.err(new Error(`Invalid category: ${parsed.category}`))
    }

    // Validate intensity
    const intensity = typeof parsed.intensity === 'number'
      ? Math.max(0, Math.min(1, parsed.intensity))
      : 0.5

    return Result.ok({
      category: parsed.category as AffectCategory,
      intensity,
      reasoning: parsed.reasoning || 'No reasoning provided'
    })
  } catch (error) {
    return Result.err(error as Error)
  }
}

/**
 * Fallback classification using simple heuristics.
 * Used when LLM call fails or response is unparseable.
 */
function fallbackClassification(message: string): AffectClassificationResult {
  const lower = message.toLowerCase()

  // Check for frustration indicators
  if (/\b(error|bug|broken|wrong|fail|crash|doesn't work|not working|won't|can't|unable)\b/.test(lower)) {
    return {
      category: 'FRUSTRATED',
      intensity: 0.6,
      reasoning: 'Detected error/failure keywords'
    }
  }

  // Check for confusion indicators
  if (/\b(what|how|why|confused|unclear|don't understand|not sure|help me understand)\b/.test(lower) && lower.includes('?')) {
    return {
      category: 'CONFUSED',
      intensity: 0.5,
      reasoning: 'Detected question with uncertainty keywords'
    }
  }

  // Check for urgency indicators
  if (/\b(urgent|asap|emergency|critical|immediately|deadline|now|quickly)\b/.test(lower)) {
    return {
      category: 'URGENT',
      intensity: 0.7,
      reasoning: 'Detected urgency keywords'
    }
  }

  // Check for satisfaction indicators
  if (/\b(thanks|thank you|perfect|great|awesome|excellent|solved|works|working)\b/.test(lower)) {
    return {
      category: 'SATISFIED',
      intensity: 0.6,
      reasoning: 'Detected satisfaction/gratitude keywords'
    }
  }

  // Check for curiosity (questions without frustration)
  if (lower.includes('?') || /\b(wondering|curious|interested|tell me|show me|explain)\b/.test(lower)) {
    return {
      category: 'CURIOUS',
      intensity: 0.5,
      reasoning: 'Detected question or exploration language'
    }
  }

  // Check for reflective indicators
  if (/\b(think|thinking|seems|perhaps|maybe|consider|overall|in summary|looking back)\b/.test(lower)) {
    return {
      category: 'REFLECTIVE',
      intensity: 0.4,
      reasoning: 'Detected reflective/analytical language'
    }
  }

  // Default to curious with low intensity
  return {
    category: 'CURIOUS',
    intensity: 0.3,
    reasoning: 'No strong affect signals detected, defaulting to curious'
  }
}

/**
 * Batch classify multiple messages.
 * Useful for retroactive classification during consolidation.
 */
export async function classifyAffectBatch(
  messages: string[],
  llmCall: (prompt: string) => Promise<Result<string>>
): Promise<Result<AffectClassificationResult[]>> {
  const results: AffectClassificationResult[] = []

  for (const message of messages) {
    const result = await classifyAffect(message, llmCall)
    if (!result.ok) {
      // Use fallback for failed classifications
      results.push(fallbackClassification(message))
    } else {
      results.push(result.value)
    }
  }

  return Result.ok(results)
}

/**
 * Get affect distribution from a list of classifications.
 * Useful for analytics.
 */
export function getAffectDistribution(
  classifications: AffectClassificationResult[]
): Record<AffectCategory, { count: number; avgIntensity: number }> {
  const distribution: Record<AffectCategory, { count: number; totalIntensity: number }> = {
    FRUSTRATED: { count: 0, totalIntensity: 0 },
    CONFUSED: { count: 0, totalIntensity: 0 },
    CURIOUS: { count: 0, totalIntensity: 0 },
    SATISFIED: { count: 0, totalIntensity: 0 },
    URGENT: { count: 0, totalIntensity: 0 },
    REFLECTIVE: { count: 0, totalIntensity: 0 }
  }

  for (const c of classifications) {
    distribution[c.category].count++
    distribution[c.category].totalIntensity += c.intensity
  }

  const result: Record<AffectCategory, { count: number; avgIntensity: number }> = {} as any

  for (const category of AFFECT_CATEGORIES) {
    const data = distribution[category]
    result[category] = {
      count: data.count,
      avgIntensity: data.count > 0 ? data.totalIntensity / data.count : 0
    }
  }

  return result
}
