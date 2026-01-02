// =============================================================================
// QUEUE ENTRY ROW
// =============================================================================
// A single entry row in the queue table.

import React from 'react';
import {
  Image,
  Copy,
  Trash2,
  MoreHorizontal,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import type { QueueEntry } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface QueueEntryRowProps {
  entry: QueueEntry;
  selected: boolean;
  checked: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onCheck: (checked: boolean) => void;
  onEnable: () => void;
  onDisable: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function QueueEntryRow({
  entry,
  selected,
  checked,
  onClick,
  onDoubleClick,
  onCheck,
  onEnable,
  onDisable,
  onDuplicate,
  onDelete,
}: QueueEntryRowProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  // Get prompt preview
  const promptPreview = entry.prompt.type === 'inline'
    ? (entry.prompt.value as string).slice(0, 60) + ((entry.prompt.value as string).length > 60 ? '...' : '')
    : entry.prompt.type === 'library'
      ? `@${entry.prompt.value}`
      : `{${(entry.prompt.value as string[]).join('|')}}`;

  // Get mode label
  const modeLabel = entry.executionMode === 'target'
    ? `Target: ${entry.targetImages}`
    : `${entry.batchCount} batches`;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px 10px 48px',
        backgroundColor: selected
          ? 'var(--color-accent-subtle)'
          : 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        opacity: entry.enabled ? 1 : 0.5,
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg)';
        }
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          e.stopPropagation();
          onCheck(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          marginRight: '12px',
          accentColor: 'var(--color-accent)',
        }}
      />

      {/* Icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          marginRight: '12px',
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Image size={14} />
      </span>

      {/* Prompt preview */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {promptPreview}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '2px',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <span>{entry.model}</span>
          <span>|</span>
          <span>{modeLabel}</span>
          <span>|</span>
          <span>{entry.imagesPerBatch}/batch</span>
          {entry.references.length > 0 && (
            <>
              <span>|</span>
              <span>{entry.references.length} refs</span>
            </>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginLeft: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enable/Disable toggle */}
        <IconButton
          icon={entry.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          tooltip={entry.enabled ? 'Disable' : 'Enable'}
          size="sm"
          onClick={() => entry.enabled ? onDisable() : onEnable()}
        />

        {/* More menu */}
        <div style={{ position: 'relative' }}>
          <IconButton
            icon={<MoreHorizontal size={14} />}
            tooltip="More options"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
          />

          {showMenu && (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10,
                }}
                onClick={() => setShowMenu(false)}
              />

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
                  minWidth: '120px',
                }}
              >
                <button
                  onClick={() => {
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this entry?')) {
                      onDelete();
                    }
                    setShowMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-error)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
