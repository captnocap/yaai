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

// New SQLite-backed modules
import { initializeDirectories } from "./lib/core";
import { DatabaseConnection, runMigrations, repairAppSchema } from "./lib/db";
import {
  registerCredentialHandlers,
  registerModelHandlers,
  registerChatHandlers,
  registerAIHandlers,
  registerParallelAIHandlers,
  registerVariableHandlers,
  registerProxyHandlers,
  registerClaudeCodeHandlers
} from "./lib/ws/handlers";
import { getClaudeSessionArchiver } from "./lib/claude-session-archiver";
import { initializeEncryption } from "./lib/core/encryption";
import { getImageGenStore } from "./lib/image-gen";
import { workbenchStore, type WorkbenchSession, type PromptLibraryItem } from "./lib/workbench-store";
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
// GLOBAL STATE
// -----------------------------------------------------------------------------

let mainWindow: BrowserWindow<any> | undefined;

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

  // Ensure data directories exist (both old and new paths)
  await ensureDirectories();
  await initializeDirectories();

  // Initialize encryption (generates or loads encryption key)
  initializeEncryption();
  console.log("[YAAI] Encryption initialized");

  // Initialize SQLite databases
  await DatabaseConnection.initializeOne('app');
  await DatabaseConnection.initializeOne('chat');
  await runMigrations();
  repairAppSchema(); // Ensure schema is up-to-date (defensive)
  console.log("[YAAI] SQLite databases initialized");

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

  // Initialize Claude session archiver
  const claudeArchiver = getClaudeSessionArchiver();
  await claudeArchiver.initialize();
  console.log("[YAAI] Claude session archiver initialized");

  // Initialize image generation store
  const imageGenStore = getImageGenStore();
  await imageGenStore.initialize(settingsStore.getAll().imageGen);
  console.log("[YAAI] Image generation store initialized");

  // Initialize workbench store
  await workbenchStore.initialize();
  console.log("[YAAI] Workbench store initialized");

  // Start file watcher for hot reload (in dev mode)
  if (process.env.NODE_ENV !== "production") {
    await registry.startWatching();
  }

  // Check if browser mode is enabled (serves React app via HTTP for browser access)
  const settings = settingsStore.getAll();
  let staticPath: string | undefined;

  if (settings.browserModeEnabled) {
    // When browser mode is enabled, serve React app from build output
    // import.meta.dir is .../app/bun, we need .../app/views/mainview
    staticPath = import.meta.dir + "/../views/mainview";

    // Check if the path exists
    const indexExists = await Bun.file(staticPath + "/index.js").exists();
    console.log(`[YAAI] Browser mode static path: ${staticPath} (exists: ${indexExists})`);

    if (!indexExists) {
      console.warn(`[YAAI] Browser mode enabled but no built files found at ${staticPath}`);
    }
  }

  // Start WebSocket server (will find available port if WS_PORT is in use)
  const wsServer = getWSServer();
  const actualPort = await wsServer.start({
    port: WS_PORT,
    host: WS_HOST,
    maxPortAttempts: 10,
    staticPath,
  });
  console.log(`[YAAI] WebSocket server started on ws://${WS_HOST}:${actualPort}`);
  if (staticPath) {
    console.log(`[YAAI] Browser Mode ENABLED - visit http://${WS_HOST}:${actualPort} in your browser`);
  } else {
    console.log(`[YAAI] Browser Mode DISABLED (desktop app only)`);
  }

  // Set up WebSocket handlers
  setupWSHandlers();

  console.log("[YAAI] Initialization complete");

  // Log stats
  const stats = await registry.getStats();
  const chats = await chatStore.list();
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
  // NEW SQLITE-BACKED HANDLERS (credentials, models, chat, ai, variables, proxy)
  // ---------------------------------------------------------------------------
  registerCredentialHandlers(wsServer);
  registerModelHandlers(wsServer);
  registerChatHandlers(wsServer);
  registerAIHandlers(wsServer);
  registerParallelAIHandlers(wsServer);
  registerVariableHandlers(wsServer);
  registerProxyHandlers(wsServer);
  registerClaudeCodeHandlers(wsServer);

  // ---------------------------------------------------------------------------
  // WINDOW HANDLERS (Linux X11 via wmctrl/xdotool)
  // ---------------------------------------------------------------------------

  wsServer.onRequest("window:minimize", async () => {
    if (process.platform === 'linux') {
      try {
        await Bun.spawn(['xdotool', 'search', '--name', 'YAAI', 'windowminimize']).exited;
      } catch (e) {
        console.error("Failed to minimize", e);
      }
    } else if (mainWindow) {
      try { (mainWindow as any).minimize?.(); } catch (e) { console.error("Failed to minimize", e); }
    }
  });

  wsServer.onRequest("window:maximize", async () => {
    if (process.platform === 'linux') {
      try {
        await Bun.spawn(['wmctrl', '-r', 'YAAI', '-b', 'toggle,maximized_vert,maximized_horz']).exited;
      } catch (e) {
        console.error("Failed to maximize", e);
      }
    } else if (mainWindow) {
      try { (mainWindow as any).maximize?.(); } catch (e) { console.error("Failed to maximize", e); }
    }
  });

  wsServer.onRequest("window:close", async () => {
    if (mainWindow) {
      try { mainWindow.close(); } catch (e) { console.error("Failed to close", e); }
    }
  });


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

    // Log browser mode changes
    if (data.path === 'browserModeEnabled') {
      console.log(`[YAAI] Browser Mode setting changed to: ${data.value} (requires restart to take effect)`);
    }

    await settingsStore.set(data.path, data.value);
    return { success: true, path: data.path, value: data.value };
  });

  wsServer.onRequest("settings:reset", async () => {
    return await settingsStore.reset();
  });

  wsServer.onRequest("settings:reset-section", async (payload) => {
    await settingsStore.resetSection(payload as keyof AppSettings);
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

  // ---------------------------------------------------------------------------
  // WORKBENCH HANDLERS
  // ---------------------------------------------------------------------------

  // Forward workbench store events
  workbenchStore.on("session-created", (session) => {
    wsServer.emit("workbench:session-created", { session });
  });

  workbenchStore.on("session-updated", (session) => {
    wsServer.emit("workbench:session-updated", { session });
  });

  workbenchStore.on("session-deleted", (data) => {
    wsServer.emit("workbench:session-deleted", data);
  });

  // CRUD handlers
  wsServer.onRequest("workbench:list", async () => {
    return await workbenchStore.list();
  });

  wsServer.onRequest("workbench:get", async (payload) => {
    return await workbenchStore.get(payload as string);
  });

  wsServer.onRequest("workbench:create", async (payload) => {
    return await workbenchStore.create(payload as Omit<WorkbenchSession, 'id' | 'createdAt' | 'updatedAt'>);
  });

  wsServer.onRequest("workbench:update", async (payload) => {
    const data = payload as { id: string; updates: Partial<Omit<WorkbenchSession, 'id' | 'createdAt'>> };
    return await workbenchStore.update(data.id, data.updates);
  });

  wsServer.onRequest("workbench:delete", async (payload) => {
    return await workbenchStore.delete(payload as string);
  });

  wsServer.onRequest("workbench:duplicate", async (payload) => {
    const data = payload as { id: string; newName?: string };
    return await workbenchStore.duplicate(data.id, data.newName);
  });

  // Execution - Run prompt against model
  wsServer.onRequest("workbench:run", async (payload, clientId) => {
    const data = payload as { session: WorkbenchSession; variables?: Record<string, string> };
    const requestId = `workbench_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Only text prompts can be run against AI
    if (data.session.type !== 'text' || !data.session.messages) {
      throw new Error('Only text prompts can be run against AI');
    }

    // Build messages for AI provider
    const messages = data.session.messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: interpolateVariables(msg.content, data.variables || {}),
    }));

    const controller = new AbortController();
    activeRequests.set(requestId, { controller, clientId });

    // Start streaming in background
    (async () => {
      try {
        const response = await aiProvider.chat(
          {
            model: data.session.modelConfig?.modelId || 'claude-sonnet-4-20250514',
            messages,
            temperature: data.session.modelConfig?.temperature,
            maxTokens: data.session.modelConfig?.maxTokens,
            topP: data.session.modelConfig?.topP,
            stream: true,
            signal: controller.signal,
          },
          (chunk) => {
            wsServer.emitTo(clientId, "workbench:run-chunk", { requestId, chunk });
          }
        );

        wsServer.emitTo(clientId, "workbench:run-complete", { requestId, response });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          wsServer.emitTo(clientId, "workbench:run-error", {
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

  wsServer.onRequest("workbench:cancel-run", async (payload) => {
    const requestId = payload as string;
    const active = activeRequests.get(requestId);
    if (active) {
      active.controller.abort();
      activeRequests.delete(requestId);
    }
  });

  // Code export
  wsServer.onRequest("workbench:get-code", async (payload) => {
    const data = payload as {
      session: WorkbenchSession;
      format: 'curl' | 'python' | 'typescript' | 'node';
      variables?: Record<string, string>;
    };

    if (data.session.type !== 'text' || !data.session.messages) {
      throw new Error('Only text prompts can be exported as code');
    }

    const messages = data.session.messages.map(msg => ({
      role: msg.role,
      content: data.variables
        ? interpolateVariables(msg.content, data.variables)
        : msg.content,
    }));

    const modelId = data.session.modelConfig?.modelId || 'claude-sonnet-4-20250514';
    const maxTokens = data.session.modelConfig?.maxTokens || 4096;

    return generateCodeExport(data.format, messages, modelId, maxTokens);
  });
}

// Helper: interpolate {{VARIABLE}} syntax
function interpolateVariables(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (match, name) => {
    return variables[name] ?? match;
  });
}

// Helper: generate code export
function generateCodeExport(
  format: 'curl' | 'python' | 'typescript' | 'node',
  messages: Array<{ role: string; content: string }>,
  modelId: string,
  maxTokens: number
): string {
  const messagesJson = JSON.stringify(messages, null, 2);

  switch (format) {
    case 'curl':
      return `curl https://api.anthropic.com/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
  "model": "${modelId}",
  "max_tokens": ${maxTokens},
  "messages": ${messagesJson.split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')}
}'`;

    case 'python':
      return `import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="${modelId}",
    max_tokens=${maxTokens},
    messages=${messagesJson}
)

print(message.content)`;

    case 'typescript':
      return `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
  model: "${modelId}",
  max_tokens: ${maxTokens},
  messages: ${messagesJson}
});

console.log(message.content);`;

    case 'node':
      return `const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

async function main() {
  const message = await client.messages.create({
    model: "${modelId}",
    max_tokens: ${maxTokens},
    messages: ${messagesJson}
  });

  console.log(message.content);
}

main();`;
  }
}

// -----------------------------------------------------------------------------
// LINUX X11 FRAMELESS WINDOW HELPER
// -----------------------------------------------------------------------------

async function removeX11Decorations(windowTitle: string, maxAttempts = 10): Promise<void> {
  if (process.platform !== 'linux') return;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Find window ID using wmctrl
      const wmctrl = Bun.spawn(['wmctrl', '-l'], { stdout: 'pipe' });
      const output = await new Response(wmctrl.stdout).text();

      const line = output.split('\n').find(l => l.includes(windowTitle));
      if (line) {
        const windowId = line.split(/\s+/)[0];
        // Remove decorations using Motif WM hints
        // Format: flags=2 (MWM_HINTS_DECORATIONS), decorations=0
        await Bun.spawn([
          'xprop', '-id', windowId,
          '-f', '_MOTIF_WM_HINTS', '32c',
          '-set', '_MOTIF_WM_HINTS', '2, 0, 0, 0, 0'
        ]).exited;
        console.log('[YAAI] X11 decorations removed');
        return;
      }
    } catch (e) {
      // wmctrl/xprop not available, skip silently
      return;
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

// -----------------------------------------------------------------------------
// STARTUP
// -----------------------------------------------------------------------------

async function startup() {
  // Initialize backend services FIRST (including WebSocket server)
  await initialize();

  // THEN create the window (so frontend can connect to the already-running WS server)
  mainWindow = new BrowserWindow({
    title: "YAAI",
    url: "views://mainview/index.html",
    frame: {
      width: 1200,
      height: 800,
      x: 0,
      y: 0,
    },
    styleMask: {
      Borderless: true,
    },
  });

  // Remove X11 window decorations on Linux (workaround for CEF/GTK)
  // TODO: Re-enable once we have proper window dragging
  // removeX11Decorations("YAAI");

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
