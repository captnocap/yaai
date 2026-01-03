// =============================================================================
// ROUTES
// =============================================================================
// Route path constants for type-safety and consistency.

export const ROUTES = {
  HOME: '/',
  CHAT: '/chat/:id',
  CODE: '/code',
  CODE_SESSION: '/code/:id',
  IMAGE_GEN: '/image',
  RESEARCH: '/research',
  RESEARCH_SESSION: '/research/:id',
  PROMPTS: '/prompts',
  PROMPTS_EDIT: '/prompts/:id',
  SETTINGS: '/settings',
  SETTINGS_PROVIDERS: '/settings/providers',
  SETTINGS_GENERAL: '/settings/general',
  SETTINGS_SHORTCUTS: '/settings/shortcuts',
  SETTINGS_IMAGE_GEN: '/settings/image-gen',
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

/**
 * Check if a path is the image gen route
 */
export function isImageGenRoute(path: string): boolean {
  return path === '/image' || path.startsWith('/image/');
}

/**
 * Check if a path is a prompts route
 */
export function isPromptsRoute(path: string): boolean {
  return path === '/prompts' || path.startsWith('/prompts/');
}

/**
 * Build a prompts edit route URL
 */
export function promptsEditRoute(sessionId: string): string {
  return `/prompts/${sessionId}`;
}

/**
 * Extract session ID from a prompts path
 */
export function extractPromptsSessionId(path: string): string | null {
  const match = path.match(/^\/prompts\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Build a research session route URL
 */
export function researchRoute(sessionId: string): string {
  return `/research/${sessionId}`;
}

/**
 * Check if a path is a research route
 */
export function isResearchRoute(path: string): boolean {
  return path === '/research' || path.startsWith('/research/');
}

/**
 * Extract research session ID from a path
 */
export function extractResearchSessionId(path: string): string | null {
  const match = path.match(/^\/research\/([^/]+)/);
  return match ? match[1] : null;
}
