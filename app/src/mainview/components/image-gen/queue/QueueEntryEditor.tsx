// =============================================================================
// QUEUE ENTRY EDITOR
// =============================================================================
// Modal for creating or editing a queue entry.

import React, { useState, useCallback } from 'react';
import { X, Image, FileText, Shuffle } from 'lucide-react';
import { Select } from '../../atoms/Select';
import { IconButton } from '../../atoms/IconButton';
import type {
  QueueEntry,
  PromptConfig,
  ResolutionConfig,
  ExecutionMode,
  AspectRatio,
} from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface QueueEntryEditorProps {
  entry?: QueueEntry;
  onSave: (entry: Partial<QueueEntry>) => Promise<void>;
  onCancel: () => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function QueueEntryEditor({
  entry,
  onSave,
  onCancel,
}: QueueEntryEditorProps) {
  const isEditing = !!entry;

  // Form state
  const [promptType, setPromptType] = useState<'inline' | 'library'>(
    entry?.prompt.type === 'library' ? 'library' : 'inline'
  );
  const [promptValue, setPromptValue] = useState(
    typeof entry?.prompt.value === 'string' ? entry.prompt.value : ''
  );
  const [model, setModel] = useState(entry?.model || 'seedream-v4');
  const [imagesPerBatch, setImagesPerBatch] = useState(entry?.imagesPerBatch || 1);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(
    entry?.executionMode || 'fixed'
  );
  const [batchCount, setBatchCount] = useState(entry?.batchCount || 25);
  const [targetImages, setTargetImages] = useState(entry?.targetImages || 100);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    entry?.resolution.aspectRatio || 'auto'
  );
  const [enabled, setEnabled] = useState(entry?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  // Models (simplified list)
  const models = [
    { id: 'seedream-v4', name: 'SeeDream V4' },
    { id: 'seedream-v3', name: 'SeeDream V3' },
    { id: 'nano-banana-pro-ultra', name: 'Nano Banana Pro Ultra' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
    { id: 'riverflow-2-max', name: 'Riverflow 2 Max' },
  ];

  const aspectRatios: AspectRatio[] = [
    'auto', 'square', '16:9', '9:16', '21:9', '4:3', '3:4', '3:2', '2:3', '5:4',
  ];

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setSaving(true);

    const prompt: PromptConfig = {
      type: promptType,
      value: promptValue,
    };

    const resolution: ResolutionConfig = {
      type: 'preset',
      preset: 'auto',
      aspectRatio: aspectRatio === 'auto' ? null : aspectRatio,
    };

    await onSave({
      prompt,
      resolution,
      model,
      imagesPerBatch,
      executionMode,
      batchCount,
      targetImages: executionMode === 'target' ? targetImages : null,
      enabled,
    });

    setSaving(false);
  }, [
    promptType,
    promptValue,
    model,
    imagesPerBatch,
    executionMode,
    batchCount,
    targetImages,
    aspectRatio,
    enabled,
    onSave,
  ]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </h2>
          <IconButton
            icon={<X size={18} />}
            tooltip="Close"
            onClick={onCancel}
          />
        </div>

        {/* Content */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {/* Prompt section */}
          <Section title="Prompt">
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <TabButton
                active={promptType === 'inline'}
                icon={<FileText size={14} />}
                label="Inline"
                onClick={() => setPromptType('inline')}
              />
              <TabButton
                active={promptType === 'library'}
                icon={<Shuffle size={14} />}
                label="Library"
                onClick={() => setPromptType('library')}
              />
            </div>

            <textarea
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={
                promptType === 'inline'
                  ? 'Enter your prompt...'
                  : 'Enter library prompt name...'
              }
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontSize: '13px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </Section>

          {/* Model & Resolution */}
          <Section title="Settings">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              <Field label="Model">
                <Select
                  value={model}
                  onChange={setModel}
                  options={models.map((m) => ({ value: m.id, label: m.name }))}
                  triggerClassName="w-full"
                />
              </Field>

              <Field label="Aspect Ratio">
                <Select
                  value={aspectRatio}
                  onChange={(val) => setAspectRatio(val as AspectRatio)}
                  options={aspectRatios.map((ar) => ({ value: ar, label: ar }))}
                  triggerClassName="w-full"
                />
              </Field>

              <Field label="Images per Batch">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={imagesPerBatch}
                  onChange={(e) => setImagesPerBatch(Number(e.target.value))}
                  style={inputStyle}
                />
              </Field>
            </div>
          </Section>

          {/* Execution Mode */}
          <Section title="Execution Mode">
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <TabButton
                active={executionMode === 'fixed'}
                label="Fixed Batches"
                onClick={() => setExecutionMode('fixed')}
              />
              <TabButton
                active={executionMode === 'target'}
                label="Target Images"
                onClick={() => setExecutionMode('target')}
              />
            </div>

            {executionMode === 'fixed' ? (
              <Field label="Batch Count">
                <input
                  type="number"
                  min={1}
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  style={inputStyle}
                />
              </Field>
            ) : (
              <Field label="Target Images">
                <input
                  type="number"
                  min={1}
                  value={targetImages}
                  onChange={(e) => setTargetImages(Number(e.target.value))}
                  style={inputStyle}
                />
              </Field>
            )}
          </Section>

          {/* Enabled toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
            }}
          >
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <label
              htmlFor="enabled"
              style={{
                fontSize: '13px',
                color: 'var(--color-text)',
              }}
            >
              Enabled
            </label>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '16px 20px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !promptValue.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
              opacity: saving || !promptValue.trim() ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)',
  fontSize: '13px',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}

function TabButton({ active, icon, label, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: active ? 'var(--color-accent-subtle)' : 'var(--color-bg)',
        border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
