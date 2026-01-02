// =============================================================================
// OUTPUT GALLERY
// =============================================================================
// Grid display of generated images.

import React from 'react';
import { Image, Download, Trash2, ExternalLink } from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import type { GeneratedImage } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface OutputGalleryProps {
  images: GeneratedImage[];
  loading: boolean;
  onImageClick: (image: GeneratedImage) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function OutputGallery({
  images,
  loading,
  onImageClick,
}: OutputGalleryProps) {
  if (loading && images.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Loading...
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <Image size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <span style={{ fontSize: '13px' }}>No images yet</span>
        <span style={{ fontSize: '11px', marginTop: '4px' }}>
          Generated images will appear here
        </span>
      </div>
    );
  }

  return (
    <div
      className="custom-scrollbar"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        }}
      >
        {images.map((image) => (
          <OutputCard
            key={image.id}
            image={image}
            onClick={() => onImageClick(image)}
          />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// OUTPUT CARD
// -----------------------------------------------------------------------------

interface OutputCardProps {
  image: GeneratedImage;
  onClick: () => void;
}

function OutputCard({ image, onClick }: OutputCardProps) {
  const [showOverlay, setShowOverlay] = React.useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      style={{
        position: 'relative',
        aspectRatio: '1',
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <img
        src={`file://${image.path}`}
        alt={image.prompt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        loading="lazy"
      />

      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '8px',
          opacity: showOverlay ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'white',
              fontSize: '10px',
            }}
          >
            {image.model}
          </span>
        </div>

        {/* Bottom row */}
        <div>
          <div
            style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '4px',
            }}
          >
            {formatDate(image.createdAt)}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {image.prompt}
          </div>
        </div>
      </div>
    </div>
  );
}
