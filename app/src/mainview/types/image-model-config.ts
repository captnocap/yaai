// =============================================================================
// IMAGE MODEL CONFIGURATION TYPES
// =============================================================================
// Types for configuring image generation models with custom payload structures.
// Each provider can have multiple image models with different parameters.

// -----------------------------------------------------------------------------
// PARAMETER TYPES
// -----------------------------------------------------------------------------

export type ImageModelParamType = 'string' | 'number' | 'boolean' | 'selection';

export interface ImageModelParam {
  /** The JSON key name in the payload */
  key: string;
  /** The type of value */
  type: ImageModelParamType;
  /** The fixed value for this parameter */
  value: string | number | boolean;
  /** For 'selection' type: available choices */
  options?: string[];
}

// -----------------------------------------------------------------------------
// IMG2IMG CONFIGURATION
// -----------------------------------------------------------------------------

export interface Img2ImgConfig {
  /** Whether this model supports image attachments */
  supported: boolean;
  /** Maximum number of images that can be attached (0 if not supported) */
  maxImages: number;
  /** The key name for the images array in the payload (default: "imageDataUrls") */
  paramKey: string;
}

// -----------------------------------------------------------------------------
// IMAGE MODEL CONFIGURATION
// -----------------------------------------------------------------------------

export interface ImageModelConfig {
  /** Unique identifier for this configuration */
  id: string;
  /** The model ID value sent in the payload (e.g., "nano-banana-pro-ultra") */
  modelId: string;
  /** Human-readable display name */
  displayName: string;
  /** Custom parameters for this model */
  parameters: ImageModelParam[];
  /** Image attachment (img2img) configuration */
  img2img: Img2ImgConfig;
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

export const DEFAULT_IMG2IMG_CONFIG: Img2ImgConfig = {
  supported: false,
  maxImages: 0,
  paramKey: 'imageDataUrls',
};

export const DEFAULT_IMAGE_MODEL_CONFIG: Omit<ImageModelConfig, 'id' | 'modelId' | 'displayName' | 'createdAt' | 'updatedAt'> = {
  parameters: [],
  img2img: DEFAULT_IMG2IMG_CONFIG,
  promptKey: 'prompt',
  modelKey: 'model',
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Create a new image model parameter
 */
export function createParam(
  key: string,
  type: ImageModelParamType,
  value: string | number | boolean,
  options?: string[]
): ImageModelParam {
  return { key, type, value, options };
}

/**
 * Build the payload for an image generation request
 */
export function buildPayload(
  config: ImageModelConfig,
  prompt: string,
  images?: string[]
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

  // Add images if supported and provided
  if (config.img2img.supported && images && images.length > 0) {
    // Limit to max allowed
    const limitedImages = images.slice(0, config.img2img.maxImages);
    payload[config.img2img.paramKey] = limitedImages;
  }

  return payload;
}

/**
 * Generate a unique ID for a new image model config
 */
export function generateImageModelId(): string {
  return `imgmodel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
