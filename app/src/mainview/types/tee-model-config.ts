// =============================================================================
// TEE MODEL CONFIGURATION TYPES
// =============================================================================
// Types for configuring TEE (Trusted Execution Environment) models.
// TEE models are text/vision models served on a separate endpoint using
// standard chat format. No payload builder needed.

// -----------------------------------------------------------------------------
// TEE MODEL INFO
// -----------------------------------------------------------------------------

export interface TEEModelInfo {
  /** Model ID (e.g., 'tee-vision-cheap') */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Whether this model supports vision/images */
  supportsVision: boolean;
  /** When this config was created */
  createdAt?: string;
  /** When this config was last updated */
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

export const DEFAULT_TEE_ENDPOINT = '/v1/tee/chat/completions';

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Generate a unique ID for a new TEE model config
 */
export function generateTEEModelId(): string {
  return `teemodel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
