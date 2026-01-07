// =============================================================================
// EDITOR GROUP
// =============================================================================
// A single editor group with tab bar and view content (like VS Code editor group).

import React, { useCallback, useRef, useEffect } from 'react';
import { TabBar } from './TabBar';
import { ViewRenderer } from './ViewRenderer';
import { useWorkspacePanesContext } from './useWorkspacePanes';
import { useWorkspaceInputContext } from './WorkspaceInputContext';
import type { PaneView, ViewInput } from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface EditorGroupProps {
  groupId: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function EditorGroup({ groupId }: EditorGroupProps) {
  const { state, actions, computed } = useWorkspacePanesContext();
  const inputContext = useWorkspaceInputContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const group = state.groups[groupId];
  const isFocused = state.focusedGroupId === groupId;
  const activeTab = group?.tabs.find(t => t.id === group.activeTabId);

  // Handle clicking within the group to focus it
  const handleClick = useCallback(() => {
    if (!isFocused) {
      actions.setFocusedGroup(groupId);
    }
  }, [groupId, isFocused, actions]);

  // Handle tab click
  const handleTabClick = useCallback((tabId: string) => {
    actions.setActiveTab(groupId, tabId);
  }, [groupId, actions]);

  // Handle tab close
  const handleTabClose = useCallback((tabId: string) => {
    actions.closeTab(tabId);
  }, [actions]);

  // Handle middle-click to close
  const handleTabMiddleClick = useCallback((tabId: string) => {
    actions.closeTab(tabId);
  }, [actions]);

  // Register input handler for active view
  const registerInputHandler = useCallback((handler: (input: ViewInput) => void) => {
    if (activeTab) {
      return inputContext.registerViewHandler(activeTab.id, handler);
    }
    return () => {};
  }, [activeTab, inputContext]);

  if (!group) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Group not found
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
        border: isFocused ? '1px solid var(--color-accent-subtle)' : '1px solid transparent',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <TabBar
        tabs={group.tabs}
        activeTabId={group.activeTabId}
        isFocused={isFocused}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onTabMiddleClick={handleTabMiddleClick}
      />

      {/* View content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab ? (
          <ViewRenderer
            view={activeTab}
            onRegisterInputHandler={registerInputHandler}
            onChatCreated={(realChatId, ephemeralId) => {
              // Update view's resource ID when chat is created
              // This would need to update the tab's resourceId
              console.log('Chat created:', realChatId, 'from', ephemeralId);
            }}
          />
        ) : (
          <EmptyGroup />
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// EMPTY GROUP PLACEHOLDER
// -----------------------------------------------------------------------------

function EmptyGroup() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-tertiary)',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
        No tabs open
      </div>
      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        Open a chat, code session, or image generation to get started
      </div>
    </div>
  );
}
