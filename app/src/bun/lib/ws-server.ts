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
import { serveStaticFile, isStaticAssetRequest } from './static-server';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WSServerOptions {
  port: number;
  host?: string;
  /** Maximum number of ports to try if the default is taken */
  maxPortAttempts?: number;
  /** Path to serve static assets from (e.g., built React app) */
  staticPath?: string;
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
  private _port: number | null = null;
  private _host: string | null = null;
  private _staticPath: string | null = null;

  /**
   * Get the actual port the server is running on
   */
  get port(): number | null {
    return this._port;
  }

  /**
   * Get the host the server is running on
   */
  get host(): string | null {
    return this._host;
  }

  /**
   * Start the WebSocket server, automatically finding an available port if needed
   */
  async start(options: WSServerOptions): Promise<number> {
    const { port: startPort, host = 'localhost', maxPortAttempts = 10, staticPath } = options;
    this.options = options;
    this._host = host;
    this._staticPath = staticPath || null;

    // Try ports starting from the requested one
    for (let attempt = 0; attempt < maxPortAttempts; attempt++) {
      const port = startPort + attempt;

      try {
        this.server = Bun.serve({
          port,
          hostname: host,

          fetch: (req, server) => {
            const url = new URL(req.url);

            // Try to serve static files if path looks like an asset
            if (this._staticPath && isStaticAssetRequest(url.pathname)) {
              return serveStaticFile(this._staticPath, url.pathname).then((staticResponse) => {
                if (staticResponse) {
                  return staticResponse;
                }
                // Fall through to WebSocket upgrade
                return this.handleWebSocketUpgrade(req, server);
              });
            }

            return this.handleWebSocketUpgrade(req, server);
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

        this._port = port;

        if (port !== startPort) {
          console.log(`[WS] Port ${startPort} in use, using port ${port} instead`);
        }
        console.log(`[WS] Server listening on ws://${host}:${port}`);

        return port;
      } catch (err) {
        const isPortInUse =
          err instanceof Error &&
          (err.message.includes('EADDRINUSE') ||
            err.message.includes('address already in use') ||
            err.message.includes('Failed to start'));

        if (!isPortInUse || attempt === maxPortAttempts - 1) {
          throw err;
        }

        // Port in use, try the next one
        console.log(`[WS] Port ${port} in use, trying ${port + 1}...`);
      }
    }

    throw new Error(`Could not find available port after ${maxPortAttempts} attempts starting from ${startPort}`);
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

  /**
   * Handle WebSocket upgrade attempt or fallback to static file serving
   */
  private handleWebSocketUpgrade(req: Request, server: any): Response | Promise<Response> {
    const url = new URL(req.url);

    // Upgrade HTTP request to WebSocket
    const upgraded = server.upgrade(req, {
      data: {
        id: crypto.randomUUID(),
        connectedAt: new Date(),
      } as WSClientData,
    });

    if (!upgraded) {
      // If no static path, return 400; otherwise try index.html
      if (this._staticPath && (url.pathname === "/" || url.pathname === "")) {
        return serveStaticFile(this._staticPath, "/index.html").then((indexResponse) => {
          if (indexResponse) {
            return indexResponse;
          }
          return new Response('WebSocket upgrade failed', { status: 400 });
        });
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    return new Response(undefined, { status: 101 });
  }

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
