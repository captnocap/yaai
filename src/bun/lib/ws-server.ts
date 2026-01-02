// =============================================================================
// WEBSOCKET SERVER
// =============================================================================
// Bun native WebSocket server for frontend-backend communication.
// Replaces Electrobun IPC with a browser-compatible transport.

import type { Server, ServerWebSocket } from 'bun';
import {
  type WSRequest,
  type WSResponse,
  type WSEvent,
  type WSError,
  isWSRequest,
  createResponse,
  createEvent,
  createError,
  WSErrorCodes,
} from '../../shared/ws-protocol';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WSServerOptions {
  port: number;
  host?: string;
  onConnection?: (clientId: string) => void;
  onDisconnection?: (clientId: string) => void;
}

export interface WSClientData {
  id: string;
  connectedAt: Date;
}

type RequestHandler = (payload: unknown, clientId: string) => Promise<unknown>;

// -----------------------------------------------------------------------------
// WEBSOCKET SERVER
// -----------------------------------------------------------------------------

class WSServer {
  private server: Server | null = null;
  private clients = new Map<string, ServerWebSocket<WSClientData>>();
  private handlers = new Map<string, RequestHandler>();
  private options: WSServerOptions | null = null;

  /**
   * Start the WebSocket server
   */
  async start(options: WSServerOptions): Promise<void> {
    const { port, host = 'localhost' } = options;
    this.options = options;

    this.server = Bun.serve({
      port,
      hostname: host,

      fetch: (req, server) => {
        // Upgrade HTTP request to WebSocket
        const upgraded = server.upgrade(req, {
          data: {
            id: crypto.randomUUID(),
            connectedAt: new Date(),
          } as WSClientData,
        });

        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 });
        }

        return undefined;
      },

      websocket: {
        open: (ws) => this.handleOpen(ws),
        message: (ws, message) => this.handleMessage(ws, message),
        close: (ws) => this.handleClose(ws),
        error: (ws, error) => {
          console.error(`[WS] Error for client ${ws.data.id}:`, error);
        },
      },
    });

    console.log(`[WS] Server listening on ws://${host}:${port}`);
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    this.clients.clear();
    console.log('[WS] Server stopped');
  }

  /**
   * Register a handler for a request channel
   */
  onRequest(channel: string, handler: RequestHandler): void {
    this.handlers.set(channel, handler);
  }

  /**
   * Broadcast an event to all connected clients
   */
  emit(channel: string, payload: unknown): void {
    const event = createEvent(channel, payload);
    const message = JSON.stringify(event);

    for (const ws of this.clients.values()) {
      ws.send(message);
    }
  }

  /**
   * Send an event to a specific client
   */
  emitTo(clientId: string, channel: string, payload: unknown): void {
    const ws = this.clients.get(clientId);
    if (ws) {
      const event = createEvent(channel, payload);
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Get the number of connected clients
   */
  get clientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if server is running
   */
  get isRunning(): boolean {
    return this.server !== null;
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HANDLERS
  // ---------------------------------------------------------------------------

  private handleOpen(ws: ServerWebSocket<WSClientData>): void {
    this.clients.set(ws.data.id, ws);
    console.log(`[WS] Client connected: ${ws.data.id} (total: ${this.clients.size})`);
    this.options?.onConnection?.(ws.data.id);
  }

  private async handleMessage(
    ws: ServerWebSocket<WSClientData>,
    message: string | Buffer
  ): Promise<void> {
    try {
      const msg = JSON.parse(message.toString());

      if (isWSRequest(msg)) {
        await this.handleRequest(ws, msg);
      }
      // Ignore non-request messages
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
      const response = createResponse(
        request.id,
        request.channel,
        undefined,
        createError(
          WSErrorCodes.UNKNOWN_CHANNEL,
          `No handler for channel: ${request.channel}`
        )
      );
      ws.send(JSON.stringify(response));
      return;
    }

    try {
      const result = await handler(request.payload, ws.data.id);
      const response = createResponse(request.id, request.channel, result);
      ws.send(JSON.stringify(response));
    } catch (err) {
      const response = createResponse(
        request.id,
        request.channel,
        undefined,
        createError(
          WSErrorCodes.HANDLER_ERROR,
          err instanceof Error ? err.message : 'Unknown error',
          err instanceof Error ? err.stack : undefined
        )
      );
      ws.send(JSON.stringify(response));
    }
  }

  private handleClose(ws: ServerWebSocket<WSClientData>): void {
    this.clients.delete(ws.data.id);
    console.log(`[WS] Client disconnected: ${ws.data.id} (total: ${this.clients.size})`);
    this.options?.onDisconnection?.(ws.data.id);
  }
}

// -----------------------------------------------------------------------------
// SINGLETON
// -----------------------------------------------------------------------------

let wsServer: WSServer | null = null;

/**
 * Get the WebSocket server singleton
 */
export function getWSServer(): WSServer {
  if (!wsServer) {
    wsServer = new WSServer();
  }
  return wsServer;
}

export { WSServer };
