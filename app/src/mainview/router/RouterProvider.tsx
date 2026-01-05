// =============================================================================
// ROUTER PROVIDER
// =============================================================================
// App-level router provider using wouter with hash-based location.
// Hash router works in both Electrobun desktop and browser mode.
// URLs like: yaai://app/#/chat/123 or http://localhost:3002/#/chat/123

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { Router, useLocation, useRoute } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import {
  ROUTES,
  isSettingsRoute,
  isChatRoute,
  isCodeRoute,
  isImageGenRoute,
  isResearchRoute,
  isPromptsRoute,
  extractChatId,
  extractSessionId,
  extractResearchSessionId,
  chatRoute,
} from './routes';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type AppMode = 'chat' | 'code' | 'image' | 'research' | 'prompts' | 'settings';

export interface AppRouterContextValue {
  // Current state
  path: string;
  isSettings: boolean;
  isChat: boolean;
  chatId: string | null;

  // Derived mode and project info
  activeMode: AppMode;
  currentProjectId: string | null;
  currentProjectType: 'chat' | 'code' | 'image' | 'research' | null;

  // Navigation actions
  navigate: (path: string) => void;
  goToChat: (chatId: string) => void;
  goToNewChat: () => void;
  goToSettings: (section?: 'providers' | 'general' | 'shortcuts' | 'image-gen') => void;
  goBack: () => void;
}

// -----------------------------------------------------------------------------
// CONTEXT
// -----------------------------------------------------------------------------

const AppRouterContext = createContext<AppRouterContextValue | null>(null);

// -----------------------------------------------------------------------------
// MODE DETECTION
// -----------------------------------------------------------------------------

function detectMode(path: string): AppMode {
  if (isSettingsRoute(path)) return 'settings';
  if (isCodeRoute(path)) return 'code';
  if (isImageGenRoute(path)) return 'image';
  if (isResearchRoute(path)) return 'research';
  if (isPromptsRoute(path)) return 'prompts';
  return 'chat'; // Default to chat (includes / and /chat/:id)
}

function extractProjectInfo(path: string): { id: string | null; type: 'chat' | 'code' | 'image' | 'research' | null } {
  if (isChatRoute(path)) {
    return { id: extractChatId(path), type: 'chat' };
  }
  if (isCodeRoute(path)) {
    return { id: extractSessionId(path), type: 'code' };
  }
  if (isResearchRoute(path)) {
    return { id: extractResearchSessionId(path), type: 'research' };
  }
  // Image gen doesn't have individual sessions/IDs in current routes
  if (isImageGenRoute(path)) {
    return { id: null, type: 'image' };
  }
  return { id: null, type: null };
}

// -----------------------------------------------------------------------------
// INNER PROVIDER (has access to wouter hooks)
// -----------------------------------------------------------------------------

function AppRouterInner({ children }: { children: React.ReactNode }) {
  const [path, setLocation] = useLocation();
  const [, chatParams] = useRoute(ROUTES.CHAT);

  // Derived state
  const isSettings = useMemo(() => isSettingsRoute(path), [path]);
  const isChat = useMemo(() => isChatRoute(path), [path]);
  const chatId = useMemo(() => chatParams?.id ?? extractChatId(path), [chatParams, path]);

  // Mode and project info
  const activeMode = useMemo(() => detectMode(path), [path]);
  const projectInfo = useMemo(() => extractProjectInfo(path), [path]);

  // Navigation actions
  const navigate = useCallback((newPath: string) => {
    setLocation(newPath);
  }, [setLocation]);

  const goToChat = useCallback((id: string) => {
    setLocation(chatRoute(id));
  }, [setLocation]);

  const goToNewChat = useCallback(() => {
    setLocation(ROUTES.HOME);
  }, [setLocation]);

  const goToSettings = useCallback((section?: 'providers' | 'general' | 'shortcuts' | 'image-gen') => {
    const settingsPath = section
      ? `/settings/${section}`
      : ROUTES.SETTINGS_PROVIDERS; // Default to providers
    setLocation(settingsPath);
  }, [setLocation]);

  const goBack = useCallback(() => {
    // Try to go back in history, fallback to home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(ROUTES.HOME);
    }
  }, [setLocation]);

  const value = useMemo<AppRouterContextValue>(() => ({
    path,
    isSettings,
    isChat,
    chatId,
    activeMode,
    currentProjectId: projectInfo.id,
    currentProjectType: projectInfo.type,
    navigate,
    goToChat,
    goToNewChat,
    goToSettings,
    goBack,
  }), [path, isSettings, isChat, chatId, activeMode, projectInfo, navigate, goToChat, goToNewChat, goToSettings, goBack]);

  return (
    <AppRouterContext.Provider value={value}>
      {children}
    </AppRouterContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// PROVIDER
// -----------------------------------------------------------------------------

interface AppRouterProviderProps {
  children: React.ReactNode;
  initialPath?: string;
}

export function AppRouterProvider({
  children,
  initialPath = '/',
}: AppRouterProviderProps) {
  // Use hash-based location for URL sync
  // This works in both Electrobun (via views:// protocol) and browser mode
  return (
    <Router hook={useHashLocation}>
      <AppRouterInner>
        {children}
      </AppRouterInner>
    </Router>
  );
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useAppRouter(): AppRouterContextValue {
  const context = useContext(AppRouterContext);
  if (!context) {
    throw new Error('useAppRouter must be used within AppRouterProvider');
  }
  return context;
}
