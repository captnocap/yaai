# SPEC_WEBSOCKET.md

WebSocket protocol, server implementation, and client management for frontend-backend communication.

**Port**: Configurable, default `3001` (auto-increment on conflict)

---

## Overview

The WebSocket system provides:
- Request/response pattern with correlation IDs
- Server-push events for real-time updates
- Client lifecycle management
- Rate limiting per client
- Error handling and recovery
- Reconnection support

---

## Protocol Specification

### Message Types

All messages share a common base structure:

```typescript
interface WSMessage {
  type: 'request' | 'response' | 'event';
  channel: string;
  timestamp: number;  // Unix ms
}
```

### Request (Client -> Server)

Client sends a request and expects a response with matching ID.

```typescript
interface WSRequest extends WSMessage {
  type: 'request';
  id: string;        // UUID for correlation
  payload?: unknown; // Request data
}

// Example
{
  "type": "request",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "chat:list",
  "payload": { "limit": 50 },
  "timestamp": 1704067200000
}
```

### Response (Server -> Client)

Server responds with matching request ID.

```typescript
interface WSResponse extends WSMessage {
  type: 'response';
  id: string;        // Matches request ID
  payload?: unknown; // Response data
  error?: WSError;   // Present if request failed
}

// Success example
{
  "type": "response",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "chat:list",
  "payload": [{ "id": "chat_1", "title": "..." }],
  "timestamp": 1704067200050
}

// Error example
{
  "type": "response",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "chat:list",
  "error": {
    "code": "HANDLER_ERROR",
    "message": "Database connection failed"
  },
  "timestamp": 1704067200050
}
```

### Event (Server -> Client)

Server pushes events without request correlation.

```typescript
interface WSEvent extends WSMessage {
  type: 'event';
  payload: unknown;
}

// Example
{
  "type": "event",
  "channel": "ai:stream-chunk",
  "payload": {
    "requestId": "req_123",
    "chunk": { "type": "text", "text": "Hello" }
  },
  "timestamp": 1704067200100
}
```

### Error Structure

```typescript
interface WSError {
  code: WSErrorCode;
  message: string;
  details?: unknown;
}

type WSErrorCode =
  | 'UNKNOWN_CHANNEL'    // No handler registered
  | 'HANDLER_ERROR'      // Handler threw an error
  | 'TIMEOUT'            // Request timed out
  | 'CONNECTION_CLOSED'  // Client disconnected
  | 'INVALID_MESSAGE'    // Malformed message
  | 'RATE_LIMITED'       // Too many requests
  | 'UNAUTHORIZED';      // Authentication required
```

---

## Channel Registry

### Chat Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `chat:list` | Request | `{ limit?: number }` | `Chat[]` | List all chats |
| `chat:create` | Request | `{ title?: string }` | `Chat` | Create new chat |
| `chat:get` | Request | `{ id: string }` | `Chat \| null` | Get chat by ID |
| `chat:update` | Request | `{ id, title, systemPrompt }` | `Chat` | Update chat |
| `chat:delete` | Request | `{ id: string }` | `boolean` | Delete chat |
| `chat:get-messages` | Request | `{ chatId, limit, before }` | `MessagePage` | Get messages |
| `chat:add-message` | Request | `CreateMessageInput` | `Message` | Add message |
| `chat:search` | Request | `{ query, limit }` | `SearchResult[]` | Search messages |

### AI Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `ai:chat` | Request | `ChatRequest` | `ChatResponse` | Non-streaming chat |
| `ai:chat-stream` | Request | `ChatRequest` | `ChatResponse` | Streaming chat (+ events) |
| `ai:models` | Request | `{ provider }` | `ModelConfig[]` | List models |
| `ai:has-credentials` | Request | `{ provider }` | `boolean` | Check API key |
| `ai:stream-chunk` | Event | `{ requestId, chunk }` | - | Stream text chunk |
| `ai:stream-complete` | Event | `{ requestId, response }` | - | Stream finished |
| `ai:stream-error` | Event | `{ requestId, error }` | - | Stream error |

### Code Session Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `code:list-sessions` | Request | - | `Session[]` | List sessions |
| `code:get-session` | Request | `{ id }` | `Session \| null` | Get session |
| `code:get-transcript` | Request | `TranscriptQuery` | `TranscriptPage` | Get transcript |
| `code:search-transcript` | Request | `{ sessionId, query }` | `SearchResult[]` | Search |
| `code:list-restore-points` | Request | `{ sessionId }` | `RestorePoint[]` | List restore points |
| `code:restore` | Request | `{ restorePointId, targetDir }` | `RestoreResult` | Restore files |

### Image Gen Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `imagegen:list-groups` | Request | - | `QueueGroup[]` | List queue groups |
| `imagegen:list-entries` | Request | `{ groupId }` | `QueueEntry[]` | List entries |
| `imagegen:create-entry` | Request | `CreateEntryInput` | `QueueEntry` | Create entry |
| `imagegen:list-images` | Request | `GalleryFilters` | `GalleryPage` | List gallery |
| `imagegen:job-created` | Event | `{ jobId, job }` | - | Job started |
| `imagegen:job-completed` | Event | `{ jobId, job }` | - | Job finished |
| `imagegen:batch-started` | Event | `{ jobId, batchIndex }` | - | Batch started |
| `imagegen:batch-completed` | Event | `{ jobId, batchIndex, images }` | - | Batch finished |

### Settings Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `settings:get-all` | Request | - | `Settings` | Get all settings |
| `settings:get` | Request | `{ key }` | `unknown` | Get setting |
| `settings:set` | Request | `{ key, value }` | - | Set setting |
| `settings:update` | Request | `Partial<Settings>` | `Settings` | Update multiple |
| `settings:reset` | Request | `{ key? }` | `Settings` | Reset to defaults |
| `settings:changed` | Event | `{ key, value }` | - | Setting changed |

### Credential Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `credentials:list` | Request | - | `string[]` | List credential keys |
| `credentials:get` | Request | `{ key }` | `{ exists, metadata }` | Check credential |
| `credentials:set` | Request | `{ key, token, metadata }` | - | Set credential |
| `credentials:delete` | Request | `{ key }` | `boolean` | Delete credential |

### Artifact Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `artifact:list` | Request | - | `ArtifactMetadata[]` | List artifacts |
| `artifact:get` | Request | `{ id }` | `Artifact \| null` | Get artifact |
| `artifact:install` | Request | `{ source }` | `Artifact` | Install artifact |
| `artifact:invoke` | Request | `{ id, input }` | `unknown` | Execute artifact |
| `artifact:enable` | Request | `{ id }` | - | Enable artifact |
| `artifact:disable` | Request | `{ id }` | - | Disable artifact |
| `artifact:installed` | Event | `{ artifact }` | - | New artifact |
| `artifact:updated` | Event | `{ artifact }` | - | Artifact changed |
| `artifact:progress` | Event | `{ id, progress }` | - | Install progress |

### Analytics Channels

| Channel | Direction | Payload | Response | Description |
|---------|-----------|---------|----------|-------------|
| `analytics:dashboard` | Request | `{ timeRange?, granularity? }` | `DashboardData` | Full dashboard overview |
| `analytics:lifetime-totals` | Request | - | `LifetimeTotals` | Cumulative counters |
| `analytics:cost-summary` | Request | `{ timeRange }` | `CostSummary` | Cost breakdown by provider/model |
| `analytics:cost-timeseries` | Request | `{ timeRange, granularity }` | `TimeSeriesData` | Cost over time |
| `analytics:error-summary` | Request | `{ timeRange }` | `ErrorSummary` | Error stats |
| `analytics:error-timeseries` | Request | `{ timeRange, granularity }` | `TimeSeriesData` | Errors over time |
| `analytics:token-timeseries` | Request | `{ timeRange, granularity }` | `TimeSeriesData` | Token usage over time |
| `analytics:model-usage` | Request | `{ timeRange }` | `ModelUsageData` | Model rankings |
| `analytics:imagegen-timeseries` | Request | `{ timeRange, granularity }` | `TimeSeriesData` | Image gen over time |
| `analytics:tool-usage` | Request | `{ timeRange }` | `ToolUsageData` | Tool invocation stats |
| `analytics:session-stats` | Request | `{ timeRange }` | `SessionStats` | App session data |
| `analytics:run-aggregation` | Request | - | `{ aggregated: number }` | Manual aggregation trigger |
| `analytics:run-cleanup` | Request | - | `{ deleted: number }` | Manual cleanup trigger |

See `SPEC_ANALYTICS.md` for detailed payload types and full analytics specification.

---

## Server Implementation

```typescript
// =============================================================================
// WEBSOCKET SERVER
// =============================================================================

import type { Server, ServerWebSocket } from 'bun';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WSServerOptions {
  port: number;
  host?: string;
  maxPortAttempts?: number;
  onConnection?: (clientId: string) => void;
  onDisconnection?: (clientId: string) => void;
}

export interface WSClientData {
  id: string;
  connectedAt: Date;
  lastActivity: Date;
  requestCount: number;
}

export interface RequestContext {
  clientId: string;
  requestId: string;
  emit: (channel: string, payload: unknown) => void;
}

type RequestHandler<TPayload = unknown, TResult = unknown> = (
  payload: TPayload,
  context: RequestContext
) => Promise<TResult>;

// -----------------------------------------------------------------------------
// WEBSOCKET SERVER
// -----------------------------------------------------------------------------

export class WSServer {
  private server: Server | null = null;
  private clients = new Map<string, ServerWebSocket<WSClientData>>();
  private handlers = new Map<string, RequestHandler>();
  private rateLimiter: RateLimiter;
  private options: WSServerOptions | null = null;
  private _port: number | null = null;

  constructor() {
    this.rateLimiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 100,  // 100 req/sec per client
    });
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Start the server, finding available port if needed
   */
  async start(options: WSServerOptions): Promise<number> {
    const { port: startPort, host = 'localhost', maxPortAttempts = 10 } = options;
    this.options = options;

    for (let attempt = 0; attempt < maxPortAttempts; attempt++) {
      const port = startPort + attempt;

      try {
        this.server = Bun.serve({
          port,
          hostname: host,
          fetch: (req, server) => this.handleUpgrade(req, server),
          websocket: {
            open: (ws) => this.handleOpen(ws),
            message: (ws, msg) => this.handleMessage(ws, msg),
            close: (ws) => this.handleClose(ws),
            error: (ws, err) => this.handleError(ws, err),
            idleTimeout: 120,  // 2 minute idle timeout
          },
        });

        this._port = port;
        console.log(`[WS] Server listening on ws://${host}:${port}`);
        return port;
      } catch (err) {
        if (attempt === maxPortAttempts - 1) throw err;
        console.log(`[WS] Port ${port} in use, trying ${port + 1}...`);
      }
    }

    throw new Error('Could not find available port');
  }

  /**
   * Stop the server and disconnect all clients
   */
  stop(): void {
    if (this.server) {
      // Notify clients
      this.emit('server:shutdown', { reason: 'Server stopping' });

      this.server.stop();
      this.server = null;
    }
    this.clients.clear();
    this._port = null;
    console.log('[WS] Server stopped');
  }

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Register a handler for a request channel
   */
  onRequest<TPayload = unknown, TResult = unknown>(
    channel: string,
    handler: RequestHandler<TPayload, TResult>
  ): void {
    this.handlers.set(channel, handler as RequestHandler);
  }

  /**
   * Remove a handler
   */
  offRequest(channel: string): void {
    this.handlers.delete(channel);
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  /**
   * Broadcast event to all connected clients
   */
  emit(channel: string, payload: unknown): void {
    const event = createEvent(channel, payload);
    const message = JSON.stringify(event);

    for (const ws of this.clients.values()) {
      ws.send(message);
    }
  }

  /**
   * Send event to specific client
   */
  emitTo(clientId: string, channel: string, payload: unknown): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      const event = createEvent(channel, payload);
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send event to multiple clients
   */
  emitToMany(clientIds: string[], channel: string, payload: unknown): void {
    const event = createEvent(channel, payload);
    const message = JSON.stringify(event);

    for (const clientId of clientIds) {
      const ws = this.clients.get(clientId);
      if (ws) ws.send(message);
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE - CONNECTION HANDLERS
  // ---------------------------------------------------------------------------

  private handleUpgrade(req: Request, server: Server): Response | undefined {
    const upgraded = server.upgrade(req, {
      data: {
        id: crypto.randomUUID(),
        connectedAt: new Date(),
        lastActivity: new Date(),
        requestCount: 0,
      } as WSClientData,
    });

    if (!upgraded) {
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    return undefined;
  }

  private handleOpen(ws: ServerWebSocket<WSClientData>): void {
    this.clients.set(ws.data.id, ws);
    console.log(`[WS] Client connected: ${ws.data.id} (total: ${this.clients.size})`);
    this.options?.onConnection?.(ws.data.id);

    // Send connection acknowledgment
    ws.send(JSON.stringify(createEvent('server:connected', {
      clientId: ws.data.id,
      serverTime: Date.now(),
    })));
  }

  private async handleMessage(
    ws: ServerWebSocket<WSClientData>,
    message: string | Buffer
  ): Promise<void> {
    ws.data.lastActivity = new Date();
    ws.data.requestCount++;

    // Rate limiting
    if (!this.rateLimiter.check(ws.data.id)) {
      ws.send(JSON.stringify(createResponse(
        'rate_limited',
        'system',
        undefined,
        createError('RATE_LIMITED', 'Too many requests')
      )));
      return;
    }

    try {
      const msg = JSON.parse(message.toString());

      if (isWSRequest(msg)) {
        await this.handleRequest(ws, msg);
      }
    } catch (err) {
      console.error('[WS] Message parse error:', err);
    }
  }

  private async handleRequest(
    ws: ServerWebSocket<WSClientData>,
    request: WSRequest
  ): Promise<void> {
    const handler = this.handlers.get(request.channel);

    if (!handler) {
      ws.send(JSON.stringify(createResponse(
        request.id,
        request.channel,
        undefined,
        createError('UNKNOWN_CHANNEL', `No handler for: ${request.channel}`)
      )));
      return;
    }

    const context: RequestContext = {
      clientId: ws.data.id,
      requestId: request.id,
      emit: (channel, payload) => this.emitTo(ws.data.id, channel, payload),
    };

    try {
      const result = await handler(request.payload, context);
      ws.send(JSON.stringify(createResponse(request.id, request.channel, result)));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      ws.send(JSON.stringify(createResponse(
        request.id,
        request.channel,
        undefined,
        createError('HANDLER_ERROR', error.message)
      )));
    }
  }

  private handleClose(ws: ServerWebSocket<WSClientData>): void {
    this.clients.delete(ws.data.id);
    this.rateLimiter.clear(ws.data.id);
    console.log(`[WS] Client disconnected: ${ws.data.id} (total: ${this.clients.size})`);
    this.options?.onDisconnection?.(ws.data.id);
  }

  private handleError(ws: ServerWebSocket<WSClientData>, error: Error): void {
    console.error(`[WS] Error for client ${ws.data.id}:`, error);
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  get port(): number | null {
    return this._port;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  get isRunning(): boolean {
    return this.server !== null;
  }

  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  getClientInfo(clientId: string): WSClientData | undefined {
    return this.clients.get(clientId)?.data;
  }
}
```

---

## Rate Limiter

```typescript
// =============================================================================
// RATE LIMITER
// =============================================================================

interface RateLimiterConfig {
  windowMs: number;   // Time window in ms
  maxRequests: number; // Max requests per window
}

class RateLimiter {
  private config: RateLimiterConfig;
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  check(clientId: string): boolean {
    const now = Date.now();
    let window = this.windows.get(clientId);

    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + this.config.windowMs };
      this.windows.set(clientId, window);
    }

    window.count++;
    return window.count <= this.config.maxRequests;
  }

  /**
   * Clear client's rate limit data
   */
  clear(clientId: string): void {
    this.windows.delete(clientId);
  }

  /**
   * Get remaining requests for client
   */
  getRemaining(clientId: string): number {
    const window = this.windows.get(clientId);
    if (!window || Date.now() >= window.resetAt) {
      return this.config.maxRequests;
    }
    return Math.max(0, this.config.maxRequests - window.count);
  }
}
```

---

## Client Implementation

```typescript
// =============================================================================
// WEBSOCKET CLIENT (Frontend)
// =============================================================================

interface WSClientOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  requestTimeout?: number;
}

type EventCallback = (payload: unknown) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private options: WSClientOptions;
  private pendingRequests = new Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private eventListeners = new Map<string, Set<EventCallback>>();
  private reconnectAttempts = 0;
  private isClosing = false;

  constructor(options: WSClientOptions) {
    this.options = {
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      requestTimeout: 30000,
      ...options,
    };
  }

  // ---------------------------------------------------------------------------
  // CONNECTION
  // ---------------------------------------------------------------------------

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (event) => {
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        this.handleClose();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.isClosing = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ---------------------------------------------------------------------------
  // REQUEST/RESPONSE
  // ---------------------------------------------------------------------------

  /**
   * Send a request and wait for response
   */
  async sendMessage<T = unknown>(channel: string, payload?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const request = createRequest(channel, payload);

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout: ${channel}`));
      }, this.options.requestTimeout!);

      this.pendingRequests.set(request.id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timeout,
      });

      this.ws!.send(JSON.stringify(request));
    });
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to server events
   */
  onMessage(channel: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set());
    }
    this.eventListeners.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(channel)?.delete(callback);
    };
  }

  /**
   * Remove all listeners for a channel
   */
  offMessage(channel: string): void {
    this.eventListeners.delete(channel);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE
  // ---------------------------------------------------------------------------

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if (isWSResponse(message)) {
        this.handleResponse(message);
      } else if (isWSEvent(message)) {
        this.handleEvent(message);
      }
    } catch (err) {
      console.error('[WS Client] Message parse error:', err);
    }
  }

  private handleResponse(response: WSResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.payload);
    }
  }

  private handleEvent(event: WSEvent): void {
    const listeners = this.eventListeners.get(event.channel);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event.payload);
        } catch (err) {
          console.error(`[WS Client] Event handler error (${event.channel}):`, err);
        }
      }
    }
  }

  private handleClose(): void {
    // Reject all pending requests
    for (const [id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    // Attempt reconnection
    if (!this.isClosing && this.options.reconnect) {
      if (this.reconnectAttempts < this.options.maxReconnectAttempts!) {
        this.reconnectAttempts++;
        const delay = this.options.reconnectInterval! * Math.pow(1.5, this.reconnectAttempts - 1);

        console.log(`[WS Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
          this.connect().catch(err => {
            console.error('[WS Client] Reconnection failed:', err);
          });
        }, delay);
      } else {
        console.error('[WS Client] Max reconnection attempts reached');
        this.emitEvent('connection:failed', {});
      }
    }
  }

  private emitEvent(channel: string, payload: unknown): void {
    const listeners = this.eventListeners.get(channel);
    if (listeners) {
      for (const callback of listeners) {
        callback(payload);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get connectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }
}
```

---

## React Hook

```typescript
// =============================================================================
// USE WEBSOCKET HOOK
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: <T>(channel: string, payload?: unknown) => Promise<T>;
  onMessage: (channel: string, callback: (payload: unknown) => void) => () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const clientRef = useRef<WSClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = new WSClient({
      url: options.url,
      reconnect: true,
    });

    clientRef.current = client;

    // Listen for connection state changes
    const unsubConnected = client.onMessage('server:connected', () => {
      setIsConnected(true);
    });

    const unsubFailed = client.onMessage('connection:failed', () => {
      setIsConnected(false);
    });

    if (options.autoConnect !== false) {
      client.connect()
        .then(() => setIsConnected(true))
        .catch(() => setIsConnected(false));
    }

    return () => {
      unsubConnected();
      unsubFailed();
      client.disconnect();
    };
  }, [options.url, options.autoConnect]);

  const sendMessage = useCallback(async <T>(channel: string, payload?: unknown): Promise<T> => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized');
    }
    return clientRef.current.sendMessage<T>(channel, payload);
  }, []);

  const onMessage = useCallback((channel: string, callback: (payload: unknown) => void) => {
    if (!clientRef.current) {
      return () => {};
    }
    return clientRef.current.onMessage(channel, callback);
  }, []);

  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect();
      setIsConnected(true);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    onMessage,
    connect,
    disconnect,
  };
}
```

---

## Handler Registration

```typescript
// =============================================================================
// REGISTER ALL HANDLERS
// =============================================================================

import { WSServer } from './ws-server';
import { registerChatHandlers } from './handlers/chat';
import { registerAIHandlers } from './handlers/ai';
import { registerCodeSessionHandlers } from './handlers/code-session';
import { registerImageGenHandlers } from './handlers/imagegen';
import { registerSettingsHandlers } from './handlers/settings';
import { registerCredentialHandlers } from './handlers/credentials';
import { registerArtifactHandlers } from './handlers/artifacts';

export function registerAllHandlers(ws: WSServer): void {
  // Get stores
  const chatStore = getChatStore();
  const codeSessionStore = getCodeSessionStore();
  const snapshotStore = getSnapshotStore();
  const imageGenStore = getImageGenStore();
  const settingsStore = getSettingsStore();
  const credentialStore = getCredentialStore();
  const artifactRegistry = getArtifactRegistry();
  const aiProvider = getAIProvider();

  // Register handlers
  registerChatHandlers(ws, chatStore);
  registerAIHandlers(ws, aiProvider);
  registerCodeSessionHandlers(ws, codeSessionStore, snapshotStore);
  registerImageGenHandlers(ws, imageGenStore);
  registerSettingsHandlers(ws, settingsStore);
  registerCredentialHandlers(ws, credentialStore);
  registerArtifactHandlers(ws, artifactRegistry);

  console.log('[WS] All handlers registered');
}
```

---

## Usage Examples

### Server Setup

```typescript
import { getWSServer } from './lib/ws-server';
import { registerAllHandlers } from './lib/ws-handlers';

async function main() {
  const ws = getWSServer();

  // Start server
  const port = await ws.start({
    port: parseInt(process.env.WS_PORT || '3001'),
    host: 'localhost',
    maxPortAttempts: 10,
    onConnection: (clientId) => console.log(`Client ${clientId} connected`),
    onDisconnection: (clientId) => console.log(`Client ${clientId} disconnected`),
  });

  // Register handlers
  registerAllHandlers(ws);

  // Broadcast event
  setInterval(() => {
    ws.emit('server:heartbeat', { timestamp: Date.now() });
  }, 30000);
}

main();
```

### Frontend Usage

```typescript
// In a React component
function ChatPage() {
  const { isConnected, sendMessage, onMessage } = useWebSocket({
    url: 'ws://localhost:3001',
  });

  const [chats, setChats] = useState<Chat[]>([]);

  // Load chats
  useEffect(() => {
    if (!isConnected) return;

    sendMessage<Chat[]>('chat:list')
      .then(setChats)
      .catch(console.error);
  }, [isConnected]);

  // Listen for updates
  useEffect(() => {
    const unsub = onMessage('chat:updated', (payload) => {
      const updated = payload as Chat;
      setChats(prev => prev.map(c => c.id === updated.id ? updated : c));
    });

    return unsub;
  }, [onMessage]);

  // Stream AI response
  const sendChatMessage = async (content: string) => {
    const chunks: string[] = [];

    onMessage('ai:stream-chunk', ({ chunk }: any) => {
      if (chunk.type === 'text') {
        chunks.push(chunk.text);
        // Update UI with accumulated text
      }
    });

    await sendMessage('ai:chat-stream', {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content }],
      stream: true,
    });
  };

  return (/* UI */);
}
```

---

## Performance Considerations

1. **Binary Messages** - Use `ArrayBuffer` for large payloads (not implemented in current spec)
2. **Compression** - Bun supports per-message compression
3. **Batching** - Batch multiple updates into single event
4. **Idle Timeout** - Server closes idle connections (2 minutes)
5. **Rate Limiting** - 100 requests/second per client

---

## Security Considerations

1. **Origin Validation** - Could add origin checking in `handleUpgrade`
2. **Authentication** - Could require auth token in first message
3. **Input Validation** - All handlers should validate payloads
4. **Rate Limiting** - Already implemented per-client
5. **Message Size** - Bun has default limits, can configure
