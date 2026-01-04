// =============================================================================
// ADD PROVIDER MODAL
// =============================================================================
// Modal for adding a new custom provider.

import React, { useState, useRef, useEffect } from 'react';
import { X, Server, Zap, Cloud, ChevronDown, Check } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export type ProviderFormat = 'openai' | 'anthropic' | 'google';

export interface NewProvider {
    id: string;
    name: string;
    format: ProviderFormat;
    baseUrl: string;
    brandColor: string;
    apiKey: string;
}

export interface AddProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (provider: NewProvider) => void;
    existingIds: string[];
}

// -----------------------------------------------------------------------------
// PRESET PROVIDERS
// -----------------------------------------------------------------------------

interface PresetProvider {
    id: string;
    name: string;
    format: ProviderFormat;
    baseUrl: string;
    brandColor: string;
    description: string;
}

const PRESET_PROVIDERS: PresetProvider[] = [
    {
        id: 'ollama',
        name: 'Ollama',
        format: 'openai',
        baseUrl: 'http://localhost:11434/v1',
        brandColor: '#ffffff',
        description: 'Local LLM server',
    },
    {
        id: 'lmstudio',
        name: 'LM Studio',
        format: 'openai',
        baseUrl: 'http://localhost:1234/v1',
        brandColor: '#6366f1',
        description: 'Local model server',
    },
    {
        id: 'together',
        name: 'Together AI',
        format: 'openai',
        baseUrl: 'https://api.together.xyz/v1',
        brandColor: '#0ea5e9',
        description: 'Cloud inference',
    },
    {
        id: 'groq',
        name: 'Groq',
        format: 'openai',
        baseUrl: 'https://api.groq.com/openai/v1',
        brandColor: '#f97316',
        description: 'Fast inference',
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        format: 'openai',
        baseUrl: 'https://openrouter.ai/api/v1',
        brandColor: '#8b5cf6',
        description: 'Model router',
    },
    {
        id: 'custom',
        name: 'Custom',
        format: 'openai',
        baseUrl: '',
        brandColor: '#6b7280',
        description: 'OpenAI-compatible API',
    },
];

// -----------------------------------------------------------------------------
// FORMAT DROPDOWN (custom to avoid X11 popup issues)
// -----------------------------------------------------------------------------

const FORMAT_OPTIONS: { value: ProviderFormat; label: string }[] = [
    { value: 'openai', label: 'OpenAI Compatible' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
];

function FormatDropdown({ format, onChange }: { format: ProviderFormat; onChange: (f: ProviderFormat) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = FORMAT_OPTIONS.find(o => o.value === format)?.label || format;

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={labelStyle}>API Format</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <span>{selectedLabel}</span>
                <ChevronDown size={16} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
            </button>
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        overflow: 'hidden',
                    }}
                >
                    {FORMAT_OPTIONS.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: option.value === format ? 'var(--color-bg-secondary)' : 'transparent',
                                border: 'none',
                                color: 'var(--color-text)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = option.value === format ? 'var(--color-bg-secondary)' : 'transparent'}
                        >
                            <span>{option.label}</span>
                            {option.value === format && <Check size={14} style={{ color: 'var(--color-accent)' }} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function AddProviderModal({ isOpen, onClose, onAdd, existingIds }: AddProviderModalProps) {
    const [step, setStep] = useState<'select' | 'configure'>('select');
    const [selectedPreset, setSelectedPreset] = useState<PresetProvider | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [id, setId] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [format, setFormat] = useState<ProviderFormat>('openai');
    const [brandColor, setBrandColor] = useState('#6b7280');

    if (!isOpen) return null;

    const handlePresetSelect = (preset: PresetProvider) => {
        setSelectedPreset(preset);
        setName(preset.name);
        setId(preset.id);
        setBaseUrl(preset.baseUrl);
        setFormat(preset.format);
        setBrandColor(preset.brandColor);
        setStep('configure');
    };

    const handleBack = () => {
        setStep('select');
        setSelectedPreset(null);
    };

    const handleAdd = () => {
        if (!name || !id || !baseUrl || !apiKey) return;

        // Generate unique ID if already exists
        let finalId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        let counter = 1;
        while (existingIds.includes(finalId)) {
            finalId = `${id}-${counter}`;
            counter++;
        }

        onAdd({
            id: finalId,
            name,
            format,
            baseUrl,
            brandColor,
            apiKey,
        });

        // Reset
        setStep('select');
        setSelectedPreset(null);
        setName('');
        setId('');
        setBaseUrl('');
        setApiKey('');
        onClose();
    };

    const isCustom = selectedPreset?.id === 'custom';
    const idExists = existingIds.includes(id.toLowerCase().replace(/[^a-z0-9-]/g, '-'));

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
                    width: '500px',
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
                        {step === 'select' ? 'Add Provider' : `Configure ${name}`}
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
                    {step === 'select' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {PRESET_PROVIDERS.filter(p => !existingIds.includes(p.id) || p.id === 'custom').map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset)}
                                    style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--color-bg)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = preset.brandColor;
                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--color-border)';
                                        e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            backgroundColor: preset.brandColor + '20',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {preset.id === 'custom' ? (
                                            <Server size={18} color={preset.brandColor} />
                                        ) : preset.baseUrl.includes('localhost') ? (
                                            <Zap size={18} color={preset.brandColor} />
                                        ) : (
                                            <Cloud size={18} color={preset.brandColor} />
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                            {preset.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                            {preset.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Name */}
                            <div>
                                <label style={labelStyle}>Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (isCustom) {
                                            setId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                        }
                                    }}
                                    placeholder="My Provider"
                                    style={inputStyle}
                                />
                            </div>

                            {/* ID (only for custom) */}
                            {isCustom && (
                                <div>
                                    <label style={labelStyle}>
                                        Provider ID
                                        {idExists && (
                                            <span style={{ color: 'var(--color-warning)', marginLeft: '8px', fontSize: '11px' }}>
                                                (will be made unique)
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        placeholder="my-provider"
                                        style={inputStyle}
                                    />
                                </div>
                            )}

                            {/* Base URL */}
                            <div>
                                <label style={labelStyle}>API Base URL</label>
                                <input
                                    type="url"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    placeholder="https://api.example.com/v1"
                                    style={inputStyle}
                                />
                            </div>

                            {/* API Key */}
                            <div>
                                <label style={labelStyle}>API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    style={inputStyle}
                                />
                            </div>

                            {/* Format (only for custom) */}
                            {isCustom && (
                                <FormatDropdown format={format} onChange={setFormat} />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderTop: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: step === 'configure' ? 'space-between' : 'flex-end',
                    }}
                >
                    {step === 'configure' && (
                        <button
                            onClick={handleBack}
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
                            Back
                        </button>
                    )}
                    {step === 'configure' && (
                        <button
                            onClick={handleAdd}
                            disabled={!name || !baseUrl || !apiKey}
                            style={{
                                padding: '8px 24px',
                                backgroundColor: name && baseUrl && apiKey ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                                color: name && baseUrl && apiKey ? 'white' : 'var(--color-text-tertiary)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: name && baseUrl && apiKey ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Add Provider
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Shared styles
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
