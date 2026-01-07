// =============================================================================
// WORKSPACE PANES HOOK
// =============================================================================
// Manages the state of VS Code-style editor groups, tabs, and layout splits.

import { useState, useCallback, useMemo, useEffect, createContext, useContext } from 'react';
import type {
  ViewType,
  PaneView,
  EditorGroup,
  LayoutNode,
  SplitDirection,
  WorkspacePanesState,
  WorkspacePanesActions,
  WorkspacePanesComputed,
  UseWorkspacePanesReturn,
} from './types';
import {
  generateViewId,
  generateGroupId,
  isGroupNode,
  isSplitNode,
  createInitialWorkspaceState,
  DEFAULT_VIEW_TITLES,
} from './types';

// -----------------------------------------------------------------------------
// LAYOUT TREE HELPERS
// -----------------------------------------------------------------------------

/** Find a group ID in the layout tree and return its path */
function findGroupPath(node: LayoutNode, groupId: string, path: number[] = []): number[] | null {
  if (isGroupNode(node)) {
    return node.groupId === groupId ? path : null;
  }
  // Split node - search children
  const firstPath = findGroupPath(node.first, groupId, [...path, 0]);
  if (firstPath) return firstPath;
  return findGroupPath(node.second, groupId, [...path, 1]);
}

/** Get a node at a given path in the layout tree */
function getNodeAtPath(root: LayoutNode, path: number[]): LayoutNode {
  let node = root;
  for (const index of path) {
    if (!isSplitNode(node)) throw new Error('Invalid path');
    node = index === 0 ? node.first : node.second;
  }
  return node;
}

/** Set a node at a given path in the layout tree (immutable) */
function setNodeAtPath(root: LayoutNode, path: number[], newNode: LayoutNode): LayoutNode {
  if (path.length === 0) return newNode;

  if (!isSplitNode(root)) throw new Error('Invalid path');

  const [index, ...restPath] = path;
  if (index === 0) {
    return {
      ...root,
      first: restPath.length === 0 ? newNode : setNodeAtPath(root.first, restPath, newNode),
    };
  } else {
    return {
      ...root,
      second: restPath.length === 0 ? newNode : setNodeAtPath(root.second, restPath, newNode),
    };
  }
}

/** Remove a group from the layout tree, returning the sibling (for cleanup after close) */
function removeGroupFromLayout(root: LayoutNode, groupId: string): LayoutNode | null {
  // If root is the group to remove, return null (caller handles this)
  if (isGroupNode(root)) {
    return root.groupId === groupId ? null : root;
  }

  // Split node
  const firstResult = isGroupNode(root.first) && root.first.groupId === groupId
    ? null
    : removeGroupFromLayout(root.first, groupId);

  const secondResult = isGroupNode(root.second) && root.second.groupId === groupId
    ? null
    : removeGroupFromLayout(root.second, groupId);

  // If first was removed, return second (and vice versa)
  if (firstResult === null && secondResult !== null) {
    return root.second;
  }
  if (secondResult === null && firstResult !== null) {
    return root.first;
  }

  // Neither removed directly at this level - recurse
  if (firstResult === null || secondResult === null) {
    return root; // No change
  }

  // Check if children changed
  if (firstResult !== root.first || secondResult !== root.second) {
    return { ...root, first: firstResult, second: secondResult };
  }

  return root;
}

/** Get all group IDs from the layout tree */
function getAllGroupIds(node: LayoutNode): string[] {
  if (isGroupNode(node)) {
    return [node.groupId];
  }
  return [...getAllGroupIds(node.first), ...getAllGroupIds(node.second)];
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useWorkspacePanes(
  initialState?: Partial<WorkspacePanesState>
): UseWorkspacePanesReturn {
  const [state, setState] = useState<WorkspacePanesState>(() => ({
    ...createInitialWorkspaceState(),
    ...initialState,
  }));

  // -------------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------------

  /** Open a view (creates new tab or focuses existing) */
  const openView = useCallback((
    type: ViewType,
    resourceId?: string | null,
    title?: string
  ): string => {
    // Check if view already exists
    const existingViewId = resourceId ? `${type}-${resourceId}` : null;

    let viewId = existingViewId;
    let targetGroupId = state.focusedGroupId;

    setState(prev => {
      // Find existing view
      if (existingViewId) {
        for (const group of Object.values(prev.groups)) {
          const existing = group.tabs.find(t => t.id === existingViewId);
          if (existing) {
            // View exists - focus it
            return {
              ...prev,
              focusedGroupId: group.id,
              activeViewId: existing.id,
              mruViewIds: [existing.id, ...prev.mruViewIds.filter(id => id !== existing.id)],
              groups: {
                ...prev.groups,
                [group.id]: { ...group, activeTabId: existing.id },
              },
            };
          }
        }
      }

      // Create new view
      viewId = generateViewId(type, resourceId);
      const newView: PaneView = {
        id: viewId!,
        type,
        resourceId: resourceId ?? null,
        title: title ?? DEFAULT_VIEW_TITLES[type],
      };

      // Add to focused group (or first group if none focused)
      targetGroupId = prev.focusedGroupId || Object.keys(prev.groups)[0];
      const targetGroup = prev.groups[targetGroupId];

      return {
        ...prev,
        activeViewId: viewId,
        mruViewIds: [viewId!, ...prev.mruViewIds],
        groups: {
          ...prev.groups,
          [targetGroupId]: {
            ...targetGroup,
            tabs: [...targetGroup.tabs, newView],
            activeTabId: viewId,
          },
        },
      };
    });

    return viewId!;
  }, [state.focusedGroupId]);

  /** Close a tab */
  const closeTab = useCallback((viewId: string) => {
    setState(prev => {
      // Find the group containing this tab
      let containingGroupId: string | null = null;
      let tabIndex = -1;

      for (const [groupId, group] of Object.entries(prev.groups)) {
        const idx = group.tabs.findIndex(t => t.id === viewId);
        if (idx !== -1) {
          containingGroupId = groupId;
          tabIndex = idx;
          break;
        }
      }

      if (!containingGroupId) return prev;

      const group = prev.groups[containingGroupId];
      const newTabs = group.tabs.filter(t => t.id !== viewId);

      // Determine new active tab
      let newActiveTabId: string | null = null;
      if (newTabs.length > 0) {
        if (group.activeTabId === viewId) {
          // Activate adjacent tab
          newActiveTabId = newTabs[Math.min(tabIndex, newTabs.length - 1)]?.id ?? null;
        } else {
          newActiveTabId = group.activeTabId;
        }
      }

      // Update MRU list
      const newMruIds = prev.mruViewIds.filter(id => id !== viewId);

      // Determine new active view
      let newActiveViewId = prev.activeViewId === viewId
        ? (newActiveTabId ?? newMruIds[0] ?? null)
        : prev.activeViewId;

      return {
        ...prev,
        activeViewId: newActiveViewId,
        mruViewIds: newMruIds,
        groups: {
          ...prev.groups,
          [containingGroupId]: {
            ...group,
            tabs: newTabs,
            activeTabId: newActiveTabId,
          },
        },
      };
    });
  }, []);

  /** Close all tabs in a group */
  const closeGroup = useCallback((groupId: string) => {
    setState(prev => {
      const groupIds = getAllGroupIds(prev.layout);
      if (groupIds.length <= 1) {
        // Can't close last group - just clear its tabs
        return {
          ...prev,
          activeViewId: null,
          mruViewIds: [],
          groups: {
            ...prev.groups,
            [groupId]: { ...prev.groups[groupId], tabs: [], activeTabId: null },
          },
        };
      }

      // Remove group from layout
      const newLayout = removeGroupFromLayout(prev.layout, groupId);
      if (!newLayout) return prev;

      // Remove closed views from MRU
      const closedViewIds = new Set(prev.groups[groupId].tabs.map(t => t.id));
      const newMruIds = prev.mruViewIds.filter(id => !closedViewIds.has(id));

      // Remove group
      const { [groupId]: _, ...remainingGroups } = prev.groups;

      // Update focused group if needed
      const newGroupIds = getAllGroupIds(newLayout);
      const newFocusedGroupId = prev.focusedGroupId === groupId
        ? newGroupIds[0]
        : prev.focusedGroupId;

      // Update active view if needed
      const newActiveViewId = closedViewIds.has(prev.activeViewId ?? '')
        ? (newMruIds[0] ?? null)
        : prev.activeViewId;

      return {
        ...prev,
        layout: newLayout,
        groups: remainingGroups,
        focusedGroupId: newFocusedGroupId,
        activeViewId: newActiveViewId,
        mruViewIds: newMruIds,
      };
    });
  }, []);

  /** Split a group in the given direction */
  const splitGroup = useCallback((groupId: string, direction: SplitDirection): string => {
    const newGroupId = generateGroupId();

    setState(prev => {
      const path = findGroupPath(prev.layout, groupId);
      if (!path) return prev;

      // Create split node
      const newSplit: LayoutNode = {
        type: 'split',
        direction,
        ratio: 0.5,
        first: { type: 'group', groupId },
        second: { type: 'group', groupId: newGroupId },
      };

      // Create new empty group
      const newGroup: EditorGroup = {
        id: newGroupId,
        tabs: [],
        activeTabId: null,
      };

      return {
        ...prev,
        layout: setNodeAtPath(prev.layout, path, newSplit),
        groups: {
          ...prev.groups,
          [newGroupId]: newGroup,
        },
        focusedGroupId: newGroupId,
      };
    });

    return newGroupId;
  }, []);

  /** Set the active tab within a group */
  const setActiveTab = useCallback((groupId: string, tabId: string) => {
    setState(prev => {
      const group = prev.groups[groupId];
      if (!group || !group.tabs.find(t => t.id === tabId)) return prev;

      return {
        ...prev,
        focusedGroupId: groupId,
        activeViewId: tabId,
        mruViewIds: [tabId, ...prev.mruViewIds.filter(id => id !== tabId)],
        groups: {
          ...prev.groups,
          [groupId]: { ...group, activeTabId: tabId },
        },
      };
    });
  }, []);

  /** Set the focused group */
  const setFocusedGroup = useCallback((groupId: string) => {
    setState(prev => {
      if (!prev.groups[groupId]) return prev;

      const group = prev.groups[groupId];
      const newActiveViewId = group.activeTabId ?? prev.activeViewId;

      return {
        ...prev,
        focusedGroupId: groupId,
        activeViewId: newActiveViewId,
        mruViewIds: newActiveViewId
          ? [newActiveViewId, ...prev.mruViewIds.filter(id => id !== newActiveViewId)]
          : prev.mruViewIds,
      };
    });
  }, []);

  /** Move a tab to a different group */
  const moveTab = useCallback((tabId: string, targetGroupId: string, index?: number) => {
    setState(prev => {
      // Find source group
      let sourceGroupId: string | null = null;
      let tab: PaneView | null = null;

      for (const [groupId, group] of Object.entries(prev.groups)) {
        const found = group.tabs.find(t => t.id === tabId);
        if (found) {
          sourceGroupId = groupId;
          tab = found;
          break;
        }
      }

      if (!sourceGroupId || !tab) return prev;
      if (sourceGroupId === targetGroupId) return prev; // Same group

      const sourceGroup = prev.groups[sourceGroupId];
      const targetGroup = prev.groups[targetGroupId];

      // Remove from source
      const newSourceTabs = sourceGroup.tabs.filter(t => t.id !== tabId);
      const newSourceActiveTabId = sourceGroup.activeTabId === tabId
        ? (newSourceTabs[0]?.id ?? null)
        : sourceGroup.activeTabId;

      // Add to target
      const insertIndex = index ?? targetGroup.tabs.length;
      const newTargetTabs = [
        ...targetGroup.tabs.slice(0, insertIndex),
        tab,
        ...targetGroup.tabs.slice(insertIndex),
      ];

      return {
        ...prev,
        focusedGroupId: targetGroupId,
        activeViewId: tabId,
        groups: {
          ...prev.groups,
          [sourceGroupId]: {
            ...sourceGroup,
            tabs: newSourceTabs,
            activeTabId: newSourceActiveTabId,
          },
          [targetGroupId]: {
            ...targetGroup,
            tabs: newTargetTabs,
            activeTabId: tabId,
          },
        },
      };
    });
  }, []);

  /** Cycle through views using MRU order */
  const cycleActiveView = useCallback((direction: 'forward' | 'backward') => {
    setState(prev => {
      if (prev.mruViewIds.length <= 1) return prev;

      const currentIndex = prev.activeViewId
        ? prev.mruViewIds.indexOf(prev.activeViewId)
        : -1;

      let newIndex: number;
      if (direction === 'forward') {
        newIndex = (currentIndex + 1) % prev.mruViewIds.length;
      } else {
        newIndex = currentIndex <= 0
          ? prev.mruViewIds.length - 1
          : currentIndex - 1;
      }

      const newActiveViewId = prev.mruViewIds[newIndex];

      // Find the group containing this view
      for (const [groupId, group] of Object.entries(prev.groups)) {
        if (group.tabs.find(t => t.id === newActiveViewId)) {
          return {
            ...prev,
            focusedGroupId: groupId,
            activeViewId: newActiveViewId,
            groups: {
              ...prev.groups,
              [groupId]: { ...group, activeTabId: newActiveViewId },
            },
          };
        }
      }

      return prev;
    });
  }, []);

  /** Update a view's title */
  const updateViewTitle = useCallback((viewId: string, title: string) => {
    setState(prev => {
      for (const [groupId, group] of Object.entries(prev.groups)) {
        const tabIndex = group.tabs.findIndex(t => t.id === viewId);
        if (tabIndex !== -1) {
          const newTabs = [...group.tabs];
          newTabs[tabIndex] = { ...newTabs[tabIndex], title };
          return {
            ...prev,
            groups: {
              ...prev.groups,
              [groupId]: { ...group, tabs: newTabs },
            },
          };
        }
      }
      return prev;
    });
  }, []);

  /** Mark a view as dirty/clean */
  const setViewDirty = useCallback((viewId: string, isDirty: boolean) => {
    setState(prev => {
      for (const [groupId, group] of Object.entries(prev.groups)) {
        const tabIndex = group.tabs.findIndex(t => t.id === viewId);
        if (tabIndex !== -1) {
          const newTabs = [...group.tabs];
          newTabs[tabIndex] = { ...newTabs[tabIndex], isDirty };
          return {
            ...prev,
            groups: {
              ...prev.groups,
              [groupId]: { ...group, tabs: newTabs },
            },
          };
        }
      }
      return prev;
    });
  }, []);

  /** Set split ratio at a path */
  const setSplitRatio = useCallback((path: number[], ratio: number) => {
    setState(prev => {
      const node = getNodeAtPath(prev.layout, path);
      if (!isSplitNode(node)) return prev;

      const newNode: LayoutNode = { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) };
      return {
        ...prev,
        layout: setNodeAtPath(prev.layout, path, newNode),
      };
    });
  }, []);

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------

  const computed = useMemo<WorkspacePanesComputed>(() => {
    // Get all views
    const allViews = Object.values(state.groups).flatMap(g => g.tabs);

    // Get active view
    const activeView = allViews.find(v => v.id === state.activeViewId) ?? null;

    // Get focused group
    const focusedGroup = state.focusedGroupId
      ? state.groups[state.focusedGroupId] ?? null
      : null;

    return {
      activeView,
      activeViewType: activeView?.type ?? null,
      activeResourceId: activeView?.resourceId ?? null,
      focusedGroup,
      totalTabs: allViews.length,
      allViews,
      hasViews: allViews.length > 0,
    };
  }, [state]);

  // -------------------------------------------------------------------------
  // ACTIONS OBJECT
  // -------------------------------------------------------------------------

  const actions: WorkspacePanesActions = useMemo(() => ({
    openView,
    closeTab,
    closeGroup,
    splitGroup,
    setActiveTab,
    setFocusedGroup,
    moveTab,
    cycleActiveView,
    updateViewTitle,
    setViewDirty,
    setSplitRatio,
  }), [
    openView,
    closeTab,
    closeGroup,
    splitGroup,
    setActiveTab,
    setFocusedGroup,
    moveTab,
    cycleActiveView,
    updateViewTitle,
    setViewDirty,
    setSplitRatio,
  ]);

  return { state, actions, computed };
}

// -----------------------------------------------------------------------------
// CONTEXT
// -----------------------------------------------------------------------------

export const WorkspacePanesContext = createContext<UseWorkspacePanesReturn | null>(null);

export function useWorkspacePanesContext(): UseWorkspacePanesReturn {
  const context = useContext(WorkspacePanesContext);
  if (!context) {
    throw new Error('useWorkspacePanesContext must be used within WorkspacePanesProvider');
  }
  return context;
}
