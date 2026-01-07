// =============================================================================
// MODEL ICON PICKER
// =============================================================================
// Modal for selecting a model icon from the built-in library or uploading custom.

import React, { useState, useRef } from 'react';
import { X, Upload, RotateCcw, Check } from 'lucide-react';
import {
  BUILT_IN_ICONS,
  getIconDisplayName,
  getModelIconName,
  processIconUpload,
} from '../../../lib/model-icons';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ModelIconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (icon: string | null) => void;  // null = use auto-detect
  modelId: string;
  modelName: string;
  currentCustomIcon?: string | null;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ModelIconPicker({
  isOpen,
  onClose,
  onSelect,
  modelId,
  modelName,
  currentCustomIcon,
}: ModelIconPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(currentCustomIcon || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoDetectedIcon = getModelIconName(modelId);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const base64 = await processIconUpload(file);
      setSelectedIcon(base64);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBuiltInSelect = (iconName: string) => {
    setSelectedIcon(`/assets/model-icons/${iconName}.png`);
    setError(null);
  };

  const handleAutoDetect = () => {
    setSelectedIcon(null);  // null means use auto-detect
    setError(null);
  };

  const handleSave = () => {
    onSelect(selectedIcon);
    onClose();
  };

  // Determine what icon is currently showing
  const previewIcon = selectedIcon || `/assets/model-icons/${autoDetectedIcon}.png`;
  const isAutoDetected = !selectedIcon;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '480px',
          maxHeight: '80vh',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Choose Icon
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {/* Preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <img
              src={previewIcon}
              alt="Preview"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-lg)',
                objectFit: 'cover',
                backgroundColor: 'var(--color-bg-tertiary)',
              }}
              onError={(e) => {
                // Fallback to first letter if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                {modelName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                {isAutoDetected
                  ? `Auto-detected: ${getIconDisplayName(autoDetectedIcon)}`
                  : 'Custom icon selected'
                }
              </div>
            </div>
          </div>

          {/* Auto-detect option */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={handleAutoDetect}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                backgroundColor: isAutoDetected ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
                border: isAutoDetected ? '2px solid #3b82f6' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--color-text)',
                fontSize: '14px',
              }}
            >
              <RotateCcw size={16} color="#3b82f6" />
              <span style={{ flex: 1, textAlign: 'left' }}>Auto-detect from model name</span>
              {isAutoDetected && <Check size={16} color="#3b82f6" />}
            </button>
          </div>

          {/* Upload option */}
          <div style={{ marginBottom: '20px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: uploading ? 'not-allowed' : 'pointer',
                color: 'var(--color-text)',
                fontSize: '14px',
              }}
            >
              <Upload size={16} color="var(--color-text-secondary)" />
              <span style={{ flex: 1, textAlign: 'left' }}>
                {uploading ? 'Processing...' : 'Upload custom image'}
              </span>
            </button>
            {error && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
                {error}
              </div>
            )}
          </div>

          {/* Built-in icons */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Built-in Icons
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px',
              }}
            >
              {BUILT_IN_ICONS.map((iconName) => {
                const iconPath = `/assets/model-icons/${iconName}.png`;
                const isSelected = selectedIcon === iconPath;

                return (
                  <button
                    key={iconName}
                    onClick={() => handleBuiltInSelect(iconName)}
                    title={getIconDisplayName(iconName)}
                    style={{
                      padding: '8px',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg)',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <img
                      src={iconPath}
                      alt={iconName}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        objectFit: 'cover',
                        backgroundColor: 'var(--color-bg-tertiary)',
                      }}
                      onError={(e) => {
                        // Show placeholder on error
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect fill="%23374151" width="32" height="32" rx="4"/><text x="16" y="20" text-anchor="middle" fill="%239CA3AF" font-size="14" font-family="system-ui">?</text></svg>';
                      }}
                    />
                    <span
                      style={{
                        fontSize: '9px',
                        color: 'var(--color-text-tertiary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                    >
                      {iconName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
