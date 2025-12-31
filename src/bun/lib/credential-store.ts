// =============================================================================
// CREDENTIAL STORE
// =============================================================================
// Securely stores and manages API credentials.
// Creates pre-authenticated HTTP clients for artifact handlers.

import { readFile, writeFile, rm, readdir, mkdir } from 'fs/promises';
import type {
  Credential,
  CredentialStore as ICredentialStore,
  AuthenticatedClient,
  RequestOptions,
  ApiResponse,
} from '../../mainview/types';
import { CREDENTIALS_DIR, getCredentialPath } from './paths';

// -----------------------------------------------------------------------------
// RATE LIMITER
// -----------------------------------------------------------------------------

class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private window: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.window = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove expired timestamps
    this.requests = this.requests.filter(t => now - t < this.window);

    if (this.requests.length >= this.limit) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitTime = this.window - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire(); // Retry after waiting
      }
    }

    this.requests.push(now);
  }
}

// -----------------------------------------------------------------------------
// AUTHENTICATED CLIENT
// -----------------------------------------------------------------------------

function createAuthenticatedClient(credential: Credential): AuthenticatedClient {
  const rateLimiter = credential.rateLimit
    ? new RateLimiter(credential.rateLimit.requests, credential.rateLimit.window)
    : null;

  /**
   * Build headers for a request
   */
  function buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...credential.defaultHeaders,
      ...options?.headers,
    };

    // Add authentication header
    switch (credential.type) {
      case 'api_key':
        if (credential.apiKey) {
          const headerName = credential.headerName || 'Authorization';
          const prefix = credential.headerPrefix ?? 'Bearer';
          headers[headerName] = prefix ? `${prefix} ${credential.apiKey}` : credential.apiKey;
        }
        break;

      case 'oauth':
        if (credential.accessToken) {
          headers['Authorization'] = `Bearer ${credential.accessToken}`;
        }
        break;

      case 'basic':
        if (credential.username && credential.password) {
          const encoded = btoa(`${credential.username}:${credential.password}`);
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Build URL with query parameters
   */
  function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(path, credential.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Make a request
   */
  async function request<T>(
    method: string,
    path: string,
    options?: RequestOptions & { data?: unknown }
  ): Promise<ApiResponse<T>> {
    // Rate limiting
    if (rateLimiter) {
      await rateLimiter.acquire();
    }

    const url = buildUrl(path, options?.params);
    const headers = buildHeaders(options);

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options?.timeout
        ? AbortSignal.timeout(options.timeout)
        : undefined,
    };

    if (options?.data && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(options.data);
    }

    const response = await fetch(url, fetchOptions);

    // Parse response
    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = await response.json() as T;
    } else {
      data = await response.text() as unknown as T;
    }

    // Convert headers to plain object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      data,
      status: response.status,
      headers: responseHeaders,
    };
  }

  return {
    get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
      return request<T>('GET', path, options);
    },

    post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
      return request<T>('POST', path, { ...options, data });
    },

    put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
      return request<T>('PUT', path, { ...options, data });
    },

    patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
      return request<T>('PATCH', path, { ...options, data });
    },

    delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
      return request<T>('DELETE', path, options);
    },

    request<T>(method: string, path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
      return request<T>(method, path, options);
    },
  };
}

// -----------------------------------------------------------------------------
// CREDENTIAL STORE
// -----------------------------------------------------------------------------

export class CredentialStore implements ICredentialStore {
  private cache = new Map<string, Credential>();
  private clients = new Map<string, AuthenticatedClient>();
  private initialized = false;

  /**
   * Initialize the store
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    await mkdir(CREDENTIALS_DIR, { recursive: true });

    // Load all credentials into cache
    await this.loadAll();

    this.initialized = true;
  }

  /**
   * Load all credentials from disk
   */
  private async loadAll(): Promise<void> {
    try {
      const files = await readdir(CREDENTIALS_DIR);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const key = file.replace('.json', '');
        try {
          const credential = await this.loadCredential(key);
          if (credential) {
            this.cache.set(key, credential);
          }
        } catch (err) {
          console.error(`Failed to load credential ${key}:`, err);
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Load a credential from disk
   */
  private async loadCredential(key: string): Promise<Credential | null> {
    try {
      const path = getCredentialPath(key);
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content) as Credential;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Store a credential
   */
  async set(key: string, credential: Credential): Promise<void> {
    if (!this.initialized) await this.initialize();

    // Validate key format
    if (!/^[a-z0-9-]+$/.test(key)) {
      throw new Error(`Invalid credential key: ${key}. Must be lowercase alphanumeric with hyphens.`);
    }

    // Write to disk
    const path = getCredentialPath(key);
    await writeFile(path, JSON.stringify(credential, null, 2));

    // Update cache
    this.cache.set(key, credential);

    // Invalidate client cache
    this.clients.delete(key);
  }

  /**
   * Get a credential
   */
  async get(key: string): Promise<Credential | null> {
    if (!this.initialized) await this.initialize();

    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Try loading from disk
    const credential = await this.loadCredential(key);
    if (credential) {
      this.cache.set(key, credential);
    }

    return credential;
  }

  /**
   * Delete a credential
   */
  async delete(key: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    const path = getCredentialPath(key);

    try {
      await rm(path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }

    this.cache.delete(key);
    this.clients.delete(key);
  }

  /**
   * List all credential keys
   */
  async list(): Promise<string[]> {
    if (!this.initialized) await this.initialize();
    return Array.from(this.cache.keys());
  }

  /**
   * Check if a credential exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    return this.cache.has(key);
  }

  /**
   * Create an authenticated client for a credential
   */
  async createClient(key: string): Promise<AuthenticatedClient> {
    if (!this.initialized) await this.initialize();

    // Check client cache
    if (this.clients.has(key)) {
      return this.clients.get(key)!;
    }

    // Get credential
    const credential = await this.get(key);
    if (!credential) {
      throw new Error(`Credential ${key} not found`);
    }

    // Check OAuth token expiration
    if (credential.type === 'oauth' && credential.expiresAt) {
      if (Date.now() >= credential.expiresAt) {
        throw new Error(`OAuth token for ${key} has expired. Please refresh.`);
      }
    }

    // Create client
    const client = createAuthenticatedClient(credential);
    this.clients.set(key, client);

    return client;
  }

  /**
   * Refresh an OAuth token (placeholder - needs OAuth flow implementation)
   */
  async refreshOAuthToken(key: string): Promise<void> {
    const credential = await this.get(key);
    if (!credential) {
      throw new Error(`Credential ${key} not found`);
    }

    if (credential.type !== 'oauth') {
      throw new Error(`Credential ${key} is not OAuth`);
    }

    if (!credential.refreshToken) {
      throw new Error(`No refresh token available for ${key}`);
    }

    // TODO: Implement actual OAuth refresh flow
    // This would involve:
    // 1. Getting the OAuth provider config
    // 2. Making a token refresh request
    // 3. Updating the credential with new tokens

    throw new Error('OAuth refresh not yet implemented');
  }

  /**
   * Get credential info without sensitive data
   */
  async getInfo(key: string): Promise<{
    name: string;
    type: string;
    baseUrl: string;
    hasToken: boolean;
    expiresAt?: number;
  } | null> {
    const credential = await this.get(key);
    if (!credential) return null;

    return {
      name: credential.name,
      type: credential.type,
      baseUrl: credential.baseUrl,
      hasToken: !!(
        credential.apiKey ||
        credential.accessToken ||
        (credential.username && credential.password)
      ),
      expiresAt: credential.expiresAt,
    };
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let storeInstance: CredentialStore | null = null;

/**
 * Get the singleton credential store instance
 */
export function getCredentialStore(): CredentialStore {
  if (!storeInstance) {
    storeInstance = new CredentialStore();
  }
  return storeInstance;
}
