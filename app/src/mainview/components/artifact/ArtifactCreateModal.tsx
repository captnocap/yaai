// =============================================================================
// ARTIFACT CREATE MODAL
// =============================================================================
// Modal for creating new artifacts with manifest and handler code.

import React, { useState, useCallback } from 'react';
import type { ArtifactManifest, ArtifactFiles, ArtifactType } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactCreateModalProps {
  onClose: () => void;
  onSubmit: (manifest: ArtifactManifest, files: ArtifactFiles) => Promise<void>;
}

interface FormState {
  id: string;
  name: string;
  description: string;
  type: ArtifactType;
  version: string;
  tags: string;
  icon: string;
  handlerCode: string;
  hasUI: boolean;
  uiCode: string;
}

// -----------------------------------------------------------------------------
// TEMPLATES
// -----------------------------------------------------------------------------

const HANDLER_TEMPLATE = `// Artifact Handler
// Implements the ArtifactHandler interface

import type { ArtifactHandler, ExecutionContext } from '../types';

interface Input {
  // Define your input type here
}

interface Output {
  // Define your output type here
}

const handler: ArtifactHandler<Input, Output> = {
  async execute(input: Input, context: ExecutionContext): Promise<Output> {
    context.logger.info('Executing artifact...');

    // Your logic here

    return {
      // Your output here
    };
  },

  // Optional: Called after installation
  async onInstall(context) {
    context.logger.info('Artifact installed');
  },

  // Optional: Called before uninstallation
  async onUninstall(context) {
    context.logger.info('Artifact uninstalling');
  },

  // Optional: Custom input validation
  validate(input: Input) {
    return { valid: true };
  },
};

export default handler;
`;

const UI_TEMPLATE = `// Artifact UI Component
// Rendered in a sandboxed iframe

import React from 'react';
import type { ArtifactUIProps } from '../types';

interface Data {
  // Match your handler's output type
}

export default function ArtifactUI({ data, manifest, onAction, onRefresh }: ArtifactUIProps<Data>) {
  return (
    <div style={{ padding: '16px' }}>
      <h2>{manifest.name}</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => onRefresh()}>Refresh</button>
    </div>
  );
}
`;

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactCreateModal({ onClose, onSubmit }: ArtifactCreateModalProps) {
  const [step, setStep] = useState<'details' | 'code' | 'review'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    id: '',
    name: '',
    description: '',
    type: 'tool',
    version: '1.0.0',
    tags: '',
    icon: '',
    handlerCode: HANDLER_TEMPLATE,
    hasUI: false,
    uiCode: UI_TEMPLATE,
  });

  // Generate ID from name
  const generateId = useCallback((name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, []);

  // Handle name change and auto-generate ID
  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      id: prev.id === generateId(prev.name) ? generateId(name) : prev.id,
    }));
  };

  // Submit the artifact
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      const manifest: ArtifactManifest = {
        id: form.id,
        name: form.name,
        description: form.description,
        type: form.type,
        version: form.version,
        entry: 'handler.ts',
        ui: form.hasUI ? 'index.tsx' : undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        icon: form.icon || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: { type: 'manual' },
      };

      const files: ArtifactFiles = {
        handler: form.handlerCode,
        ui: form.hasUI ? form.uiCode : undefined,
      };

      await onSubmit(manifest, files);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create artifact');
    } finally {
      setLoading(false);
    }
  };

  // Render step indicator
  const renderSteps = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
    }}>
      {(['details', 'code', 'review'] as const).map((s, i) => (
        <div
          key={s}
          onClick={() => setStep(s)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: step === s ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            color: step === s ? 'white' : 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: step === s ? 600 : 400,
          }}
        >
          <span style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: step === s ? 'white' : 'var(--color-border)',
            color: step === s ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {i + 1}
          </span>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </div>
      ))}
    </div>
  );

  // Render details step
  const renderDetailsStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="My Artifact"
          style={inputStyle}
        />
      </div>

      {/* ID */}
      <div>
        <label style={labelStyle}>ID *</label>
        <input
          type="text"
          value={form.id}
          onChange={(e) => setForm(prev => ({ ...prev, id: e.target.value }))}
          placeholder="my-artifact"
          style={inputStyle}
        />
        <p style={helpStyle}>Lowercase letters, numbers, and hyphens only</p>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What does this artifact do?"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Type */}
      <div>
        <label style={labelStyle}>Type *</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['tool', 'view', 'service', 'prompt'] as const).map(type => (
            <button
              key={type}
              onClick={() => setForm(prev => ({ ...prev, type }))}
              style={{
                flex: 1,
                padding: '10px',
                border: form.type === type
                  ? '2px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: form.type === type
                  ? 'var(--color-accent-subtle)'
                  : 'var(--color-bg-tertiary)',
                color: form.type === type
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Version & Icon */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Version</label>
          <input
            type="text"
            value={form.version}
            onChange={(e) => setForm(prev => ({ ...prev, version: e.target.value }))}
            placeholder="1.0.0"
            style={inputStyle}
          />
        </div>
        <div style={{ width: '100px' }}>
          <label style={labelStyle}>Icon</label>
          <input
            type="text"
            value={form.icon}
            onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
            placeholder="🔧"
            style={{ ...inputStyle, textAlign: 'center', fontSize: '20px' }}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label style={labelStyle}>Tags</label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
          placeholder="api, utility, data"
          style={inputStyle}
        />
        <p style={helpStyle}>Comma-separated list</p>
      </div>

      {/* Has UI */}
      <div>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={form.hasUI}
            onChange={(e) => setForm(prev => ({ ...prev, hasUI: e.target.checked }))}
          />
          <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>
            Include UI component
          </span>
        </label>
      </div>
    </div>
  );

  // Render code step
  const renderCodeStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Handler Code */}
      <div>
        <label style={labelStyle}>Handler Code (handler.ts) *</label>
        <textarea
          value={form.handlerCode}
          onChange={(e) => setForm(prev => ({ ...prev, handlerCode: e.target.value }))}
          rows={15}
          style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
      </div>

      {/* UI Code */}
      {form.hasUI && (
        <div>
          <label style={labelStyle}>UI Component (index.tsx)</label>
          <textarea
            value={form.uiCode}
            onChange={(e) => setForm(prev => ({ ...prev, uiCode: e.target.value }))}
            rows={15}
            style={{
              ...inputStyle,
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>
      )}
    </div>
  );

  // Render review step
  const renderReviewStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>
        Review Your Artifact
      </h3>

      <div style={{
        padding: '16px',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '32px' }}>{form.icon || '📦'}</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>
              {form.name || 'Unnamed Artifact'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              {form.id} • v{form.version} • {form.type}
            </p>
          </div>
        </div>

        <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {form.description || 'No description'}
        </p>

        {form.tags && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {form.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: '12px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
      }}>
        <strong>Files to create:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>manifest.json</li>
          <li>handler.ts ({form.handlerCode.split('\n').length} lines)</li>
          {form.hasUI && <li>index.tsx ({form.uiCode.split('\n').length} lines)</li>}
        </ul>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}
    </div>
  );

  // Check if can proceed to next step
  const canProceed = () => {
    switch (step) {
      case 'details':
        return form.id && form.name && form.description && form.type;
      case 'code':
        return form.handlerCode.trim().length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
          Create New Artifact
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {renderSteps()}
        {step === 'details' && renderDetailsStep()}
        {step === 'code' && renderCodeStep()}
        {step === 'review' && renderReviewStep()}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}>
        <button
          onClick={() => {
            if (step === 'code') setStep('details');
            else if (step === 'review') setStep('code');
            else onClose();
          }}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          {step === 'details' ? 'Cancel' : 'Back'}
        </button>

        {step !== 'review' ? (
          <button
            onClick={() => {
              if (step === 'details') setStep('code');
              else if (step === 'code') setStep('review');
            }}
            disabled={!canProceed()}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              backgroundColor: canProceed() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: canProceed() ? 'white' : 'var(--color-text-tertiary)',
              cursor: canProceed() ? 'pointer' : 'not-allowed',
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              backgroundColor: 'var(--color-success)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Artifact'}
          </button>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STYLES
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
  backgroundColor: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  outline: 'none',
};

const helpStyle: React.CSSProperties = {
  margin: '4px 0 0 0',
  fontSize: '11px',
  color: 'var(--color-text-tertiary)',
};
