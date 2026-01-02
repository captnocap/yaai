// =============================================================================
// WORKSPACE SHELL
// =============================================================================
// The main container that orchestrates the four-layer layout system:
// - Navigation Layer (red/z-1): Sidebar, can expand/collapse
// - Content Layer (green/z-2): Main chat area, reactive to other layers
// - Artifact Layer (blue/z-3): Outputs, previews, agents - dockable/floatable
// - Overlay Layer (z-4): Modals, settings, dialogs - slides over everything

import React, { useEffect, useMemo, useCallback } from 'react';
import { cn } from '../../lib';
import {
  ChevronRight,
} from 'lucide-react';
import {
  useWorkspaceLayout,
  WorkspaceLayoutContext,
  type ArtifactDock,
  type NavigationState,
  type ArtifactState,
  type OverlayEntry,
  type OverlayVariant,
} from './useWorkspaceLayout';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface WorkspaceShellProps {
  children: React.ReactNode;

  // Layer content slots
  navigation?: React.ReactNode;
  artifact?: React.ReactNode;

  // Initial state overrides
  initialNavExpanded?: boolean;
  initialArtifactDock?: ArtifactDock;

  // Callbacks
  onLayoutChange?: (state: { navigation: NavigationState; artifact: ArtifactState }) => void;

  className?: string;
}

// -----------------------------------------------------------------------------
// CSS CUSTOM PROPERTIES
// -----------------------------------------------------------------------------

function useLayoutCSSVariables(
  navWidth: number,
  contentInsets: { top: number; right: number; bottom: number; left: number },
  artifactDock: ArtifactDock,
  artifactWidth: number,
  artifactHeight: number,
  floatPosition: { x: number; y: number },
  floatSize: { width: number; height: number }
): React.CSSProperties {
  return useMemo(() => ({
    '--nav-width': `${navWidth}px`,
    '--content-inset-top': `${contentInsets.top}px`,
    '--content-inset-right': `${contentInsets.right}px`,
    '--content-inset-bottom': `${contentInsets.bottom}px`,
    '--content-inset-left': `${contentInsets.left}px`,
    '--artifact-width': `${artifactWidth}px`,
    '--artifact-height': `${artifactHeight}px`,
    '--artifact-float-x': `${floatPosition.x}%`,
    '--artifact-float-y': `${floatPosition.y}%`,
    '--artifact-float-width': `${floatSize.width}px`,
    '--artifact-float-height': `${floatSize.height}px`,
  } as React.CSSProperties), [
    navWidth,
    contentInsets,
    artifactDock,
    artifactWidth,
    artifactHeight,
    floatPosition,
    floatSize,
  ]);
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export function WorkspaceShell({
  children,
  navigation,
  artifact,
  initialNavExpanded = false,
  initialArtifactDock = 'hidden',
  onLayoutChange,
  className,
}: WorkspaceShellProps) {
  const layout = useWorkspaceLayout(
    { expanded: initialNavExpanded },
    { dock: initialArtifactDock }
  );

  const { state, computed } = layout;

  // Notify parent of layout changes
  useEffect(() => {
    onLayoutChange?.(state);
  }, [state, onLayoutChange]);

  // Generate CSS variables for the layout
  const cssVariables = useLayoutCSSVariables(
    computed.navWidth,
    computed.contentInsets,
    state.artifact.dock,
    state.artifact.width,
    state.artifact.height,
    { x: state.artifact.floatX, y: state.artifact.floatY },
    { width: state.artifact.floatWidth, height: state.artifact.floatHeight }
  );

  return (
    <WorkspaceLayoutContext.Provider value={layout}>
      <div
        className={cn('workspace-shell', className)}
        style={{
          ...cssVariables,
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg)',
        }}
        data-nav-expanded={state.navigation.expanded}
        data-artifact-dock={state.artifact.dock}
      >
        {/* Layer 1: Navigation (Red) */}
        <NavigationLayerWrapper
          expanded={state.navigation.expanded}
          hovered={state.navigation.hovered}
          collapsedWidth={state.navigation.collapsedWidth}
          expandedWidth={state.navigation.expandedWidth}
          onHoverChange={layout.actions.setNavHovered}
          onToggle={layout.actions.toggleNav}
        >
          {navigation}
        </NavigationLayerWrapper>

        {/* Layer 2: Content (Green) - The chat area */}
        <ContentLayerWrapper insets={computed.contentInsets}>
          {children}
        </ContentLayerWrapper>

        {/* Layer 3: Artifact (Blue) */}
        {computed.artifactVisible && (
          <ArtifactLayerWrapper
            dock={state.artifact.dock}
            width={state.artifact.width}
            height={state.artifact.height}
            floatX={state.artifact.floatX}
            floatY={state.artifact.floatY}
            floatWidth={state.artifact.floatWidth}
            floatHeight={state.artifact.floatHeight}
            navWidth={computed.navWidth}
            onResize={layout.actions.setArtifactSize}
            onFloatMove={layout.actions.setArtifactFloatPosition}
            onClose={layout.actions.closeArtifact}
            onDockChange={layout.actions.setArtifactDock}
          >
            {artifact}
          </ArtifactLayerWrapper>
        )}

        {/* Layer 4: Overlays (Modals, Settings, Dialogs) */}
        {state.overlays.length > 0 && (
          <OverlayLayer
            overlays={state.overlays}
            onClose={layout.actions.closeOverlay}
          />
        )}
      </div>
    </WorkspaceLayoutContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// NAVIGATION LAYER WRAPPER
// -----------------------------------------------------------------------------

interface NavigationLayerWrapperProps {
  children: React.ReactNode;
  expanded: boolean;
  hovered: boolean;
  collapsedWidth: number;
  expandedWidth: number;
  onHoverChange: (hovered: boolean) => void;
  onToggle: () => void;
}

function NavigationLayerWrapper({
  children,
  expanded,
  hovered,
  collapsedWidth,
  expandedWidth,
  onHoverChange,
  onToggle,
}: NavigationLayerWrapperProps) {
  const width = expanded || hovered ? expandedWidth : collapsedWidth;
  const [isBtnHovered, setIsBtnHovered] = React.useState(false);

  return (
    <div
      className="navigation-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: `${width}px`,
        zIndex: 10,
        backgroundColor: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        transition: 'width 0.2s ease-out',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
      data-expanded={expanded}
      data-hovered={hovered}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Centered Chevron Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={() => {
          setIsBtnHovered(true);
          onHoverChange(true);
        }}
        onMouseLeave={() => {
          setIsBtnHovered(false);
          onHoverChange(false);
        }}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isBtnHovered ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 100,
          transition: 'all 0.2s ease',
          opacity: isBtnHovered || expanded ? 1 : 0.6,
        }}
        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronRight
          size={14}
          style={{
            transform: (expanded || hovered) ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        />
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CONTENT LAYER WRAPPER
// -----------------------------------------------------------------------------

interface ContentLayerWrapperProps {
  children: React.ReactNode;
  insets: { top: number; right: number; bottom: number; left: number };
}

function ContentLayerWrapper({ children, insets }: ContentLayerWrapperProps) {
  return (
    <div
      className="content-layer"
      style={{
        position: 'absolute',
        top: `${insets.top}px`,
        right: `${insets.right}px`,
        bottom: `${insets.bottom}px`,
        left: `${insets.left}px`,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.2s ease-out',
      }}
    >
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ARTIFACT LAYER WRAPPER
// -----------------------------------------------------------------------------

interface ArtifactLayerWrapperProps {
  children: React.ReactNode;
  dock: ArtifactDock;
  width: number;
  height: number;
  floatX: number;
  floatY: number;
  floatWidth: number;
  floatHeight: number;
  navWidth: number;
  onResize: (width: number, height: number) => void;
  onFloatMove: (x: number, y: number) => void;
  onClose: () => void;
  onDockChange: (dock: ArtifactDock) => void;
}

function ArtifactLayerWrapper({
  children,
  dock,
  width,
  height,
  floatX,
  floatY,
  floatWidth,
  floatHeight,
  navWidth,
  onResize,
  onFloatMove,
  onClose,
  onDockChange,
}: ArtifactLayerWrapperProps) {
  // Calculate position and size based on dock mode
  const style = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 30,
      backgroundColor: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'all 0.25s ease-out',
    };

    switch (dock) {
      case 'right':
        return {
          ...base,
          top: '8px',
          right: '8px',
          bottom: '8px',
          width: `${width}px`,
          borderRadius: 'var(--radius-lg)',
        };

      case 'left':
        return {
          ...base,
          top: '8px',
          left: `${navWidth + 8}px`,
          bottom: '8px',
          width: `${width}px`,
        };

      case 'top':
        return {
          ...base,
          top: '8px',
          left: `${navWidth + 8}px`,
          right: '8px',
          height: `${height}px`,
        };

      case 'bottom':
        return {
          ...base,
          left: `${navWidth + 8}px`,
          right: '8px',
          bottom: '8px',
          height: `${height}px`,
        };

      case 'float':
        return {
          ...base,
          left: `${floatX}%`,
          top: `${floatY}%`,
          width: `${floatWidth}px`,
          height: `${floatHeight}px`,
          transform: 'translate(-50%, 0)',
        };

      default:
        return base;
    }
  }, [dock, width, height, floatX, floatY, floatWidth, floatHeight, navWidth]);

  // Determine which edges can be resized
  const resizeEdges = useMemo(() => {
    switch (dock) {
      case 'right': return ['left'];
      case 'left': return ['right'];
      case 'top': return ['bottom'];
      case 'bottom': return ['top'];
      case 'float': return ['left', 'right', 'bottom'];
      default: return [];
    }
  }, [dock]);

  return (
    <div
      className="artifact-layer"
      style={style}
      data-dock={dock}
    >
      {/* Header with controls - draggable in float mode */}
      <ArtifactHeader
        dock={dock}
        onClose={onClose}
        onDockChange={onDockChange}
        onDrag={dock === 'float' ? onFloatMove : undefined}
        currentX={floatX}
        currentY={floatY}
      />

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>

      {/* Resize handles */}
      {resizeEdges.map(edge => (
        <ResizeHandle
          key={edge}
          edge={edge as 'left' | 'right' | 'top' | 'bottom'}
          dock={dock}
          currentWidth={dock === 'float' ? floatWidth : width}
          currentHeight={dock === 'float' ? floatHeight : height}
          onResize={onResize}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ARTIFACT HEADER
// -----------------------------------------------------------------------------

interface ArtifactHeaderProps {
  dock: ArtifactDock;
  onClose: () => void;
  onDockChange: (dock: ArtifactDock) => void;
  onDrag?: (x: number, y: number) => void;
  currentX?: number;
  currentY?: number;
}

function ArtifactHeader({
  dock,
  onClose,
  onDockChange,
  onDrag,
  currentX = 50,
  currentY = 20,
}: ArtifactHeaderProps) {
  const isDraggable = dock === 'float' && onDrag;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable) return;

    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = currentX;
    const startY = currentY;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Convert pixel delta to percentage
      const deltaXPercent = ((moveEvent.clientX - startMouseX) / windowWidth) * 100;
      const deltaYPercent = ((moveEvent.clientY - startMouseY) / windowHeight) * 100;

      // Calculate new position
      let newX = startX + deltaXPercent;
      let newY = startY + deltaYPercent;

      // Clamp to keep panel on screen
      newX = Math.max(10, Math.min(90, newX));
      newY = Math.max(5, Math.min(80, newY));

      onDrag!(newX, newY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-tertiary)',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
        userSelect: 'none',
        cursor: isDraggable ? 'grab' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isDraggable && <span style={{ opacity: 0.5 }}>⋮⋮</span>}
        Artifact
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {/* Dock position buttons */}
        <DockButton
          active={dock === 'left'}
          onClick={() => onDockChange('left')}
          title="Dock Left"
        >
          ◧
        </DockButton>
        <DockButton
          active={dock === 'right'}
          onClick={() => onDockChange('right')}
          title="Dock Right"
        >
          ◨
        </DockButton>
        <DockButton
          active={dock === 'top'}
          onClick={() => onDockChange('top')}
          title="Dock Top"
        >
          ⬒
        </DockButton>
        <DockButton
          active={dock === 'bottom'}
          onClick={() => onDockChange('bottom')}
          title="Dock Bottom"
        >
          ⬓
        </DockButton>
        <DockButton
          active={dock === 'float'}
          onClick={() => onDockChange('float')}
          title="Float"
        >
          ❐
        </DockButton>
        <DockButton
          onClick={onClose}
          title="Close"
          style={{ marginLeft: '8px' }}
        >
          ✕
        </DockButton>
      </div>
    </div>
  );
}

interface DockButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  style?: React.CSSProperties;
}

function DockButton({ children, active, onClick, title, style }: DockButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: active ? 'var(--color-accent-subtle)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.15s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// RESIZE HANDLE
// -----------------------------------------------------------------------------

interface ResizeHandleProps {
  edge: 'left' | 'right' | 'top' | 'bottom';
  dock: ArtifactDock;
  currentWidth: number;
  currentHeight: number;
  onResize: (width: number, height: number) => void;
}

function ResizeHandle({
  edge,
  dock,
  currentWidth,
  currentHeight,
  onResize,
}: ResizeHandleProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = currentWidth;
    const startHeight = currentHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Calculate new size based on edge and dock position
      if (edge === 'left') {
        // Dragging left edge: dock right means increase width when dragging left
        newWidth = dock === 'right' ? startWidth - deltaX : startWidth + deltaX;
      } else if (edge === 'right') {
        newWidth = startWidth + deltaX;
      } else if (edge === 'top') {
        newHeight = startHeight - deltaY;
      } else if (edge === 'bottom') {
        newHeight = startHeight + deltaY;
      }

      // Clamp values
      newWidth = Math.max(200, Math.min(newWidth, window.innerWidth * 0.8));
      newHeight = Math.max(150, Math.min(newHeight, window.innerHeight * 0.8));

      onResize(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = edge === 'left' || edge === 'right' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const isHorizontal = edge === 'left' || edge === 'right';
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    [edge]: '-3px',
    ...(isHorizontal
      ? { top: 0, bottom: 0, width: '6px', cursor: 'ew-resize' }
      : { left: 0, right: 0, height: '6px', cursor: 'ns-resize' }
    ),
  };

  return (
    <div
      className="resize-handle"
      style={{
        ...positionStyle,
        backgroundColor: 'transparent',
        zIndex: 50,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Visual indicator on hover */}
      <div
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '2px', height: '32px' }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '32px', height: '2px' }
          ),
          backgroundColor: 'var(--color-border)',
          borderRadius: '1px',
          opacity: 0.5,
          transition: 'opacity 0.15s ease',
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// OVERLAY LAYER
// -----------------------------------------------------------------------------

interface OverlayLayerProps {
  overlays: OverlayEntry[];
  onClose: (id: string) => void;
}

function OverlayLayer({ overlays, onClose }: OverlayLayerProps) {
  // Handle ESC key to close top overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlays.length > 0) {
        const topOverlay = overlays[overlays.length - 1];
        if (topOverlay.dismissible) {
          onClose(topOverlay.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [overlays, onClose]);

  return (
    <div
      className="overlay-layer"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {overlays.map((overlay, index) => (
        <OverlayItem
          key={overlay.id}
          overlay={overlay}
          isTop={index === overlays.length - 1}
          onClose={() => onClose(overlay.id)}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// OVERLAY ITEM
// -----------------------------------------------------------------------------

interface OverlayItemProps {
  overlay: OverlayEntry;
  isTop: boolean;
  onClose: () => void;
}

function OverlayItem({ overlay, isTop, onClose }: OverlayItemProps) {
  const { variant, backdrop, dismissible, width, isClosing, content } = overlay;

  // Get animation styles based on variant
  const getAnimationStyles = (): {
    backdrop: React.CSSProperties;
    panel: React.CSSProperties;
  } => {
    const entering = !isClosing;
    const duration = '0.3s';
    const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';

    // Base backdrop styles
    const backdropBase: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      transition: `opacity ${duration} ${easing}`,
      opacity: entering ? 1 : 0,
      pointerEvents: 'auto',
    };

    // Apply backdrop type
    if (backdrop === 'dim') {
      backdropBase.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    } else if (backdrop === 'blur') {
      backdropBase.backgroundColor = 'rgba(0, 0, 0, 0.3)';
      backdropBase.backdropFilter = 'blur(4px)';
    } else {
      backdropBase.backgroundColor = 'transparent';
    }

    // Panel base styles
    const panelBase: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: 'var(--color-bg-elevated)',
      boxShadow: '0 16px 64px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      pointerEvents: 'auto',
      transition: `transform ${duration} ${easing}, opacity ${duration} ${easing}`,
    };

    // Variant-specific styles
    switch (variant) {
      case 'slide-right':
        return {
          backdrop: backdropBase,
          panel: {
            ...panelBase,
            top: 0,
            right: 0,
            bottom: 0,
            width: width || '400px',
            borderLeft: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
            transform: entering ? 'translateX(0)' : 'translateX(100%)',
          },
        };

      case 'slide-left':
        return {
          backdrop: backdropBase,
          panel: {
            ...panelBase,
            top: 0,
            left: 0,
            bottom: 0,
            width: width || '400px',
            borderRight: '1px solid var(--color-border)',
            borderRadius: '0 var(--radius-lg) var(--radius-lg) 0',
            transform: entering ? 'translateX(0)' : 'translateX(-100%)',
          },
        };

      case 'fade':
        return {
          backdrop: backdropBase,
          panel: {
            ...panelBase,
            top: '50%',
            left: '50%',
            transform: entering
              ? 'translate(-50%, -50%)'
              : 'translate(-50%, -50%)',
            opacity: entering ? 1 : 0,
            width: width || 'auto',
            maxWidth: '90vw',
            maxHeight: '90vh',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          },
        };

      case 'zoom':
        return {
          backdrop: backdropBase,
          panel: {
            ...panelBase,
            top: '50%',
            left: '50%',
            transform: entering
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -50%) scale(0.95)',
            opacity: entering ? 1 : 0,
            width: width || 'auto',
            maxWidth: '90vw',
            maxHeight: '90vh',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
          },
        };

      default:
        return { backdrop: backdropBase, panel: panelBase };
    }
  };

  const styles = getAnimationStyles();

  return (
    <>
      {/* Backdrop */}
      <div
        className="overlay-backdrop"
        style={styles.backdrop}
        onClick={dismissible ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className="overlay-panel"
        style={styles.panel}
        role="dialog"
        aria-modal="true"
      >
        {content}
      </div>
    </>
  );
}
