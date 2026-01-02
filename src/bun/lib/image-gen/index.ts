// =============================================================================
// IMAGE GEN MODULE
// =============================================================================
// Main export for image generation backend services.

// Store
export {
  ImageGenStore,
  getImageGenStore,
  resetImageGenStore,
} from './image-gen-store';

// Dispatcher
export {
  RequestDispatcher,
  getDispatcher,
  resetDispatcher,
  type DispatcherState,
} from './request-dispatcher';

// Rate Limiter
export {
  RateLimiter,
  getRateLimiter,
  resetRateLimiter,
} from './rate-limiter';

// Concurrency Limiter
export {
  ConcurrencyLimiter,
  getConcurrencyLimiter,
  resetConcurrencyLimiter,
} from './concurrency-limiter';

// API Client
export {
  ImageGenAPIClient,
  getAPIClient,
  resetAPIClient,
  buildPayload,
  APIClientError,
  type GenerateResult,
} from './api-client';

// Image Compressor
export {
  compressImage,
  compressBuffer,
  generateThumbnail,
  getCachedThumbnail,
  getImageDimensions,
  calculatePerImageBudget,
  calculateBudget,
  estimateBase64Size,
  formatBytes,
} from './image-compressor';

// Reference Resolver
export {
  expandPath,
  parseReferencePattern,
  resolvePattern,
  resolvePatterns,
  getRoots,
  getFolderContents,
  getFolderStats,
  getCachedFolderImages,
  invalidateFolderCache,
  clearFolderCache,
  type FolderNode,
  type FolderContents,
} from './reference-resolver';

// Prompt Processor
export {
  listPrompts,
  loadPrompt,
  savePrompt,
  deletePrompt,
  renamePrompt,
  resolvePromptConfig,
  processPrompt,
  previewPrompt,
  generatePromptVariations,
  type ProcessOptions,
} from './prompt-processor';
