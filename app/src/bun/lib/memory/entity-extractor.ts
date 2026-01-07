// =============================================================================
// ENTITY EXTRACTOR
// =============================================================================
// LLM-based entity and relation extraction for the L3 knowledge graph.

import { Result, Errors, logger } from '../core'
import type { EntityType, RelationType } from '../core/types'
import { ENTITY_TYPES, RELATION_TYPES } from '../core/types'
import type { EntityExtractionResult, ExtractedEntity, ExtractedRelation } from './types'

const log = logger.child({ module: 'entity-extractor' })

// =============================================================================
// EXTRACTION PROMPT
// =============================================================================

const EXTRACTION_PROMPT = `You are an expert at extracting structured information from text.

Analyze the following message and extract:
1. Named entities (people, concepts, tools, technologies, files, locations)
2. Relations between entities

Message to analyze:
"""
{message}
"""

Respond ONLY with a valid JSON object (no markdown, no explanation):
{
  "entities": [
    {"type": "ENTITY_TYPE", "value": "entity name", "canonicalForm": "normalized name or null"}
  ],
  "relations": [
    {"source": "entity1", "target": "entity2", "type": "RELATION_TYPE", "confidence": 0.8}
  ]
}

Entity types: PERSON, CONCEPT, TOOL, LOCATION, FILE, TECHNOLOGY, OTHER
Relation types: USES, PART_OF, RELATED_TO, MENTIONED_WITH, DEPENDS_ON

Rules:
- Only extract clearly mentioned entities (no inferences)
- Normalize entity names (e.g., "React.js" → "React")
- Confidence should be 0.0-1.0 based on how explicit the relation is
- If no entities found, return {"entities": [], "relations": []}`

// =============================================================================
// EXTRACTOR
// =============================================================================

/**
 * Extract entities and relations from a message using LLM.
 */
export async function extractEntities(
  messageContent: string,
  llmCall: (prompt: string) => Promise<Result<string>>
): Promise<Result<EntityExtractionResult>> {
  try {
    // Skip very short messages
    if (messageContent.length < 20) {
      return Result.ok({ entities: [], relations: [] })
    }

    // Build prompt
    const prompt = EXTRACTION_PROMPT.replace('{message}', messageContent)

    // Call LLM
    const llmResult = await llmCall(prompt)
    if (!llmResult.ok) {
      log.error('LLM call failed for entity extraction', llmResult.error)
      // Fall back to heuristic extraction
      return Result.ok(heuristicExtraction(messageContent))
    }

    // Parse response
    const parsed = parseExtractionResponse(llmResult.value)
    if (!parsed.ok) {
      log.warn('Failed to parse extraction response, using heuristic', { response: llmResult.value })
      return Result.ok(heuristicExtraction(messageContent))
    }

    log.debug('Extracted entities', {
      entityCount: parsed.value.entities.length,
      relationCount: parsed.value.relations.length
    })

    return Result.ok(parsed.value)
  } catch (error) {
    log.error('Entity extraction failed', error as Error)
    return Result.ok(heuristicExtraction(messageContent))
  }
}

/**
 * Parse the LLM's JSON response.
 */
function parseExtractionResponse(response: string): Result<EntityExtractionResult> {
  try {
    // Clean up response
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
      entities: Array<{ type: string; value: string; canonicalForm?: string }>
      relations: Array<{ source: string; target: string; type: string; confidence: number }>
    }

    // Validate and filter entities
    const entities: ExtractedEntity[] = []
    for (const e of parsed.entities ?? []) {
      if (!e.type || !e.value) continue
      const type = e.type.toUpperCase() as EntityType
      if (!ENTITY_TYPES.includes(type)) continue

      entities.push({
        type,
        value: e.value,
        canonicalForm: e.canonicalForm || undefined
      })
    }

    // Validate and filter relations
    const relations: ExtractedRelation[] = []
    for (const r of parsed.relations ?? []) {
      if (!r.source || !r.target || !r.type) continue
      const type = r.type.toUpperCase() as RelationType
      if (!RELATION_TYPES.includes(type)) continue

      // Find source and target entities
      const sourceEntity = entities.find(e => e.value === r.source || e.canonicalForm === r.source)
      const targetEntity = entities.find(e => e.value === r.target || e.canonicalForm === r.target)

      if (sourceEntity && targetEntity) {
        relations.push({
          sourceEntity,
          targetEntity,
          relationType: type,
          confidence: Math.max(0, Math.min(1, r.confidence ?? 0.5))
        })
      }
    }

    return Result.ok({ entities, relations })
  } catch (error) {
    return Result.err(error as Error)
  }
}

/**
 * Heuristic-based entity extraction fallback.
 * Uses pattern matching when LLM is unavailable.
 */
function heuristicExtraction(message: string): EntityExtractionResult {
  const entities: ExtractedEntity[] = []
  const seen = new Set<string>()

  // Technology patterns
  const techPatterns = [
    /\b(React|Vue|Angular|Svelte|Next\.?js|Nuxt|Express|Node\.?js|Deno|Bun)\b/gi,
    /\b(TypeScript|JavaScript|Python|Rust|Go|Java|C\+\+|Ruby|PHP)\b/gi,
    /\b(SQLite|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
    /\b(Docker|Kubernetes|AWS|GCP|Azure|Vercel|Netlify)\b/gi,
    /\b(Git|GitHub|GitLab|npm|yarn|pnpm)\b/gi,
    /\b(VS ?Code|Vim|Neovim|Emacs|WebStorm|IntelliJ)\b/gi,
    /\b(API|REST|GraphQL|WebSocket|HTTP|JSON|XML)\b/gi,
    /\b(CSS|HTML|SCSS|Tailwind|Bootstrap)\b/gi
  ]

  for (const pattern of techPatterns) {
    const matches = message.matchAll(pattern)
    for (const match of matches) {
      const value = match[0]
      const normalized = normalizeTech(value)
      if (!seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase())
        entities.push({
          type: 'TECHNOLOGY',
          value: normalized,
          canonicalForm: normalized
        })
      }
    }
  }

  // File patterns
  const filePatterns = [
    /\b[\w\-]+\.(ts|tsx|js|jsx|py|rs|go|java|rb|php|css|scss|html|json|yaml|yml|md|sql)\b/gi,
    /\b(package\.json|tsconfig\.json|\.env|Dockerfile|docker-compose\.ya?ml)\b/gi
  ]

  for (const pattern of filePatterns) {
    const matches = message.matchAll(pattern)
    for (const match of matches) {
      const value = match[0]
      if (!seen.has(value.toLowerCase())) {
        seen.add(value.toLowerCase())
        entities.push({
          type: 'FILE',
          value
        })
      }
    }
  }

  // Concept patterns (capitalized phrases that look like concepts)
  const conceptPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g
  const conceptMatches = message.matchAll(conceptPattern)
  for (const match of conceptMatches) {
    const value = match[0]
    // Filter out common false positives
    if (!isCommonPhrase(value) && !seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase())
      entities.push({
        type: 'CONCEPT',
        value
      })
    }
  }

  // Tool patterns
  const toolPatterns = [
    /\b(Claude|ChatGPT|GPT-4|Copilot|Cursor|Anthropic|OpenAI)\b/gi,
    /\b(Slack|Discord|Notion|Figma|Linear|Jira|Trello)\b/gi
  ]

  for (const pattern of toolPatterns) {
    const matches = message.matchAll(pattern)
    for (const match of matches) {
      const value = match[0]
      const normalized = normalizeTool(value)
      if (!seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase())
        entities.push({
          type: 'TOOL',
          value: normalized,
          canonicalForm: normalized
        })
      }
    }
  }

  // Generate basic MENTIONED_WITH relations between entities in same message
  const relations: ExtractedRelation[] = []
  if (entities.length >= 2 && entities.length <= 5) {
    for (let i = 0; i < entities.length - 1; i++) {
      relations.push({
        sourceEntity: entities[i],
        targetEntity: entities[i + 1],
        relationType: 'MENTIONED_WITH',
        confidence: 0.5
      })
    }
  }

  return { entities, relations }
}

/**
 * Normalize technology names.
 */
function normalizeTech(value: string): string {
  const normalizations: Record<string, string> = {
    'nodejs': 'Node.js',
    'node.js': 'Node.js',
    'node': 'Node.js',
    'nextjs': 'Next.js',
    'next.js': 'Next.js',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'vscode': 'VS Code',
    'vs code': 'VS Code',
    'postgresql': 'PostgreSQL',
    'postgres': 'PostgreSQL',
    'graphql': 'GraphQL'
  }

  return normalizations[value.toLowerCase()] || value
}

/**
 * Normalize tool names.
 */
function normalizeTool(value: string): string {
  const normalizations: Record<string, string> = {
    'chatgpt': 'ChatGPT',
    'gpt-4': 'GPT-4',
    'gpt4': 'GPT-4'
  }

  return normalizations[value.toLowerCase()] || value
}

/**
 * Check if a phrase is a common false positive.
 */
function isCommonPhrase(phrase: string): boolean {
  const common = [
    'The', 'This', 'That', 'These', 'Those',
    'For Example', 'In This', 'As A', 'To The',
    'Let Me', 'Can You', 'Would You', 'Could You',
    'I Am', 'You Are', 'We Are', 'They Are'
  ]
  return common.some(c => phrase.toLowerCase() === c.toLowerCase())
}

/**
 * Extract concepts/topics from text (simpler than full entity extraction).
 * Used for L5 co-occurrence graph.
 */
export function extractConcepts(message: string): string[] {
  const concepts: string[] = []
  const seen = new Set<string>()

  // Extract technology mentions
  const techPattern = /\b(React|Vue|Angular|TypeScript|JavaScript|Python|Rust|Go|Node\.?js|SQLite|PostgreSQL|Docker|Git|API|CSS|HTML)\b/gi
  const techMatches = message.matchAll(techPattern)
  for (const match of techMatches) {
    const normalized = normalizeTech(match[0]).toLowerCase()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      concepts.push(normalized)
    }
  }

  // Extract significant nouns (simple heuristic)
  const words = message.split(/\s+/)
  for (const word of words) {
    // Skip short words and common words
    if (word.length < 4) continue
    const clean = word.toLowerCase().replace(/[^a-z]/g, '')
    if (clean.length < 4) continue
    if (isStopWord(clean)) continue

    if (!seen.has(clean)) {
      seen.add(clean)
      concepts.push(clean)
    }
  }

  return concepts.slice(0, 10) // Limit to 10 concepts per message
}

/**
 * Check if word is a stop word.
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
    'will', 'would', 'could', 'should', 'about', 'which', 'when', 'where',
    'what', 'there', 'their', 'they', 'them', 'then', 'than', 'some', 'such',
    'just', 'only', 'also', 'very', 'more', 'most', 'other', 'into', 'over',
    'after', 'before', 'between', 'under', 'again', 'further', 'once', 'here',
    'each', 'both', 'through', 'during', 'being', 'having', 'doing', 'does',
    'done', 'make', 'made', 'want', 'need', 'like', 'know', 'think', 'going'
  ])
  return stopWords.has(word)
}
