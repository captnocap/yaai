// =============================================================================
// VIDEO MODEL CONFIGURATION TYPES
// =============================================================================
// Types for configuring video generation models with custom payload structures.
// Video APIs vary radically, so we use a payload builder approach like image models.

// -----------------------------------------------------------------------------
// PARAMETER TYPES (reuse from image model)
// -----------------------------------------------------------------------------

export type VideoModelParamType = 'string' | 'number' | 'boolean' | 'selection';

export interface VideoModelParam {
  /** The JSON key name in the payload */
  key: string;
  /** The type of value */
  type: VideoModelParamType;
  /** The fixed value for this parameter */
  value: string | number | boolean;
  /** For 'selection' type: available choices */
  options?: string[];
}

// -----------------------------------------------------------------------------
// MEDIA INPUT CONFIGURATION
// -----------------------------------------------------------------------------

export interface MediaInputConfig {
  /** Whether this input type is supported */
  supported: boolean;
  /** The key name for this media in the payload */
  paramKey: string;
}

export interface VideoMediaInputConfig {
  /** Image-to-video (img2vid) configuration */
  image: MediaInputConfig;
  /** Video-to-video (vid2vid) configuration */
  video: MediaInputConfig;
  /** Audio-driven video configuration */
  audio: MediaInputConfig;
}

// -----------------------------------------------------------------------------
// VIDEO MODEL CONFIGURATION
// -----------------------------------------------------------------------------

export interface VideoModelConfig {
  /** Unique identifier for this configuration */
  id: string;
  /** The model ID value sent in the payload (e.g., "sora-2", "veo3-1-video") */
  modelId: string;
  /** Human-readable display name */
  displayName: string;
  /** Custom parameters for this model */
  parameters: VideoModelParam[];
  /** Media input (img2vid, vid2vid, audio) configuration */
  mediaInput: VideoMediaInputConfig;
  /** The key name for the prompt in the payload (default: "prompt") */
  promptKey: string;
  /** The key name for the model ID in the payload (default: "model") */
  modelKey: string;
  /** When this config was created */
  createdAt: string;
  /** When this config was last updated */
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const DEFAULT_MEDIA_INPUT_CONFIG: VideoMediaInputConfig = {
  image: { supported: false, paramKey: 'imageDataUrl' },
  video: { supported: false, paramKey: 'videoDataUrl' },
  audio: { supported: false, paramKey: 'audioDataUrl' },
};

// Alias for backward compatibility
export const DEFAULT_VIDEO_MEDIA_INPUT = DEFAULT_MEDIA_INPUT_CONFIG;

export const DEFAULT_VIDEO_MODEL_CONFIG: Omit<VideoModelConfig, 'id' | 'modelId' | 'displayName' | 'createdAt' | 'updatedAt'> = {
  parameters: [],
  mediaInput: DEFAULT_MEDIA_INPUT_CONFIG,
  promptKey: 'prompt',
  modelKey: 'model',
};

export const DEFAULT_VIDEO_ENDPOINT = '/generate-video';

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Create a new video model parameter
 */
export function createVideoParam(
  key: string,
  type: VideoModelParamType,
  value: string | number | boolean,
  options?: string[]
): VideoModelParam {
  return { key, type, value, options };
}

/**
 * Build the payload for a video generation request
 */
export function buildVideoPayload(
  config: VideoModelConfig,
  prompt: string,
  media?: {
    image?: string;  // base64 or URL
    video?: string;  // base64 or URL
    audio?: string;  // base64 or URL
  }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  // Add model ID
  payload[config.modelKey] = config.modelId;

  // Add prompt
  payload[config.promptKey] = prompt;

  // Add fixed parameters
  for (const param of config.parameters) {
    payload[param.key] = param.value;
  }

  // Add media inputs if supported and provided
  if (media?.image && config.mediaInput.image.supported) {
    payload[config.mediaInput.image.paramKey] = media.image;
  }
  if (media?.video && config.mediaInput.video.supported) {
    payload[config.mediaInput.video.paramKey] = media.video;
  }
  if (media?.audio && config.mediaInput.audio.supported) {
    payload[config.mediaInput.audio.paramKey] = media.audio;
  }

  return payload;
}

/**
 * Generate a unique ID for a new video model config
 */
export function generateVideoModelId(): string {
  return `vidmodel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
