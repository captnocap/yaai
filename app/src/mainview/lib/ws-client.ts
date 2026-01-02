// =============================================================================
// WEBSOCKET CLIENT
// =============================================================================
// Browser WebSocket client with auto-reconnect and request/response correlation.
// Provides the frontend communication layer for the WebSocket protocol.

import {
  type WSRequest,
  type WSResponse,
  type WSEvent,
  type WSMessage,
  isWSResponse,
  isWSEvent,
  createRequest,
  WSErrorCodes,
} from '../../shared/ws-protocol';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WSClientOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  requestTimeout?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnecting?: (attempt: number) => void;
}

type EventHandler = (payload: unknown) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// -----------------------------------------------------------------------------
// WEBSOCKET CLIENT
// -----------------------------------------------------------------------------

class WSClient {
  private ws: WebSocket | null = null;
  private options: Required<WSClientOptions>;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private shouldReconnect = true;
  private connectPromise: Promise<void> | null = null;

  constructor(options: WSClientOptions) {
    this.options = {
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      requestTimeout: 30000,
      onConnect: () => {},
      onDisconnect: () => {},
      onReconnecting: () => {},
      ...options,
    };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    // Already connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // Connection in progress - return existing promise
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectPromise = null;
          console.log('[WS Client] Connected');
          this.options.onConnect();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.connectPromise = null;
          console.log('[WS Client] Disconnected');
          this.options.onDisconnect();
          this.attemptReconnect();
        };

        this.ws.onerror = (err) => {
          this.isConnecting = false;
          this.connectPromise = null;
          console.error('[WS Client] Connection error');
          if (this.reconnectAttempts === 0) {
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (err) {
        this.isConnecting = false;
        this.connectPromise = null;
        reject(err);
      }
    });

    return this.connectPromise;
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
    this.connectPromise = null;

    // Reject all pending requests
    for (const { reject, timeout } of this.pendingRequests.values()) {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Send a request and wait for response
   */
  async send<T>(channel: string, payload?: unknown): Promise<T> {
    // Ensure connection
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const request = createRequest(channel, payload);

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout: ${channel}`));
      }, this.options.requestTimeout);

      this.pendingRequests.set(request.id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Subscribe to events on a channel
   */
  on(channel: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(channel)) {
      this.eventHandlers.set(channel, new Set());
    }
    this.eventHandlers.get(channel)!.add(handler);

    return () => {
      this.eventHandlers.get(channel)?.delete(handler);
    };
  }

  /**
   * Unsubscribe from events on a channel
   */
  off(channel: string, handler: EventHandler): void {
    this.eventHandlers.get(channel)?.delete(handler);
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private attemptReconnect(): void {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[WS Client] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.options.onReconnecting(this.reconnectAttempts);
    console.log(`[WS Client] Reconnecting (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Will retry via onclose
      });
    }, this.options.reconnectInterval);
  }

  private handleMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data);

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
    const handlers = this.eventHandlers.get(event.channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event.payload);
        } catch (err) {
          console.error(`[WS Client] Event handler error for ${event.channel}:`, err);
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let wsClient: WSClient | null = null;

/**
 * Get the WebSocket client singleton
 */
export function getWSClient(): WSClient {
  if (!wsClient) {
    const port = (window as any).__WS_PORT__ || 3001;
    const host = (window as any).__WS_HOST__ || 'localhost';

    wsClient = new WSClient({
      url: `ws://${host}:${port}`,
      onConnect: () => console.log('[YAAI] WebSocket connected'),
      onDisconnect: () => console.log('[YAAI] WebSocket disconnected'),
      onReconnecting: (attempt) => console.log(`[YAAI] Reconnecting (attempt ${attempt})...`),
    });
  }
  return wsClient;
}

/**
 * Initialize and connect the WebSocket client
 */
export async function initWSClient(): Promise<WSClient> {
  const client = getWSClient();
  await client.connect();
  return client;
}

export { WSClient };
