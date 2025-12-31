// =============================================================================
// ARTIFACT LOADER
// =============================================================================
// Executes artifact handlers in sandboxed Bun Workers.
// Provides ExecutionContext with APIs, storage, logging, etc.

import { readFile } from 'fs/promises';
import { join } from 'path';
import type {
  ArtifactManifest,
  ArtifactLoader as IArtifactLoader,
  ArtifactExecutionResult,
  ArtifactError,
  ArtifactErrorCode,
  ExecutionContext,
  ValidationResult,
  ArtifactStorage,
  ArtifactLogger,
  ArtifactInvoker,
  AuthenticatedClient,
} from '../../mainview/types';
import {
  getArtifactDir,
  getArtifactHandlerPath,
  getArtifactUIPath,
  getArtifactStorageDir,
  getArtifactCacheDir,
} from './paths';
import { getRegistry } from './artifact-registry';
import { getCredentialStore } from './credential-store';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface WorkerMessage {
  type: 'execute' | 'result' | 'error' | 'log' | 'progress';
  requestId: string;
  data?: unknown;
  error?: ArtifactError;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logMessage?: string;
  progress?: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// -----------------------------------------------------------------------------
// ARTIFACT STORAGE IMPLEMENTATION
// -----------------------------------------------------------------------------

function createArtifactStorage(artifactId: string): ArtifactStorage {
  const storageDir = getArtifactStorageDir(artifactId);
  const cache = new Map<string, unknown>();

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      // Check memory cache
      if (cache.has(key)) {
        return cache.get(key) as T;
      }

      // Check disk
      try {
        const filePath = join(storageDir, `${key}.json`);
        const content = await readFile(filePath, 'utf-8');
        const value = JSON.parse(content) as T;
        cache.set(key, value);
        return value;
      } catch {
        return null;
      }
    },

    async set<T = unknown>(key: string, value: T): Promise<void> {
      const { writeFile, mkdir } = await import('fs/promises');
      await mkdir(storageDir, { recursive: true });

      const filePath = join(storageDir, `${key}.json`);
      await writeFile(filePath, JSON.stringify(value, null, 2));
      cache.set(key, value);
    },

    async delete(key: string): Promise<void> {
      const { rm } = await import('fs/promises');
      try {
        const filePath = join(storageDir, `${key}.json`);
        await rm(filePath);
      } catch {
        // Ignore if doesn't exist
      }
      cache.delete(key);
    },

    async list(): Promise<string[]> {
      const { readdir } = await import('fs/promises');
      try {
        const files = await readdir(storageDir);
        return files
          .filter(f => f.endsWith('.json'))
          .map(f => f.replace('.json', ''));
      } catch {
        return [];
      }
    },

    async clear(): Promise<void> {
      const { rm, mkdir } = await import('fs/promises');
      try {
        await rm(storageDir, { recursive: true });
        await mkdir(storageDir, { recursive: true });
      } catch {
        // Ignore errors
      }
      cache.clear();
    },
  };
}

// -----------------------------------------------------------------------------
// ARTIFACT LOGGER IMPLEMENTATION
// -----------------------------------------------------------------------------

function createArtifactLogger(
  artifactId: string,
  invocationId: string,
  onLog?: (level: string, message: string) => void
): ArtifactLogger {
  const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: unknown[]) => {
    const formattedMessage = args.length > 0
      ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}`
      : message;

    // Console output with prefix
    const prefix = `[${artifactId}:${invocationId.slice(0, 8)}]`;
    console[level](`${prefix} ${formattedMessage}`);

    // Callback for streaming to frontend
    onLog?.(level, formattedMessage);
  };

  return {
    debug: (message, ...args) => log('debug', message, ...args),
    info: (message, ...args) => log('info', message, ...args),
    warn: (message, ...args) => log('warn', message, ...args),
    error: (message, ...args) => log('error', message, ...args),
  };
}

// -----------------------------------------------------------------------------
// ARTIFACT INVOKER IMPLEMENTATION
// -----------------------------------------------------------------------------

function createArtifactInvoker(loader: ArtifactLoader, context: Partial<ExecutionContext>): ArtifactInvoker {
  return {
    async invoke<TInput = unknown, TOutput = unknown>(
      artifactId: string,
      input: TInput
    ): Promise<TOutput> {
      const result = await loader.invoke<TInput, TOutput>(artifactId, input, context);

      if (!result.success) {
        throw new Error(result.error?.message || 'Artifact invocation failed');
      }

      return result.data as TOutput;
    },

    async exists(artifactId: string): Promise<boolean> {
      const registry = getRegistry();
      const manifest = await registry.get(artifactId);
      return manifest !== null && manifest.enabled !== false;
    },

    async getManifest(artifactId: string): Promise<ArtifactManifest | null> {
      const registry = getRegistry();
      return registry.get(artifactId);
    },
  };
}

// -----------------------------------------------------------------------------
// ARTIFACT LOADER
// -----------------------------------------------------------------------------

export class ArtifactLoader implements IArtifactLoader {
  private handlerCache = new Map<string, unknown>();
  private resultCache = new Map<string, CacheEntry<unknown>>();
  private uiCache = new Map<string, string>();
  private activeWorkers = new Map<string, Worker>();

  // Event callbacks
  public onLog?: (artifactId: string, invocationId: string, level: string, message: string) => void;
  public onProgress?: (artifactId: string, requestId: string, progress: number, message?: string) => void;

  /**
   * Invoke an artifact
   */
  async invoke<TInput = unknown, TOutput = unknown>(
    artifactId: string,
    input: TInput,
    partialContext?: Partial<ExecutionContext>
  ): Promise<ArtifactExecutionResult<TOutput>> {
    const startTime = Date.now();
    const invocationId = crypto.randomUUID();

    try {
      // Get manifest
      const registry = getRegistry();
      const manifest = await registry.get(artifactId);

      if (!manifest) {
        return this.createErrorResult<TOutput>(
          'NOT_FOUND',
          `Artifact ${artifactId} not found`,
          startTime
        );
      }

      if (manifest.enabled === false) {
        return this.createErrorResult<TOutput>(
          'DISABLED',
          `Artifact ${artifactId} is disabled`,
          startTime
        );
      }

      // Check cache
      if (manifest.cache?.enabled) {
        const cacheKey = this.getCacheKey(artifactId, input);
        const cached = this.resultCache.get(cacheKey);

        if (cached && Date.now() < cached.expiresAt) {
          return {
            success: true,
            data: cached.data as TOutput,
            duration: Date.now() - startTime,
            cached: true,
          };
        }
      }

      // Validate input
      const validation = await this.validateInput(artifactId, input);
      if (!validation.valid) {
        return this.createErrorResult<TOutput>(
          'VALIDATION_ERROR',
          `Input validation failed: ${validation.errors?.map(e => e.message).join(', ')}`,
          startTime,
          validation.errors
        );
      }

      // Build execution context
      const context = await this.buildContext(manifest, invocationId, partialContext);

      // Execute with timeout and retries
      const result = await this.executeWithRetry<TInput, TOutput>(
        manifest,
        input,
        context
      );

      // Cache successful results
      if (result.success && manifest.cache?.enabled) {
        const cacheKey = this.getCacheKey(artifactId, input);
        this.resultCache.set(cacheKey, {
          data: result.data,
          expiresAt: Date.now() + manifest.cache.ttl,
        });
      }

      return {
        ...result,
        duration: Date.now() - startTime,
        cached: false,
      };
    } catch (err) {
      return this.createErrorResult<TOutput>(
        'INTERNAL_ERROR',
        err instanceof Error ? err.message : 'Unknown error',
        startTime,
        err
      );
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<TInput, TOutput>(
    manifest: ArtifactManifest,
    input: TInput,
    context: ExecutionContext
  ): Promise<ArtifactExecutionResult<TOutput>> {
    const maxRetries = manifest.retries ?? 0;
    let lastError: ArtifactError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await this.executeInWorker<TInput, TOutput>(
          manifest,
          input,
          context
        );

        return {
          success: true,
          data,
          duration: 0, // Will be set by caller
          cached: false,
        };
      } catch (err) {
        lastError = this.toArtifactError(err);

        // Don't retry on certain error types
        if (['VALIDATION_ERROR', 'NOT_FOUND', 'DISABLED', 'PERMISSION_DENIED'].includes(lastError.code)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    return {
      success: false,
      error: lastError,
      duration: 0,
      cached: false,
    };
  }

  /**
   * Execute handler in a Bun Worker
   */
  private async executeInWorker<TInput, TOutput>(
    manifest: ArtifactManifest,
    input: TInput,
    context: ExecutionContext
  ): Promise<TOutput> {
    const timeout = manifest.timeout ?? 30000;

    // For now, execute directly (Bun Worker implementation TODO)
    // In production, this would spawn a Worker for sandboxing
    return this.executeDirectly<TInput, TOutput>(manifest, input, context, timeout);
  }

  /**
   * Execute handler directly (no sandboxing - for development)
   */
  private async executeDirectly<TInput, TOutput>(
    manifest: ArtifactManifest,
    input: TInput,
    context: ExecutionContext,
    timeout: number
  ): Promise<TOutput> {
    const handlerPath = getArtifactHandlerPath(manifest.id, manifest.entry);

    // Dynamic import of the handler
    const handlerModule = await import(handlerPath);
    const handler = handlerModule.default || handlerModule;

    if (typeof handler.execute !== 'function') {
      throw new Error('Handler does not have an execute function');
    }

    // Execute with timeout
    const result = await Promise.race([
      handler.execute(input, context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);

    return result as TOutput;
  }

  /**
   * Build execution context
   */
  private async buildContext(
    manifest: ArtifactManifest,
    invocationId: string,
    partial?: Partial<ExecutionContext>
  ): Promise<ExecutionContext> {
    // Create abort controller
    const abortController = new AbortController();

    // Build API clients
    const apis: Record<string, AuthenticatedClient> = {};
    if (manifest.apis) {
      const credStore = getCredentialStore();
      for (const apiKey of manifest.apis) {
        try {
          apis[apiKey] = await credStore.createClient(apiKey);
        } catch (err) {
          console.warn(`Failed to create client for ${apiKey}:`, err);
        }
      }
    }

    // Create context
    const context: ExecutionContext = {
      apis,
      artifacts: createArtifactInvoker(this, partial),
      storage: createArtifactStorage(manifest.id),
      logger: createArtifactLogger(
        manifest.id,
        invocationId,
        (level, message) => {
          this.onLog?.(manifest.id, invocationId, level, message);
        }
      ),
      signal: abortController.signal,
      userId: partial?.userId || 'default',
      invocationId,
      manifest,
      ...partial,
    };

    return context;
  }

  /**
   * Get compiled UI component code
   */
  async getUIComponent(artifactId: string): Promise<string | null> {
    // Check cache
    if (this.uiCache.has(artifactId)) {
      return this.uiCache.get(artifactId)!;
    }

    // Get manifest
    const registry = getRegistry();
    const manifest = await registry.get(artifactId);

    if (!manifest || !manifest.ui) {
      return null;
    }

    try {
      // Read UI file
      const uiPath = getArtifactUIPath(artifactId, manifest.ui);
      const code = await readFile(uiPath, 'utf-8');

      // TODO: Compile/bundle the UI component
      // For now, return raw code
      // In production, use Bun.build() or esbuild to bundle

      this.uiCache.set(artifactId, code);
      return code;
    } catch (err) {
      console.error(`Failed to load UI for ${artifactId}:`, err);
      return null;
    }
  }

  /**
   * Validate input against artifact schema
   */
  async validateInput(artifactId: string, input: unknown): Promise<ValidationResult> {
    const registry = getRegistry();
    const manifest = await registry.get(artifactId);

    if (!manifest) {
      return { valid: false, errors: [{ path: '', message: 'Artifact not found' }] };
    }

    // If no schema, consider valid
    if (!manifest.input?.schema) {
      return { valid: true };
    }

    // TODO: Implement schema validation
    // This would use Zod or JSON Schema validation
    // For now, always valid
    return { valid: true };
  }

  /**
   * Invalidate cached handler
   */
  invalidateCache(artifactId: string): void {
    this.handlerCache.delete(artifactId);
    this.uiCache.delete(artifactId);

    // Clear result cache for this artifact
    for (const key of this.resultCache.keys()) {
      if (key.startsWith(`${artifactId}:`)) {
        this.resultCache.delete(key);
      }
    }
  }

  /**
   * Cancel a running invocation
   */
  cancel(requestId: string): void {
    const worker = this.activeWorkers.get(requestId);
    if (worker) {
      worker.terminate();
      this.activeWorkers.delete(requestId);
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private getCacheKey(artifactId: string, input: unknown): string {
    const inputHash = JSON.stringify(input);
    return `${artifactId}:${inputHash}`;
  }

  private createErrorResult<T>(
    code: ArtifactErrorCode,
    message: string,
    startTime: number,
    details?: unknown
  ): ArtifactExecutionResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      duration: Date.now() - startTime,
      cached: false,
    };
  }

  private toArtifactError(err: unknown): ArtifactError {
    if (err instanceof Error) {
      if (err.message.includes('timeout')) {
        return { code: 'TIMEOUT', message: err.message };
      }
      if (err.message.includes('abort')) {
        return { code: 'CANCELLED', message: err.message };
      }
      return {
        code: 'EXECUTION_ERROR',
        message: err.message,
        stack: err.stack,
      };
    }
    return {
      code: 'INTERNAL_ERROR',
      message: String(err),
    };
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let loaderInstance: ArtifactLoader | null = null;

/**
 * Get the singleton loader instance
 */
export function getLoader(): ArtifactLoader {
  if (!loaderInstance) {
    loaderInstance = new ArtifactLoader();
  }
  return loaderInstance;
}
