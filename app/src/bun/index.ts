// =============================================================================
// YAAI MAIN PROCESS
// =============================================================================
// Electrobun main process entry point.
// Initializes artifact system and serves WebSocket API for frontend.

import Electrobun, { BrowserWindow } from "electrobun/bun";
import {
  ensureDirectories,
  getRegistry,
  getLoader,
  getCredentialStore,
  getChatStore,
  getSettingsStore,
  getAIProvider,
  getWSServer,
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
  ImageGenSettings,
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
// CONFIGURATION
// -----------------------------------------------------------------------------

const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10);
const WS_HOST = process.env.WS_HOST || 'localhost';

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

  // Start WebSocket server (will find available port if WS_PORT is in use)
  const wsServer = getWSServer();
  const actualPort = await wsServer.start({ port: WS_PORT, host: WS_HOST, maxPortAttempts: 10 });
  console.log(`[YAAI] WebSocket server started on ws://${WS_HOST}:${actualPort}`);

  // Set up WebSocket handlers
  setupWSHandlers();

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
// WEBSOCKET HANDLERS
// -----------------------------------------------------------------------------

function setupWSHandlers() {
  const wsServer = getWSServer();
  const registry = getRegistry();
  const loader = getLoader();
  const credentialStore = getCredentialStore();
  const chatStore = getChatStore();
  const settingsStore = getSettingsStore();
  const aiProvider = getAIProvider();

  // Track active AI streaming requests (requestId -> { controller, clientId })
  const activeRequests = new Map<string, { controller: AbortController; clientId: string }>();

  // ---------------------------------------------------------------------------
  // ARTIFACT HANDLERS
  // ---------------------------------------------------------------------------

  // Set up log forwarding
  loader.onLog = (artifactId, invocationId, level, message) => {
    wsServer.emit("artifact:log", {
      artifactId,
      invocationId,
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  // Set up progress forwarding
  loader.onProgress = (artifactId, requestId, progress, message) => {
    wsServer.emit("artifact:progress", {
      artifactId,
      requestId,
      progress,
      message,
    });
  };

  // Forward registry events
  registry.on("installed", (manifest) => {
    wsServer.emit("artifact:installed", { manifest });
  });

  registry.on("uninstalled", (manifest) => {
    wsServer.emit("artifact:uninstalled", { artifactId: manifest.id });
  });

  registry.on("updated", (manifest) => {
    wsServer.emit("artifact:updated", { manifest });
  });

  registry.on("enabled", (manifest) => {
    wsServer.emit("artifact:enabled", { artifactId: manifest.id });
  });

  registry.on("disabled", (manifest) => {
    wsServer.emit("artifact:disabled", { artifactId: manifest.id });
  });

  registry.on("file-changed", (data: { artifactId: string; filename: string }) => {
    wsServer.emit("artifact:file-changed", data);
  });

  // Artifact request handlers
  wsServer.onRequest("artifact:list", async (payload) => {
    return await registry.list(payload as ArtifactQuery | undefined);
  });

  wsServer.onRequest("artifact:get", async (payload) => {
    return await registry.get(payload as string);
  });

  wsServer.onRequest("artifact:install", async (payload) => {
    const data = payload as { manifest: ArtifactManifest; files: ArtifactFiles };
    await registry.install(data.manifest, data.files);
  });

  wsServer.onRequest("artifact:uninstall", async (payload) => {
    await registry.uninstall(payload as string);
  });

  wsServer.onRequest("artifact:update", async (payload) => {
    const data = payload as {
      id: string;
      manifest?: Partial<ArtifactManifest>;
      files?: Partial<ArtifactFiles>;
    };
    await registry.update(data.id, data.manifest || {}, data.files);
  });

  wsServer.onRequest("artifact:enable", async (payload) => {
    await registry.enable(payload as string);
  });

  wsServer.onRequest("artifact:disable", async (payload) => {
    await registry.disable(payload as string);
  });

  wsServer.onRequest("artifact:invoke", async (payload) => {
    const data = payload as { artifactId: string; input: unknown; requestId: string };
    return await loader.invoke(data.artifactId, data.input);
  });

  wsServer.onRequest("artifact:cancel", async (payload) => {
    loader.cancel(payload as string);
  });

  wsServer.onRequest("artifact:get-ui", async (payload) => {
    return await loader.getUIComponent(payload as string);
  });

  // ---------------------------------------------------------------------------
  // CREDENTIAL HANDLERS
  // ---------------------------------------------------------------------------

  wsServer.onRequest("credential:list", async () => {
    return await credentialStore.list();
  });

  wsServer.onRequest("credential:exists", async (payload) => {
    return await credentialStore.exists(payload as string);
  });

  wsServer.onRequest("credential:info", async (payload) => {
    return await credentialStore.getInfo(payload as string);
  });

  // ---------------------------------------------------------------------------
  // CHAT HANDLERS
  // ---------------------------------------------------------------------------

  // Forward chat store events
  chatStore.on("created", (metadata) => {
    wsServer.emit("chat:created", { metadata });
  });

  chatStore.on("updated", (metadata) => {
    wsServer.emit("chat:updated", { metadata });
  });

  chatStore.on("deleted", (metadata) => {
    wsServer.emit("chat:deleted", { chatId: (metadata as ChatMetadata).id });
  });

  chatStore.on("message-added", (data) => {
    wsServer.emit("chat:message-added", data);
  });

  // Chat request handlers
  wsServer.onRequest("chat:list", async () => {
    return await chatStore.list();
  });

  wsServer.onRequest("chat:get", async (payload) => {
    return await chatStore.get(payload as string);
  });

  wsServer.onRequest("chat:create", async (payload) => {
    const data = payload as { title?: string; models?: string[] };
    return await chatStore.create(data.title, data.models);
  });

  wsServer.onRequest("chat:update", async (payload) => {
    const data = payload as { chatId: string; updates: Partial<ChatMetadata> };
    return await chatStore.update(data.chatId, data.updates);
  });

  wsServer.onRequest("chat:delete", async (payload) => {
    await chatStore.delete(payload as string);
  });

  wsServer.onRequest("chat:get-messages", async (payload) => {
    return await chatStore.getMessages(payload as string);
  });

  wsServer.onRequest("chat:add-message", async (payload) => {
    const data = payload as { chatId: string; message: StoredMessage };
    await chatStore.addMessage(data.chatId, data.message);
  });

  wsServer.onRequest("chat:update-message", async (payload) => {
    const data = payload as { chatId: string; messageId: string; updates: Partial<StoredMessage> };
    await chatStore.updateMessage(data.chatId, data.messageId, data.updates);
  });

  wsServer.onRequest("chat:delete-message", async (payload) => {
    const data = payload as { chatId: string; messageId: string };
    await chatStore.deleteMessage(data.chatId, data.messageId);
  });

  wsServer.onRequest("chat:clear-messages", async (payload) => {
    await chatStore.clearMessages(payload as string);
  });

  // ---------------------------------------------------------------------------
  // SETTINGS HANDLERS
  // ---------------------------------------------------------------------------

  // Forward settings updates
  settingsStore.on("updated", (settings) => {
    wsServer.emit("settings:updated", { settings });
  });

  // Settings request handlers
  wsServer.onRequest("settings:get-all", async () => {
    return settingsStore.getAll();
  });

  wsServer.onRequest("settings:get", async (payload) => {
    return settingsStore.get(payload as string);
  });

  wsServer.onRequest("settings:update", async (payload) => {
    return await settingsStore.update(payload as Partial<AppSettings>);
  });

  wsServer.onRequest("settings:set", async (payload) => {
    const data = payload as { path: string; value: unknown };
    await settingsStore.set(data.path, data.value);
  });

  wsServer.onRequest("settings:reset", async () => {
    return await settingsStore.reset();
  });

  wsServer.onRequest("settings:reset-section", async (payload) => {
    await settingsStore.resetSection(payload as keyof AppSettings);
  });

  // ---------------------------------------------------------------------------
  // AI HANDLERS
  // ---------------------------------------------------------------------------

  wsServer.onRequest("ai:chat", async (payload) => {
    return await aiProvider.chat(payload as ChatRequest);
  });

  wsServer.onRequest("ai:chat-stream", async (payload, clientId) => {
    const request = payload as ChatRequest;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const controller = new AbortController();
    activeRequests.set(requestId, { controller, clientId });

    // Start streaming in background
    (async () => {
      try {
        const response = await aiProvider.chat(
          { ...request, stream: true, signal: controller.signal },
          (chunk) => {
            // Send chunk only to the requesting client
            wsServer.emitTo(clientId, "ai:stream-chunk", { requestId, chunk });
          }
        );

        wsServer.emitTo(clientId, "ai:stream-complete", { requestId, response });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          wsServer.emitTo(clientId, "ai:stream-error", {
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

  wsServer.onRequest("ai:cancel", async (payload) => {
    const requestId = payload as string;
    const active = activeRequests.get(requestId);
    if (active) {
      active.controller.abort();
      activeRequests.delete(requestId);
    }
  });

  wsServer.onRequest("ai:models", async (payload) => {
    return aiProvider.getModels(payload as ProviderType);
  });

  wsServer.onRequest("ai:has-credentials", async (payload) => {
    return await aiProvider.hasCredentials(payload as ProviderType);
  });

  // ---------------------------------------------------------------------------
  // CODE SESSION HANDLERS
  // ---------------------------------------------------------------------------

  // Forward code session events
  codeSessionManager.on("output", (data) => {
    wsServer.emit("code-session:output", data);
  });

  codeSessionManager.on("prompt", (data) => {
    wsServer.emit("code-session:prompt", data);
  });

  codeSessionManager.on("fileEdit", (data) => {
    wsServer.emit("code-session:file-edit", data);
  });

  codeSessionManager.on("compact", (data) => {
    wsServer.emit("code-session:compact", data);
  });

  codeSessionManager.on("planUpdate", (data) => {
    wsServer.emit("code-session:plan-update", data);
  });

  codeSessionManager.on("statusChange", (data) => {
    wsServer.emit("code-session:status", data);
  });

  codeSessionManager.on("error", (data) => {
    wsServer.emit("code-session:error", data);
  });

  codeSessionManager.on("ended", (data) => {
    wsServer.emit("code-session:ended", data);
  });

  // Session lifecycle
  wsServer.onRequest("code-session:start", async (payload) => {
    const data = payload as { projectPath: string; options?: SessionOptions };
    return await codeSessionManager.startSession(data.projectPath, data.options);
  });

  wsServer.onRequest("code-session:stop", async (payload) => {
    await codeSessionManager.stopSession(payload as string);
  });

  wsServer.onRequest("code-session:pause", async (payload) => {
    await codeSessionManager.pauseSession(payload as string);
  });

  wsServer.onRequest("code-session:resume", async (payload) => {
    await codeSessionManager.resumeSession(payload as string);
  });

  // Input
  wsServer.onRequest("code-session:input", async (payload) => {
    const data = payload as { sessionId: string; input: string };
    await codeSessionManager.sendInput(data.sessionId, data.input);
  });

  wsServer.onRequest("code-session:yes-no", async (payload) => {
    const data = payload as { sessionId: string; answer: boolean };
    await codeSessionManager.sendYesNo(data.sessionId, data.answer);
  });

  wsServer.onRequest("code-session:selection", async (payload) => {
    const data = payload as { sessionId: string; index: number };
    await codeSessionManager.sendSelection(data.sessionId, data.index);
  });

  // Queries
  wsServer.onRequest("code-session:list", async () => {
    return await codeSessionManager.listSessions();
  });

  wsServer.onRequest("code-session:get", async (payload) => {
    return codeSessionManager.getSession(payload as string);
  });

  wsServer.onRequest("code-session:transcript", async (payload) => {
    return await codeSessionManager.getTranscript(payload as string);
  });

  wsServer.onRequest("code-session:transcript-since", async (payload) => {
    const data = payload as { sessionId: string; entryId: string };
    return await codeSessionManager.getTranscriptSince(data.sessionId, data.entryId);
  });

  wsServer.onRequest("code-session:current-prompt", async (payload) => {
    return codeSessionManager.getCurrentPrompt(payload as string);
  });

  // Restore points
  wsServer.onRequest("code-session:create-restore", async (payload) => {
    const data = payload as { sessionId: string; description: string };
    return await codeSessionManager.createRestorePoint(data.sessionId, data.description);
  });

  wsServer.onRequest("code-session:restore-points", async (payload) => {
    return await codeSessionManager.getRestorePoints(payload as string);
  });

  wsServer.onRequest("code-session:restore", async (payload) => {
    const data = payload as { sessionId: string; restorePointId: string };
    await codeSessionManager.restoreToPoint(data.sessionId, data.restorePointId);
  });

  // Session management
  wsServer.onRequest("code-session:delete", async (payload) => {
    return await codeSessionManager.deleteSession(payload as string);
  });

  // ---------------------------------------------------------------------------
  // IMAGE GENERATION HANDLERS
  // ---------------------------------------------------------------------------

  const imageGenStore = getImageGenStore();

  // Forward image-gen events
  imageGenStore.on("event", (event: ImageGenEvent) => {
    wsServer.emit("image-gen:event", event);
  });

  // Queue management - Groups
  wsServer.onRequest("image-gen:create-group", async (payload) => {
    const data = payload as { name: string };
    return imageGenStore.createGroup(data.name);
  });

  wsServer.onRequest("image-gen:update-group", async (payload) => {
    const data = payload as { id: string; updates: Partial<QueueGroup> };
    return imageGenStore.updateGroup(data.id, data.updates);
  });

  wsServer.onRequest("image-gen:delete-group", async (payload) => {
    imageGenStore.deleteGroup(payload as string);
  });

  wsServer.onRequest("image-gen:reorder-groups", async (payload) => {
    imageGenStore.reorderGroups(payload as string[]);
  });

  wsServer.onRequest("image-gen:get-groups", async () => {
    return imageGenStore.getAllGroups();
  });

  // Queue management - Entries
  wsServer.onRequest("image-gen:create-entry", async (payload) => {
    const data = payload as { groupId: string; entry: Partial<QueueEntry> };
    return imageGenStore.createEntry(data.groupId, data.entry);
  });

  wsServer.onRequest("image-gen:update-entry", async (payload) => {
    const data = payload as { id: string; updates: Partial<QueueEntry> };
    return imageGenStore.updateEntry(data.id, data.updates);
  });

  wsServer.onRequest("image-gen:delete-entry", async (payload) => {
    imageGenStore.deleteEntry(payload as string);
  });

  wsServer.onRequest("image-gen:duplicate-entry", async (payload) => {
    return imageGenStore.duplicateEntry(payload as string);
  });

  wsServer.onRequest("image-gen:move-entry", async (payload) => {
    const data = payload as { id: string; targetGroupId: string; index: number };
    imageGenStore.moveEntry(data.id, data.targetGroupId, data.index);
  });

  wsServer.onRequest("image-gen:reorder-entries", async (payload) => {
    const data = payload as { groupId: string; orderedIds: string[] };
    imageGenStore.reorderEntries(data.groupId, data.orderedIds);
  });

  wsServer.onRequest("image-gen:get-entry", async (payload) => {
    return imageGenStore.getEntry(payload as string);
  });

  // Bulk operations
  wsServer.onRequest("image-gen:enable-entries", async (payload) => {
    imageGenStore.enableEntries(payload as string[]);
  });

  wsServer.onRequest("image-gen:disable-entries", async (payload) => {
    imageGenStore.disableEntries(payload as string[]);
  });

  wsServer.onRequest("image-gen:delete-entries", async (payload) => {
    imageGenStore.deleteEntries(payload as string[]);
  });

  // Job control
  wsServer.onRequest("image-gen:start-queue", async () => {
    await imageGenStore.startQueue();
  });

  wsServer.onRequest("image-gen:stop-queue", async () => {
    await imageGenStore.stopQueue();
  });

  wsServer.onRequest("image-gen:pause-queue", async () => {
    imageGenStore.pauseQueue();
  });

  wsServer.onRequest("image-gen:resume-queue", async () => {
    imageGenStore.resumeQueue();
  });

  wsServer.onRequest("image-gen:pause-job", async (payload) => {
    imageGenStore.pauseJob(payload as string);
  });

  wsServer.onRequest("image-gen:resume-job", async (payload) => {
    imageGenStore.resumeJob(payload as string);
  });

  wsServer.onRequest("image-gen:cancel-job", async (payload) => {
    imageGenStore.cancelJob(payload as string);
  });

  wsServer.onRequest("image-gen:cancel-all", async () => {
    imageGenStore.cancelAllJobs();
  });

  wsServer.onRequest("image-gen:update-job-target", async (payload) => {
    const data = payload as { jobId: string; target: number };
    imageGenStore.updateJobTarget(data.jobId, data.target);
  });

  wsServer.onRequest("image-gen:get-job", async (payload) => {
    return imageGenStore.getJob(payload as string);
  });

  wsServer.onRequest("image-gen:get-active-jobs", async () => {
    return imageGenStore.getActiveJobs();
  });

  wsServer.onRequest("image-gen:get-job-history", async () => {
    return imageGenStore.getJobHistory();
  });

  // Pipeline state
  wsServer.onRequest("image-gen:get-pipeline-state", async () => {
    return imageGenStore.getPipelineState();
  });

  // Quick generate
  wsServer.onRequest("image-gen:quick-generate", async (payload) => {
    return await imageGenStore.quickGenerate(payload as QuickGenerateRequest);
  });

  // Prompt library
  wsServer.onRequest("image-gen:get-prompts", async () => {
    return await imageGenStore.getPrompts();
  });

  wsServer.onRequest("image-gen:load-prompt", async (payload) => {
    return await imageGenStore.loadPrompt(payload as string);
  });

  wsServer.onRequest("image-gen:save-prompt", async (payload) => {
    const data = payload as { name: string; content: string };
    await imageGenStore.savePrompt(data.name, data.content);
  });

  wsServer.onRequest("image-gen:delete-prompt", async (payload) => {
    await imageGenStore.deletePrompt(payload as string);
  });

  wsServer.onRequest("image-gen:rename-prompt", async (payload) => {
    const data = payload as { oldName: string; newName: string };
    await imageGenStore.renamePrompt(data.oldName, data.newName);
  });

  // Reference browser
  wsServer.onRequest("image-gen:get-reference-roots", async () => {
    return imageGenStore.getReferenceRoots();
  });

  wsServer.onRequest("image-gen:get-folder-contents", async (payload) => {
    return await imageGenStore.getFolderContents(payload as string);
  });

  wsServer.onRequest("image-gen:get-folder-stats", async (payload) => {
    return await imageGenStore.getFolderStats(payload as string);
  });

  // Output gallery
  wsServer.onRequest("image-gen:get-outputs", async (payload) => {
    return await imageGenStore.getOutputImages(payload as GalleryFilters | undefined);
  });

  // Settings
  wsServer.onRequest("image-gen:update-settings", async (payload) => {
    imageGenStore.updateSettings(payload as Partial<ImageGenSettings>);
  });

  wsServer.onRequest("image-gen:get-settings", async () => {
    return imageGenStore.getSettings();
  });
}

// -----------------------------------------------------------------------------
// STARTUP
// -----------------------------------------------------------------------------

async function startup() {
  // Initialize backend services FIRST (including WebSocket server)
  await initialize();

  // THEN create the window (so frontend can connect to the already-running WS server)
  const mainWindow = new BrowserWindow({
    title: "YAAI",
    url: "views://mainview/index.html",
    frame: {
      width: 1200,
      height: 800,
    },
  });

  mainWindow.on("close", async () => {
    // Clean up
    const registry = getRegistry();
    registry.stopWatching();

    // Stop WebSocket server
    const wsServer = getWSServer();
    wsServer.stop();

    // Stop all code sessions
    await codeSessionManager.stopAll();

    process.exit(0);
  });
}

// Run startup
startup().catch((err) => {
  console.error("[YAAI] Startup failed:", err);
  process.exit(1);
});
