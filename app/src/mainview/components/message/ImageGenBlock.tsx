// =============================================================================
// IMAGE GEN BLOCK
// =============================================================================
// Displays image generation results inline in chat messages.

import React, { useState, useCallback } from 'react';
import { Image, Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { IconButton } from '../atoms/IconButton';
import type { ImageGenContentBlock, QuickGenerateResult } from '../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageGenBlockProps {
  block: ImageGenContentBlock;
  onRegenerate?: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ImageGenBlock({ block, onRegenerate }: ImageGenBlockProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { status, prompt, model, result, error } = block;

  // ---------------------------------------------------------------------------
  // RENDER - PENDING
  // ---------------------------------------------------------------------------

  if (status === 'pending') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Image size={20} style={{ color: 'var(--color-text-tertiary)' }} />
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text)',
              marginBottom: '4px',
            }}
          >
            Preparing image generation...
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}
          >
            {model}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - GENERATING
  // ---------------------------------------------------------------------------

  if (status === 'generating') {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-lg)',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <Loader2
            size={20}
            style={{
              color: 'var(--color-accent)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-accent)',
            }}
          >
            Generating image...
          </span>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ marginBottom: '4px' }}>
            <strong>Model:</strong> {model}
          </div>
          <div>
            <strong>Prompt:</strong> {prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}
          </div>
        </div>

        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - FAILED
  // ---------------------------------------------------------------------------

  if (status === 'failed') {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-error-subtle)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-lg)',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <AlertCircle size={18} style={{ color: 'var(--color-error)' }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-error)',
            }}
          >
            Image generation failed
          </span>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginBottom: '12px',
          }}
        >
          {error || 'An unknown error occurred'}
        </div>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER - COMPLETED
  // ---------------------------------------------------------------------------

  if (status === 'completed' && result) {
    const images = result.images;

    return (
      <div
        style={{
          marginTop: '8px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Image size={16} style={{ color: 'var(--color-accent)' }} />
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
            >
              Generated {images.length} image{images.length > 1 ? 's' : ''} with {model}
            </span>
          </div>

          {onRegenerate && (
            <IconButton
              icon={<RefreshCw size={14} />}
              tooltip="Regenerate"
              size="sm"
              onClick={onRegenerate}
            />
          )}
        </div>

        {/* Image grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              onClick={() => setLightboxIndex(index)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <img
                src={`file://${image.path}`}
                alt={prompt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>

        {/* Prompt preview */}
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {prompt.length > 150 ? prompt.slice(0, 150) + '...' : prompt}
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              cursor: 'pointer',
            }}
          >
            <img
              src={`file://${images[lightboxIndex].path}`}
              alt={prompt}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation */}
            {images.length > 1 && (
              <>
                {lightboxIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(lightboxIndex - 1);
                    }}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    &lt;
                  </button>
                )}

                {lightboxIndex < images.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(lightboxIndex + 1);
                    }}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    &gt;
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}
