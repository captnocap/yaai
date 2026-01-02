// =============================================================================
// PROMPT PROCESSOR
// =============================================================================
// Processes prompts with wildcards, variables, and conditionals.
// Handles: {option1|option2}, {option<tag>}, <tag:conditional>, %img2img.name%

import { readFile, readdir, writeFile, stat, unlink, rename } from 'fs/promises';
import { join, basename, extname } from 'path';
import type { PromptConfig, PromptFile, PromptChangeEvent, ResolvedReference } from '../../../mainview/types/image-gen';
import { IMAGE_GEN_PROMPTS_DIR } from '../paths';

// -----------------------------------------------------------------------------
// PROMPT LIBRARY
// -----------------------------------------------------------------------------

/**
 * List all prompt files in the library.
 */
export async function listPrompts(promptsDir: string = IMAGE_GEN_PROMPTS_DIR): Promise<PromptFile[]> {
  try {
    const entries = await readdir(promptsDir, { withFileTypes: true });
    const prompts: PromptFile[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.txt')) {
        const fullPath = join(promptsDir, entry.name);
        const stats = await stat(fullPath);

        prompts.push({
          name: entry.name.replace(/\.txt$/, ''),
          path: fullPath,
          size: stats.size,
          modifiedAt: stats.mtimeMs,
        });
      }
    }

    // Sort by name
    prompts.sort((a, b) => a.name.localeCompare(b.name));
    return prompts;
  } catch {
    return [];
  }
}

/**
 * Load prompt content by name.
 */
export async function loadPrompt(
  name: string,
  promptsDir: string = IMAGE_GEN_PROMPTS_DIR
): Promise<string> {
  const filename = name.endsWith('.txt') ? name : `${name}.txt`;
  const path = join(promptsDir, filename);
  return readFile(path, 'utf-8');
}

/**
 * Save prompt content.
 */
export async function savePrompt(
  name: string,
  content: string,
  promptsDir: string = IMAGE_GEN_PROMPTS_DIR
): Promise<void> {
  const filename = name.endsWith('.txt') ? name : `${name}.txt`;
  const path = join(promptsDir, filename);
  await writeFile(path, content, 'utf-8');
}

/**
 * Delete a prompt.
 */
export async function deletePrompt(
  name: string,
  promptsDir: string = IMAGE_GEN_PROMPTS_DIR
): Promise<void> {
  const filename = name.endsWith('.txt') ? name : `${name}.txt`;
  const path = join(promptsDir, filename);
  await unlink(path);
}

/**
 * Rename a prompt.
 */
export async function renamePrompt(
  oldName: string,
  newName: string,
  promptsDir: string = IMAGE_GEN_PROMPTS_DIR
): Promise<void> {
  const oldFilename = oldName.endsWith('.txt') ? oldName : `${oldName}.txt`;
  const newFilename = newName.endsWith('.txt') ? newName : `${newName}.txt`;
  const oldPath = join(promptsDir, oldFilename);
  const newPath = join(promptsDir, newFilename);
  await rename(oldPath, newPath);
}

// -----------------------------------------------------------------------------
// PROMPT RESOLUTION
// -----------------------------------------------------------------------------

/**
 * Resolve a PromptConfig to the actual prompt text.
 */
export async function resolvePromptConfig(
  config: PromptConfig,
  promptsDir: string = IMAGE_GEN_PROMPTS_DIR
): Promise<string> {
  switch (config.type) {
    case 'inline':
      return config.value as string;

    case 'library':
      return loadPrompt(config.value as string, promptsDir);

    case 'wildcard': {
      // Pick random from array of prompt names
      const names = config.value as string[];
      if (names.length === 0) return '';
      const selected = names[Math.floor(Math.random() * names.length)];
      return loadPrompt(selected, promptsDir);
    }

    default:
      return '';
  }
}

// -----------------------------------------------------------------------------
// PROMPT PROCESSING
// -----------------------------------------------------------------------------

/**
 * Process prompt text with wildcards, variables, and conditionals.
 * Returns the fully resolved prompt ready for the API.
 */
export function processPrompt(
  text: string,
  references: ResolvedReference[] = [],
  options: ProcessOptions = {}
): string {
  let result = text;

  // Track selected tags for conditional inclusion
  const selectedTags = new Map<string, string>();

  // Step 1: Variable substitution (%img2img.name%, %img2img[0].name%, etc.)
  result = substituteVariables(result, references);

  // Step 2: Tagged wildcard resolution {option1<tag>|option2<tag>}
  result = resolveTaggedWildcards(result, selectedTags);

  // Step 3: Conditional inclusion <tag:text>
  result = resolveConditionals(result, selectedTags);

  // Step 4: Simple wildcard resolution {option1|option2|option3}
  result = resolveSimpleWildcards(result);

  // Step 5: Add safety instructions if references present
  if (references.length > 0 && options.addSafetyInstructions !== false) {
    result = addSafetyInstructions(result);
  }

  // Step 6: Normalize whitespace
  result = normalizeWhitespace(result);

  return result;
}

export interface ProcessOptions {
  addSafetyInstructions?: boolean;
}

// -----------------------------------------------------------------------------
// VARIABLE SUBSTITUTION
// -----------------------------------------------------------------------------

/**
 * Substitute %img2img.*% variables with reference information.
 * Supports:
 *   %img2img.filename% - first reference filename with extension
 *   %img2img.name% - first reference filename without extension
 *   %img2img[0].filename% - indexed reference
 *   %img2img[0].name% - indexed reference name
 */
function substituteVariables(text: string, references: ResolvedReference[]): string {
  // Get all resolved paths flattened
  const allPaths = references.flatMap(r => r.resolvedPaths);

  // %img2img.filename% - first file with extension
  text = text.replace(/%img2img\.filename%/g, () => {
    if (allPaths.length === 0) return '';
    return basename(allPaths[0]);
  });

  // %img2img.name% - first file without extension
  text = text.replace(/%img2img\.name%/g, () => {
    if (allPaths.length === 0) return '';
    const name = basename(allPaths[0]);
    return name.replace(/\.[^/.]+$/, '');
  });

  // %img2img[N].filename% - indexed file with extension
  text = text.replace(/%img2img\[(\d+)\]\.filename%/g, (_, indexStr) => {
    const index = parseInt(indexStr, 10);
    if (index >= allPaths.length) return '';
    return basename(allPaths[index]);
  });

  // %img2img[N].name% - indexed file without extension
  text = text.replace(/%img2img\[(\d+)\]\.name%/g, (_, indexStr) => {
    const index = parseInt(indexStr, 10);
    if (index >= allPaths.length) return '';
    const name = basename(allPaths[index]);
    return name.replace(/\.[^/.]+$/, '');
  });

  return text;
}

// -----------------------------------------------------------------------------
// TAGGED WILDCARDS
// -----------------------------------------------------------------------------

/**
 * Resolve tagged wildcards: {option1<tag>|option2<tag>|option3<tag>}
 * Stores the selected tag for conditional resolution.
 */
function resolveTaggedWildcards(text: string, selectedTags: Map<string, string>): string {
  // Match {content} where content contains at least one <tag>
  const taggedPattern = /\{([^{}]+<[^>]+>[^{}]*)\}/g;

  return text.replace(taggedPattern, (match, inner) => {
    const options = inner.split('|').map((s: string) => s.trim());

    // Parse options and their tags
    const parsed = options.map((opt: string) => {
      const tagMatch = opt.match(/<([^>]+)>/);
      return {
        text: opt.replace(/<[^>]+>/g, '').trim(),
        tag: tagMatch ? tagMatch[1] : null,
      };
    });

    // Select random option
    const selected = parsed[Math.floor(Math.random() * parsed.length)];

    // Store tag if present
    if (selected.tag) {
      selectedTags.set(selected.tag, selected.text);
    }

    return selected.text;
  });
}

// -----------------------------------------------------------------------------
// CONDITIONALS
// -----------------------------------------------------------------------------

/**
 * Resolve conditionals: <tag:text to include if tag was selected>
 */
function resolveConditionals(text: string, selectedTags: Map<string, string>): string {
  // Match <tag:content>
  const conditionalPattern = /<([^:>]+):([^>]+)>/g;

  return text.replace(conditionalPattern, (match, tag, content) => {
    if (selectedTags.has(tag)) {
      return content;
    }
    return '';
  });
}

// -----------------------------------------------------------------------------
// SIMPLE WILDCARDS
// -----------------------------------------------------------------------------

/**
 * Resolve simple wildcards: {option1|option2|option3}
 * These are wildcards without tags.
 */
function resolveSimpleWildcards(text: string): string {
  // Match {content} where content doesn't have tags
  const simplePattern = /\{([^{}<>]+)\}/g;

  return text.replace(simplePattern, (match, inner) => {
    const options = inner.split('|').map((s: string) => s.trim());
    if (options.length === 0) return '';
    return options[Math.floor(Math.random() * options.length)];
  });
}

// -----------------------------------------------------------------------------
// SAFETY INSTRUCTIONS
// -----------------------------------------------------------------------------

const IMG2IMG_SAFETY_SUFFIX = `

[follow the user prompt exactly, do not deviate from the words stated. In the reference images, if there are any watermarks/logos always remove them / do not render them at all unless explicitly asked to do so. Never try and merge together faces and traits unless it is the same person stated by the following prompt or asked to do so explicitly, otherwise, always acknowledge that the reference images have multiple people with distinct key features that need to be retained in the generated image]
prompt:`;

/**
 * Add safety instructions for img2img generation.
 */
function addSafetyInstructions(text: string): string {
  return text + IMG2IMG_SAFETY_SUFFIX;
}

// -----------------------------------------------------------------------------
// WHITESPACE NORMALIZATION
// -----------------------------------------------------------------------------

/**
 * Normalize whitespace: collapse multiple spaces, trim.
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

// -----------------------------------------------------------------------------
// PREVIEW
// -----------------------------------------------------------------------------

/**
 * Preview prompt processing without variable substitution.
 * Useful for showing what wildcards will be resolved.
 */
export function previewPrompt(text: string): {
  wildcards: Array<{ match: string; options: string[] }>;
  conditionals: Array<{ tag: string; content: string }>;
  variables: string[];
} {
  const wildcards: Array<{ match: string; options: string[] }> = [];
  const conditionals: Array<{ tag: string; content: string }> = [];
  const variables: string[] = [];

  // Find wildcards
  const wildcardPattern = /\{([^{}]+)\}/g;
  let match;
  while ((match = wildcardPattern.exec(text)) !== null) {
    const options = match[1].split('|').map(s => s.trim());
    wildcards.push({ match: match[0], options });
  }

  // Find conditionals
  const conditionalPattern = /<([^:>]+):([^>]+)>/g;
  while ((match = conditionalPattern.exec(text)) !== null) {
    conditionals.push({ tag: match[1], content: match[2] });
  }

  // Find variables
  const variablePattern = /%[^%]+%/g;
  while ((match = variablePattern.exec(text)) !== null) {
    variables.push(match[0]);
  }

  return { wildcards, conditionals, variables };
}

// -----------------------------------------------------------------------------
// BATCH PROCESSING
// -----------------------------------------------------------------------------

/**
 * Process a prompt multiple times to generate variations.
 * Each call resolves wildcards differently.
 */
export function generatePromptVariations(
  text: string,
  count: number,
  references: ResolvedReference[] = [],
  options: ProcessOptions = {}
): string[] {
  const variations: string[] = [];

  for (let i = 0; i < count; i++) {
    variations.push(processPrompt(text, references, options));
  }

  return variations;
}
