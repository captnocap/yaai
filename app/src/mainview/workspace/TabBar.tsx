// =============================================================================
// TAB BAR
// =============================================================================
// Horizontal tab bar for editor groups. Shows open tabs with close buttons.

import React, { useCallback } from 'react';
import { X, MessageSquare, Terminal, Image, Telescope, FileText } from 'lucide-react';
import type { PaneView, ViewType } from './types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface TabBarProps {
  tabs: PaneView[];
  activeTabId: string | null;
  isFocused: boolean;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabMiddleClick?: (tabId: string) => void;
}

// -----------------------------------------------------------------------------
// ICON MAP
// -----------------------------------------------------------------------------

const VIEW_ICONS: Record<ViewType, React.ComponentType<{ size?: number }>> = {
  chat: MessageSquare,
  code: Terminal,
  image: Image,
  research: Telescope,
  prompts: FileText,
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function TabBar({
  tabs,
  activeTabId,
  isFocused,
  onTabClick,
  onTabClose,
  onTabMiddleClick,
}: TabBarProps) {
  const handleMiddleClick = useCallback((e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      onTabMiddleClick?.(tabId);
    }
  }, [onTabMiddleClick]);

  if (tabs.length === 0) {
    return (
      <div
        style={{
          height: '36px',
          backgroundColor: 'var(--color-bg-tertiary)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '12px',
          fontSize: '12px',
          color: 'var(--color-text-tertiary)',
        }}
      >
        No open tabs
      </div>
    );
  }

  return (
    <div
      style={{
        height: '36px',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'stretch',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
      className="custom-scrollbar"
    >
      {tabs.map((tab) => {
        const Icon = VIEW_ICONS[tab.type];
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            onMouseDown={(e) => handleMiddleClick(e, tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              cursor: 'pointer',
              backgroundColor: isActive
                ? 'var(--color-bg)'
                : 'transparent',
              borderRight: '1px solid var(--color-border)',
              borderBottom: isActive
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              color: isActive
                ? 'var(--color-text)'
                : 'var(--color-text-secondary)',
              fontSize: '12px',
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.1s ease',
              minWidth: '80px',
              maxWidth: '180px',
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            <Icon size={14} style={{ flexShrink: 0, opacity: 0.7 }} />

            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {tab.title}
            </span>

            {tab.isDirty && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                  flexShrink: 0,
                }}
              />
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.1s ease',
              }}
              className="hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text)]"
              title="Close tab"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
