// =============================================================================
// INPUT HUB GRID
// =============================================================================
// Main grid container using react-grid-layout for Tarkov/Diablo-style
// drag-and-drop, resizable panel system.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import GridLayout from 'react-grid-layout';
import { cn } from '../../lib';

// Suppress type issues with react-grid-layout
const RGL = GridLayout as any;
import type { ViewType } from '../../workspace/types';
import {
  type PanelId,
  type Layout,
  getLayoutForMode,
  getEnabledPanelsForMode,
  saveLayout,
  filterLayoutByEnabledPanels,
  PANEL_DEFINITIONS,
} from './grid-config';

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface InputHubGridProps {
  /** Current view mode (chat, code, image, etc.) */
  mode: ViewType;
  /** Width of the grid container */
  width: number;
  /** Height of the grid container */
  height: number;
  /** Render function for each panel */
  renderPanel: (panelId: PanelId) => React.ReactNode;
  /** Called when layout changes */
  onLayoutChange?: (layout: Layout[]) => void;
  /** Additional class name */
  className?: string;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const COLS = 12;
const MAX_ROWS = 12;
const ROW_HEIGHT = 20; // 12 rows × 20px + 11 margins × 4px + 8px padding = 300px
const MARGIN: [number, number] = [4, 4];
const CONTAINER_PADDING: [number, number] = [4, 4];

// -----------------------------------------------------------------------------
// LAYOUT CLAMPING - ensures items stay within grid bounds
// -----------------------------------------------------------------------------

function clampLayout(layout: Layout[], maxRows: number): Layout[] {
  return layout.map((item) => {
    let { y, h } = item;

    // Clamp height to not exceed maxRows
    if (h > maxRows) {
      h = maxRows;
    }

    // Clamp y position so item doesn't extend past maxRows
    if (y + h > maxRows) {
      y = Math.max(0, maxRows - h);
    }

    return { ...item, y, h };
  });
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function InputHubGrid({
  mode,
  width,
  height,
  renderPanel,
  onLayoutChange,
  className,
}: InputHubGridProps) {
  // Load layout and enabled panels for current mode (clamped to bounds)
  const [layout, setLayout] = useState<Layout[]>(() =>
    clampLayout(getLayoutForMode(mode), MAX_ROWS)
  );
  const [enabledPanels, setEnabledPanels] = useState<PanelId[]>(() =>
    getEnabledPanelsForMode(mode)
  );

  // Fixed row height - grid is always 12x12, 300px tall
  const rowHeight = ROW_HEIGHT;

  // Update layout when mode changes (clamped to bounds)
  useEffect(() => {
    const newLayout = clampLayout(getLayoutForMode(mode), MAX_ROWS);
    const newEnabledPanels = getEnabledPanelsForMode(mode);
    setLayout(newLayout);
    setEnabledPanels(newEnabledPanels);
  }, [mode]);

  // Filter layout to only show enabled panels (clamped)
  const filteredLayout = useMemo(
    () => clampLayout(filterLayoutByEnabledPanels(layout, enabledPanels), MAX_ROWS),
    [layout, enabledPanels]
  );

  // Handle layout change (drag/resize) - clamp to bounds
  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const clamped = clampLayout(newLayout, MAX_ROWS);
      setLayout(clamped);
      saveLayout(mode, clamped);
      onLayoutChange?.(clamped);
    },
    [mode, onLayoutChange]
  );

  // Calculate actual width accounting for padding
  const gridWidth = width - CONTAINER_PADDING[0] * 2;

  return (
    <div
      className={cn(
        'input-hub-grid',
        'relative',
        'overflow-hidden',
        className
      )}
      style={{
        width,
        height,
        padding: `${CONTAINER_PADDING[1]}px ${CONTAINER_PADDING[0]}px`,
      }}
    >
      <RGL
        className="layout"
        layout={filteredLayout}
        cols={COLS}
        rowHeight={rowHeight}
        width={gridWidth}
        margin={MARGIN}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        isDraggable
        isResizable
        draggableHandle=".panel-header"
        resizeHandles={['se', 'e', 's']}
        compactType={null}
        preventCollision={true}
        useCSSTransforms
      >
        {enabledPanels.map((panelId) => {
          const panelLayout = filteredLayout.find((l) => l.i === panelId);
          if (!panelLayout) return null;

          return (
            <div key={panelId} className="grid-panel-container h-full w-full overflow-hidden">
              {renderPanel(panelId)}
            </div>
          );
        })}
      </RGL>

      {/* Debug: Grid overlay and info */}
      <GridOverlay cols={COLS} rows={MAX_ROWS} rowHeight={rowHeight} margin={MARGIN[1]} />
      <GridDebugInfo
        cols={COLS}
        rows={MAX_ROWS}
        width={gridWidth}
        height={height}
        rowHeight={rowHeight}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// GRID OVERLAY (for debugging)
// -----------------------------------------------------------------------------

interface GridOverlayProps {
  cols: number;
  rows: number;
  rowHeight: number;
  margin: number;
}

function GridOverlay({ cols, rows, rowHeight, margin }: GridOverlayProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        padding: '0',
      }}
    >
      {/* Row lines */}
      {Array.from({ length: rows + 1 }).map((_, i) => {
        // Row boundaries: row 0 at y=0, subsequent rows at y = i * (rowHeight + margin)
        // Last boundary (row 12) is at total grid height (no margin after last row)
        const y = i < rows
          ? i * (rowHeight + margin)
          : rows * rowHeight + (rows - 1) * margin;
        return (
          <div
            key={`row-${i}`}
            className="absolute left-0 right-0 border-t border-dashed"
            style={{
              top: y,
              borderColor: i === 0 || i === rows ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.4)',
              borderWidth: i === 0 || i === rows ? 2 : 1,
            }}
          >
            <span
              className="absolute text-[9px] px-1 rounded"
              style={{
                left: 2,
                top: -1,
                background: i === 0 || i === rows ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.6)',
                color: 'white',
              }}
            >
              Row {i}
            </span>
          </div>
        );
      })}

      {/* Column lines */}
      {Array.from({ length: cols + 1 }).map((_, i) => {
        const colWidth = 100 / cols;
        return (
          <div
            key={`col-${i}`}
            className="absolute top-0 bottom-0 border-l border-dashed"
            style={{
              left: `${i * colWidth}%`,
              borderColor: i === 0 || i === cols ? 'rgba(239, 68, 68, 0.7)' : 'rgba(59, 130, 246, 0.2)',
              borderWidth: i === 0 || i === cols ? 2 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// GRID DEBUG INFO
// -----------------------------------------------------------------------------

interface GridDebugInfoProps {
  cols: number;
  rows: number;
  width: number;
  height: number;
  rowHeight: number;
}

function GridDebugInfo({ cols, rows, width, height, rowHeight }: GridDebugInfoProps) {
  const totalGridHeight = rows * rowHeight + (rows - 1) * MARGIN[1] + CONTAINER_PADDING[1] * 2;

  return (
    <div
      className="absolute top-1 right-1 z-50 pointer-events-none"
      style={{
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        padding: '6px 10px',
        borderRadius: 6,
        fontSize: 10,
        fontFamily: 'monospace',
        lineHeight: 1.5,
      }}
    >
      <div><strong>Grid Debug</strong></div>
      <div>Cols: <span style={{color: '#60a5fa'}}>{cols}</span> | Rows: <span style={{color: '#60a5fa'}}>{rows}</span></div>
      <div>Container: <span style={{color: '#60a5fa'}}>{width}×{height}px</span></div>
      <div>Row height: <span style={{color: '#60a5fa'}}>{rowHeight}px</span></div>
      <div>Grid total H: <span style={{color: totalGridHeight <= height ? '#4ade80' : '#f87171'}}>{totalGridHeight}px</span></div>
      <div style={{color: totalGridHeight <= height ? '#4ade80' : '#f87171', fontWeight: 'bold'}}>
        {totalGridHeight <= height ? '✓ Fits' : `✗ Overflow by ${totalGridHeight - height}px`}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HOOK: useInputHubGrid
// -----------------------------------------------------------------------------

export interface UseInputHubGridOptions {
  mode: ViewType;
}

export function useInputHubGrid({ mode }: UseInputHubGridOptions) {
  const [layout, setLayout] = useState<Layout[]>(() => getLayoutForMode(mode));
  const [enabledPanels, setEnabledPanels] = useState<PanelId[]>(() =>
    getEnabledPanelsForMode(mode)
  );

  // Update when mode changes
  useEffect(() => {
    setLayout(getLayoutForMode(mode));
    setEnabledPanels(getEnabledPanelsForMode(mode));
  }, [mode]);

  const togglePanel = useCallback((panelId: PanelId) => {
    setEnabledPanels((prev) => {
      const definition = PANEL_DEFINITIONS[panelId];
      if (definition.isRequired) return prev; // Can't toggle required panels

      if (prev.includes(panelId)) {
        return prev.filter((p) => p !== panelId);
      } else {
        return [...prev, panelId];
      }
    });
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayout = getLayoutForMode(mode);
    const defaultPanels = getEnabledPanelsForMode(mode);
    setLayout(defaultLayout);
    setEnabledPanels(defaultPanels);
    saveLayout(mode, defaultLayout);
  }, [mode]);

  return {
    layout,
    setLayout,
    enabledPanels,
    setEnabledPanels,
    togglePanel,
    resetLayout,
  };
}
