// =============================================================================
// ARTIFACT WORKER
// =============================================================================
// Worker script that executes artifact handlers in an isolated context.
// Communicates with the main thread via postMessage.

import type {
  ArtifactManifest,
  ExecutionContext,
  ArtifactStorage,
  ArtifactLogger,
  ArtifactInvoker,
  AuthenticatedClient,
} from '../../mainview/types';

// -----------------------------------------------------------------------------
// MESSAGE TYPES
// -----------------------------------------------------------------------------

export interface WorkerRequest {
  type: 'execute';
  requestId: string;
  handlerPath: string;
  input: unknown;
  manifest: ArtifactManifest;
  timeout: number;
  // Serializable parts of context
  contextData: {
    userId: string;
    invocationId: string;
    apiConfigs?: Record<string, { baseUrl: string; headers: Record<string, string> }>;
    storageDir: string;
  };
}

export interface WorkerResponse {
  type: 'result' | 'error' | 'log' | 'progress' | 'storage';
  requestId: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logMessage?: string;
  progress?: number;
  progressMessage?: string;
  // Storage operations
  storageOp?: 'get' | 'set' | 'delete' | 'list' | 'clear';
  storageKey?: string;
  storageValue?: unknown;
}

// -----------------------------------------------------------------------------
// WORKER STORAGE PROXY
// -----------------------------------------------------------------------------

// Storage operations are proxied to main thread
function createWorkerStorage(requestId: string, storageDir: string): ArtifactStorage {
  const cache = new Map<string, unknown>();

  // Synchronous proxy - operations are batched and sent to main thread
  // For simplicity, we use local storage backed by the cache
  // In production, this would use structured clone + postMessage

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      if (cache.has(key)) {
        return cache.get(key) as T;
      }

      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(storageDir, `${key}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        const value = JSON.parse(content) as T;
        cache.set(key, value);
        return value;
      } catch {
        return null;
      }
    },

    async set<T = unknown>(key: string, value: T): Promise<void> {
      const fs = await import('fs/promises');
      const path = await import('path');

      await fs.mkdir(storageDir, { recursive: true });
      const filePath = path.join(storageDir, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(value, null, 2));
      cache.set(key, value);
    },

    async delete(key: string): Promise<void> {
      const fs = await import('fs/promises');
      const path = await import('path');

      try {
        const filePath = path.join(storageDir, `${key}.json`);
        await fs.unlink(filePath);
      } catch {
        // Ignore if doesn't exist
      }
      cache.delete(key);
    },

    async list(): Promise<string[]> {
      const fs = await import('fs/promises');

      try {
        const files = await fs.readdir(storageDir);
        return files
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace('.json', ''));
      } catch {
        return [];
      }
    },

    async clear(): Promise<void> {
      const fs = await import('fs/promises');

      try {
        await fs.rm(storageDir, { recursive: true });
        await fs.mkdir(storageDir, { recursive: true });
      } catch {
        // Ignore errors
      }
      cache.clear();
    },
  };
}

// -----------------------------------------------------------------------------
// WORKER LOGGER
// -----------------------------------------------------------------------------

function createWorkerLogger(requestId: string): ArtifactLogger {
  const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]) => {
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
      : message;

    // Send to main thread
    const response: WorkerResponse = {
      type: 'log',
      requestId,
      logLevel: level,
      logMessage: formattedMessage,
    };
    self.postMessage(response);
  };

  return {
    debug: (message, ...args) => log('debug', message, ...args),
    info: (message, ...args) => log('info', message, ...args),
    warn: (message, ...args) => log('warn', message, ...args),
    error: (message, ...args) => log('error', message, ...args),
  };
}

// -----------------------------------------------------------------------------
// WORKER API CLIENT PROXY
// -----------------------------------------------------------------------------

function createWorkerApiClient(
  apiKey: string,
  config: { baseUrl: string; headers: Record<string, string> }
): AuthenticatedClient {
  return {
    async get<T = unknown>(endpoint: string): Promise<T> {
      const url = `${config.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: config.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    },

    async post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
      const url = `${config.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...config.headers,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    },

    async put<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
      const url = `${config.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...config.headers,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    },

    async delete<T = unknown>(endpoint: string): Promise<T> {
      const url = `${config.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: config.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    },
  };
}

// -----------------------------------------------------------------------------
// WORKER ARTIFACT INVOKER STUB
// -----------------------------------------------------------------------------

function createWorkerArtifactInvoker(): ArtifactInvoker {
  // Artifact invocation from within a worker is not supported yet
  // Would require message passing to main thread
  return {
    async invoke<TInput = unknown, TOutput = unknown>(
      artifactId: string,
      _input: TInput
    ): Promise<TOutput> {
      throw new Error(
        `Artifact invocation (${artifactId}) from within a worker is not yet supported. ` +
        'Call artifacts from the main handler instead.'
      );
    },

    async exists(_artifactId: string): Promise<boolean> {
      return false;
    },

    async getManifest(_artifactId: string) {
      return null;
    },
  };
}

// -----------------------------------------------------------------------------
// MESSAGE HANDLER
// -----------------------------------------------------------------------------

async function handleMessage(event: MessageEvent<WorkerRequest>): Promise<void> {
  const request = event.data;

  if (request.type !== 'execute') {
    return;
  }

  const { requestId, handlerPath, input, manifest, timeout, contextData } = request;

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  try {
    // Build context
    const apis: Record<string, AuthenticatedClient> = {};
    if (contextData.apiConfigs) {
      for (const [key, config] of Object.entries(contextData.apiConfigs)) {
        apis[key] = createWorkerApiClient(key, config);
      }
    }

    const context: ExecutionContext = {
      apis,
      artifacts: createWorkerArtifactInvoker(),
      storage: createWorkerStorage(requestId, contextData.storageDir),
      logger: createWorkerLogger(requestId),
      signal: abortController.signal,
      userId: contextData.userId,
      invocationId: contextData.invocationId,
      manifest,
    };

    // Import and execute handler
    const handlerModule = await import(handlerPath);
    const handler = handlerModule.default || handlerModule;

    if (typeof handler.execute !== 'function') {
      throw new Error('Handler does not have an execute function');
    }

    // Execute
    const result = await Promise.race([
      handler.execute(input, context),
      new Promise((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(new Error('Execution timeout'));
        });
      }),
    ]);

    clearTimeout(timeoutId);

    // Send success response
    const response: WorkerResponse = {
      type: 'result',
      requestId,
      data: result,
    };
    self.postMessage(response);

  } catch (err) {
    clearTimeout(timeoutId);

    // Send error response
    const response: WorkerResponse = {
      type: 'error',
      requestId,
      error: {
        code: err instanceof Error && err.message.includes('timeout') ? 'TIMEOUT' : 'EXECUTION_ERROR',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    };
    self.postMessage(response);
  }
}

// -----------------------------------------------------------------------------
// WORKER ENTRY POINT
// -----------------------------------------------------------------------------

// Listen for messages from main thread
self.onmessage = handleMessage;

// Signal ready
self.postMessage({ type: 'ready' });
