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

export {
  useImageGen,
  usePrompts,
  useReferences,
  useGallery,
  type UseImageGenReturn,
  type UsePromptsReturn,
  type UseReferencesReturn,
  type UseGalleryReturn,
} from './useImageGen';

export {
  useWorkbench,
  type UseWorkbenchReturn,
  type PromptType,
  type MessageRole,
  type MessageBlock,
  type VariableDefinition,
  type WorkbenchModelConfig,
  type WorkbenchSession,
  type PromptLibraryItem,
  type CodeExportFormat,
} from './useWorkbench';

export {
  useResearch,
  useCreateResearch,
  useResearchSessions,
  type UseResearchReturn,
  type ViewMode,
} from './useResearch';

export {
  useProviderSettings,
  type UseProviderSettingsReturn,
  type ProviderType as ProviderSettingsType,
  type ModelInfo as ProviderModelInfo,
  type UserModel,
  type ProviderStatus,
} from './useProviderSettings';

export {
  useVariables,
  useVariableExpansion,
  type UseVariablesReturn,
  type UseVariableExpansionReturn,
} from './useVariables';

export {
  useClaudeCodeConfig,
  type UseClaudeCodeConfigReturn,
} from './useClaudeCodeConfig';

export {
  useClaudeCodeData,
  type UseClaudeCodeDataReturn,
  type UseClaudeCodeDataOptions,
  type ClaudeSession,
  type ClaudeTranscriptEntry,
  type ClaudePlan,
  type ClaudeHistoryEntry,
  type ArchivedSession,
} from './useClaudeCodeData';
