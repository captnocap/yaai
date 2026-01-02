// =============================================================================
// ARTIFACT TYPES
// =============================================================================
// Type definitions for the Artifact Registry System.
// Artifacts are persistent, invocable tools created during chat.

import type { z } from 'zod';

// -----------------------------------------------------------------------------
// CORE TYPES
// -----------------------------------------------------------------------------

/**
 * Artifact categories - determines behavior and capabilities
 */
export type ArtifactType = 'tool' | 'view' | 'service' | 'prompt';

/**
 * Current state of an artifact in the system
 */
export type ArtifactStatus =
  | 'installing'    // Being written to disk, validated
  | 'installed'     // Ready to use
  | 'running'       // Currently executing
  | 'error'         // Failed installation or execution
  | 'disabled';     // Manually disabled by user

/**
 * How the artifact was created
 */
export type ArtifactOrigin =
  | 'chat'          // Created by AI in conversation
  | 'manual'        // User wrote it directly
  | 'import'        // Imported from file/URL
  | 'builtin';      // Ships with the app

// -----------------------------------------------------------------------------
// MANIFEST
// -----------------------------------------------------------------------------

/**
 * Schema definition - supports both Zod and JSON Schema
 */
export interface SchemaDefinition {
  /** Zod schema (runtime) or JSON Schema (serialized) */
  schema: z.ZodType | JSONSchemaType;
  /** Human-readable description of the data shape */
  description?: string;
}

/**
 * JSON Schema type for serialization
 */
export interface JSONSchemaType {
  type: string;
  properties?: Record<string, JSONSchemaType>;
  required?: string[];
  items?: JSONSchemaType;
  enum?: unknown[];
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

/**
 * The artifact manifest - metadata and configuration
 */
export interface ArtifactManifest {
  /** Unique identifier (slug format: lowercase, hyphens) */
  id: string;

  /** Human-readable display name */
  name: string;

  /** What this artifact does */
  description: string;

  /** Artifact category */
  type: ArtifactType;

  /** Semantic version */
  version: string;

  // -- Execution --

  /** Relative path to handler module (e.g., "handler.ts") */
  entry: string;

  /** Relative path to UI component (e.g., "index.tsx") */
  ui?: string;

  // -- Schema --

  /** Input validation schema */
  input?: SchemaDefinition;

  /** Output type schema */
  output?: SchemaDefinition;

  // -- Dependencies --

  /** Required credential keys (e.g., ["github", "notion"]) */
  apis?: string[];

  /** Other artifacts this depends on */
  artifacts?: string[];

  /** npm packages needed (installed to artifact dir) */
  packages?: string[];

  // -- Metadata --

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  /** How this artifact was created */
  createdBy: {
    type: ArtifactOrigin;
    /** Reference to source (chat ID, import URL, etc.) */
    ref?: string;
  };

  /** Tags for organization/search */
  tags?: string[];

  /** Icon identifier or emoji */
  icon?: string;

  // -- Runtime Config --

  /** Execution timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retry attempts on failure (default: 0) */
  retries?: number;

  /** Caching configuration */
  cache?: {
    enabled: boolean;
    /** Time-to-live in milliseconds */
    ttl: number;
  };

  /** Whether this artifact is enabled */
  enabled?: boolean;
}

// -----------------------------------------------------------------------------
// HANDLER INTERFACE
// -----------------------------------------------------------------------------

/**
 * Validation result from input checking
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Logger interface available to handlers
 */
export interface ArtifactLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Key-value storage scoped to the artifact
 */
export interface ArtifactStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Invoke other artifacts from within a handler
 */
export interface ArtifactInvoker {
  invoke<TInput = unknown, TOutput = unknown>(
    artifactId: string,
    input: TInput
  ): Promise<TOutput>;

  /** Check if an artifact exists and is enabled */
  exists(artifactId: string): Promise<boolean>;

  /** Get manifest of another artifact */
  getManifest(artifactId: string): Promise<ArtifactManifest | null>;
}

/**
 * Pre-authenticated API client
 */
export interface AuthenticatedClient {
  get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  /** Raw request for custom methods */
  request<T = unknown>(method: string, path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}

export interface RequestOptions {
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Context provided to handler during execution
 */
export interface ExecutionContext {
  // -- Available Resources --

  /** Pre-authenticated API clients keyed by credential name */
  apis: Record<string, AuthenticatedClient>;

  /** Invoke other artifacts */
  artifacts: ArtifactInvoker;

  /** Artifact-scoped key-value storage */
  storage: ArtifactStorage;

  /** Logging interface */
  logger: ArtifactLogger;

  /** Abort signal for cancellation */
  signal: AbortSignal;

  // -- Metadata --

  /** Chat ID if invoked from conversation */
  chatId?: string;

  /** User identifier */
  userId: string;

  /** Unique ID for this invocation */
  invocationId: string;

  /** The artifact's own manifest */
  manifest: ArtifactManifest;
}

/**
 * The interface every artifact handler must implement
 */
export interface ArtifactHandler<TInput = unknown, TOutput = unknown> {
  /** Main execution function */
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;

  /** Called after artifact is installed */
  onInstall?(context: Omit<ExecutionContext, 'signal'>): Promise<void>;

  /** Called before artifact is uninstalled */
  onUninstall?(context: Omit<ExecutionContext, 'signal'>): Promise<void>;

  /** Custom input validation (in addition to schema) */
  validate?(input: TInput): ValidationResult;
}

// -----------------------------------------------------------------------------
// EXECUTION TYPES
// -----------------------------------------------------------------------------

/**
 * Result of an artifact invocation
 */
export interface ArtifactExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ArtifactError;
  /** Execution time in milliseconds */
  duration: number;
  /** Whether result was served from cache */
  cached: boolean;
}

/**
 * Structured error from artifact execution
 */
export interface ArtifactError {
  code: ArtifactErrorCode;
  message: string;
  details?: unknown;
  /** Stack trace (only in dev mode) */
  stack?: string;
}

export type ArtifactErrorCode =
  | 'NOT_FOUND'           // Artifact doesn't exist
  | 'DISABLED'            // Artifact is disabled
  | 'VALIDATION_ERROR'    // Input validation failed
  | 'EXECUTION_ERROR'     // Handler threw an error
  | 'TIMEOUT'             // Execution exceeded timeout
  | 'CANCELLED'           // Aborted via signal
  | 'DEPENDENCY_ERROR'    // Required artifact/credential missing
  | 'PERMISSION_DENIED'   // User lacks permission
  | 'INTERNAL_ERROR';     // Unexpected system error

// -----------------------------------------------------------------------------
// FILES
// -----------------------------------------------------------------------------

/**
 * Files that make up an artifact
 */
export interface ArtifactFiles {
  /** handler.ts content - required */
  handler: string;

  /** schema.ts content - optional, for complex schemas */
  schema?: string;

  /** index.tsx content - optional UI component */
  ui?: string;

  /** Additional assets (images, data files) */
  assets?: Record<string, string | ArrayBuffer>;
}

/**
 * Artifact with its files loaded
 */
export interface ArtifactBundle {
  manifest: ArtifactManifest;
  files: ArtifactFiles;
  /** Resolved absolute path to artifact directory */
  path: string;
}

// -----------------------------------------------------------------------------
// REGISTRY
// -----------------------------------------------------------------------------

/**
 * Query options for listing artifacts
 */
export interface ArtifactQuery {
  type?: ArtifactType;
  tags?: string[];
  search?: string;
  enabled?: boolean;
  origin?: ArtifactOrigin;
  limit?: number;
  offset?: number;
}

/**
 * Registry interface for artifact CRUD operations
 */
export interface ArtifactRegistry {
  // -- Discovery --

  list(query?: ArtifactQuery): Promise<ArtifactManifest[]>;
  get(id: string): Promise<ArtifactManifest | null>;
  exists(id: string): Promise<boolean>;

  // -- Lifecycle --

  install(manifest: ArtifactManifest, files: ArtifactFiles): Promise<void>;
  uninstall(id: string): Promise<void>;
  update(id: string, manifest: Partial<ArtifactManifest>, files?: Partial<ArtifactFiles>): Promise<void>;

  // -- State --

  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;

  // -- Events --

  on(event: ArtifactRegistryEvent, handler: (manifest: ArtifactManifest) => void): () => void;
}

export type ArtifactRegistryEvent = 'installed' | 'uninstalled' | 'updated' | 'enabled' | 'disabled';

// -----------------------------------------------------------------------------
// LOADER
// -----------------------------------------------------------------------------

/**
 * Loader interface for executing artifacts
 */
export interface ArtifactLoader {
  /** Invoke an artifact with input */
  invoke<TInput = unknown, TOutput = unknown>(
    artifactId: string,
    input: TInput,
    context?: Partial<ExecutionContext>
  ): Promise<ArtifactExecutionResult<TOutput>>;

  /** Get compiled UI component code */
  getUIComponent(artifactId: string): Promise<string | null>;

  /** Validate input against artifact schema */
  validateInput(artifactId: string, input: unknown): Promise<ValidationResult>;

  /** Invalidate cached handler (for hot reload) */
  invalidateCache(artifactId: string): void;
}

// -----------------------------------------------------------------------------
// CREDENTIALS
// -----------------------------------------------------------------------------

/**
 * Credential types supported
 */
export type CredentialType = 'api_key' | 'oauth' | 'basic';

/**
 * Credential configuration
 */
export interface Credential {
  /** Credential type */
  type: CredentialType;

  /** API base URL */
  baseUrl: string;

  /** Display name */
  name: string;

  // -- API Key Auth --

  apiKey?: string;
  /** Header name (default: "Authorization") */
  headerName?: string;
  /** Header prefix (default: "Bearer") */
  headerPrefix?: string;

  // -- OAuth --

  accessToken?: string;
  refreshToken?: string;
  /** Token expiration timestamp */
  expiresAt?: number;
  /** OAuth scopes */
  scopes?: string[];

  // -- Basic Auth --

  username?: string;
  password?: string;

  // -- Common --

  /** Default headers to include */
  defaultHeaders?: Record<string, string>;

  /** Rate limiting config */
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

/**
 * Credential store interface
 */
export interface CredentialStore {
  set(key: string, credential: Credential): Promise<void>;
  get(key: string): Promise<Credential | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  exists(key: string): Promise<boolean>;

  /** Create an authenticated client from credential */
  createClient(key: string): Promise<AuthenticatedClient>;
}

// -----------------------------------------------------------------------------
// WEBSOCKET EVENTS
// -----------------------------------------------------------------------------

/**
 * Client -> Server events
 */
export interface ArtifactClientEvents {
  'artifact:install': {
    manifest: ArtifactManifest;
    files: ArtifactFiles;
  };

  'artifact:invoke': {
    artifactId: string;
    input: unknown;
    requestId: string;
  };

  'artifact:cancel': {
    requestId: string;
  };

  'artifact:uninstall': {
    artifactId: string;
  };

  'artifact:update': {
    artifactId: string;
    manifest?: Partial<ArtifactManifest>;
    files?: Partial<ArtifactFiles>;
  };

  'artifact:enable': {
    artifactId: string;
  };

  'artifact:disable': {
    artifactId: string;
  };

  'artifact:list': {
    query?: ArtifactQuery;
  };

  'artifact:get': {
    artifactId: string;
  };

  'artifact:get-ui': {
    artifactId: string;
  };
}

/**
 * Server -> Client events
 */
export interface ArtifactServerEvents {
  'artifact:installed': {
    manifest: ArtifactManifest;
  };

  'artifact:uninstalled': {
    artifactId: string;
  };

  'artifact:updated': {
    manifest: ArtifactManifest;
  };

  'artifact:enabled': {
    artifactId: string;
  };

  'artifact:disabled': {
    artifactId: string;
  };

  'artifact:result': {
    requestId: string;
    result: ArtifactExecutionResult;
  };

  'artifact:progress': {
    requestId: string;
    progress: number; // 0-100
    message?: string;
  };

  'artifact:list-result': {
    artifacts: ArtifactManifest[];
    total: number;
  };

  'artifact:get-result': {
    artifact: ArtifactBundle | null;
  };

  'artifact:ui-component': {
    artifactId: string;
    code: string;
  };

  'artifact:error': {
    artifactId?: string;
    requestId?: string;
    error: ArtifactError;
  };

  'artifact:log': {
    artifactId: string;
    invocationId: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
  };
}

// -----------------------------------------------------------------------------
// UI COMPONENT TYPES
// -----------------------------------------------------------------------------

/**
 * Props passed to artifact UI components in iframe
 */
export interface ArtifactUIProps<TData = unknown> {
  /** Data from handler execution */
  data: TData;

  /** Artifact manifest */
  manifest: ArtifactManifest;

  /** Send action to parent */
  onAction: (action: string, payload?: unknown) => void;

  /** Request re-execution with new input */
  onRefresh: (input?: unknown) => void;

  /** Theme variables from parent */
  theme: Record<string, string>;
}

/**
 * Message types for iframe <-> parent communication
 */
export interface ArtifactUIMessage {
  type: 'action' | 'refresh' | 'ready' | 'error' | 'resize';
  action?: string;
  payload?: unknown;
  height?: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// AI INTEGRATION
// -----------------------------------------------------------------------------

/**
 * Artifact creation request from AI
 */
export interface ArtifactCreateRequest {
  manifest: Omit<ArtifactManifest, 'createdAt' | 'updatedAt' | 'createdBy'>;
  files: ArtifactFiles;
}

/**
 * Artifact invocation request from AI
 */
export interface ArtifactInvokeRequest {
  artifactId: string;
  input: unknown;
}

/**
 * Summary of an artifact for AI context injection
 */
export interface ArtifactSummary {
  id: string;
  name: string;
  type: ArtifactType;
  description: string;
  inputDescription?: string;
  outputDescription?: string;
}
