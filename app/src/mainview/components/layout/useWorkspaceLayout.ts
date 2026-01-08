// =============================================================================
// WORKSPACE LAYOUT HOOK
// =============================================================================
// Manages the layered workspace state: navigation, content, and artifact panels.
// Computes dynamic insets so content layer reacts to other layers.

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { sendMessage } from '../../lib/comm-bridge';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ArtifactDock =
  | 'right'    // Docked to right edge, pushes content
  | 'left'     // Docked to left edge, pushes content
  | 'top'      // Docked to top, pushes content down
  | 'bottom'   // Docked to bottom, pushes content up
  | 'float'    // Floating overlay, doesn't push content
  | 'hidden';  // Not visible

// Overlay/Modal types
export type OverlayVariant =
  | 'slide-right'  // Slides in from right edge (settings, panels)
  | 'slide-left'   // Slides in from left edge
  | 'fade'         // Simple fade in (dialogs)
  | 'zoom';        // Scale up from center (alerts)

export type OverlayBackdrop = 'dim' | 'blur' | 'none';

export interface OverlayConfig {
  id: string;
  variant: OverlayVariant;
  backdrop: OverlayBackdrop;
  dismissible: boolean;      // Click backdrop to close
  width?: number | string;   // For slide variants
  onClose?: () => void;      // Callback when closed
}

export interface OverlayEntry extends OverlayConfig {
  content: React.ReactNode;
  isClosing: boolean;        // For exit animation
}

export interface ArtifactState {
  dock: ArtifactDock;
  width: number;      // Used when docked left/right
  height: number;     // Used when docked top/bottom
  floatX: number;     // X position when floating (percentage from left)
  floatY: number;     // Y position when floating (percentage from top)
  floatWidth: number; // Width when floating
  floatHeight: number;// Height when floating
}

export interface NavigationState {
  expanded: boolean;
  collapsedWidth: number;
  expandedWidth: number;
  hovered: boolean;
}

export interface ContentInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BottomPanelState {
  visible: boolean;
  height: number;
  minHeight: number;
  maxHeight: number;
}

export interface WorkspaceLayoutState {
  navigation: NavigationState;
  artifact: ArtifactState;
  bottomPanel: BottomPanelState;
  overlays: OverlayEntry[];
}

export interface WorkspaceLayoutActions {
  // Navigation
  toggleNav: () => void;
  setNavExpanded: (expanded: boolean) => void;
  setNavHovered: (hovered: boolean) => void;

  // Artifact panel
  setArtifactDock: (dock: ArtifactDock) => void;
  setArtifactSize: (width: number, height: number) => void;
  setArtifactFloatPosition: (x: number, y: number) => void;
  setArtifactFloatSize: (width: number, height: number) => void;
  toggleArtifact: () => void;

  // Quick actions
  maximizeArtifact: () => void;
  minimizeArtifact: () => void;
  closeArtifact: () => void;

  // Overlay actions
  openOverlay: (config: OverlayConfig, content: React.ReactNode) => void;
  closeOverlay: (id: string) => void;
  closeAllOverlays: () => void;

  // Bottom panel actions
  setBottomPanelVisible: (visible: boolean) => void;
  setBottomPanelHeight: (height: number) => void;
  toggleBottomPanel: () => void;
}

export interface WorkspaceLayoutComputed {
  navWidth: number;           // Current nav width (considering hover/expanded)
  contentInsets: ContentInsets; // Insets for content layer
  artifactVisible: boolean;
  artifactPushesContent: boolean;
  bottomPanelVisible: boolean;
  bottomPanelHeight: number;
  hasOverlay: boolean;        // Any overlay currently open
  topOverlay: OverlayEntry | null; // The topmost overlay
}

export interface UseWorkspaceLayoutReturn {
  state: WorkspaceLayoutState;
  actions: WorkspaceLayoutActions;
  computed: WorkspaceLayoutComputed;
}

// -----------------------------------------------------------------------------
// DEFAULT VALUES
// -----------------------------------------------------------------------------

const DEFAULT_NAV: NavigationState = {
  expanded: false,
  collapsedWidth: 0,      // VS Code style: collapsed = hidden, not icon-only
  expandedWidth: 220,     // Minimum useful width for text
  hovered: false,
};

const DEFAULT_ARTIFACT: ArtifactState = {
  dock: 'hidden',
  width: 400,
  height: 300,
  floatX: 60,  // 60% from left
  floatY: 20,  // 20% from top
  floatWidth: 500,
  floatHeight: 400,
};

const DEFAULT_BOTTOM_PANEL: BottomPanelState = {
  visible: true,
  height: 200,
  minHeight: 100,
  maxHeight: 400,
};

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useWorkspaceLayout(
  initialNav?: Partial<NavigationState>,
  initialArtifact?: Partial<ArtifactState>,
  initialBottomPanel?: Partial<BottomPanelState>
): UseWorkspaceLayoutReturn {
  // State
  const [navigation, setNavigation] = useState<NavigationState>({
    ...DEFAULT_NAV,
    ...initialNav,
  });

  // Start with defaults, then load from backend
  const [artifact, setArtifact] = useState<ArtifactState>({
    ...DEFAULT_ARTIFACT,
    ...initialArtifact,
  });

  // Bottom panel state
  const [bottomPanel, setBottomPanel] = useState<BottomPanelState>({
    ...DEFAULT_BOTTOM_PANEL,
    ...initialBottomPanel,
  });

  // Track if we've loaded from backend (to avoid overwriting on initial load)
  const hasLoadedFromBackend = useRef(false);
  const isUserChange = useRef(false);

  // Load layout state from backend on mount
  useEffect(() => {
    sendMessage<{ artifactDock?: ArtifactDock; artifactWidth?: number; artifactHeight?: number }>('settings:get', 'layout')
      .then((layout) => {
        if (layout) {
          hasLoadedFromBackend.current = true;
          setArtifact(prev => ({
            ...prev,
            dock: layout.artifactDock ?? prev.dock,
            width: layout.artifactWidth ?? prev.width,
            height: layout.artifactHeight ?? prev.height,
          }));
        }
      })
      .catch((err) => {
        console.warn('[useWorkspaceLayout] Failed to load layout from backend:', err);
      });
  }, []);

  // Persist artifact state to backend when user changes it
  useEffect(() => {
    // Skip if we haven't loaded yet or this isn't a user change
    if (!hasLoadedFromBackend.current) return;
    if (!isUserChange.current) {
      isUserChange.current = true; // Next change will be from user
      return;
    }

    // Save to backend
    sendMessage('settings:set', {
      path: 'layout',
      value: {
        artifactDock: artifact.dock,
        artifactWidth: artifact.width,
        artifactHeight: artifact.height,
        navExpanded: navigation.expanded,
      },
    }).catch((err) => {
      console.warn('[useWorkspaceLayout] Failed to save layout to backend:', err);
    });
  }, [artifact.dock, artifact.width, artifact.height, navigation.expanded]);

  // Overlay state
  const [overlays, setOverlays] = useState<OverlayEntry[]>([]);
  const overlayTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Navigation actions
  const toggleNav = useCallback(() => {
    setNavigation(prev => ({ ...prev, expanded: !prev.expanded }));
  }, []);

  const setNavExpanded = useCallback((expanded: boolean) => {
    setNavigation(prev => ({ ...prev, expanded }));
  }, []);

  const setNavHovered = useCallback((hovered: boolean) => {
    setNavigation(prev => ({ ...prev, hovered }));
  }, []);

  // Artifact actions
  const setArtifactDock = useCallback((dock: ArtifactDock) => {
    setArtifact(prev => ({ ...prev, dock }));
  }, []);

  const setArtifactSize = useCallback((width: number, height: number) => {
    setArtifact(prev => ({ ...prev, width, height }));
  }, []);

  const setArtifactFloatPosition = useCallback((floatX: number, floatY: number) => {
    setArtifact(prev => ({ ...prev, floatX, floatY }));
  }, []);

  const setArtifactFloatSize = useCallback((floatWidth: number, floatHeight: number) => {
    setArtifact(prev => ({ ...prev, floatWidth, floatHeight }));
  }, []);

  const toggleArtifact = useCallback(() => {
    setArtifact(prev => ({
      ...prev,
      dock: prev.dock === 'hidden' ? 'right' : 'hidden',
    }));
  }, []);

  const maximizeArtifact = useCallback(() => {
    setArtifact(prev => ({
      ...prev,
      dock: 'right',
      width: Math.max(prev.width, 600),
    }));
  }, []);

  const minimizeArtifact = useCallback(() => {
    setArtifact(prev => ({ ...prev, dock: 'float' }));
  }, []);

  const closeArtifact = useCallback(() => {
    setArtifact(prev => ({ ...prev, dock: 'hidden' }));
  }, []);

  // Bottom panel actions
  const setBottomPanelVisible = useCallback((visible: boolean) => {
    setBottomPanel(prev => ({ ...prev, visible }));
  }, []);

  const setBottomPanelHeight = useCallback((height: number) => {
    setBottomPanel(prev => ({
      ...prev,
      height: Math.max(prev.minHeight, Math.min(prev.maxHeight, height)),
    }));
  }, []);

  const toggleBottomPanel = useCallback(() => {
    setBottomPanel(prev => ({ ...prev, visible: !prev.visible }));
  }, []);

  // Overlay actions
  const openOverlay = useCallback((config: OverlayConfig, content: React.ReactNode) => {
    // Clear any pending close timeout for this overlay
    const existingTimeout = overlayTimeouts.current.get(config.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      overlayTimeouts.current.delete(config.id);
    }

    setOverlays(prev => {
      // Remove existing overlay with same id, then add new one
      const filtered = prev.filter(o => o.id !== config.id);
      return [...filtered, { ...config, content, isClosing: false }];
    });
  }, []);

  const closeOverlay = useCallback((id: string) => {
    // Start closing animation
    setOverlays(prev =>
      prev.map(o => o.id === id ? { ...o, isClosing: true } : o)
    );

    // Remove after animation (300ms)
    const timeout = setTimeout(() => {
      setOverlays(prev => prev.filter(o => o.id !== id));
      overlayTimeouts.current.delete(id);

      // Call onClose callback
      const overlay = overlays.find(o => o.id === id);
      overlay?.onClose?.();
    }, 300);

    overlayTimeouts.current.set(id, timeout);
  }, [overlays]);

  const closeAllOverlays = useCallback(() => {
    // Close all overlays with animation
    overlays.forEach(o => closeOverlay(o.id));
  }, [overlays, closeOverlay]);

  // Computed values
  const computed = useMemo<WorkspaceLayoutComputed>(() => {
    // Calculate effective nav width
    // If hovered but not expanded, show expanded width temporarily
    const navWidth = navigation.expanded || navigation.hovered
      ? navigation.expandedWidth
      : navigation.collapsedWidth;

    // Determine if artifact pushes content
    const artifactPushesContent = ['left', 'right', 'top', 'bottom'].includes(artifact.dock);
    const artifactVisible = artifact.dock !== 'hidden';

    // Bottom panel
    const bottomPanelVisible = bottomPanel.visible;
    const bottomPanelHeight = bottomPanel.visible ? bottomPanel.height : 0;

    // Calculate content insets based on nav, artifact, and bottom panel positions
    const contentInsets: ContentInsets = {
      top: 0,
      right: 0,
      bottom: 0,
      left: navWidth,
    };

    // Add artifact insets only if it pushes content
    if (artifactPushesContent) {
      switch (artifact.dock) {
        case 'right':
          contentInsets.right = artifact.width;
          break;
        case 'left':
          contentInsets.left += artifact.width;
          break;
        case 'top':
          contentInsets.top = artifact.height;
          break;
        case 'bottom':
          contentInsets.bottom += artifact.height;
          break;
      }
    }

    // Overlay state
    const hasOverlay = overlays.length > 0;
    const topOverlay = overlays.length > 0 ? overlays[overlays.length - 1] : null;

    return {
      navWidth,
      contentInsets,
      artifactVisible,
      artifactPushesContent,
      bottomPanelVisible,
      bottomPanelHeight,
      hasOverlay,
      topOverlay,
    };
  }, [navigation, artifact, bottomPanel, overlays]);

  // Combine actions
  const actions: WorkspaceLayoutActions = useMemo(() => ({
    toggleNav,
    setNavExpanded,
    setNavHovered,
    setArtifactDock,
    setArtifactSize,
    setArtifactFloatPosition,
    setArtifactFloatSize,
    toggleArtifact,
    maximizeArtifact,
    minimizeArtifact,
    closeArtifact,
    openOverlay,
    closeOverlay,
    closeAllOverlays,
    setBottomPanelVisible,
    setBottomPanelHeight,
    toggleBottomPanel,
  }), [
    toggleNav,
    setNavExpanded,
    setNavHovered,
    setArtifactDock,
    setArtifactSize,
    setArtifactFloatPosition,
    setArtifactFloatSize,
    toggleArtifact,
    maximizeArtifact,
    minimizeArtifact,
    closeArtifact,
    openOverlay,
    closeOverlay,
    closeAllOverlays,
    setBottomPanelVisible,
    setBottomPanelHeight,
    toggleBottomPanel,
  ]);

  return {
    state: { navigation, artifact, bottomPanel, overlays },
    actions,
    computed,
  };
}

// -----------------------------------------------------------------------------
// CONTEXT (optional, for deep component access)
// -----------------------------------------------------------------------------

import { createContext, useContext } from 'react';

export const WorkspaceLayoutContext = createContext<UseWorkspaceLayoutReturn | null>(null);

export function useWorkspaceLayoutContext(): UseWorkspaceLayoutReturn {
  const context = useContext(WorkspaceLayoutContext);
  if (!context) {
    throw new Error('useWorkspaceLayoutContext must be used within WorkspaceLayoutProvider');
  }
  return context;
}
