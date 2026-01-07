// =============================================================================
// WORKSPACE INPUT CONTEXT
// =============================================================================
// Provides communication between GlobalInputHub and active views.

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import type { ViewType, ViewInput, WorkspaceInputContextValue } from './types';
import { useWorkspacePanesContext } from './useWorkspacePanes';

// -----------------------------------------------------------------------------
// EXTENDED CONTEXT TYPE
// -----------------------------------------------------------------------------

interface WorkspaceInputContextInternal extends WorkspaceInputContextValue {
  /** Register a handler for a specific view (used by ViewRenderer) */
  registerViewHandler: (viewId: string, handler: (input: ViewInput) => void) => () => void;
}

// -----------------------------------------------------------------------------
// CONTEXT
// -----------------------------------------------------------------------------

const WorkspaceInputContext = createContext<WorkspaceInputContextInternal | null>(null);

// -----------------------------------------------------------------------------
// PROVIDER
// -----------------------------------------------------------------------------

export interface WorkspaceInputProviderProps {
  children: React.ReactNode;
}

export function WorkspaceInputProvider({ children }: WorkspaceInputProviderProps) {
  const { computed } = useWorkspacePanesContext();

  // Map of view ID to handler
  const handlersRef = useRef<Map<string, (input: ViewInput) => void>>(new Map());

  // Register a handler for a view
  const registerViewHandler = useCallback((viewId: string, handler: (input: ViewInput) => void) => {
    handlersRef.current.set(viewId, handler);
    return () => {
      handlersRef.current.delete(viewId);
    };
  }, []);

  // Send input to active view
  const sendToActiveView = useCallback((input: ViewInput) => {
    const activeViewId = computed.activeView?.id;
    if (!activeViewId) {
      console.warn('[WorkspaceInput] No active view to send input to');
      return;
    }

    const handler = handlersRef.current.get(activeViewId);
    if (handler) {
      handler(input);
    } else {
      console.warn('[WorkspaceInput] No handler registered for view:', activeViewId);
    }
  }, [computed.activeView?.id]);

  // Register callback to receive input (for views that want to subscribe)
  const onInputReceived = useCallback((viewId: string, callback: (input: ViewInput) => void) => {
    return registerViewHandler(viewId, callback);
  }, [registerViewHandler]);

  const value = useMemo<WorkspaceInputContextInternal>(() => ({
    activeViewType: computed.activeViewType,
    activeResourceId: computed.activeResourceId,
    activeViewId: computed.activeView?.id ?? null,
    sendToActiveView,
    onInputReceived,
    registerViewHandler,
  }), [
    computed.activeViewType,
    computed.activeResourceId,
    computed.activeView?.id,
    sendToActiveView,
    onInputReceived,
    registerViewHandler,
  ]);

  return (
    <WorkspaceInputContext.Provider value={value}>
      {children}
    </WorkspaceInputContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// HOOKS
// -----------------------------------------------------------------------------

export function useWorkspaceInputContext(): WorkspaceInputContextInternal {
  const context = useContext(WorkspaceInputContext);
  if (!context) {
    // Return a no-op context for views rendered outside workspace
    return {
      activeViewType: null,
      activeResourceId: null,
      activeViewId: null,
      sendToActiveView: () => {},
      onInputReceived: () => () => {},
      registerViewHandler: () => () => {},
    };
  }
  return context;
}

/** Hook for GlobalInputHub to send input to active view */
export function useWorkspaceInput() {
  const context = useWorkspaceInputContext();
  return {
    activeViewType: context.activeViewType,
    activeResourceId: context.activeResourceId,
    sendToActiveView: context.sendToActiveView,
  };
}
