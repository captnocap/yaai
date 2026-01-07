// =============================================================================
// USE PROVIDER SETTINGS
// =============================================================================
// Hook for managing provider credentials and models via SQLite backend.

import { useState, useCallback, useEffect } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';
import type { ImageModelConfig } from '../types/image-model-config';
import type { EmbeddingModelInfo } from '../types/embedding-model-config';
import type { VideoModelConfig } from '../types/video-model-config';
import type { TTSModelConfig } from '../types/tts-model-config';
import type { TEEModelInfo } from '../types/tee-model-config';

// -----------------------------------------------------------------------------
// API KEY CACHE (sessionStorage for security - clears on window close)
// -----------------------------------------------------------------------------

const API_KEY_CACHE_KEY = 'yaai:api-key-cache';

const apiKeyCache = {
  get(providerId: string): string | null {
    try {
      const cache = JSON.parse(sessionStorage.getItem(API_KEY_CACHE_KEY) || '{}');
      return cache[providerId] || null;
    } catch {
      return null;
    }
  },

  set(providerId: string, apiKey: string): void {
    try {
      const cache = JSON.parse(sessionStorage.getItem(API_KEY_CACHE_KEY) || '{}');
      cache[providerId] = apiKey;
      sessionStorage.setItem(API_KEY_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore storage errors
    }
  },

  setAll(keys: Array<{ provider: string; apiKey: string }>): void {
    try {
      const cache: Record<string, string> = {};
      for (const { provider, apiKey } of keys) {
        cache[provider] = apiKey;
      }
      sessionStorage.setItem(API_KEY_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore storage errors
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(API_KEY_CACHE_KEY);
    } catch {
      // Ignore storage errors
    }
  },
};

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ProviderType = 'anthropic' | 'openai' | 'google';
export type ProviderFormat = 'anthropic' | 'openai' | 'google';

export interface ModelInfo {
  id: string;
  provider: string;
  displayName: string;
  contextWindow: number;
  maxOutput: number;
  supportsVision: boolean;
  supportsTools: boolean;
  inputPrice?: number;
  outputPrice?: number;
}

export interface UserModel extends ModelInfo {
  isDefault: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderStatus {
  provider: string;
  hasCredential: boolean;
  defaultModel: string | null;
  modelCount: number;
  enabledModelCount: number;
}

export interface CredentialInfo {
  exists: boolean;
  id?: string;
  name?: string;
  format?: ProviderFormat;
  baseUrl?: string;
  brandColor?: string;
}

export interface SetCredentialOptions {
  name?: string;
  format?: ProviderFormat;
  baseUrl?: string;
  brandColor?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  format: ProviderFormat;
  baseUrl: string;
  brandColor?: string;
  isBuiltIn?: boolean;
}

export interface UseProviderSettingsReturn {
  // State
  loading: boolean;
  error: string | null;

  // Credentials / Providers
  hasCredential: (providerId: string) => Promise<boolean>;
  getCredential: (providerId: string) => Promise<CredentialInfo | null>;
  setCredential: (providerId: string, apiKey: string, options?: SetCredentialOptions) => Promise<ProviderInfo | null>;
  updateBaseUrl: (providerId: string, baseUrl: string | null) => Promise<void>;
  deleteCredential: (providerId: string) => Promise<void>;
  listCredentials: () => Promise<string[]>;
  getAllProviders: () => Promise<ProviderInfo[]>;

  // API Key reveal (from cache or backend)
  revealApiKey: (providerId: string) => Promise<string | null>;
  cacheAllApiKeys: () => Promise<void>;
  clearApiKeyCache: () => void;

  // Models - Available (from provider config)
  getAvailableModels: (providerId: string) => Promise<ModelInfo[]>;
  fetchModelsFromAPI: (providerId: string) => Promise<ModelInfo[]>;

  // Models - User's list (text models)
  getUserModels: (providerId?: string) => Promise<UserModel[]>;
  addModel: (providerId: string, model: ModelInfo) => Promise<UserModel>;
  removeModel: (providerId: string, modelId: string) => Promise<void>;
  setDefaultModel: (providerId: string, modelId: string) => Promise<void>;
  getDefaultModel: (providerId: string) => Promise<UserModel | null>;

  // Image Models
  getImageEndpoint: (providerId: string) => Promise<string | null>;
  setImageEndpoint: (providerId: string, endpoint: string | null) => Promise<void>;
  getImageModels: (providerId: string) => Promise<ImageModelConfig[]>;
  addImageModel: (providerId: string, model: ImageModelConfig) => Promise<void>;
  updateImageModel: (providerId: string, modelId: string, model: ImageModelConfig) => Promise<void>;
  removeImageModel: (providerId: string, modelId: string) => Promise<void>;

  // Embedding Models
  getEmbeddingEndpoint: (providerId: string) => Promise<string | null>;
  setEmbeddingEndpoint: (providerId: string, endpoint: string | null) => Promise<void>;
  getEmbeddingModels: (providerId: string) => Promise<EmbeddingModelInfo[]>;
  addEmbeddingModel: (providerId: string, model: EmbeddingModelInfo) => Promise<void>;
  updateEmbeddingModel: (providerId: string, modelId: string, model: EmbeddingModelInfo) => Promise<void>;
  removeEmbeddingModel: (providerId: string, modelId: string) => Promise<void>;

  // Video Models
  getVideoEndpoint: (providerId: string) => Promise<string | null>;
  setVideoEndpoint: (providerId: string, endpoint: string | null) => Promise<void>;
  getVideoModels: (providerId: string) => Promise<VideoModelConfig[]>;
  addVideoModel: (providerId: string, model: VideoModelConfig) => Promise<void>;
  updateVideoModel: (providerId: string, modelId: string, model: VideoModelConfig) => Promise<void>;
  removeVideoModel: (providerId: string, modelId: string) => Promise<void>;

  // TTS Models
  getTTSEndpoint: (providerId: string) => Promise<string | null>;
  setTTSEndpoint: (providerId: string, endpoint: string | null) => Promise<void>;
  getTTSModels: (providerId: string) => Promise<TTSModelConfig[]>;
  addTTSModel: (providerId: string, model: TTSModelConfig) => Promise<void>;
  updateTTSModel: (providerId: string, modelId: string, model: TTSModelConfig) => Promise<void>;
  removeTTSModel: (providerId: string, modelId: string) => Promise<void>;

  // TEE Models
  getTEEEndpoint: (providerId: string) => Promise<string | null>;
  setTEEEndpoint: (providerId: string, endpoint: string | null) => Promise<void>;
  getTEEModels: (providerId: string) => Promise<TEEModelInfo[]>;
  addTEEModel: (providerId: string, model: TEEModelInfo) => Promise<void>;
  updateTEEModel: (providerId: string, modelId: string, model: TEEModelInfo) => Promise<void>;
  removeTEEModel: (providerId: string, modelId: string) => Promise<void>;

  // Provider status
  getProviderStatus: (providerId: string) => Promise<ProviderStatus>;
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useProviderSettings(): UseProviderSettingsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // CREDENTIALS
  // ---------------------------------------------------------------------------

  const hasCredential = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      return await sendMessage<boolean>('credentials:has', { provider: providerId });
    } catch {
      return false;
    }
  }, []);

  const getCredential = useCallback(async (providerId: string): Promise<CredentialInfo | null> => {
    try {
      return await sendMessage<CredentialInfo>('credentials:get', { provider: providerId });
    } catch {
      return null;
    }
  }, []);

  const setCredential = useCallback(async (
    providerId: string,
    apiKey: string,
    options?: SetCredentialOptions
  ): Promise<ProviderInfo | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendMessage<{ success: boolean; provider: ProviderInfo }>('credentials:set', {
        provider: providerId,
        apiKey,
        name: options?.name,
        format: options?.format,
        baseUrl: options?.baseUrl,
        brandColor: options?.brandColor,
      });
      // Cache the API key
      apiKeyCache.set(providerId, apiKey);
      return result.provider;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBaseUrl = useCallback(async (
    providerId: string,
    baseUrl: string | null
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:update-base-url', { provider: providerId, baseUrl });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCredential = useCallback(async (providerId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:delete', { provider: providerId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listCredentials = useCallback(async (): Promise<string[]> => {
    try {
      return await sendMessage<string[]>('credentials:list');
    } catch {
      return [];
    }
  }, []);

  const getAllProviders = useCallback(async (): Promise<ProviderInfo[]> => {
    try {
      return await sendMessage<ProviderInfo[]>('credentials:list-all');
    } catch {
      return [];
    }
  }, []);

  // ---------------------------------------------------------------------------
  // API KEY REVEAL / CACHE
  // ---------------------------------------------------------------------------

  const revealApiKey = useCallback(async (providerId: string): Promise<string | null> => {
    // Try cache first
    const cached = apiKeyCache.get(providerId);
    if (cached) return cached;

    // Fetch from backend
    try {
      const result = await sendMessage<{ exists: boolean; apiKey?: string }>('credentials:reveal', {
        provider: providerId
      });
      if (result.exists && result.apiKey) {
        apiKeyCache.set(providerId, result.apiKey);
        return result.apiKey;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const cacheAllApiKeys = useCallback(async (): Promise<void> => {
    try {
      const keys = await sendMessage<Array<{ provider: string; apiKey: string }>>('credentials:get-all-keys');
      apiKeyCache.setAll(keys);
    } catch {
      // Ignore errors
    }
  }, []);

  const clearApiKeyCache = useCallback((): void => {
    apiKeyCache.clear();
  }, []);

  // ---------------------------------------------------------------------------
  // AVAILABLE MODELS
  // ---------------------------------------------------------------------------

  const getAvailableModels = useCallback(async (providerId: string): Promise<ModelInfo[]> => {
    try {
      return await sendMessage<ModelInfo[]>('ai:available-models', { provider: providerId });
    } catch {
      return [];
    }
  }, []);

  const fetchModelsFromAPI = useCallback(async (providerId: string): Promise<ModelInfo[]> => {
    setLoading(true);
    setError(null);
    try {
      return await sendMessage<ModelInfo[]>('ai:fetch-models', { provider: providerId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // USER MODELS
  // ---------------------------------------------------------------------------

  const getUserModels = useCallback(async (providerId?: string): Promise<UserModel[]> => {
    try {
      return await sendMessage<UserModel[]>('ai:models', { provider: providerId });
    } catch {
      return [];
    }
  }, []);

  const addModel = useCallback(async (providerId: string, model: ModelInfo): Promise<UserModel> => {
    setLoading(true);
    setError(null);
    try {
      return await sendMessage<UserModel>('ai:add-model', { provider: providerId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeModel = useCallback(async (providerId: string, modelId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('ai:remove-model', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setDefaultModel = useCallback(async (providerId: string, modelId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('ai:set-default', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDefaultModel = useCallback(async (providerId: string): Promise<UserModel | null> => {
    try {
      return await sendMessage<UserModel | null>('ai:get-default', { provider: providerId });
    } catch {
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // PROVIDER STATUS
  // ---------------------------------------------------------------------------

  const getProviderStatus = useCallback(async (providerId: string): Promise<ProviderStatus> => {
    try {
      return await sendMessage<ProviderStatus>('ai:provider-status', { provider: providerId });
    } catch {
      return {
        provider: providerId,
        hasCredential: false,
        defaultModel: null,
        modelCount: 0,
        enabledModelCount: 0,
      };
    }
  }, []);

  // ---------------------------------------------------------------------------
  // IMAGE MODELS
  // ---------------------------------------------------------------------------

  const getImageEndpoint = useCallback(async (providerId: string): Promise<string | null> => {
    try {
      const result = await sendMessage<{ endpoint: string | null }>('credentials:get-image-endpoint', {
        provider: providerId,
      });
      return result.endpoint;
    } catch {
      return null;
    }
  }, []);

  const setImageEndpoint = useCallback(async (
    providerId: string,
    endpoint: string | null
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:set-image-endpoint', { provider: providerId, endpoint });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getImageModels = useCallback(async (providerId: string): Promise<ImageModelConfig[]> => {
    try {
      const result = await sendMessage<{ models: ImageModelConfig[] }>('credentials:get-image-models', {
        provider: providerId,
      });
      return result.models;
    } catch {
      return [];
    }
  }, []);

  const addImageModel = useCallback(async (
    providerId: string,
    model: ImageModelConfig
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:add-image-model', { provider: providerId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateImageModel = useCallback(async (
    providerId: string,
    modelId: string,
    model: ImageModelConfig
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:update-image-model', { provider: providerId, modelId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeImageModel = useCallback(async (
    providerId: string,
    modelId: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:remove-image-model', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // EMBEDDING MODELS
  // ---------------------------------------------------------------------------

  const getEmbeddingEndpoint = useCallback(async (providerId: string): Promise<string | null> => {
    try {
      const result = await sendMessage<{ endpoint: string | null }>('credentials:get-embedding-endpoint', { provider: providerId });
      return result.endpoint;
    } catch {
      return null;
    }
  }, []);

  const setEmbeddingEndpoint = useCallback(async (providerId: string, endpoint: string | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:set-embedding-endpoint', { provider: providerId, endpoint });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEmbeddingModels = useCallback(async (providerId: string): Promise<EmbeddingModelInfo[]> => {
    try {
      const result = await sendMessage<{ models: EmbeddingModelInfo[] }>('credentials:get-embedding-models', { provider: providerId });
      return result.models;
    } catch {
      return [];
    }
  }, []);

  const addEmbeddingModel = useCallback(async (providerId: string, model: EmbeddingModelInfo): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:add-embedding-model', { provider: providerId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEmbeddingModel = useCallback(async (providerId: string, modelId: string, model: EmbeddingModelInfo): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:update-embedding-model', { provider: providerId, modelId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeEmbeddingModel = useCallback(async (providerId: string, modelId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:remove-embedding-model', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // VIDEO MODELS
  // ---------------------------------------------------------------------------

  const getVideoEndpoint = useCallback(async (providerId: string): Promise<string | null> => {
    try {
      const result = await sendMessage<{ endpoint: string | null }>('credentials:get-video-endpoint', { provider: providerId });
      return result.endpoint;
    } catch {
      return null;
    }
  }, []);

  const setVideoEndpoint = useCallback(async (providerId: string, endpoint: string | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:set-video-endpoint', { provider: providerId, endpoint });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVideoModels = useCallback(async (providerId: string): Promise<VideoModelConfig[]> => {
    try {
      const result = await sendMessage<{ models: VideoModelConfig[] }>('credentials:get-video-models', { provider: providerId });
      return result.models;
    } catch {
      return [];
    }
  }, []);

  const addVideoModel = useCallback(async (providerId: string, model: VideoModelConfig): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:add-video-model', { provider: providerId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateVideoModel = useCallback(async (providerId: string, modelId: string, model: VideoModelConfig): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:update-video-model', { provider: providerId, modelId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeVideoModel = useCallback(async (providerId: string, modelId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:remove-video-model', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // TTS MODELS
  // ---------------------------------------------------------------------------

  const getTTSEndpoint = useCallback(async (providerId: string): Promise<string | null> => {
    try {
      const result = await sendMessage<{ endpoint: string | null }>('credentials:get-tts-endpoint', { provider: providerId });
      return result.endpoint;
    } catch {
      return null;
    }
  }, []);

  const setTTSEndpoint = useCallback(async (providerId: string, endpoint: string | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:set-tts-endpoint', { provider: providerId, endpoint });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTTSModels = useCallback(async (providerId: string): Promise<TTSModelConfig[]> => {
    try {
      const result = await sendMessage<{ models: TTSModelConfig[] }>('credentials:get-tts-models', { provider: providerId });
      return result.models;
    } catch {
      return [];
    }
  }, []);

  const addTTSModel = useCallback(async (providerId: string, model: TTSModelConfig): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:add-tts-model', { provider: providerId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTTSModel = useCallback(async (providerId: string, modelId: string, model: TTSModelConfig): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:update-tts-model', { provider: providerId, modelId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeTTSModel = useCallback(async (providerId: string, modelId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:remove-tts-model', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // TEE MODELS
  // ---------------------------------------------------------------------------

  const getTEEEndpoint = useCallback(async (providerId: string): Promise<string | null> => {
    try {
      const result = await sendMessage<{ endpoint: string | null }>('credentials:get-tee-endpoint', { provider: providerId });
      return result.endpoint;
    } catch {
      return null;
    }
  }, []);

  const setTEEEndpoint = useCallback(async (providerId: string, endpoint: string | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:set-tee-endpoint', { provider: providerId, endpoint });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTEEModels = useCallback(async (providerId: string): Promise<TEEModelInfo[]> => {
    try {
      const result = await sendMessage<{ models: TEEModelInfo[] }>('credentials:get-tee-models', { provider: providerId });
      return result.models;
    } catch {
      return [];
    }
  }, []);

  const addTEEModel = useCallback(async (providerId: string, model: TEEModelInfo): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:add-tee-model', { provider: providerId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTEEModel = useCallback(async (providerId: string, modelId: string, model: TEEModelInfo): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:update-tee-model', { provider: providerId, modelId, model });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeTEEModel = useCallback(async (providerId: string, modelId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendMessage('credentials:remove-tee-model', { provider: providerId, modelId });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    hasCredential,
    getCredential,
    setCredential,
    updateBaseUrl,
    deleteCredential,
    listCredentials,
    getAllProviders,
    revealApiKey,
    cacheAllApiKeys,
    clearApiKeyCache,
    getAvailableModels,
    fetchModelsFromAPI,
    getUserModels,
    addModel,
    removeModel,
    setDefaultModel,
    getDefaultModel,
    // Image models
    getImageEndpoint,
    setImageEndpoint,
    getImageModels,
    addImageModel,
    updateImageModel,
    removeImageModel,
    // Embedding models
    getEmbeddingEndpoint,
    setEmbeddingEndpoint,
    getEmbeddingModels,
    addEmbeddingModel,
    updateEmbeddingModel,
    removeEmbeddingModel,
    // Video models
    getVideoEndpoint,
    setVideoEndpoint,
    getVideoModels,
    addVideoModel,
    updateVideoModel,
    removeVideoModel,
    // TTS models
    getTTSEndpoint,
    setTTSEndpoint,
    getTTSModels,
    addTTSModel,
    updateTTSModel,
    removeTTSModel,
    // TEE models
    getTEEEndpoint,
    setTEEEndpoint,
    getTEEModels,
    addTEEModel,
    updateTEEModel,
    removeTEEModel,
    getProviderStatus,
  };
}
