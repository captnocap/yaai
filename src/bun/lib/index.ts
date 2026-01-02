// =============================================================================
// BUN LIB EXPORTS
// =============================================================================

// Paths
export * from './paths';

// Artifact Registry
export { ArtifactRegistry, getRegistry } from './artifact-registry';

// Artifact Loader
export { ArtifactLoader, getLoader } from './artifact-loader';

// Credential Store
export { CredentialStore, getCredentialStore } from './credential-store';

// Chat Store
export {
  ChatStore,
  getChatStore,
  type ChatMetadata,
  type StoredMessage,
  type ChatStoreEvent,
} from './chat-store';

// Settings Store
export {
  SettingsStore,
  getSettingsStore,
  type AppSettings,
  type ProviderSettings,
  type SettingsEvent,
} from './settings-store';

// AI Provider
export {
  AIProvider,
  getAIProvider,
  type ProviderType,
  type ChatMessage,
  type ContentBlock,
  type ChatRequest,
  type ChatResponse,
  type StreamChunk,
  type StreamCallback,
  type ToolDefinition,
  type ToolCall,
} from './ai-provider';

// UI Bundler
export {
  bundleUIComponent,
  invalidateUICache,
  clearUICache,
  getUICacheStats,
  type BundleOptions,
  type BundleResult,
} from './ui-bundler';

// Artifact Watcher
export {
  ArtifactWatcher,
  getWatcher,
  startWatcher,
  stopWatcher,
  type WatcherOptions,
  type WatchEvent,
  type WatchCallback,
} from './artifact-watcher';

// WebSocket Server
export {
  WSServer,
  getWSServer,
  type WSServerOptions,
  type WSClientData,
} from './ws-server';
