// =============================================================================
// USE PROVIDER SETTINGS
// =============================================================================
// Hook for managing provider credentials and models via SQLite backend.

import { useState, useCallback, useEffect } from 'react';
import { sendMessage, onMessage } from '../lib/comm-bridge';

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

  // Models - Available (from provider config)
  getAvailableModels: (providerId: string) => Promise<ModelInfo[]>;
  fetchModelsFromAPI: (providerId: string) => Promise<ModelInfo[]>;

  // Models - User's list
  getUserModels: (providerId?: string) => Promise<UserModel[]>;
  addModel: (providerId: string, model: ModelInfo) => Promise<UserModel>;
  removeModel: (providerId: string, modelId: string) => Promise<void>;
  setDefaultModel: (providerId: string, modelId: string) => Promise<void>;
  getDefaultModel: (providerId: string) => Promise<UserModel | null>;

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
    getAvailableModels,
    fetchModelsFromAPI,
    getUserModels,
    addModel,
    removeModel,
    setDefaultModel,
    getDefaultModel,
    getProviderStatus,
  };
}
