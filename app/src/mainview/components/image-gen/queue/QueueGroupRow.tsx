// =============================================================================
// QUEUE GROUP ROW
// =============================================================================
// A collapsible group header in the queue table.

import React from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  CheckSquare,
} from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import type { QueueGroup } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface QueueGroupRowProps {
  group: QueueGroup;
  entryCount: number;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddEntry: () => void;
  onSelectAll: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function QueueGroupRow({
  group,
  entryCount,
  onToggle,
  onRename,
  onDelete,
  onAddEntry,
  onSelectAll,
}: QueueGroupRowProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={onToggle}
    >
      {/* Collapse icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          marginRight: '8px',
          color: 'var(--color-text-tertiary)',
        }}
      >
        {group.collapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronDown size={16} />
        )}
      </span>

      {/* Folder icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '8px',
          color: 'var(--color-accent)',
        }}
      >
        {group.collapsed ? (
          <Folder size={16} />
        ) : (
          <FolderOpen size={16} />
        )}
      </span>

      {/* Name */}
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text)',
        }}
      >
        {group.name}
      </span>

      {/* Entry count */}
      <span
        style={{
          padding: '2px 8px',
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: '9999px',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          marginRight: '8px',
        }}
      >
        {entryCount}
      </span>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          icon={<Plus size={14} />}
          tooltip="Add entry"
          size="sm"
          onClick={onAddEntry}
        />

        <div style={{ position: 'relative' }}>
          <IconButton
            icon={<MoreHorizontal size={14} />}
            tooltip="More options"
            size="sm"
            onClick={handleMenuClick}
          />

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10,
                }}
                onClick={() => setShowMenu(false)}
              />

              {/* Menu */}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  padding: '4px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 11,
                  minWidth: '140px',
                }}
              >
                <MenuItem
                  icon={<CheckSquare size={14} />}
                  label="Select all"
                  onClick={() => {
                    onSelectAll();
                    setShowMenu(false);
                  }}
                />
                <MenuItem
                  icon={<Pencil size={14} />}
                  label="Rename"
                  onClick={() => {
                    onRename();
                    setShowMenu(false);
                  }}
                />
                <MenuItem
                  icon={<Trash2 size={14} />}
                  label="Delete"
                  danger
                  onClick={() => {
                    if (confirm(`Delete group "${group.name}" and all its entries?`)) {
                      onDelete();
                    }
                    setShowMenu(false);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MENU ITEM
// -----------------------------------------------------------------------------

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

function MenuItem({ icon, label, danger, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: danger ? 'var(--color-error)' : 'var(--color-text)',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon}
      {label}
    </button>
  );
}
