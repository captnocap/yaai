// =============================================================================
// WORKBENCH TYPES
// =============================================================================
// Types for the Prompt Workbench feature - prompt forging, testing, and management.

// -----------------------------------------------------------------------------
// CORE TYPES
// -----------------------------------------------------------------------------

export type PromptType = 'text' | 'image' | 'tool';
export type MessageRole = 'system' | 'user' | 'assistant';

// -----------------------------------------------------------------------------
// MESSAGE BLOCKS
// -----------------------------------------------------------------------------

export interface MessageBlock {
  id: string;
  role: MessageRole;
  content: string;        // supports {{VARIABLE}} syntax
  isPrefill?: boolean;    // for assistant pre-fill
}

// -----------------------------------------------------------------------------
// VARIABLES
// -----------------------------------------------------------------------------

export interface VariableDefinition {
  name: string;           // key without braces, e.g., "CONTEXT"
  currentValue: string;   // value to use for the next run
  description?: string;
}

// -----------------------------------------------------------------------------
// MODEL CONFIG
// -----------------------------------------------------------------------------

export interface WorkbenchModelConfig {
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
}

export const DEFAULT_MODEL_CONFIG: WorkbenchModelConfig = {
  modelId: 'claude-sonnet-4-20250514',
  temperature: 1,
  maxTokens: 4096,
};

// -----------------------------------------------------------------------------
// TYPE-SPECIFIC CONFIGS
// -----------------------------------------------------------------------------

// For Image Prompts - reuse existing wildcard syntax from image-gen
export interface ImagePromptConfig {
  prompt: string;              // supports {wildcard} syntax
  negativePrompt?: string;
  model: string;
  wildcardSources?: string[];  // folders to pull wildcards from
}

// For Tool/Agent Configs
export interface ToolPromptConfig {
  name: string;
  description: string;
  inputSchema: string;         // JSON schema as string for editing
  instructions?: string;
}

// -----------------------------------------------------------------------------
// WORKBENCH SESSION
// -----------------------------------------------------------------------------

export interface WorkbenchSession {
  id: string;
  name: string;
  type: PromptType;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;

  // Text prompt config
  modelConfig?: WorkbenchModelConfig;
  messages?: MessageBlock[];
  variables?: VariableDefinition[];

  // Image prompt config
  imageConfig?: ImagePromptConfig;

  // Tool config
  toolConfig?: ToolPromptConfig;
}

// -----------------------------------------------------------------------------
// LIBRARY ITEM
// -----------------------------------------------------------------------------

// Summary for list view (lighter than full session)
export interface PromptLibraryItem {
  id: string;
  name: string;
  type: PromptType;
  description?: string;
  updatedAt: string;
  tags?: string[];
}

// -----------------------------------------------------------------------------
// EXECUTION
// -----------------------------------------------------------------------------

export interface WorkbenchRunRequest {
  sessionId: string;
  // Override variables for this run
  variables?: Record<string, string>;
}

export interface WorkbenchRunResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}

export type CodeExportFormat = 'curl' | 'python' | 'typescript' | 'node';

export interface CodeExportRequest {
  sessionId: string;
  format: CodeExportFormat;
  // Include variable placeholders or substitute current values
  includePlaceholders?: boolean;
}

// -----------------------------------------------------------------------------
// EVENTS
// -----------------------------------------------------------------------------

export type WorkbenchEventType =
  | 'session-created'
  | 'session-updated'
  | 'session-deleted'
  | 'run-started'
  | 'run-chunk'
  | 'run-completed'
  | 'run-error';

export interface WorkbenchEvent {
  type: WorkbenchEventType;
  sessionId?: string;
  data?: unknown;
}

// -----------------------------------------------------------------------------
// FACTORY FUNCTIONS
// -----------------------------------------------------------------------------

export function createEmptySession(type: PromptType, name?: string): Omit<WorkbenchSession, 'id' | 'createdAt' | 'updatedAt'> {
  const base = {
    name: name || 'Untitled',
    type,
    description: '',
    tags: [],
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        modelConfig: { ...DEFAULT_MODEL_CONFIG },
        messages: [
          { id: crypto.randomUUID(), role: 'system', content: '' },
          { id: crypto.randomUUID(), role: 'user', content: '' },
        ],
        variables: [],
      };
    case 'image':
      return {
        ...base,
        imageConfig: {
          prompt: '',
          model: 'seedream-v4',
          wildcardSources: [],
        },
      };
    case 'tool':
      return {
        ...base,
        toolConfig: {
          name: '',
          description: '',
          inputSchema: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
          instructions: '',
        },
      };
  }
}

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

// Extract {{VARIABLE}} patterns from content
export function extractVariables(content: string): string[] {
  const regex = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

// Extract all variables from a session's messages
export function extractSessionVariables(session: WorkbenchSession): string[] {
  if (session.type !== 'text' || !session.messages) {
    return [];
  }
  const allVars = new Set<string>();
  for (const msg of session.messages) {
    for (const v of extractVariables(msg.content)) {
      allVars.add(v);
    }
  }
  return Array.from(allVars);
}

// Interpolate variables into content
export function interpolateVariables(
  content: string,
  variables: Record<string, string>
): string {
  return content.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, name) => {
    return variables[name] ?? match;
  });
}
