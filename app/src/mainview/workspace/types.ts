// =============================================================================
// WORKSPACE PANE TYPES
// =============================================================================
// Core type definitions for the VS Code-style workspace pane system.

// -----------------------------------------------------------------------------
// VIEW TYPES
// -----------------------------------------------------------------------------

/** Types of views that can be displayed in workspace panes */
export type ViewType = 'chat' | 'code' | 'image' | 'research' | 'prompts';

/** A single view instance within a pane */
export interface PaneView {
  /** Unique identifier for this view instance (e.g., "chat-abc123") */
  id: string;
  /** Type of view being displayed */
  type: ViewType;
  /** Resource ID (chat ID, session ID, etc.) - null for new/unsaved */
  resourceId: string | null;
  /** Display title for the tab */
  title: string;
  /** Whether this view has unsaved changes */
  isDirty?: boolean;
}

// -----------------------------------------------------------------------------
// EDITOR GROUP TYPES
// -----------------------------------------------------------------------------

/** A group of tabs (like a VS Code editor group) */
export interface EditorGroup {
  /** Unique identifier for this group */
  id: string;
  /** Tabs in this group (ordered) */
  tabs: PaneView[];
  /** Currently active tab ID (null if group is empty) */
  activeTabId: string | null;
}

// -----------------------------------------------------------------------------
// LAYOUT TYPES
// -----------------------------------------------------------------------------

/** Direction of a split */
export type SplitDirection = 'horizontal' | 'vertical';

/** A leaf node containing an editor group */
export interface GroupNode {
  type: 'group';
  groupId: string;
}

/** A split node containing two children */
export interface SplitNode {
  type: 'split';
  /** Direction of the split */
  direction: SplitDirection;
  /** Ratio of first child (0-1, e.g., 0.5 = 50/50 split) */
  ratio: number;
  /** First child (left for horizontal, top for vertical) */
  first: LayoutNode;
  /** Second child (right for horizontal, bottom for vertical) */
  second: LayoutNode;
}

/** A node in the layout tree */
export type LayoutNode = GroupNode | SplitNode;

// -----------------------------------------------------------------------------
// WORKSPACE STATE
// -----------------------------------------------------------------------------

/** Complete workspace panes state */
export interface WorkspacePanesState {
  /** Root of the layout tree */
  layout: LayoutNode;
  /** All editor groups by ID */
  groups: Record<string, EditorGroup>;
  /** Currently focused group ID (receives keyboard events) */
  focusedGroupId: string | null;
  /** Currently active view ID (receives input from GlobalInputHub) */
  activeViewId: string | null;
  /** Most Recently Used view IDs (for Ctrl+Tab cycling) */
  mruViewIds: string[];
}

// -----------------------------------------------------------------------------
// WORKSPACE ACTIONS
// -----------------------------------------------------------------------------

export interface WorkspacePanesActions {
  /** Open a view (creates new or focuses existing) */
  openView: (type: ViewType, resourceId?: string | null, title?: string) => string;
  /** Close a tab */
  closeTab: (viewId: string) => void;
  /** Close all tabs in a group */
  closeGroup: (groupId: string) => void;
  /** Split a group in the given direction */
  splitGroup: (groupId: string, direction: SplitDirection) => string;
  /** Set the active tab within a group */
  setActiveTab: (groupId: string, tabId: string) => void;
  /** Set the focused group */
  setFocusedGroup: (groupId: string) => void;
  /** Move a tab to a different group */
  moveTab: (tabId: string, targetGroupId: string, index?: number) => void;
  /** Cycle through views (for Ctrl+Tab) */
  cycleActiveView: (direction: 'forward' | 'backward') => void;
  /** Update a view's title */
  updateViewTitle: (viewId: string, title: string) => void;
  /** Mark a view as dirty/clean */
  setViewDirty: (viewId: string, isDirty: boolean) => void;
  /** Set resize ratio for a split */
  setSplitRatio: (path: number[], ratio: number) => void;
}

// -----------------------------------------------------------------------------
// WORKSPACE COMPUTED
// -----------------------------------------------------------------------------

export interface WorkspacePanesComputed {
  /** The currently active view (or null) */
  activeView: PaneView | null;
  /** The currently active view's type (or null) */
  activeViewType: ViewType | null;
  /** The currently active view's resource ID (or null) */
  activeResourceId: string | null;
  /** The currently focused group (or null) */
  focusedGroup: EditorGroup | null;
  /** Total number of open tabs across all groups */
  totalTabs: number;
  /** All open views flattened */
  allViews: PaneView[];
  /** Whether the workspace has any open views */
  hasViews: boolean;
}

// -----------------------------------------------------------------------------
// HOOK RETURN TYPE
// -----------------------------------------------------------------------------

export interface UseWorkspacePanesReturn {
  state: WorkspacePanesState;
  actions: WorkspacePanesActions;
  computed: WorkspacePanesComputed;
}

// -----------------------------------------------------------------------------
// INPUT CONTEXT TYPES
// -----------------------------------------------------------------------------

/** Types of input that can be sent to views */
export type ViewInput =
  | { type: 'chat'; content: string; models?: string[]; tools?: string[]; memoryIds?: string[] }
  | { type: 'code'; content: string; promptType?: string }
  | { type: 'image'; prompt: string; negativePrompt?: string; settings?: Record<string, unknown> }
  | { type: 'research'; query: string }
  | { type: 'prompts'; action: string; data?: unknown };

/** Context value for input-view communication */
export interface WorkspaceInputContextValue {
  /** Type of the active view (determines which input adapter to show) */
  activeViewType: ViewType | null;
  /** Resource ID of the active view */
  activeResourceId: string | null;
  /** View ID of the active view */
  activeViewId: string | null;
  /** Send input to the active view */
  sendToActiveView: (input: ViewInput) => void;
  /** Register a callback to receive input (returns unsubscribe function) */
  onInputReceived: (viewId: string, callback: (input: ViewInput) => void) => () => void;
}

// -----------------------------------------------------------------------------
// UTILITY TYPES
// -----------------------------------------------------------------------------

/** Default titles for view types */
export const DEFAULT_VIEW_TITLES: Record<ViewType, string> = {
  chat: 'New Chat',
  code: 'Code Session',
  image: 'Image Gen',
  research: 'Research',
  prompts: 'Prompts',
};

/** Generate a unique view ID */
export function generateViewId(type: ViewType, resourceId?: string | null): string {
  if (resourceId) {
    return `${type}-${resourceId}`;
  }
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Generate a unique group ID */
export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Check if a layout node is a group node */
export function isGroupNode(node: LayoutNode): node is GroupNode {
  return node.type === 'group';
}

/** Check if a layout node is a split node */
export function isSplitNode(node: LayoutNode): node is SplitNode {
  return node.type === 'split';
}

/** Create initial workspace state with a single empty group */
export function createInitialWorkspaceState(): WorkspacePanesState {
  const groupId = generateGroupId();
  return {
    layout: { type: 'group', groupId },
    groups: {
      [groupId]: {
        id: groupId,
        tabs: [],
        activeTabId: null,
      },
    },
    focusedGroupId: groupId,
    activeViewId: null,
    mruViewIds: [],
  };
}
