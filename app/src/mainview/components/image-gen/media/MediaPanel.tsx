// =============================================================================
// MEDIA PANEL
// =============================================================================
// Displays generated images in a gallery grid with filters.

import React from 'react';
import { RefreshCw, Filter, SortAsc, SortDesc, Image, Calendar } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import { OutputGallery } from './OutputGallery';
import type { GeneratedImage, GalleryFilters } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface MediaPanelProps {
  images: GeneratedImage[];
  filters: GalleryFilters;
  loading: boolean;
  onFiltersChange: (filters: GalleryFilters) => void;
  onImageClick: (image: GeneratedImage) => void;
  onRefresh: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function MediaPanel({
  images,
  filters,
  loading,
  onFiltersChange,
  onImageClick,
  onRefresh,
}: MediaPanelProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const handleSortChange = () => {
    const nextSort = filters.sortBy === 'newest' ? 'oldest' : 'newest';
    onFiltersChange({ ...filters, sortBy: nextSort });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}
        >
          {images.length} images
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <IconButton
            icon={filters.sortBy === 'newest' ? <SortDesc size={14} /> : <SortAsc size={14} />}
            tooltip={`Sort: ${filters.sortBy}`}
            size="sm"
            onClick={handleSortChange}
          />

          <IconButton
            icon={<Filter size={14} />}
            tooltip="Filters"
            size="sm"
            active={showFilters}
            onClick={() => setShowFilters(!showFilters)}
          />

          <IconButton
            icon={<RefreshCw size={14} />}
            tooltip="Refresh"
            size="sm"
            loading={loading}
            onClick={onRefresh}
          />
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div
          style={{
            padding: '12px',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <FilterButton
              active={!filters.model}
              label="All Models"
              onClick={() => onFiltersChange({ ...filters, model: undefined })}
            />
            {/* Model filter buttons would be populated from available models */}
          </div>

          {filters.model && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
              }}
            >
              Filtering by: {filters.model}
            </div>
          )}
        </div>
      )}

      {/* Gallery */}
      <OutputGallery
        images={images}
        loading={loading}
        onImageClick={onImageClick}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// FILTER BUTTON
// -----------------------------------------------------------------------------

interface FilterButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function FilterButton({ active, label, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        backgroundColor: active ? 'var(--color-accent-subtle)' : 'var(--color-bg-tertiary)',
        border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        fontSize: '11px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}
