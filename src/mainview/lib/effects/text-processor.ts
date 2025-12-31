// =============================================================================
// TEXT EFFECT PROCESSOR
// =============================================================================
// Processes text and applies transformation rules (animations, replacements, etc.)

import type { TextRule } from '../../types/effects';

export interface TextSegment {
  type: 'text' | 'effect';
  content: string;
  rule?: TextRule;
  key: string;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a regex from a TextRule
 */
function createRuleRegex(rule: TextRule): RegExp {
  const pattern = rule.isRegex ? rule.match : escapeRegex(rule.match);
  const flags = rule.caseSensitive ? 'g' : 'gi';
  return new RegExp(`(${pattern})`, flags);
}

/**
 * Process text through a single rule, returning segments
 */
function applyRule(segments: TextSegment[], rule: TextRule): TextSegment[] {
  const regex = createRuleRegex(rule);
  let keyCounter = 0;

  return segments.flatMap((segment) => {
    // Don't process already-processed effect segments
    if (segment.type === 'effect') {
      return segment;
    }

    const parts = segment.content.split(regex);
    const result: TextSegment[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      // Check if this part matches the rule
      const isMatch = regex.test(part);
      regex.lastIndex = 0; // Reset regex state

      if (isMatch) {
        result.push({
          type: 'effect',
          content: rule.action === 'replace' ? (rule.replacement || part) : part,
          rule,
          key: `${rule.id}-${keyCounter++}`,
        });
      } else {
        result.push({
          type: 'text',
          content: part,
          key: `text-${keyCounter++}`,
        });
      }
    }

    return result;
  });
}

/**
 * Process text through all enabled rules
 * Rules are applied in order - earlier rules take precedence
 */
export function processText(text: string, rules: TextRule[]): TextSegment[] {
  // Start with the full text as a single segment
  let segments: TextSegment[] = [
    { type: 'text', content: text, key: 'initial' },
  ];

  // Apply each enabled rule in sequence
  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    try {
      segments = applyRule(segments, rule);
    } catch (e) {
      // Invalid regex - skip this rule
      console.warn(`Invalid text rule "${rule.id}":`, e);
    }
  }

  // Generate unique keys for final segments
  return segments.map((seg, i) => ({
    ...seg,
    key: `${seg.key}-${i}`,
  }));
}

/**
 * Quick check if any rules would match in the given text
 * Useful for performance - skip processing if nothing would match
 */
export function hasAnyMatch(text: string, rules: TextRule[]): boolean {
  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    try {
      const regex = createRuleRegex(rule);
      if (regex.test(text)) {
        return true;
      }
    } catch {
      // Invalid regex - skip
    }
  }

  return false;
}

/**
 * Validate a text rule configuration
 */
export function validateRule(rule: Partial<TextRule>): { valid: boolean; error?: string } {
  if (!rule.match || rule.match.trim() === '') {
    return { valid: false, error: 'Match pattern is required' };
  }

  if (!rule.action) {
    return { valid: false, error: 'Action is required' };
  }

  if (rule.action === 'replace' && !rule.replacement) {
    return { valid: false, error: 'Replacement text is required for replace action' };
  }

  if (rule.action !== 'replace' && !rule.className) {
    return { valid: false, error: 'CSS class is required for animate/style/wrap actions' };
  }

  // Test regex validity
  if (rule.isRegex) {
    try {
      new RegExp(rule.match);
    } catch (e) {
      return { valid: false, error: `Invalid regex: ${(e as Error).message}` };
    }
  }

  return { valid: true };
}

/**
 * Create a new text rule with defaults
 */
export function createTextRule(partial: Partial<TextRule>): TextRule {
  return {
    id: partial.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    match: partial.match || '',
    isRegex: partial.isRegex ?? false,
    caseSensitive: partial.caseSensitive ?? false,
    action: partial.action || 'animate',
    replacement: partial.replacement,
    className: partial.className,
    style: partial.style,
    enabled: partial.enabled ?? true,
    name: partial.name,
  };
}
