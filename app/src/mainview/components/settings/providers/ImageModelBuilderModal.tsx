// =============================================================================
// IMAGE MODEL BUILDER MODAL
// =============================================================================
// Modal for building image model configurations with custom payload parameters.

import React, { useState, useCallback } from 'react';
import type {
  ImageModelConfig,
  ImageModelParam,
  ImageModelParamType,
  Img2ImgConfig,
} from '../../../types/image-model-config';
import {
  DEFAULT_IMG2IMG_CONFIG,
  DEFAULT_IMAGE_MODEL_CONFIG,
  generateImageModelId,
} from '../../../types/image-model-config';
import { Select } from '../../atoms/Select';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ImageModelBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: ImageModelConfig) => void;
  /** Existing model to edit (undefined for new) */
  editingModel?: ImageModelConfig;
  /** Provider ID for context */
  providerId: string;
}

interface ParameterRowProps {
  param: ImageModelParam;
  index: number;
  onUpdate: (index: number, param: ImageModelParam) => void;
  onRemove: (index: number) => void;
}

// -----------------------------------------------------------------------------
// PARAMETER ROW
// -----------------------------------------------------------------------------

function ParameterRow({ param, index, onUpdate, onRemove }: ParameterRowProps) {
  const [showOptions, setShowOptions] = useState(param.type === 'selection');
  const [newOption, setNewOption] = useState('');

  const handleTypeChange = (type: ImageModelParamType) => {
    let value: string | number | boolean = param.value;
    let options: string[] | undefined = undefined;

    // Convert value to appropriate type
    switch (type) {
      case 'string':
        value = String(param.value);
        break;
      case 'number':
        value = typeof param.value === 'number' ? param.value : 0;
        break;
      case 'boolean':
        value = Boolean(param.value);
        break;
      case 'selection':
        // For selection, we need non-empty options
        // Filter out any empty strings from existing options
        const existingOptions = (param.options || []).filter(o => o.trim() !== '');
        const currentValue = String(param.value).trim();

        if (existingOptions.length > 0) {
          options = existingOptions;
          value = existingOptions.includes(currentValue) ? currentValue : existingOptions[0];
        } else if (currentValue) {
          // Use current value as first option if non-empty
          options = [currentValue];
          value = currentValue;
        } else {
          // No options yet - start with empty array, user must add options
          options = [];
          value = '';
        }
        setShowOptions(true);
        break;
    }

    onUpdate(index, {
      ...param,
      type,
      value,
      options: type === 'selection' ? options : undefined,
    });

    if (type !== 'selection') {
      setShowOptions(false);
    }
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const options = [...(param.options || []), newOption.trim()];
    onUpdate(index, { ...param, options });
    setNewOption('');
  };

  const handleRemoveOption = (optIndex: number) => {
    const options = (param.options || []).filter((_, i) => i !== optIndex);
    onUpdate(index, { ...param, options });
  };

  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'var(--color-bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Key */}
        <input
          type="text"
          value={param.key}
          onChange={(e) => onUpdate(index, { ...param, key: e.target.value })}
          placeholder="Key name"
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
            fontSize: '13px',
          }}
        />

        {/* Type */}
        <Select
          value={param.type}
          onChange={(val) => handleTypeChange(val as ImageModelParamType)}
          options={[
            { value: 'string', label: 'String' },
            { value: 'number', label: 'Number' },
            { value: 'boolean', label: 'Boolean' },
            { value: 'selection', label: 'Selection' },
          ]}
          size="sm"
        />

        {/* Value input based on type */}
        {param.type === 'boolean' ? (
          <Select
            value={String(param.value)}
            onChange={(val) => onUpdate(index, { ...param, value: val === 'true' })}
            options={[
              { value: 'true', label: 'true' },
              { value: 'false', label: 'false' },
            ]}
            size="sm"
          />
        ) : param.type === 'number' ? (
          <input
            type="number"
            value={param.value as number}
            onChange={(e) => onUpdate(index, { ...param, value: Number(e.target.value) })}
            style={{
              width: '100px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '13px',
            }}
          />
        ) : param.type === 'selection' ? (
          (() => {
            // Filter out any empty strings from options
            const validOptions = (param.options || []).filter(opt => opt && opt.trim() !== '');
            if (validOptions.length > 0) {
              // Ensure value is one of the valid options
              const currentValue = String(param.value);
              const safeValue = validOptions.includes(currentValue) ? currentValue : validOptions[0];
              return (
                <Select
                  value={safeValue}
                  onChange={(val) => onUpdate(index, { ...param, value: val })}
                  options={validOptions.map(opt => ({ value: opt, label: opt }))}
                  placeholder="Select..."
                  size="sm"
                />
              );
            }
            return (
              <span style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--color-text-tertiary)',
                fontStyle: 'italic',
              }}>
                Add options below first
              </span>
            );
          })()
        ) : (
          <input
            type="text"
            value={String(param.value)}
            onChange={(e) => onUpdate(index, { ...param, value: e.target.value })}
            placeholder="Value"
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '13px',
            }}
          />
        )}

        {/* Remove button */}
        <button
          onClick={() => onRemove(index)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error, #ef4444)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Remove parameter"
        >
          X
        </button>
      </div>

      {/* Selection options editor */}
      {showOptions && param.type === 'selection' && (
        <div style={{
          marginTop: '4px',
          padding: '8px',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Selection Options:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {(param.options || []).map((opt, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {opt}
                <button
                  onClick={() => handleRemoveOption(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: '10px',
                  }}
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              placeholder="Add option..."
              style={{
                flex: 1,
                padding: '4px 8px',
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                fontSize: '12px',
              }}
            />
            <button
              onClick={handleAddOption}
              style={{
                padding: '4px 12px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN MODAL
// -----------------------------------------------------------------------------

export function ImageModelBuilderModal({
  isOpen,
  onClose,
  onSave,
  editingModel,
  providerId,
}: ImageModelBuilderModalProps) {
  const [modelId, setModelId] = useState(editingModel?.modelId || '');
  const [displayName, setDisplayName] = useState(editingModel?.displayName || '');
  const [parameters, setParameters] = useState<ImageModelParam[]>(
    editingModel?.parameters || []
  );
  const [img2img, setImg2img] = useState<Img2ImgConfig>(
    editingModel?.img2img || DEFAULT_IMG2IMG_CONFIG
  );
  const [promptKey, setPromptKey] = useState(
    editingModel?.promptKey || DEFAULT_IMAGE_MODEL_CONFIG.promptKey
  );
  const [modelKey, setModelKey] = useState(
    editingModel?.modelKey || DEFAULT_IMAGE_MODEL_CONFIG.modelKey
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEditing = !!editingModel;

  const handleAddParameter = useCallback(() => {
    setParameters([
      ...parameters,
      { key: '', type: 'string', value: '' },
    ]);
  }, [parameters]);

  const handleUpdateParameter = useCallback((index: number, param: ImageModelParam) => {
    setParameters(prev => prev.map((p, i) => i === index ? param : p));
  }, []);

  const handleRemoveParameter = useCallback((index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    if (!modelId.trim() || !displayName.trim()) {
      return;
    }

    // Filter out parameters with empty keys
    const validParams = parameters.filter(p => p.key.trim());

    const now = new Date().toISOString();
    const config: ImageModelConfig = {
      id: editingModel?.id || generateImageModelId(),
      modelId: modelId.trim(),
      displayName: displayName.trim(),
      parameters: validParams,
      img2img,
      promptKey,
      modelKey,
      createdAt: editingModel?.createdAt || now,
      updatedAt: now,
    };

    onSave(config);
    onClose();
  }, [modelId, displayName, parameters, img2img, promptKey, modelKey, editingModel, onSave, onClose]);

  if (!isOpen) return null;

  return (
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
      onMouseDown={(e) => {
        // Only close if clicking directly on backdrop, not dragging from inside
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          width: '600px',
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
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            {isEditing ? 'Edit Image Model' : 'Add Image Model'}
          </h2>
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

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
          }}
          className="custom-scrollbar"
        >
          {/* Instructions */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            marginBottom: '20px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>
              How this works:
            </div>
            <div style={{ lineHeight: 1.5 }}>
              <strong>Automatically added at runtime:</strong> prompt, model ID, and images (if enabled)
              <br />
              <strong>You define:</strong> Fixed parameters like <code style={{
                backgroundColor: 'var(--color-bg)',
                padding: '1px 4px',
                borderRadius: '3px',
                fontSize: '11px'
              }}>nImages</code>, <code style={{
                backgroundColor: 'var(--color-bg)',
                padding: '1px 4px',
                borderRadius: '3px',
                fontSize: '11px'
              }}>resolution</code>, <code style={{
                backgroundColor: 'var(--color-bg)',
                padding: '1px 4px',
                borderRadius: '3px',
                fontSize: '11px'
              }}>showExplicitContent</code>, etc.
            </div>
          </div>

          {/* Model ID & Display Name */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Model ID
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g. nano-banana-pro-ultra"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                This is the value sent in the "model" field
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Nano Banana Pro Ultra"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Parameters Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                Payload Parameters
              </h3>
              <button
                onClick={handleAddParameter}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                + Add Parameter
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {parameters.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '13px',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  No parameters added. Click "+ Add Parameter" to define custom payload fields.
                </div>
              ) : (
                parameters.map((param, index) => (
                  <ParameterRow
                    key={index}
                    param={param}
                    index={index}
                    onUpdate={handleUpdateParameter}
                    onRemove={handleRemoveParameter}
                  />
                ))
              )}
            </div>
          </div>

          {/* img2img Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
              Image Input (img2img)
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={img2img.supported}
                  onChange={(e) => setImg2img({ ...img2img, supported: e.target.checked })}
                />
                <span style={{ fontSize: '13px' }}>Supports image attachments</span>
              </label>

              {img2img.supported && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                      Max images
                    </label>
                    <input
                      type="number"
                      value={img2img.maxImages}
                      onChange={(e) => setImg2img({ ...img2img, maxImages: parseInt(e.target.value) || 0 })}
                      min={0}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                      Array key name
                    </label>
                    <input
                      type="text"
                      value={img2img.paramKey}
                      onChange={(e) => setImg2img({ ...img2img, paramKey: e.target.value })}
                      placeholder="imageDataUrls"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--color-text)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Section */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '0',
                marginBottom: showAdvanced ? '12px' : '0',
              }}
            >
              {showAdvanced ? '- Hide' : '+ Show'} Advanced Settings
            </button>

            {showAdvanced && (
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                    Prompt key
                  </label>
                  <input
                    type="text"
                    value={promptKey}
                    onChange={(e) => setPromptKey(e.target.value)}
                    placeholder="prompt"
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                    Model key
                  </label>
                  <input
                    type="text"
                    value={modelKey}
                    onChange={(e) => setModelKey(e.target.value)}
                    placeholder="model"
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payload Preview */}
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
              Payload Preview
            </h3>
            <div style={{
              padding: '12px',
              backgroundColor: '#1e1e1e',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              overflow: 'auto',
              maxHeight: '200px',
            }}>
              <pre style={{ margin: 0, color: '#d4d4d4' }}>
                {JSON.stringify(
                  (() => {
                    const payload: Record<string, unknown> = {};

                    // Add prompt (runtime)
                    payload[promptKey || 'prompt'] = '<your prompt>';

                    // Add model
                    payload[modelKey || 'model'] = modelId || '<model-id>';

                    // Add fixed parameters
                    for (const param of parameters.filter(p => p.key.trim())) {
                      payload[param.key] = param.value;
                    }

                    // Add images if supported
                    if (img2img.supported) {
                      payload[img2img.paramKey || 'imageDataUrls'] = ['<base64...>', '...'];
                    }

                    return payload;
                  })(),
                  null,
                  2
                )}
              </pre>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
              Values in &lt;brackets&gt; are populated at runtime
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!modelId.trim() || !displayName.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: (!modelId.trim() || !displayName.trim())
                ? 'var(--color-bg-tertiary)'
                : 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: (!modelId.trim() || !displayName.trim())
                ? 'var(--color-text-tertiary)'
                : 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: (!modelId.trim() || !displayName.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {isEditing ? 'Save Changes' : 'Add Model'}
          </button>
        </div>
      </div>
    </div>
  );
}
