// =============================================================================
// ROUTER PROVIDER
// =============================================================================
// App-level router provider using wouter with memory history.
// Memory router for Electrobun desktop app (no URL bar visible).

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Router, useLocation, useRoute } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { ROUTES, isSettingsRoute, isChatRoute, extractChatId, chatRoute } from './routes';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface AppRouterContextValue {
  // Current state
  path: string;
  isSettings: boolean;
  isChat: boolean;
  chatId: string | null;

  // Navigation actions
  navigate: (path: string) => void;
  goToChat: (chatId: string) => void;
  goToNewChat: () => void;
  goToSettings: (section?: 'providers' | 'general' | 'shortcuts') => void;
  goBack: () => void;
}

// -----------------------------------------------------------------------------
// CONTEXT
// -----------------------------------------------------------------------------

const AppRouterContext = createContext<AppRouterContextValue | null>(null);

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

  const goToSettings = useCallback((section?: 'providers' | 'general' | 'shortcuts') => {
    const settingsPath = section
      ? `/settings/${section}`
      : ROUTES.SETTINGS_PROVIDERS; // Default to providers
    setLocation(settingsPath);
  }, [setLocation]);

  const goBack = useCallback(() => {
    // In memory router, go to home as fallback
    setLocation(ROUTES.HOME);
  }, [setLocation]);

  const value = useMemo<AppRouterContextValue>(() => ({
    path,
    isSettings,
    isChat,
    chatId,
    navigate,
    goToChat,
    goToNewChat,
    goToSettings,
    goBack,
  }), [path, isSettings, isChat, chatId, navigate, goToChat, goToNewChat, goToSettings, goBack]);

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

// Create memory location hook for wouter
const { hook: memoryHook } = memoryLocation({ path: '/' });

export function AppRouterProvider({
  children,
  initialPath = '/',
}: AppRouterProviderProps) {
  return (
    <Router hook={memoryHook}>
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
