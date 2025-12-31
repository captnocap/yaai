// =============================================================================
// ARTIFACT LIST
// =============================================================================
// Displays a filterable, searchable list of artifacts.
// Used in the artifact panel sidebar and registry browser.

import React, { useState, useMemo } from 'react';
import { ArtifactCard } from './ArtifactCard';
import type { ArtifactManifest, ArtifactStatus, ArtifactType } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactWithStatus {
  manifest: ArtifactManifest;
  status: ArtifactStatus;
}

export interface ArtifactListProps {
  artifacts: ArtifactWithStatus[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  onInvoke?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactList({
  artifacts,
  selectedId,
  onSelect,
  onInvoke,
  onEdit,
  onDelete,
  onToggleEnabled,
  showSearch = true,
  showFilters = true,
  compact = false,
  emptyMessage = 'No artifacts found',
}: ArtifactListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ArtifactType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ArtifactStatus | 'all'>('all');

  // Filter artifacts
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(({ manifest, status }) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = manifest.name.toLowerCase().includes(searchLower);
        const matchesDescription = manifest.description.toLowerCase().includes(searchLower);
        const matchesTags = manifest.tags?.some(t => t.toLowerCase().includes(searchLower));
        if (!matchesName && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && manifest.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [artifacts, search, typeFilter, statusFilter]);

  // Count by type for filter badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: artifacts.length };
    artifacts.forEach(({ manifest }) => {
      counts[manifest.type] = (counts[manifest.type] || 0) + 1;
    });
    return counts;
  }, [artifacts]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Search */}
      {showSearch && (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--color-border)' }}>
          <input
            type="text"
            placeholder="Search artifacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          {/* Type filters */}
          {(['all', 'tool', 'view', 'service', 'prompt'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                backgroundColor: typeFilter === type
                  ? 'var(--color-accent)'
                  : 'var(--color-bg-tertiary)',
                border: 'none',
                borderRadius: '9999px',
                color: typeFilter === type
                  ? 'white'
                  : 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {typeCounts[type] > 0 && (
                <span style={{
                  fontSize: '10px',
                  opacity: 0.7,
                }}>
                  {typeCounts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px',
      }}>
        {filteredArtifacts.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: '13px',
          }}>
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No matching artifacts'
              : emptyMessage}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? '4px' : '8px',
          }}>
            {filteredArtifacts.map(({ manifest, status }) => (
              <ArtifactCard
                key={manifest.id}
                manifest={manifest}
                status={status}
                selected={manifest.id === selectedId}
                compact={compact}
                onClick={onSelect ? () => onSelect(manifest.id) : undefined}
                onInvoke={onInvoke ? () => onInvoke(manifest.id) : undefined}
                onEdit={onEdit ? () => onEdit(manifest.id) : undefined}
                onDelete={onDelete ? () => onDelete(manifest.id) : undefined}
                onToggleEnabled={
                  onToggleEnabled
                    ? (enabled) => onToggleEnabled(manifest.id, enabled)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--color-border)',
        fontSize: '11px',
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
      }}>
        {filteredArtifacts.length} of {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
