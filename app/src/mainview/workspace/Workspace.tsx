// =============================================================================
// WORKSPACE
// =============================================================================
// Main workspace component that combines all workspace pieces.
// This is the entry point for the VS Code-style pane system.

import React, { useEffect, useCallback } from 'react';
import {
  useWorkspacePanes,
  WorkspacePanesContext,
} from './useWorkspacePanes';
import {
  WorkspaceInputProvider,
} from './WorkspaceInputContext';
import { EditorArea } from './EditorArea';
import { GlobalInputHub } from './GlobalInputHub';
import { createStateFromUrl, serializeWorkspaceUrl } from './url-encoding';
import type { ViewType, WorkspacePanesState } from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WorkspaceProps {
  /** Initial URL hash to parse workspace state from */
  initialHash?: string;
  /** Called when workspace state changes (for URL sync) */
  onStateChange?: (hash: string) => void;
  /** If true, GlobalInputHub is rendered internally. If false, use the separate GlobalInputHub export */
  includeInputHub?: boolean;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function Workspace({
  initialHash,
  onStateChange,
  includeInputHub = false,
  className,
}: WorkspaceProps) {
  // Initialize workspace state from URL or create default
  const initialState = initialHash ? createStateFromUrl(initialHash) : undefined;
  const panes = useWorkspacePanes(initialState ?? undefined);

  // Sync state to URL
  useEffect(() => {
    if (onStateChange) {
      const hash = serializeWorkspaceUrl(panes.state);
      onStateChange(hash);
    }
  }, [panes.state, onStateChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab / Cmd+Tab: Cycle views forward
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        panes.actions.cycleActiveView('forward');
      }
      // Ctrl+Shift+Tab: Cycle views backward
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        panes.actions.cycleActiveView('backward');
      }
      // Ctrl+W / Cmd+W: Close current tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (panes.computed.activeView) {
          panes.actions.closeTab(panes.computed.activeView.id);
        }
      }
      // Ctrl+\ : Split current group
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        if (panes.state.focusedGroupId) {
          panes.actions.splitGroup(panes.state.focusedGroupId, 'horizontal');
        }
      }
      // Ctrl+1-9: Jump to tab by number
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const focusedGroup = panes.computed.focusedGroup;
        if (focusedGroup && focusedGroup.tabs[index]) {
          panes.actions.setActiveTab(focusedGroup.id, focusedGroup.tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panes]);

  return (
    <WorkspacePanesContext.Provider value={panes}>
      <WorkspaceInputProvider>
        <div
          className={className}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg)',
          }}
        >
          {/* Editor area (panes + tabs) */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <EditorArea />
          </div>

          {/* Global input hub (only if includeInputHub is true) */}
          {includeInputHub && <GlobalInputHub />}
        </div>
      </WorkspaceInputProvider>
    </WorkspacePanesContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// WORKSPACE PROVIDER
// -----------------------------------------------------------------------------
// Provides workspace contexts for use when GlobalInputHub is rendered separately
// (e.g., in WorkspaceShell's bottomPanel slot)

export interface WorkspaceProviderProps {
  /** Initial URL hash to parse workspace state from */
  initialHash?: string;
  /** Called when workspace state changes (for URL sync) */
  onStateChange?: (hash: string) => void;
  children: React.ReactNode;
}

export function WorkspaceProvider({
  initialHash,
  onStateChange,
  children,
}: WorkspaceProviderProps) {
  const initialState = initialHash ? createStateFromUrl(initialHash) : undefined;
  const panes = useWorkspacePanes(initialState ?? undefined);

  // Sync state to URL
  useEffect(() => {
    if (onStateChange) {
      const hash = serializeWorkspaceUrl(panes.state);
      onStateChange(hash);
    }
  }, [panes.state, onStateChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        panes.actions.cycleActiveView('forward');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        panes.actions.cycleActiveView('backward');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (panes.computed.activeView) {
          panes.actions.closeTab(panes.computed.activeView.id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        if (panes.state.focusedGroupId) {
          panes.actions.splitGroup(panes.state.focusedGroupId, 'horizontal');
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const focusedGroup = panes.computed.focusedGroup;
        if (focusedGroup && focusedGroup.tabs[index]) {
          panes.actions.setActiveTab(focusedGroup.id, focusedGroup.tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panes]);

  return (
    <WorkspacePanesContext.Provider value={panes}>
      <WorkspaceInputProvider>
        {children}
      </WorkspaceInputProvider>
    </WorkspacePanesContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// WORKSPACE EDITOR AREA (for use with WorkspaceProvider)
// -----------------------------------------------------------------------------
// Just the editor area without providers - use inside WorkspaceProvider

export interface WorkspaceEditorAreaProps {
  className?: string;
}

export function WorkspaceEditorArea({ className }: WorkspaceEditorAreaProps) {
  return (
    <div
      className={className}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <EditorArea />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// QUICK ACCESS HOOKS
// -----------------------------------------------------------------------------

/** Hook to open a view from anywhere in the workspace */
export function useOpenView() {
  const { actions } = React.useContext(WorkspacePanesContext) ?? { actions: null };

  return useCallback((type: ViewType, resourceId?: string | null, title?: string) => {
    if (actions) {
      return actions.openView(type, resourceId, title);
    }
    console.warn('[useOpenView] Not inside WorkspacePanesContext');
    return null;
  }, [actions]);
}
