// =============================================================================
// EMBEDDING MODEL MODAL
// =============================================================================
// Simple modal for adding/editing embedding models.
// Embeddings are standardized (OpenAI-compatible) so no payload builder needed.

import React, { useState, useEffect } from 'react';
import { X, Hash } from 'lucide-react';
import type { EmbeddingModelInfo, ProviderFormat } from '../../../types/embedding-model-config';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface EmbeddingModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (model: EmbeddingModelInfo) => void;
    providerId: string;
    format: ProviderFormat;
    existingModel?: EmbeddingModelInfo; // For edit mode
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function EmbeddingModelModal({
    isOpen,
    onClose,
    onSave,
    providerId,
    format,
    existingModel,
}: EmbeddingModelModalProps) {
    const isEditing = !!existingModel;

    // Form state
    const [id, setId] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [dimensions, setDimensions] = useState(1536);
    const [maxTokens, setMaxTokens] = useState(8191);
    const [inputPrice, setInputPrice] = useState<string>('');
    const [supportsDimensions, setSupportsDimensions] = useState(false);

    // Reset form when modal opens or existingModel changes
    useEffect(() => {
        if (isOpen) {
            if (existingModel) {
                setId(existingModel.id);
                setDisplayName(existingModel.displayName);
                setDimensions(existingModel.dimensions);
                setMaxTokens(existingModel.maxTokens);
                setInputPrice(existingModel.inputPrice?.toString() || '');
                setSupportsDimensions(existingModel.supportsDimensions || false);
            } else {
                setId('');
                setDisplayName('');
                setDimensions(1536);
                setMaxTokens(8191);
                setInputPrice('');
                setSupportsDimensions(false);
            }
        }
    }, [isOpen, existingModel]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!id || !displayName) return;

        const model: EmbeddingModelInfo = {
            id,
            provider: providerId,
            format,
            displayName,
            dimensions,
            maxTokens,
            inputPrice: inputPrice ? parseFloat(inputPrice) : undefined,
            supportsDimensions,
            createdAt: existingModel?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        onSave(model);
        onClose();
    };

    const isValid = id.trim() && displayName.trim() && dimensions > 0 && maxTokens > 0;

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Hash size={18} color="#06b6d4" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                            {isEditing ? 'Edit Embedding Model' : 'Add Embedding Model'}
                        </h2>
                    </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Model ID */}
                        <div>
                            <label style={labelStyle}>Model ID</label>
                            <input
                                type="text"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                placeholder="text-embedding-3-small"
                                style={inputStyle}
                                disabled={isEditing}
                            />
                            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                                The exact model ID as used in API calls
                            </div>
                        </div>

                        {/* Display Name */}
                        <div>
                            <label style={labelStyle}>Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Text Embedding 3 Small"
                                style={inputStyle}
                            />
                        </div>

                        {/* Dimensions and Max Tokens */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Dimensions</label>
                                <input
                                    type="number"
                                    value={dimensions}
                                    onChange={(e) => setDimensions(parseInt(e.target.value) || 0)}
                                    placeholder="1536"
                                    style={inputStyle}
                                    min={1}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Max Tokens</label>
                                <input
                                    type="number"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                                    placeholder="8191"
                                    style={inputStyle}
                                    min={1}
                                />
                            </div>
                        </div>

                        {/* Input Price */}
                        <div>
                            <label style={labelStyle}>Price per Million Tokens (Optional)</label>
                            <input
                                type="number"
                                value={inputPrice}
                                onChange={(e) => setInputPrice(e.target.value)}
                                placeholder="0.02"
                                style={inputStyle}
                                step="0.001"
                                min={0}
                            />
                        </div>

                        {/* Supports Custom Dimensions */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                backgroundColor: 'var(--color-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setSupportsDimensions(!supportsDimensions)}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '2px solid',
                                    borderColor: supportsDimensions ? '#06b6d4' : 'var(--color-border)',
                                    backgroundColor: supportsDimensions ? '#06b6d4' : 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {supportsDimensions && (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                                    Supports Custom Dimensions
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                    Model can reduce output dimensions via API parameter
                                </div>
                            </div>
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
                        disabled={!isValid}
                        style={{
                            padding: '8px 24px',
                            backgroundColor: isValid ? '#06b6d4' : 'var(--color-bg-tertiary)',
                            color: isValid ? 'white' : 'var(--color-text-tertiary)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: isValid ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {isEditing ? 'Save Changes' : 'Add Model'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// SHARED STYLES
// -----------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    outline: 'none',
};
