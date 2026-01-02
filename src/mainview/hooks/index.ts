// =============================================================================
// HOOKS
// =============================================================================

export {
  useEffectsSettings,
  type UseEffectsSettingsReturn,
} from './useEffectsSettings';

export {
  useArtifacts,
  type UseArtifactsReturn,
  type UseArtifactsOptions,
} from './useArtifacts';

export {
  useChatHistory,
  type UseChatHistoryReturn,
  type UseChatHistoryOptions,
  type ChatMetadata,
} from './useChatHistory';

export {
  useSettings,
  type UseSettingsReturn,
  type UseSettingsOptions,
  type AppSettings,
  type ProviderSettings,
} from './useSettings';

export {
  useAI,
  type UseAIReturn,
  type UseAIOptions,
  type ProviderType,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ModelInfo,
} from './useAI';
