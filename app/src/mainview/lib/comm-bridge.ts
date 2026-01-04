// =============================================================================
// COMMUNICATION BRIDGE
// =============================================================================
// Unified communication API for WebSocket-based frontend-backend messaging.
// Provides the same API shape as the old IPC bridge for easy migration.

import { getWSClient, initWSClient } from './ws-client';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

type EventHandler = (data: unknown) => void;

// -----------------------------------------------------------------------------
// BRIDGE API
// -----------------------------------------------------------------------------

let initialized = false;

/**
 * Ensure WebSocket connection is established
 */
async function ensureConnection(): Promise<void> {
  if (!initialized) {
    await initWSClient();
    initialized = true;
  }
}

/**
 * Send a request and wait for response
 * Replaces: ipc.send(channel, data)
 */
export async function sendMessage<T>(channel: string, data?: unknown): Promise<T> {
  await ensureConnection();
  return await getWSClient().send<T>(channel, data);
}

/**
 * Subscribe to events on a channel
 * Replaces: ipc.on(channel, handler)
 * Returns unsubscribe function
 */
export function onMessage(channel: string, handler: EventHandler): () => void {
  // Lazy connect on first subscription
  ensureConnection().catch(console.error);
  return getWSClient().on(channel, handler);
}

/**
 * Unsubscribe from events on a channel
 * Replaces: ipc.off(channel, handler)
 */
export function offMessage(channel: string, handler: EventHandler): void {
  getWSClient().off(channel, handler);
}

/**
 * Check if connection is available
 */
export function isConnected(): boolean {
  return getWSClient().isConnected;
}

/**
 * Manually disconnect
 */
export function disconnect(): void {
  getWSClient().disconnect();
  initialized = false;
}

// -----------------------------------------------------------------------------
// VARIABLE EXPANSION
// -----------------------------------------------------------------------------

export interface VariableExpansionResult {
  variable: string
  data?: string
  error?: string
}

/**
 * Expand multiple variables by name
 * Returns results for each variable with data or error
 */
export async function expandVariables(
  variableNames: string[]
): Promise<VariableExpansionResult[]> {
  return sendMessage<VariableExpansionResult[]>('variable:expand', { names: variableNames });
}
