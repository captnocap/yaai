// =============================================================================
// PROJECT CONTEXT MENU
// =============================================================================
// Right-click context menu for project actions.

import React, { useEffect, useRef } from 'react';
import { Pin, PinOff, Archive, Trash2, Edit2, ArchiveRestore } from 'lucide-react';

export type ProjectAction = 'pin' | 'unpin' | 'archive' | 'unarchive' | 'delete' | 'rename';

interface ProjectContextMenuProps {
  x: number;
  y: number;
  isPinned: boolean;
  isArchived: boolean;
  onAction: (action: ProjectAction) => void;
  onClose: () => void;
}

const MENU_ITEMS: Array<{
  action: ProjectAction;
  label: string;
  icon: React.FC<{ size: number }>;
  showWhen: (props: { isPinned: boolean; isArchived: boolean }) => boolean;
  danger?: boolean;
}> = [
  {
    action: 'pin',
    label: 'Pin to Top',
    icon: Pin,
    showWhen: ({ isPinned }) => !isPinned,
  },
  {
    action: 'unpin',
    label: 'Unpin',
    icon: PinOff,
    showWhen: ({ isPinned }) => isPinned,
  },
  {
    action: 'rename',
    label: 'Rename',
    icon: Edit2,
    showWhen: () => true,
  },
  {
    action: 'archive',
    label: 'Archive',
    icon: Archive,
    showWhen: ({ isArchived }) => !isArchived,
  },
  {
    action: 'unarchive',
    label: 'Unarchive',
    icon: ArchiveRestore,
    showWhen: ({ isArchived }) => isArchived,
  },
  {
    action: 'delete',
    label: 'Delete',
    icon: Trash2,
    showWhen: () => true,
    danger: true,
  },
];

export function ProjectContextMenu({
  x,
  y,
  isPinned,
  isArchived,
  onAction,
  onClose,
}: ProjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedStyle = {
    position: 'fixed' as const,
    left: `${Math.min(x, window.innerWidth - 180)}px`,
    top: `${Math.min(y, window.innerHeight - 200)}px`,
  };

  const visibleItems = MENU_ITEMS.filter((item) =>
    item.showWhen({ isPinned, isArchived })
  );

  return (
    <div
      ref={menuRef}
      style={{
        ...adjustedStyle,
        minWidth: '160px',
        padding: '4px',
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
      }}
    >
      {visibleItems.map((item, index) => {
        const Icon = item.icon;
        const showDivider = item.danger && index > 0;

        return (
          <React.Fragment key={item.action}>
            {showDivider && (
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--color-border)',
                  margin: '4px 0',
                }}
              />
            )}
            <button
              onClick={() => {
                onAction(item.action);
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: item.danger ? 'var(--color-error)' : 'var(--color-text)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.1s ease',
              }}
              className="hover:bg-[var(--color-bg-tertiary)]"
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
