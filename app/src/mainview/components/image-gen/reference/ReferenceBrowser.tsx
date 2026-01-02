// =============================================================================
// REFERENCE BROWSER
// =============================================================================
// Folder-based browser for selecting reference images.

import React, { useCallback } from 'react';
import {
  Folder,
  FolderOpen,
  Image,
  ChevronLeft,
  RefreshCw,
  Home,
  Tag,
} from 'lucide-react';
import { IconButton } from '../../atoms/IconButton';
import type { FolderNode, FolderContents, ImageNode } from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ReferenceBrowserProps {
  roots: FolderNode[];
  currentPath: string | null;
  contents: FolderContents | null;
  loading: boolean;
  onNavigate: (path: string) => Promise<void>;
  onGoUp: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectImage?: (image: ImageNode) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ReferenceBrowser({
  roots,
  currentPath,
  contents,
  loading,
  onNavigate,
  onGoUp,
  onRefresh,
  onSelectImage,
}: ReferenceBrowserProps) {
  // Show roots if no path selected
  const showingRoots = !currentPath;

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {!showingRoots && (
            <IconButton
              icon={<ChevronLeft size={16} />}
              tooltip="Go back"
              size="sm"
              onClick={onGoUp}
            />
          )}

          <IconButton
            icon={<Home size={16} />}
            tooltip="Go to root"
            size="sm"
            onClick={() => onNavigate('')}
            disabled={showingRoots}
          />
        </div>

        <span
          style={{
            flex: 1,
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
            padding: '0 8px',
          }}
        >
          {showingRoots ? 'Reference Folders' : currentPath?.split('/').pop()}
        </span>

        <IconButton
          icon={<RefreshCw size={14} />}
          tooltip="Refresh"
          size="sm"
          loading={loading}
          onClick={onRefresh}
        />
      </div>

      {/* Content */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {loading && !contents && !roots.length ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Loading...
          </div>
        ) : showingRoots ? (
          // Show root folders
          <div>
            {roots.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '12px',
                }}
              >
                No reference folders configured
              </div>
            ) : (
              roots.map((folder) => (
                <FolderItem
                  key={folder.path}
                  folder={folder}
                  onClick={() => onNavigate(folder.path)}
                />
              ))
            )}
          </div>
        ) : contents ? (
          // Show folder contents
          <div>
            {/* Subfolders */}
            {contents.folders.map((folder) => (
              <FolderItem
                key={folder.path}
                folder={folder}
                onClick={() => onNavigate(folder.path)}
              />
            ))}

            {/* Images */}
            {contents.images.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '4px',
                  padding: '8px',
                }}
              >
                {contents.images.map((image) => (
                  <ImageThumbnail
                    key={image.path}
                    image={image}
                    onClick={() => onSelectImage?.(image)}
                  />
                ))}
              </div>
            )}

            {contents.folders.length === 0 && contents.images.length === 0 && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '12px',
                }}
              >
                Empty folder
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Footer with stats */}
      {contents && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{contents.folders.length} folders</span>
          <span>{contents.totalImages} images</span>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// FOLDER ITEM
// -----------------------------------------------------------------------------

interface FolderItemProps {
  folder: FolderNode;
  onClick: () => void;
}

function FolderItem({ folder, onClick }: FolderItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        fontSize: '12px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Folder size={16} style={{ color: 'var(--color-accent)' }} />

      <span
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {folder.name}
      </span>

      {folder.isAlias && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            backgroundColor: 'var(--color-accent-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-accent)',
            fontSize: '10px',
          }}
        >
          <Tag size={10} />
          {folder.aliasName}
        </span>
      )}
    </button>
  );
}

// -----------------------------------------------------------------------------
// IMAGE THUMBNAIL
// -----------------------------------------------------------------------------

interface ImageThumbnailProps {
  image: ImageNode;
  onClick: () => void;
}

function ImageThumbnail({ image, onClick }: ImageThumbnailProps) {
  return (
    <button
      onClick={onClick}
      style={{
        aspectRatio: '1',
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        position: 'relative',
      }}
      title={image.name}
    >
      <img
        src={`file://${image.path}`}
        alt={image.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        loading="lazy"
      />

      {/* Hover overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0';
        }}
      >
        <Image size={20} color="white" />
      </div>
    </button>
  );
}
