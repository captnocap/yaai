// =============================================================================
// API CLIENT
// =============================================================================
// HTTP client for nano-gpt.com image generation API.
// Handles payload construction, request execution, and response parsing.

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import type {
  APIPayload,
  StandardPayload,
  ResolutionPayload,
  APIResponse,
  APIError,
  ModelConfig,
  QueueEntry,
  ResolvedReference,
  CompressionResult,
  SavedFile,
  ResolutionPreset,
} from '../../../mainview/types/image-gen';
import { IMAGE_GEN_OUTPUTS_DIR } from '../paths';

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

const DEFAULT_API_URL = 'https://nano-gpt.com/api/generate-image';

// -----------------------------------------------------------------------------
// API CLIENT
// -----------------------------------------------------------------------------

export class ImageGenAPIClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string = DEFAULT_API_URL, apiKey: string = '') {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Update API configuration.
   */
  configure(config: { apiUrl?: string; apiKey?: string }): void {
    if (config.apiUrl) this.apiUrl = config.apiUrl;
    if (config.apiKey) this.apiKey = config.apiKey;
  }

  /**
   * Generate images using the API.
   */
  async generate(
    payload: APIPayload,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    if (!this.apiKey) {
      throw new APIClientError('API key not configured', 401);
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new APIClientError(
        `API request failed: ${errorText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json() as APIResponse;
    const images = extractImages(data);

    return {
      images,
      count: images.length,
      model: payload.model,
    };
  }

  /**
   * Generate and save images to disk.
   */
  async generateAndSave(
    payload: APIPayload,
    outputDir: string = IMAGE_GEN_OUTPUTS_DIR,
    filenamePrefix: string = 'gen',
    signal?: AbortSignal
  ): Promise<SavedFile[]> {
    const result = await this.generate(payload, signal);
    const savedFiles: SavedFile[] = [];

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    for (let i = 0; i < result.images.length; i++) {
      const base64 = result.images[i];
      const buffer = Buffer.from(base64, 'base64');
      const timestamp = Date.now();
      const filename = `${filenamePrefix}_${timestamp}_${i}.png`;
      const filepath = join(outputDir, filename);

      await writeFile(filepath, buffer);

      savedFiles.push({
        filename,
        path: filepath,
        size: buffer.length,
      });
    }

    return savedFiles;
  }

  /**
   * Test API connection with a minimal request.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Just check if we can reach the endpoint
      const response = await fetch(this.apiUrl, {
        method: 'HEAD',
      });
      return response.status < 500;
    } catch {
      return false;
    }
  }
}

// -----------------------------------------------------------------------------
// PAYLOAD CONSTRUCTION
// -----------------------------------------------------------------------------

/**
 * Build API payload from queue entry and resolved references.
 */
export function buildPayload(
  entry: QueueEntry,
  prompt: string,
  references: CompressionResult[],
  modelConfig: ModelConfig
): APIPayload {
  // Build image data URLs
  const imageDataUrls = references.map(
    ref => `data:image/jpeg;base64,${ref.base64}`
  );

  if (modelConfig.payloadType === 'standard') {
    return buildStandardPayload(entry, prompt, imageDataUrls, modelConfig);
  } else {
    return buildResolutionPayload(entry, prompt, imageDataUrls, modelConfig);
  }
}

/**
 * Build standard payload (width/height based).
 */
function buildStandardPayload(
  entry: QueueEntry,
  prompt: string,
  imageDataUrls: string[],
  modelConfig: ModelConfig
): StandardPayload {
  const payload: StandardPayload = {
    prompt,
    model: entry.model,
    width: entry.resolution.width || 4096,
    height: entry.resolution.height || 4096,
    nImages: entry.imagesPerBatch,
    responseFormat: 'b64_json',
    showExplicitContent: true,
  };

  // Add references if present
  if (imageDataUrls.length > 0) {
    payload.imageDataUrls = imageDataUrls;
  }

  // Add style if present
  if (entry.style) {
    payload.style = entry.style;
  }

  // Add model-specific params
  if (entry.extParams.guidanceScale !== undefined) {
    payload.guidance_scale = entry.extParams.guidanceScale;
  }
  if (entry.extParams.safetyChecker !== undefined) {
    payload.enable_safety_checker = entry.extParams.safetyChecker;
  }

  // Apply model defaults
  const defaults = modelConfig.defaultParams as Record<string, unknown>;
  if (defaults.guidance_scale !== undefined && payload.guidance_scale === undefined) {
    payload.guidance_scale = defaults.guidance_scale as number;
  }
  if (defaults.enable_safety_checker !== undefined && payload.enable_safety_checker === undefined) {
    payload.enable_safety_checker = defaults.enable_safety_checker as boolean;
  }

  return payload;
}

/**
 * Build resolution-based payload.
 */
function buildResolutionPayload(
  entry: QueueEntry,
  prompt: string,
  imageDataUrls: string[],
  modelConfig: ModelConfig
): ResolutionPayload {
  const payload: ResolutionPayload = {
    prompt,
    model: entry.model,
    resolution: (entry.resolution.preset || 'auto') as ResolutionPreset,
    nImages: entry.imagesPerBatch,
    responseFormat: 'b64_json',
    showExplicitContent: true,
  };

  // Add aspect ratio
  if (entry.resolution.aspectRatio) {
    payload.aspect_ratio = entry.resolution.aspectRatio;
  } else if (entry.extParams.aspectRatio) {
    payload.aspect_ratio = entry.extParams.aspectRatio;
  }

  // Add references if present
  if (imageDataUrls.length > 0) {
    payload.imageDataUrls = imageDataUrls;
  }

  // Add style if present
  if (entry.style) {
    payload.style = entry.style;
  }

  // Add model-specific params (riverflow)
  if (entry.extParams.steps !== undefined) {
    payload.steps = entry.extParams.steps;
  }
  if (entry.extParams.cfgScale !== undefined) {
    payload.CFGScale = entry.extParams.cfgScale;
  }
  if (entry.extParams.strength !== undefined) {
    payload.strength = entry.extParams.strength;
  }

  // Add seed (wan)
  if (entry.extParams.seed !== undefined && entry.extParams.seed !== null) {
    payload.seed = entry.extParams.seed;
  }

  // Apply model defaults
  const defaults = modelConfig.defaultParams as Record<string, unknown>;
  if (defaults.resolution !== undefined && payload.resolution === 'auto') {
    payload.resolution = defaults.resolution as ResolutionPreset;
  }
  if (defaults.aspect_ratio !== undefined && !payload.aspect_ratio) {
    payload.aspect_ratio = defaults.aspect_ratio as typeof payload.aspect_ratio;
  }
  if (defaults.steps !== undefined && payload.steps === undefined) {
    payload.steps = defaults.steps as number;
  }
  if (defaults.CFGScale !== undefined && payload.CFGScale === undefined) {
    payload.CFGScale = defaults.CFGScale as number;
  }
  if (defaults.strength !== undefined && payload.strength === undefined) {
    payload.strength = defaults.strength as number;
  }

  return payload;
}

// -----------------------------------------------------------------------------
// RESPONSE PARSING
// -----------------------------------------------------------------------------

/**
 * Extract base64 images from API response.
 */
function extractImages(response: APIResponse): string[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }

  return response.data
    .map(item => item.b64_json || item.image || '')
    .filter(Boolean);
}

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GenerateResult {
  images: string[];  // base64 encoded
  count: number;
  model: string;
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

export class APIClientError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = 'APIClientError';
    this.status = status;
    this.details = details;
  }

  /**
   * Check if error is retryable.
   */
  isRetryable(): boolean {
    return [429, 500, 502, 503, 504].includes(this.status);
  }

  /**
   * Check if error is fatal (no retry).
   */
  isFatal(): boolean {
    return [400, 401, 413].includes(this.status);
  }

  /**
   * Get user-friendly error message.
   */
  getUserMessage(): string {
    switch (this.status) {
      case 400:
        return 'Invalid request parameters. Check your settings.';
      case 401:
        return 'Invalid API key. Please check your credentials.';
      case 413:
        return 'Payload too large. Reduce reference images or increase compression.';
      case 429:
        return 'Rate limited. Request will be retried automatically.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Request will be retried automatically.';
      default:
        return this.message;
    }
  }

  /**
   * Get hint for resolving the error.
   */
  getHint(): string | null {
    switch (this.status) {
      case 413:
        return 'Try reducing the number of reference images or lowering the compression quality settings.';
      case 401:
        return 'Go to Settings → Image Generation to update your API key.';
      case 429:
        return 'The queue will automatically resume once rate limits reset.';
      default:
        return null;
    }
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let apiClientInstance: ImageGenAPIClient | null = null;

export function getAPIClient(apiUrl?: string, apiKey?: string): ImageGenAPIClient {
  if (!apiClientInstance) {
    apiClientInstance = new ImageGenAPIClient(apiUrl, apiKey);
  } else if (apiUrl || apiKey) {
    apiClientInstance.configure({ apiUrl, apiKey });
  }
  return apiClientInstance;
}

export function resetAPIClient(): void {
  apiClientInstance = null;
}
