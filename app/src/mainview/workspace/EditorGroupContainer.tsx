// =============================================================================
// EDITOR GROUP CONTAINER
// =============================================================================
// Recursively renders the layout tree, handling splits and groups.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EditorGroup } from './EditorGroup';
import { useWorkspacePanesContext } from './useWorkspacePanes';
import type { LayoutNode } from './types';
import { isGroupNode, isSplitNode } from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface EditorGroupContainerProps {
  node: LayoutNode;
  path?: number[];
}

// -----------------------------------------------------------------------------
// RESIZE HANDLE
// -----------------------------------------------------------------------------

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
}

function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - startPosRef.current;
      startPosRef.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction, onResize]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'relative',
        flexShrink: 0,
        ...(isHorizontal
          ? { width: '4px', cursor: 'col-resize' }
          : { height: '4px', cursor: 'row-resize' }
        ),
        backgroundColor: isDragging ? 'var(--color-accent)' : 'transparent',
        transition: 'background-color 0.1s ease',
      }}
      className="hover:bg-[var(--color-border)]"
    >
      {/* Visual indicator */}
      <div
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '24px',
              }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '2px',
              }
          ),
          backgroundColor: 'var(--color-border)',
          borderRadius: '1px',
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function EditorGroupContainer({
  node,
  path = [],
}: EditorGroupContainerProps) {
  const { actions } = useWorkspacePanesContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container size for ratio calculations
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // If it's a group node, render the EditorGroup
  if (isGroupNode(node)) {
    return <EditorGroup groupId={node.groupId} />;
  }

  // It's a split node - render children with resize handle
  const { direction, ratio, first, second } = node;
  const isHorizontal = direction === 'horizontal';

  const handleResize = useCallback((delta: number) => {
    const totalSize = isHorizontal ? containerSize.width : containerSize.height;
    if (totalSize === 0) return;

    const deltaRatio = delta / totalSize;
    const newRatio = Math.max(0.1, Math.min(0.9, ratio + deltaRatio));
    actions.setSplitRatio(path, newRatio);
  }, [path, ratio, containerSize, isHorizontal, actions]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* First child */}
      <div
        style={{
          flex: `${ratio} 0 0`,
          minWidth: isHorizontal ? '100px' : undefined,
          minHeight: !isHorizontal ? '100px' : undefined,
          overflow: 'hidden',
        }}
      >
        <EditorGroupContainer node={first} path={[...path, 0]} />
      </div>

      {/* Resize handle */}
      <ResizeHandle direction={direction} onResize={handleResize} />

      {/* Second child */}
      <div
        style={{
          flex: `${1 - ratio} 0 0`,
          minWidth: isHorizontal ? '100px' : undefined,
          minHeight: !isHorizontal ? '100px' : undefined,
          overflow: 'hidden',
        }}
      >
        <EditorGroupContainer node={second} path={[...path, 1]} />
      </div>
    </div>
  );
}
