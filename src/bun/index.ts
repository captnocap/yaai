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
} from "./lib";
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

  // Start file watcher for hot reload (in dev mode)
  if (process.env.NODE_ENV !== "production") {
    await registry.startWatching();
  }

  console.log("[YAAI] Initialization complete");

  // Log stats
  const stats = await registry.getStats();
  console.log(`[YAAI] Loaded ${stats.total} artifacts (${stats.enabled} enabled)`);
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

mainWindow.on("close", () => {
  // Clean up
  const registry = getRegistry();
  registry.stopWatching();

  process.exit(0);
});

// Initialize on startup
initialize().catch((err) => {
  console.error("[YAAI] Initialization failed:", err);
  process.exit(1);
});
