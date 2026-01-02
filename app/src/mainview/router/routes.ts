// =============================================================================
// ROUTES
// =============================================================================
// Route path constants for type-safety and consistency.

export const ROUTES = {
  HOME: '/',
  CHAT: '/chat/:id',
  CODE: '/code',
  CODE_SESSION: '/code/:id',
  SETTINGS: '/settings',
  SETTINGS_PROVIDERS: '/settings/providers',
  SETTINGS_GENERAL: '/settings/general',
  SETTINGS_SHORTCUTS: '/settings/shortcuts',
} as const;

/**
 * Build a chat route URL
 */
export function chatRoute(chatId: string): string {
  return `/chat/${chatId}`;
}

/**
 * Check if a path is a settings route
 */
export function isSettingsRoute(path: string): boolean {
  return path.startsWith('/settings');
}

/**
 * Check if a path is a chat route
 */
export function isChatRoute(path: string): boolean {
  return path.startsWith('/chat/');
}

/**
 * Extract chat ID from a path
 */
export function extractChatId(path: string): string | null {
  const match = path.match(/^\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Build a code session route URL
 */
export function codeSessionRoute(sessionId: string): string {
  return `/code/${sessionId}`;
}

/**
 * Check if a path is a code route
 */
export function isCodeRoute(path: string): boolean {
  return path.startsWith('/code');
}

/**
 * Extract session ID from a code path
 */
export function extractSessionId(path: string): string | null {
  const match = path.match(/^\/code\/([^/]+)/);
  return match ? match[1] : null;
}
