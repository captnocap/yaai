// =============================================================================
// GRID CHAIN
// =============================================================================
// Array of 300×300px grids chained horizontally.
// Each grid is 12×12 with 25px cells (square).
// Components can move between grids via drag detection.

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import GridLayout from 'react-grid-layout';
import { cn } from '../../lib';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Suppress type issues
const RGL = GridLayout as any;

// Track dragging state globally
let dragState: {
  itemId: string | null;
  startGridIndex: number;
  startX: number;
  startY: number;
} = {
  itemId: null,
  startGridIndex: -1,
  startX: 0,
  startY: 0,
};

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const GRID_SIZE = 300; // Each grid is 300×300px
const CELLS_PER_GRID = 12; // 12×12 grid
const CELL_SIZE = GRID_SIZE / CELLS_PER_GRID; // 25px per cell
const MARGIN: [number, number] = [0, 0]; // No margin for seamless look

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/** Clamp a single item to fit within grid bounds */
function clampItem(item: { x: number; y: number; w: number; h: number }) {
  let { x, y, w, h } = item;

  // Clamp width and height first
  w = Math.max(1, Math.min(w, CELLS_PER_GRID));
  h = Math.max(1, Math.min(h, CELLS_PER_GRID));

  // Clamp x so item doesn't extend past right edge
  x = Math.max(0, Math.min(x, CELLS_PER_GRID - w));

  // Clamp y so item doesn't extend past bottom edge
  y = Math.max(0, Math.min(y, CELLS_PER_GRID - h));

  return { x, y, w, h };
}

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface GridItem {
  id: string;
  gridIndex: number; // Which grid this item is in
  x: number; // X position within that grid (0-11)
  y: number; // Y position within that grid (0-11)
  w: number; // Width in cells
  h: number; // Height in cells
}

export interface GridChainProps {
  /** Container width - determines number of grids */
  width: number;
  /** Items to render */
  items: GridItem[];
  /** Render function for each item */
  renderItem: (item: GridItem) => React.ReactNode;
  /** Called when items change (drag/resize) */
  onItemsChange?: (items: GridItem[]) => void;
  /** Show debug grid lines */
  debug?: boolean;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function GridChain({
  width,
  items,
  renderItem,
  onItemsChange,
  debug = true,
  className,
}: GridChainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverGridIndex, setDragOverGridIndex] = useState<number | null>(null);

  // Calculate number of grids needed
  const gridCount = Math.max(1, Math.floor(width / GRID_SIZE));

  // Group items by grid index, clamping positions
  const itemsByGrid = useMemo(() => {
    const grouped: Map<number, GridItem[]> = new Map();
    for (let i = 0; i < gridCount; i++) {
      grouped.set(i, []);
    }
    items.forEach(item => {
      // Clamp grid index to valid range
      const clampedIndex = Math.max(0, Math.min(item.gridIndex, gridCount - 1));
      const gridItems = grouped.get(clampedIndex);
      if (gridItems) {
        // Also clamp x, y, w, h to grid bounds
        const clamped = clampItem(item);
        gridItems.push({
          ...item,
          ...clamped,
          gridIndex: clampedIndex,
        });
      }
    });
    return grouped;
  }, [items, gridCount]);

  // Handle layout change for a specific grid
  const handleLayoutChange = useCallback((gridIndex: number, newLayout: any[]) => {
    if (!onItemsChange) return;

    const updatedItems = items.map(item => {
      if (item.gridIndex !== gridIndex) return item;

      const layoutItem = newLayout.find(l => l.i === item.id);
      if (!layoutItem) return item;

      // CLAMP: Ensure item stays within 12×12 bounds
      const clamped = clampItem({
        x: layoutItem.x,
        y: layoutItem.y,
        w: layoutItem.w,
        h: layoutItem.h,
      });

      return {
        ...item,
        ...clamped,
      };
    });

    onItemsChange(updatedItems);
  }, [items, onItemsChange]);

  // Calculate centering offset (needed for drag calculations and rendering)
  const totalGridWidth = gridCount * GRID_SIZE;
  const leftoverSpace = width - totalGridWidth;
  const centerOffset = Math.max(0, leftoverSpace / 2);

  // Handle drag start
  const handleDragStart = useCallback((gridIndex: number, itemId: string) => {
    dragState = {
      itemId,
      startGridIndex: gridIndex,
      startX: 0,
      startY: 0,
    };
  }, []);

  // Handle drag stop - check if item should move to different grid
  const handleDragStop = useCallback((
    gridIndex: number,
    layout: any[],
    oldItem: any,
    newItem: any,
    placeholder: any,
    e: MouseEvent
  ) => {
    if (!onItemsChange || !containerRef.current) return;

    // Get mouse position relative to container, accounting for centering
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left - centerOffset;

    // Calculate which grid the mouse is over
    const targetGridIndex = Math.floor(mouseX / GRID_SIZE);
    const clampedTargetIndex = Math.max(0, Math.min(targetGridIndex, gridCount - 1));

    // If dropped on a different grid, move the item
    if (clampedTargetIndex !== gridIndex) {
      // Calculate new x position within target grid
      const xInTargetGrid = Math.floor((mouseX - clampedTargetIndex * GRID_SIZE) / CELL_SIZE);

      // CLAMP: Ensure item stays within 12×12 bounds
      const clamped = clampItem({
        x: xInTargetGrid,
        y: newItem.y,
        w: newItem.w,
        h: newItem.h,
      });

      const updatedItems = items.map(item => {
        if (item.id !== newItem.i) return item;

        return {
          ...item,
          gridIndex: clampedTargetIndex,
          ...clamped,
        };
      });

      onItemsChange(updatedItems);
    } else {
      // Normal update within same grid
      handleLayoutChange(gridIndex, layout);
    }

    setDragOverGridIndex(null);
    dragState.itemId = null;
  }, [items, onItemsChange, gridCount, handleLayoutChange]);

  // Track mouse during drag to show which grid we're over
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.itemId || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left - centerOffset;
      const targetGridIndex = Math.floor(mouseX / GRID_SIZE);
      const clampedIndex = Math.max(0, Math.min(targetGridIndex, gridCount - 1));

      setDragOverGridIndex(clampedIndex);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gridCount, centerOffset]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'grid-chain',
        'flex',
        'overflow-hidden',
        'relative',
        className
      )}
      style={{ height: GRID_SIZE }}
    >
      {/* Centering wrapper */}
      <div
        className="flex"
        style={{ marginLeft: centerOffset }}
      >
        {Array.from({ length: gridCount }).map((_, gridIndex) => (
          <SingleGrid
            key={gridIndex}
            gridIndex={gridIndex}
            items={itemsByGrid.get(gridIndex) || []}
            renderItem={renderItem}
            onLayoutChange={(layout) => handleLayoutChange(gridIndex, layout)}
            onDragStart={(itemId) => handleDragStart(gridIndex, itemId)}
            onDragStop={(layout, oldItem, newItem, placeholder, e) =>
              handleDragStop(gridIndex, layout, oldItem, newItem, placeholder, e)
            }
            debug={debug}
            isDropTarget={dragOverGridIndex === gridIndex && dragState.startGridIndex !== gridIndex}
          />
        ))}
      </div>

      {/* Debug info */}
      {debug && (
        <div
          className="absolute top-1 right-1 z-50 pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.9)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
          <div><strong>Grid Chain</strong></div>
          <div>Container: {width}px</div>
          <div>Grids: {gridCount} × {GRID_SIZE}px = {totalGridWidth}px</div>
          <div>Center offset: {Math.round(centerOffset)}px</div>
          <div>Cells: {CELLS_PER_GRID}×{CELLS_PER_GRID} @ {CELL_SIZE}px</div>
          {dragState.itemId && (
            <div style={{ color: '#4ade80' }}>Dragging: {dragState.itemId}</div>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SINGLE GRID (300×300px, 12×12 cells)
// -----------------------------------------------------------------------------

interface SingleGridProps {
  gridIndex: number;
  items: GridItem[];
  renderItem: (item: GridItem) => React.ReactNode;
  onLayoutChange: (layout: any[]) => void;
  onDragStart: (itemId: string) => void;
  onDragStop: (layout: any[], oldItem: any, newItem: any, placeholder: any, e: MouseEvent) => void;
  debug: boolean;
  isDropTarget: boolean;
}

function SingleGrid({
  gridIndex,
  items,
  renderItem,
  onLayoutChange,
  onDragStart,
  onDragStop,
  debug,
  isDropTarget,
}: SingleGridProps) {
  // Build layout with clamping and constraints
  const layout = items.map(item => {
    const clamped = clampItem(item);
    return {
      i: item.id,
      x: clamped.x,
      y: clamped.y,
      w: clamped.w,
      h: clamped.h,
      // Constraints to prevent items from growing beyond bounds
      maxW: CELLS_PER_GRID,
      maxH: CELLS_PER_GRID,
      minW: 1,
      minH: 1,
    };
  });

  const handleDragStart = useCallback((
    layout: any[],
    oldItem: any,
    newItem: any,
    placeholder: any,
    e: MouseEvent,
    element: HTMLElement
  ) => {
    onDragStart(oldItem.i);
  }, [onDragStart]);

  const handleDragStop = useCallback((
    layout: any[],
    oldItem: any,
    newItem: any,
    placeholder: any,
    e: MouseEvent,
    element: HTMLElement
  ) => {
    onDragStop(layout, oldItem, newItem, placeholder, e);
  }, [onDragStop]);

  // Handle resize stop - clamp to bounds
  const handleResizeStop = useCallback((
    layout: any[],
    oldItem: any,
    newItem: any,
    placeholder: any,
    e: MouseEvent,
    element: HTMLElement
  ) => {
    // The clamped layout will be processed in onLayoutChange
    onLayoutChange(layout);
  }, [onLayoutChange]);

  return (
    <div
      className={cn(
        'single-grid relative',
        isDropTarget && 'ring-2 ring-green-500 ring-inset'
      )}
      style={{
        width: GRID_SIZE,
        height: GRID_SIZE,
        flexShrink: 0,
        overflow: 'hidden', // Clip anything that escapes bounds
        transition: 'box-shadow 0.15s ease',
      }}
    >
      {/* Drop target highlight */}
      {isDropTarget && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ background: 'rgba(74, 222, 128, 0.1)' }}
        />
      )}

      {/* Debug grid lines */}
      {debug && <GridLines />}

      <RGL
        className="layout"
        layout={layout}
        cols={CELLS_PER_GRID}
        rowHeight={CELL_SIZE}
        width={GRID_SIZE}
        maxRows={CELLS_PER_GRID}
        margin={MARGIN}
        containerPadding={[0, 0]}
        onLayoutChange={onLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        isDraggable
        isResizable
        isBounded={true}
        draggableHandle=".panel-drag-handle"
        resizeHandles={['se', 'e', 's']}
        compactType={null}
        preventCollision={true}
        useCSSTransforms
      >
        {items.map(item => (
          <div key={item.id} className="grid-item">
            {renderItem(item)}
          </div>
        ))}
      </RGL>

      {/* Grid index label */}
      {debug && (
        <div
          className="absolute bottom-1 left-1 text-[10px] font-mono px-1 rounded z-30"
          style={{ background: 'rgba(59,130,246,0.8)', color: 'white' }}
        >
          Grid {gridIndex}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// GRID LINES (debug overlay)
// -----------------------------------------------------------------------------

function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Vertical lines */}
      {Array.from({ length: CELLS_PER_GRID + 1 }).map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0"
          style={{
            left: i === CELLS_PER_GRID ? GRID_SIZE - 1 : i * CELL_SIZE,
            width: i === 0 || i === CELLS_PER_GRID ? 2 : 1,
            background: i === 0 || i === CELLS_PER_GRID
              ? 'rgba(239, 68, 68, 0.8)'
              : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
      {/* Horizontal lines */}
      {Array.from({ length: CELLS_PER_GRID + 1 }).map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0"
          style={{
            top: i === CELLS_PER_GRID ? GRID_SIZE - 2 : i * CELL_SIZE,
            height: i === 0 || i === CELLS_PER_GRID ? 2 : 1,
            background: i === 0 || i === CELLS_PER_GRID
              ? 'rgba(239, 68, 68, 0.8)'
              : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------

export { GRID_SIZE, CELLS_PER_GRID, CELL_SIZE };
