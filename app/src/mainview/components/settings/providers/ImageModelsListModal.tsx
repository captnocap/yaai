// =============================================================================
// IMAGE MODELS LIST MODAL
// =============================================================================
// Modal for viewing and managing configured image models for a provider.

import React, { useState, useEffect, useCallback } from 'react';
import type { ImageModelConfig } from '../../../types/image-model-config';
import { ImageModelBuilderModal } from './ImageModelBuilderModal';
import { useProviderSettings } from '../../../hooks/useProviderSettings';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageModelsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ImageModelsListModal({
  isOpen,
  onClose,
  providerId,
  providerName,
}: ImageModelsListModalProps) {
  const [models, setModels] = useState<ImageModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ImageModelConfig | undefined>();

  const {
    getImageModels,
    addImageModel,
    updateImageModel,
    removeImageModel,
    error,
  } = useProviderSettings();

  // Load models on open
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getImageModels(providerId)
        .then(setModels)
        .finally(() => setLoading(false));
    }
  }, [isOpen, providerId, getImageModels]);

  const handleAddNew = useCallback(() => {
    setEditingModel(undefined);
    setIsBuilderOpen(true);
  }, []);

  const handleEdit = useCallback((model: ImageModelConfig) => {
    setEditingModel(model);
    setIsBuilderOpen(true);
  }, []);

  const handleDelete = useCallback(async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this image model?')) return;

    try {
      await removeImageModel(providerId, modelId);
      setModels(prev => prev.filter(m => m.id !== modelId));
    } catch (err) {
      console.error('Failed to delete image model:', err);
    }
  }, [providerId, removeImageModel]);

  const handleSave = useCallback(async (model: ImageModelConfig) => {
    try {
      if (editingModel) {
        await updateImageModel(providerId, editingModel.id, model);
        setModels(prev => prev.map(m => m.id === editingModel.id ? model : m));
      } else {
        await addImageModel(providerId, model);
        setModels(prev => [...prev, model]);
      }
      setIsBuilderOpen(false);
      setEditingModel(undefined);
    } catch (err) {
      console.error('Failed to save image model:', err);
    }
  }, [providerId, editingModel, addImageModel, updateImageModel]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            width: '700px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--color-border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Image Models
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Configure image generation models for {providerName}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
            >
              x
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div style={{
              margin: '12px 20px 0',
              padding: '12px',
              backgroundColor: 'var(--color-error-bg, #fee2e2)',
              border: '1px solid var(--color-error, #ef4444)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error, #ef4444)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
            }}
            className="custom-scrollbar"
          >
            {loading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '48px',
                color: 'var(--color-text-tertiary)',
              }}>
                Loading...
              </div>
            ) : models.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
                color: 'var(--color-text-tertiary)',
                textAlign: 'center',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  fontSize: '24px',
                }}>
                  @
                </div>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                  No image models configured
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                  Add custom image generation models with their own payload structures
                </p>
                <button
                  onClick={handleAddNew}
                  style={{
                    marginTop: '16px',
                    padding: '8px 20px',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Add Image Model
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {models.map((model) => (
                  <div
                    key={model.id}
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                          {model.displayName}
                        </h4>
                        <code style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          backgroundColor: 'var(--color-bg-tertiary)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          marginTop: '4px',
                          display: 'inline-block',
                        }}>
                          {model.modelId}
                        </code>

                        {/* Model info */}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          marginTop: '12px',
                          fontSize: '12px',
                          color: 'var(--color-text-tertiary)',
                        }}>
                          <span>{model.parameters.length} parameters</span>
                          {model.img2img.supported && (
                            <span style={{ color: 'var(--color-success, #22c55e)' }}>
                              img2img (max {model.img2img.maxImages})
                            </span>
                          )}
                        </div>

                        {/* Parameters preview */}
                        {model.parameters.length > 0 && (
                          <div style={{
                            marginTop: '8px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px',
                          }}>
                            {model.parameters.slice(0, 5).map((param, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  backgroundColor: 'var(--color-bg-tertiary)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {param.key}: {String(param.value)}
                              </span>
                            ))}
                            {model.parameters.length > 5 && (
                              <span style={{
                                fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                              }}>
                                +{model.parameters.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(model)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-text)',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(model.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-error, #ef4444)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-error, #ef4444)',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {models.length} model{models.length !== 1 ? 's' : ''} configured
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleAddNew}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                + Add Model
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Builder Modal */}
      <ImageModelBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingModel(undefined);
        }}
        onSave={handleSave}
        editingModel={editingModel}
        providerId={providerId}
      />
    </>
  );
}
