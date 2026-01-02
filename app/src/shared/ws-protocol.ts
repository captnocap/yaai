// =============================================================================
// WEBSOCKET PROTOCOL
// =============================================================================
// Shared types for WebSocket communication between Bun backend and frontend.
// Protocol supports request/response pattern and server-push events.

// -----------------------------------------------------------------------------
// MESSAGE TYPES
// -----------------------------------------------------------------------------

/**
 * Base message structure for all WebSocket communication
 */
export interface WSMessage {
  type: 'request' | 'response' | 'event';
  channel: string;
  timestamp: number;
}

/**
 * Request message: Client -> Server
 * Expects a response with matching id
 */
export interface WSRequest extends WSMessage {
  type: 'request';
  id: string;
  payload?: unknown;
}

/**
 * Response message: Server -> Client
 * Correlates with request via matching id
 */
export interface WSResponse extends WSMessage {
  type: 'response';
  id: string;
  payload?: unknown;
  error?: WSError;
}

/**
 * Event message: Server -> Client (push)
 * No request/response correlation
 */
export interface WSEvent extends WSMessage {
  type: 'event';
  payload: unknown;
}

/**
 * Error structure for failed requests
 */
export interface WSError {
  code: string;
  message: string;
  details?: unknown;
}

// -----------------------------------------------------------------------------
// TYPE GUARDS
// -----------------------------------------------------------------------------

export function isWSRequest(msg: WSMessage): msg is WSRequest {
  return msg.type === 'request' && typeof (msg as WSRequest).id === 'string';
}

export function isWSResponse(msg: WSMessage): msg is WSResponse {
  return msg.type === 'response' && typeof (msg as WSResponse).id === 'string';
}

export function isWSEvent(msg: WSMessage): msg is WSEvent {
  return msg.type === 'event';
}

// -----------------------------------------------------------------------------
// ERROR CODES
// -----------------------------------------------------------------------------

export const WSErrorCodes = {
  UNKNOWN_CHANNEL: 'UNKNOWN_CHANNEL',
  HANDLER_ERROR: 'HANDLER_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_CLOSED: 'CONNECTION_CLOSED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
} as const;

export type WSErrorCode = typeof WSErrorCodes[keyof typeof WSErrorCodes];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/**
 * Create a request message
 */
export function createRequest(channel: string, payload?: unknown): WSRequest {
  return {
    type: 'request',
    id: crypto.randomUUID(),
    channel,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Create a response message
 */
export function createResponse(
  requestId: string,
  channel: string,
  payload?: unknown,
  error?: WSError
): WSResponse {
  return {
    type: 'response',
    id: requestId,
    channel,
    payload,
    error,
    timestamp: Date.now(),
  };
}

/**
 * Create an event message
 */
export function createEvent(channel: string, payload: unknown): WSEvent {
  return {
    type: 'event',
    channel,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Create an error object
 */
export function createError(
  code: WSErrorCode,
  message: string,
  details?: unknown
): WSError {
  return { code, message, details };
}
