// =============================================================================
// INPUT HUB PANEL
// =============================================================================
// Generic panel wrapper with consistent header, controls, and styling.
// All grid panels are wrapped in this component.

import React, { forwardRef } from 'react';
import { cn } from '../../lib';
import { GripVertical, Settings, X, Minus } from 'lucide-react';
import type { PanelId } from './grid-config';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface InputHubPanelProps {
  panelId: PanelId;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Hide the header completely */
  hideHeader?: boolean;
  /** Compact header (smaller, less prominent) */
  compactHeader?: boolean;
  /** Show settings button */
  showSettings?: boolean;
  /** Show minimize button */
  showMinimize?: boolean;
  /** Show close button */
  showClose?: boolean;
  /** Called when settings clicked */
  onSettings?: () => void;
  /** Called when minimize clicked */
  onMinimize?: () => void;
  /** Called when close clicked */
  onClose?: () => void;
  /** Called on right-click (for customize menu) */
  onContextMenu?: (e: React.MouseEvent) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export const InputHubPanel = forwardRef<HTMLDivElement, InputHubPanelProps>(
  function InputHubPanel(
    {
      panelId,
      title,
      icon,
      children,
      className,
      hideHeader = false,
      compactHeader = false,
      showSettings = false,
      showMinimize = false,
      showClose = false,
      onSettings,
      onMinimize,
      onClose,
      onContextMenu,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          'input-hub-panel',
          'h-full flex flex-col',
          'bg-[var(--panel-bg,var(--color-bg-elevated))]',
          'border border-[var(--panel-border,var(--color-border))]',
          'rounded-[var(--panel-radius,8px)]',
          'overflow-hidden',
          'transition-shadow duration-150',
          'hover:shadow-lg hover:shadow-black/20',
          className
        )}
        style={{
          opacity: 'var(--panel-opacity, 1)',
        }}
        data-panel-id={panelId}
        onContextMenu={onContextMenu}
      >
        {/* Header */}
        {!hideHeader && (
          <div
            className={cn(
              'panel-header',
              'flex items-center justify-between',
              'border-b border-[var(--panel-border,var(--color-border))]',
              'bg-[var(--color-bg-tertiary)]',
              'select-none',
              compactHeader ? 'h-5 px-1.5' : 'h-6 px-2',
              // Drag handle - the header is draggable
              'cursor-grab active:cursor-grabbing'
            )}
          >
            {/* Left: Drag handle + title */}
            <div className="flex items-center gap-1.5 min-w-0">
              <GripVertical
                size={compactHeader ? 10 : 12}
                className="text-[var(--color-text-tertiary)] shrink-0"
              />
              {icon && (
                <span className="text-[var(--panel-accent,var(--color-accent))] shrink-0">
                  {icon}
                </span>
              )}
              <span
                className={cn(
                  'panel-title',
                  'font-medium uppercase tracking-wider truncate',
                  'text-[var(--panel-text-color,var(--color-text-secondary))]',
                  compactHeader ? 'text-[9px]' : 'text-[10px]'
                )}
              >
                {title}
              </span>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-0.5 shrink-0">
              {showSettings && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettings?.();
                  }}
                  className={cn(
                    'p-0.5 rounded hover:bg-[var(--color-bg-secondary)]',
                    'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
                    'transition-colors'
                  )}
                  title="Panel settings"
                >
                  <Settings size={compactHeader ? 10 : 12} />
                </button>
              )}
              {showMinimize && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMinimize?.();
                  }}
                  className={cn(
                    'p-0.5 rounded hover:bg-[var(--color-bg-secondary)]',
                    'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]',
                    'transition-colors'
                  )}
                  title="Minimize"
                >
                  <Minus size={compactHeader ? 10 : 12} />
                </button>
              )}
              {showClose && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                  }}
                  className={cn(
                    'p-0.5 rounded hover:bg-red-500/20',
                    'text-[var(--color-text-tertiary)] hover:text-red-400',
                    'transition-colors'
                  )}
                  title="Close panel"
                >
                  <X size={compactHeader ? 10 : 12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'panel-content',
            'flex-1 min-h-0 overflow-auto',
            'text-[var(--panel-text-color,var(--color-text))]',
            'font-[var(--panel-font-family,inherit)]'
          )}
          style={{
            fontSize: 'var(--panel-font-size, 13px)',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

// -----------------------------------------------------------------------------
// MINIMAL PANEL (no header, just content)
// -----------------------------------------------------------------------------

export interface MinimalPanelProps {
  panelId: PanelId;
  children: React.ReactNode;
  className?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const MinimalPanel = forwardRef<HTMLDivElement, MinimalPanelProps>(
  function MinimalPanel({ panelId, children, className, onContextMenu }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'input-hub-panel minimal',
          'h-full',
          'bg-[var(--panel-bg,var(--color-bg-elevated))]',
          'border border-[var(--panel-border,var(--color-border))]',
          'rounded-[var(--panel-radius,8px)]',
          'overflow-hidden',
          className
        )}
        data-panel-id={panelId}
        onContextMenu={onContextMenu}
      >
        {children}
      </div>
    );
  }
);
