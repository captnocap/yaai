// =============================================================================
// ARTIFACT CARD
// =============================================================================
// Displays an artifact's metadata in a compact card format.
// Used in the artifact panel, registry browser, and chat references.

import React from 'react';
import type { ArtifactManifest, ArtifactStatus, ArtifactType } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactCardProps {
  manifest: ArtifactManifest;
  status?: ArtifactStatus;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onInvoke?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleEnabled?: (enabled: boolean) => void;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const TYPE_CONFIG: Record<ArtifactType, { icon: string; label: string; color: string }> = {
  tool: { icon: '⚡', label: 'Tool', color: 'var(--color-warning)' },
  view: { icon: '👁', label: 'View', color: 'var(--color-accent)' },
  service: { icon: '⚙', label: 'Service', color: 'var(--color-success)' },
  prompt: { icon: '💬', label: 'Prompt', color: 'var(--color-info)' },
};

const STATUS_CONFIG: Record<ArtifactStatus, { label: string; color: string; pulse?: boolean }> = {
  installing: { label: 'Installing', color: 'var(--color-warning)', pulse: true },
  installed: { label: 'Ready', color: 'var(--color-success)' },
  running: { label: 'Running', color: 'var(--color-accent)', pulse: true },
  error: { label: 'Error', color: 'var(--color-error)' },
  disabled: { label: 'Disabled', color: 'var(--color-text-tertiary)' },
};

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactCard({
  manifest,
  status = 'installed',
  selected = false,
  compact = false,
  onClick,
  onInvoke,
  onEdit,
  onDelete,
  onToggleEnabled,
}: ArtifactCardProps) {
  const typeConfig = TYPE_CONFIG[manifest.type];
  const statusConfig = STATUS_CONFIG[status];
  const isDisabled = status === 'disabled' || manifest.enabled === false;

  // Compact variant (for lists, chat references)
  if (compact) {
    return (
      <button
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          backgroundColor: selected
            ? 'var(--color-accent-subtle)'
            : 'var(--color-bg-secondary)',
          border: selected
            ? '1px solid var(--color-accent)'
            : '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '14px' }}>
          {manifest.icon || typeConfig.icon}
        </span>
        <span style={{
          flex: 1,
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {manifest.name}
        </span>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '9999px',
          backgroundColor: `color-mix(in srgb, ${typeConfig.color} 15%, transparent)`,
          color: typeConfig.color,
        }}>
          {typeConfig.label}
        </span>
      </button>
    );
  }

  // Full card variant
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: selected
          ? 'var(--color-accent-subtle)'
          : 'var(--color-bg-secondary)',
        border: selected
          ? '1px solid var(--color-accent)'
          : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        marginBottom: '8px',
      }}>
        {/* Icon */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: `color-mix(in srgb, ${typeConfig.color} 15%, transparent)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}>
          {manifest.icon || typeConfig.icon}
        </div>

        {/* Title & Type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {manifest.name}
            </h4>
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '9999px',
              backgroundColor: `color-mix(in srgb, ${typeConfig.color} 15%, transparent)`,
              color: typeConfig.color,
              flexShrink: 0,
            }}>
              {typeConfig.label}
            </span>
          </div>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
          }}>
            v{manifest.version}
          </p>
        </div>

        {/* Status indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: statusConfig.color,
            animation: statusConfig.pulse ? 'pulse 1.5s infinite' : undefined,
          }} />
          <span style={{
            fontSize: '11px',
            color: statusConfig.color,
          }}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 10px 0',
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {manifest.description}
      </p>

      {/* Tags */}
      {manifest.tags && manifest.tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '10px',
        }}>
          {manifest.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {tag}
            </span>
          ))}
          {manifest.tags.length > 4 && (
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              color: 'var(--color-text-tertiary)',
            }}>
              +{manifest.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Dependencies indicators */}
      {(manifest.apis?.length || manifest.artifacts?.length) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '10px',
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
        }}>
          {manifest.apis?.length && (
            <span>🔑 {manifest.apis.length} API{manifest.apis.length > 1 ? 's' : ''}</span>
          )}
          {manifest.artifacts?.length && (
            <span>🔗 {manifest.artifacts.length} dep{manifest.artifacts.length > 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid var(--color-border)',
      }}>
        {/* Meta info */}
        <span style={{
          fontSize: '11px',
          color: 'var(--color-text-tertiary)',
        }}>
          Updated {formatRelativeTime(manifest.updatedAt)}
        </span>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '4px',
        }}>
          {onToggleEnabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(!isDisabled);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {isDisabled ? 'Enable' : 'Disable'}
            </button>
          )}
          {onInvoke && status === 'installed' && !isDisabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInvoke();
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Run
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
