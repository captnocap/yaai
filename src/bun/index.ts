// =============================================================================
// YAAI MAIN PROCESS
// =============================================================================
// Electrobun main process entry point.
// Initializes artifact system and handles IPC with renderer.

import Electrobun, { BrowserWindow } from "electrobun/bun";
import {
  ensureDirectories,
  getRegistry,
  getLoader,
  getCredentialStore,
  getChatStore,
  getSettingsStore,
  getAIProvider,
  type ChatMetadata,
  type StoredMessage,
  type AppSettings,
  type ChatRequest,
  type ChatResponse,
  type ProviderType,
} from "./lib";
import { getImageGenStore } from "./lib/image-gen";
import type {
  QueueEntry,
  QueueGroup,
  ImageGenEvent,
  QuickGenerateRequest,
  GalleryFilters,
} from "../mainview/types/image-gen";
import { codeSessionManager } from "./lib/code-session-manager";
import type {
  CodeSession,
  SessionOptions,
  TranscriptEntry,
} from "../mainview/types/code-session";
import type { RestorePoint } from "../mainview/types/snapshot";
import type {
  ArtifactManifest,
  ArtifactFiles,
  ArtifactQuery,
  ArtifactExecutionResult,
} from "../mainview/types";

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------

async function initialize() {
  console.log("[YAAI] Initializing...");

  // Ensure data directories exist
  await ensureDirectories();

  // Initialize artifact registry
  const registry = getRegistry();
  await registry.initialize();

  // Initialize credential store
  const credentialStore = getCredentialStore();
  await credentialStore.initialize();

  // Initialize chat store
  const chatStore = getChatStore();
  await chatStore.initialize();

  // Initialize settings store
  const settingsStore = getSettingsStore();
  await settingsStore.initialize();

  // Initialize code session manager
  await codeSessionManager.initialize();
  console.log("[YAAI] Code session manager initialized");

  // Initialize image generation store
  const imageGenStore = getImageGenStore();
  await imageGenStore.initialize(settingsStore.getAll().imageGen);
  console.log("[YAAI] Image generation store initialized");

  // Start file watcher for hot reload (in dev mode)
  if (process.env.NODE_ENV !== "production") {
    await registry.startWatching();
  }

  console.log("[YAAI] Initialization complete");

  // Log stats
  const stats = await registry.getStats();
  const chats = await chatStore.list();
  const settings = settingsStore.getAll();
  console.log(`[YAAI] Loaded ${stats.total} artifacts (${stats.enabled} enabled)`);
  console.log(`[YAAI] Loaded ${chats.length} chats`);
  console.log(`[YAAI] Settings loaded (theme: ${settings.theme})`);
}

// -----------------------------------------------------------------------------
// IPC HANDLERS
// -----------------------------------------------------------------------------

// Note: Electrobun's IPC API may differ from this
// This is a conceptual implementation that will need adaptation

interface IPCHandlers {
  // Artifact Registry
  "artifact:list": (query?: ArtifactQuery) => Promise<ArtifactManifest[]>;
  "artifact:get": (id: string) => Promise<ArtifactManifest | null>;
  "artifact:install": (data: { manifest: ArtifactManifest; files: ArtifactFiles }) => Promise<void>;
  "artifact:uninstall": (id: string) => Promise<void>;
  "artifact:update": (data: {
    id: string;
    manifest?: Partial<ArtifactManifest>;
    files?: Partial<ArtifactFiles>;
  }) => Promise<void>;
  "artifact:enable": (id: string) => Promise<void>;
  "artifact:disable": (id: string) => Promise<void>;

  // Artifact Execution
  "artifact:invoke": (data: {
    artifactId: string;
    input: unknown;
    requestId: string;
  }) => Promise<ArtifactExecutionResult>;
  "artifact:cancel": (requestId: string) => Promise<void>;
  "artifact:get-ui": (artifactId: string) => Promise<string | null>;

  // Credentials
  "credential:list": () => Promise<string[]>;
  "credential:exists": (key: string) => Promise<boolean>;
  "credential:info": (key: string) => Promise<{
    name: string;
    type: string;
    baseUrl: string;
    hasToken: boolean;
  } | null>;

  // Chats
  "chat:list": () => Promise<ChatMetadata[]>;
  "chat:get": (chatId: string) => Promise<ChatMetadata | null>;
  "chat:create": (data: { title?: string; models?: string[] }) => Promise<ChatMetadata>;
  "chat:update": (data: { chatId: string; updates: Partial<ChatMetadata> }) => Promise<ChatMetadata>;
  "chat:delete": (chatId: string) => Promise<void>;
  "chat:get-messages": (chatId: string) => Promise<StoredMessage[]>;
  "chat:add-message": (data: { chatId: string; message: StoredMessage }) => Promise<void>;
  "chat:update-message": (data: { chatId: string; messageId: string; updates: Partial<StoredMessage> }) => Promise<void>;
  "chat:delete-message": (data: { chatId: string; messageId: string }) => Promise<void>;
  "chat:clear-messages": (chatId: string) => Promise<void>;

  // Settings
  "settings:get-all": () => Promise<AppSettings>;
  "settings:get": (path: string) => Promise<unknown>;
  "settings:update": (updates: Partial<AppSettings>) => Promise<AppSettings>;
  "settings:set": (data: { path: string; value: unknown }) => Promise<void>;
  "settings:reset": () => Promise<AppSettings>;
  "settings:reset-section": (section: keyof AppSettings) => Promise<void>;

  // AI Chat
  "ai:chat": (request: ChatRequest) => Promise<ChatResponse>;
  "ai:chat-stream": (request: ChatRequest) => Promise<string>; // Returns request ID
  "ai:cancel": (requestId: string) => Promise<void>;
  "ai:models": (provider: ProviderType) => Promise<{ id: string; name: string; contextWindow: number }[]>;
  "ai:has-credentials": (provider: ProviderType) => Promise<boolean>;
}

function setupIPCHandlers(mainWindow: BrowserWindow) {
  const registry = getRegistry();
  const loader = getLoader();
  const credentialStore = getCredentialStore();

  // Set up log forwarding
  loader.onLog = (artifactId, invocationId, level, message) => {
    mainWindow.webview.postMessage("artifact:log", {
      artifactId,
      invocationId,
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  // Set up progress forwarding
  loader.onProgress = (artifactId, requestId, progress, message) => {
    mainWindow.webview.postMessage("artifact:progress", {
      artifactId,
      requestId,
      progress,
      message,
    });
  };

  // Forward registry events to renderer
  registry.on("installed", (manifest) => {
    mainWindow.webview.postMessage("artifact:installed", { manifest });
  });

  registry.on("uninstalled", (manifest) => {
    mainWindow.webview.postMessage("artifact:uninstalled", { artifactId: manifest.id });
  });

  registry.on("updated", (manifest) => {
    mainWindow.webview.postMessage("artifact:updated", { manifest });
  });

  registry.on("enabled", (manifest) => {
    mainWindow.webview.postMessage("artifact:enabled", { artifactId: manifest.id });
  });

  registry.on("disabled", (manifest) => {
    mainWindow.webview.postMessage("artifact:disabled", { artifactId: manifest.id });
  });

  registry.on("file-changed", (data: { artifactId: string; filename: string }) => {
    mainWindow.webview.postMessage("artifact:file-changed", data);
  });

  // Register IPC handlers
  // Note: This is conceptual - actual Electrobun API may differ

  mainWindow.webview.onMessage("artifact:list", async (query?: ArtifactQuery) => {
    return await registry.list(query);
  });

  mainWindow.webview.onMessage("artifact:get", async (id: string) => {
    return await registry.get(id);
  });

  mainWindow.webview.onMessage("artifact:install", async (data: {
    manifest: ArtifactManifest;
    files: ArtifactFiles;
  }) => {
    await registry.install(data.manifest, data.files);
  });

  mainWindow.webview.onMessage("artifact:uninstall", async (id: string) => {
    await registry.uninstall(id);
  });

  mainWindow.webview.onMessage("artifact:update", async (data: {
    id: string;
    manifest?: Partial<ArtifactManifest>;
    files?: Partial<ArtifactFiles>;
  }) => {
    await registry.update(data.id, data.manifest || {}, data.files);
  });

  mainWindow.webview.onMessage("artifact:enable", async (id: string) => {
    await registry.enable(id);
  });

  mainWindow.webview.onMessage("artifact:disable", async (id: string) => {
    await registry.disable(id);
  });

  mainWindow.webview.onMessage("artifact:invoke", async (data: {
    artifactId: string;
    input: unknown;
    requestId: string;
  }) => {
    return await loader.invoke(data.artifactId, data.input);
  });

  mainWindow.webview.onMessage("artifact:cancel", async (requestId: string) => {
    loader.cancel(requestId);
  });

  mainWindow.webview.onMessage("artifact:get-ui", async (artifactId: string) => {
    return await loader.getUIComponent(artifactId);
  });

  mainWindow.webview.onMessage("credential:list", async () => {
    return await credentialStore.list();
  });

  mainWindow.webview.onMessage("credential:exists", async (key: string) => {
    return await credentialStore.exists(key);
  });

  mainWindow.webview.onMessage("credential:info", async (key: string) => {
    return await credentialStore.getInfo(key);
  });

  // Chat handlers
  const chatStore = getChatStore();

  // Forward chat store events to renderer
  chatStore.on("created", (metadata) => {
    mainWindow.webview.postMessage("chat:created", { metadata });
  });

  chatStore.on("updated", (metadata) => {
    mainWindow.webview.postMessage("chat:updated", { metadata });
  });

  chatStore.on("deleted", (metadata) => {
    mainWindow.webview.postMessage("chat:deleted", { chatId: (metadata as ChatMetadata).id });
  });

  chatStore.on("message-added", (data) => {
    mainWindow.webview.postMessage("chat:message-added", data);
  });

  mainWindow.webview.onMessage("chat:list", async () => {
    return await chatStore.list();
  });

  mainWindow.webview.onMessage("chat:get", async (chatId: string) => {
    return await chatStore.get(chatId);
  });

  mainWindow.webview.onMessage("chat:create", async (data: { title?: string; models?: string[] }) => {
    return await chatStore.create(data.title, data.models);
  });

  mainWindow.webview.onMessage("chat:update", async (data: {
    chatId: string;
    updates: Partial<ChatMetadata>;
  }) => {
    return await chatStore.update(data.chatId, data.updates);
  });

  mainWindow.webview.onMessage("chat:delete", async (chatId: string) => {
    await chatStore.delete(chatId);
  });

  mainWindow.webview.onMessage("chat:get-messages", async (chatId: string) => {
    return await chatStore.getMessages(chatId);
  });

  mainWindow.webview.onMessage("chat:add-message", async (data: {
    chatId: string;
    message: StoredMessage;
  }) => {
    await chatStore.addMessage(data.chatId, data.message);
  });

  mainWindow.webview.onMessage("chat:update-message", async (data: {
    chatId: string;
    messageId: string;
    updates: Partial<StoredMessage>;
  }) => {
    await chatStore.updateMessage(data.chatId, data.messageId, data.updates);
  });

  mainWindow.webview.onMessage("chat:delete-message", async (data: {
    chatId: string;
    messageId: string;
  }) => {
    await chatStore.deleteMessage(data.chatId, data.messageId);
  });

  mainWindow.webview.onMessage("chat:clear-messages", async (chatId: string) => {
    await chatStore.clearMessages(chatId);
  });

  // Settings handlers
  const settingsStore = getSettingsStore();

  // Forward settings updates to renderer
  settingsStore.on("updated", (settings) => {
    mainWindow.webview.postMessage("settings:updated", { settings });
  });

  mainWindow.webview.onMessage("settings:get-all", async () => {
    return settingsStore.getAll();
  });

  mainWindow.webview.onMessage("settings:get", async (path: string) => {
    return settingsStore.get(path);
  });

  mainWindow.webview.onMessage("settings:update", async (updates: Partial<AppSettings>) => {
    return await settingsStore.update(updates);
  });

  mainWindow.webview.onMessage("settings:set", async (data: { path: string; value: unknown }) => {
    await settingsStore.set(data.path, data.value);
  });

  mainWindow.webview.onMessage("settings:reset", async () => {
    return await settingsStore.reset();
  });

  mainWindow.webview.onMessage("settings:reset-section", async (section: keyof AppSettings) => {
    await settingsStore.resetSection(section);
  });

  // AI handlers
  const aiProvider = getAIProvider();
  const activeRequests = new Map<string, AbortController>();

  mainWindow.webview.onMessage("ai:chat", async (request: ChatRequest) => {
    return await aiProvider.chat(request);
  });

  mainWindow.webview.onMessage("ai:chat-stream", async (request: ChatRequest) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const controller = new AbortController();
    activeRequests.set(requestId, controller);

    // Start streaming in background
    (async () => {
      try {
        const response = await aiProvider.chat(
          { ...request, stream: true, signal: controller.signal },
          (chunk) => {
            mainWindow.webview.postMessage("ai:stream-chunk", { requestId, chunk });
          }
        );

        mainWindow.webview.postMessage("ai:stream-complete", { requestId, response });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          mainWindow.webview.postMessage("ai:stream-error", {
            requestId,
            error: (err as Error).message,
          });
        }
      } finally {
        activeRequests.delete(requestId);
      }
    })();

    return requestId;
  });

  mainWindow.webview.onMessage("ai:cancel", async (requestId: string) => {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
    }
  });

  mainWindow.webview.onMessage("ai:models", async (provider: ProviderType) => {
    return aiProvider.getModels(provider);
  });

  mainWindow.webview.onMessage("ai:has-credentials", async (provider: ProviderType) => {
    return await aiProvider.hasCredentials(provider);
  });

  // ---------------------------------------------------------------------------
  // CODE SESSION HANDLERS
  // ---------------------------------------------------------------------------

  // Forward code session events to renderer
  codeSessionManager.on("output", (data) => {
    mainWindow.webview.postMessage("code-session:output", data);
  });

  codeSessionManager.on("prompt", (data) => {
    mainWindow.webview.postMessage("code-session:prompt", data);
  });

  codeSessionManager.on("fileEdit", (data) => {
    mainWindow.webview.postMessage("code-session:file-edit", data);
  });

  codeSessionManager.on("compact", (data) => {
    mainWindow.webview.postMessage("code-session:compact", data);
  });

  codeSessionManager.on("planUpdate", (data) => {
    mainWindow.webview.postMessage("code-session:plan-update", data);
  });

  codeSessionManager.on("statusChange", (data) => {
    mainWindow.webview.postMessage("code-session:status", data);
  });

  codeSessionManager.on("error", (data) => {
    mainWindow.webview.postMessage("code-session:error", data);
  });

  codeSessionManager.on("ended", (data) => {
    mainWindow.webview.postMessage("code-session:ended", data);
  });

  // Session lifecycle
  mainWindow.webview.onMessage("code-session:start", async (data: {
    projectPath: string;
    options?: SessionOptions;
  }) => {
    return await codeSessionManager.startSession(data.projectPath, data.options);
  });

  mainWindow.webview.onMessage("code-session:stop", async (sessionId: string) => {
    await codeSessionManager.stopSession(sessionId);
  });

  mainWindow.webview.onMessage("code-session:pause", async (sessionId: string) => {
    await codeSessionManager.pauseSession(sessionId);
  });

  mainWindow.webview.onMessage("code-session:resume", async (sessionId: string) => {
    await codeSessionManager.resumeSession(sessionId);
  });

  // Input
  mainWindow.webview.onMessage("code-session:input", async (data: {
    sessionId: string;
    input: string;
  }) => {
    await codeSessionManager.sendInput(data.sessionId, data.input);
  });

  mainWindow.webview.onMessage("code-session:yes-no", async (data: {
    sessionId: string;
    answer: boolean;
  }) => {
    await codeSessionManager.sendYesNo(data.sessionId, data.answer);
  });

  mainWindow.webview.onMessage("code-session:selection", async (data: {
    sessionId: string;
    index: number;
  }) => {
    await codeSessionManager.sendSelection(data.sessionId, data.index);
  });

  // Queries
  mainWindow.webview.onMessage("code-session:list", async () => {
    return await codeSessionManager.listSessions();
  });

  mainWindow.webview.onMessage("code-session:get", async (sessionId: string) => {
    return codeSessionManager.getSession(sessionId);
  });

  mainWindow.webview.onMessage("code-session:transcript", async (sessionId: string) => {
    return await codeSessionManager.getTranscript(sessionId);
  });

  mainWindow.webview.onMessage("code-session:transcript-since", async (data: {
    sessionId: string;
    entryId: string;
  }) => {
    return await codeSessionManager.getTranscriptSince(data.sessionId, data.entryId);
  });

  mainWindow.webview.onMessage("code-session:current-prompt", async (sessionId: string) => {
    return codeSessionManager.getCurrentPrompt(sessionId);
  });

  // Restore points
  mainWindow.webview.onMessage("code-session:create-restore", async (data: {
    sessionId: string;
    description: string;
  }) => {
    return await codeSessionManager.createRestorePoint(data.sessionId, data.description);
  });

  mainWindow.webview.onMessage("code-session:restore-points", async (sessionId: string) => {
    return await codeSessionManager.getRestorePoints(sessionId);
  });

  mainWindow.webview.onMessage("code-session:restore", async (data: {
    sessionId: string;
    restorePointId: string;
  }) => {
    await codeSessionManager.restoreToPoint(data.sessionId, data.restorePointId);
  });

  // Session management
  mainWindow.webview.onMessage("code-session:delete", async (sessionId: string) => {
    return await codeSessionManager.deleteSession(sessionId);
  });
}

// -----------------------------------------------------------------------------
// MAIN WINDOW
// -----------------------------------------------------------------------------

const mainWindow = new BrowserWindow({
  title: "YAAI",
  url: "views://mainview/index.html",
  frame: {
    width: 1200,
    height: 800,
  },
});

// Set up IPC handlers once window is ready
mainWindow.on("ready", () => {
  setupIPCHandlers(mainWindow);
});

mainWindow.on("close", async () => {
  // Clean up
  const registry = getRegistry();
  registry.stopWatching();

  // Stop all code sessions
  await codeSessionManager.stopAll();

  process.exit(0);
});

// Initialize on startup
initialize().catch((err) => {
  console.error("[YAAI] Initialization failed:", err);
  process.exit(1);
});
