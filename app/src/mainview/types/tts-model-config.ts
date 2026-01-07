// =============================================================================
// TTS MODEL CONFIGURATION TYPES
// =============================================================================
// Types for configuring text-to-speech models with custom payload structures.
// TTS has moderate variance (voice, format, speed parameters).

// -----------------------------------------------------------------------------
// PARAMETER TYPES (reuse pattern from image/video)
// -----------------------------------------------------------------------------

export type TTSModelParamType = 'string' | 'number' | 'boolean' | 'selection';

export interface TTSModelParam {
  /** The JSON key name in the payload */
  key: string;
  /** The type of value */
  type: TTSModelParamType;
  /** The fixed value for this parameter */
  value: string | number | boolean;
  /** For 'selection' type: available choices */
  options?: string[];
}

// -----------------------------------------------------------------------------
// TTS MODEL CONFIGURATION
// -----------------------------------------------------------------------------

export interface TTSModelConfig {
  /** Unique identifier for this configuration */
  id: string;
  /** The model ID value sent in the payload (e.g., "nano-tts-1", "Elevenlabs-Turbo-V2.5") */
  modelId: string;
  /** Human-readable display name */
  displayName: string;
  /** Custom parameters for this model (voice, format, speed, etc.) */
  parameters: TTSModelParam[];
  /** The key name for the input text in the payload (default: "input") */
  inputKey: string;
  /** The key name for the model ID in the payload (default: "model") */
  modelKey: string;
  /** Whether this model uses async processing (poll status endpoint) */
  async: boolean;
  /** When this config was created */
  createdAt: string;
  /** When this config was last updated */
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const DEFAULT_TTS_MODEL_CONFIG: Omit<TTSModelConfig, 'id' | 'modelId' | 'displayName' | 'createdAt' | 'updatedAt'> = {
  parameters: [],
  inputKey: 'input',
  modelKey: 'model',
  async: false,
};

export const DEFAULT_TTS_ENDPOINT = '/api/v1/speech';

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Create a new TTS model parameter
 */
export function createTTSParam(
  key: string,
  type: TTSModelParamType,
  value: string | number | boolean,
  options?: string[]
): TTSModelParam {
  return { key, type, value, options };
}

/**
 * Build the payload for a TTS request
 */
export function buildTTSPayload(
  config: TTSModelConfig,
  inputText: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  // Add model ID
  payload[config.modelKey] = config.modelId;

  // Add input text
  payload[config.inputKey] = inputText;

  // Add fixed parameters
  for (const param of config.parameters) {
    payload[param.key] = param.value;
  }

  return payload;
}

/**
 * Generate a unique ID for a new TTS model config
 */
export function generateTTSModelId(): string {
  return `ttsmodel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
