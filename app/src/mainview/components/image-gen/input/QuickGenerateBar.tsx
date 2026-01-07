// =============================================================================
// QUICK GENERATE BAR
// =============================================================================
// Simple input bar for quick single-image generation.
// Dynamically renders controls based on selected model's supportedParams.

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sparkles, Info } from 'lucide-react';

import { Select } from '../../atoms/Select';
import { ModelSelectorDropdown } from '../../model-selector/ModelSelectorDropdown';
import { Tooltip } from '../../atoms/Tooltip';
import type { AIModel } from '../../model-selector/types';
import type {
  ImageGenSettings,
  QuickGenerateRequest,
  QuickGenerateResult,
  ResolutionConfig,
  ModelConfig,
  ModelParam,
  SelectParam,
  NumberParam,
  SliderParam,
  BooleanParam,
} from '../../../types/image-gen';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface QuickGenerateBarProps {
  settings: ImageGenSettings | null;
  onGenerate: (request: QuickGenerateRequest) => Promise<QuickGenerateResult>;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function QuickGenerateBar({
  settings,
  onGenerate,
}: QuickGenerateBarProps) {
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState(settings?.defaultModel || 'seedream-v4');
  const [imagesPerBatch, setImagesPerBatch] = useState(1);
  const [generating, setGenerating] = useState(false);

  // Dynamic params state - keyed by param key
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});

  // Get selected model config
  const selectedModel = useMemo(() => {
    return settings?.models.find(m => m.id === modelId);
  }, [settings?.models, modelId]);

  // Reset param values when model changes
  useEffect(() => {
    if (selectedModel?.supportedParams) {
      const defaults: Record<string, unknown> = {};
      for (const param of selectedModel.supportedParams) {
        defaults[param.key] = param.default;
      }
      setParamValues(defaults);
    } else {
      setParamValues({});
    }
  }, [selectedModel?.id]);

  // Transform image-gen models to AIModel format for the selector
  const aiModels: AIModel[] = useMemo(() => {
    if (!settings?.models) return [];
    return settings.models
      .filter(m => m.enabled)
      .map(m => ({
        id: m.id,
        name: m.name,
        provider: {
          id: 'nano-gpt',
          name: 'NanoGPT',
        },
        group: m.payloadType === 'resolution' ? 'Resolution Models' : 'Standard Models',
        capabilities: {
          vision: false,
          research: false,
          imageGen: true,
          coding: false,
        },
        contextWindow: 0,
        formattedContext: m.supports8k ? '8K' : '4K',
      }));
  }, [settings?.models]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || generating) return;

    setGenerating(true);

    // Build resolution config from params
    const resolution: ResolutionConfig = {
      type: selectedModel?.payloadType === 'resolution' ? 'preset' : 'dimensions',
      preset: (paramValues.resolution as string) || 'auto',
      aspectRatio: paramValues.aspect_ratio === 'auto' ? null : (paramValues.aspect_ratio as string) || null,
    };

    // Build extParams from remaining param values
    const extParams: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(paramValues)) {
      if (key !== 'resolution' && key !== 'aspect_ratio' && value !== undefined) {
        extParams[key] = value;
      }
    }

    try {
      await onGenerate({
        prompt: prompt.trim(),
        model: modelId,
        resolution,
        imagesPerBatch,
        references: [],
        extParams,
      });

      setPrompt('');
    } catch (err) {
      console.error('Quick generate failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [prompt, modelId, selectedModel, paramValues, imagesPerBatch, generating, onGenerate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  }, [handleGenerate]);

  const handleModelSelect = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      setModelId(ids[0]);
    }
  }, []);

  const handleParamChange = useCallback((key: string, value: unknown) => {
    setParamValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const supportedParams = selectedModel?.supportedParams || [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Options row - always visible */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Model selector - always shown */}
        <ParamField label="Model">
          <ModelSelectorDropdown
            models={aiModels}
            selectedModelIds={[modelId]}
            onSelect={handleModelSelect}
            multiSelect={false}
            placeholder="Select model"
            className="!min-w-[180px] !bg-[var(--color-bg)] !border-[var(--color-border)]"
          />
        </ParamField>

        {/* Count - always shown */}
        <ParamField label="Count">
          <input
            type="number"
            min={1}
            max={10}
            value={imagesPerBatch}
            onChange={(e) => setImagesPerBatch(Number(e.target.value))}
            style={inputStyle}
          />
        </ParamField>

        {/* Dynamic params based on selected model */}
        {supportedParams.map((param) => (
          <DynamicParamControl
            key={param.key}
            param={param}
            value={paramValues[param.key]}
            onChange={(value) => handleParamChange(param.key, value)}
          />
        ))}
      </div>

      {/* Main input row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 12px',
          }}
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a prompt to generate..."
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--color-text)',
              fontSize: '13px',
              outline: 'none',
              padding: '8px 0',
            }}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 24px',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            opacity: !prompt.trim() || generating ? 0.5 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          {generating ? (
            <>
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate
            </>
          )}
        </button>
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

// -----------------------------------------------------------------------------
// PARAM FIELD WRAPPER
// -----------------------------------------------------------------------------

interface ParamFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function ParamField({ label, description, children }: ParamFieldProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {description && (
          <Tooltip content={description}>
            <Info size={12} style={{ opacity: 0.6 }} />
          </Tooltip>
        )}
      </label>
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// DYNAMIC PARAM CONTROL
// -----------------------------------------------------------------------------

interface DynamicParamControlProps {
  param: ModelParam;
  value: unknown;
  onChange: (value: unknown) => void;
}

function DynamicParamControl({ param, value, onChange }: DynamicParamControlProps) {
  switch (param.type) {
    case 'select':
      return (
        <ParamField label={param.label} description={param.description}>
          <Select
            value={(value as string) ?? param.default ?? ''}
            onChange={(val) => onChange(val)}
            options={(param as SelectParam).options}
            size="sm"
          />
        </ParamField>
      );

    case 'number':
      const numParam = param as NumberParam;
      return (
        <ParamField label={param.label} description={param.description}>
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            min={numParam.min}
            max={numParam.max}
            step={numParam.step}
            placeholder={param.default?.toString()}
            style={{ ...inputStyle, width: '80px' }}
          />
        </ParamField>
      );

    case 'slider':
      const sliderParam = param as SliderParam;
      const sliderValue = (value as number) ?? sliderParam.default ?? sliderParam.min;
      return (
        <ParamField label={param.label} description={param.description}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              value={sliderValue}
              onChange={(e) => onChange(Number(e.target.value))}
              min={sliderParam.min}
              max={sliderParam.max}
              step={sliderParam.step || 1}
              style={{
                width: '80px',
                accentColor: 'var(--color-accent)',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-text)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: '32px',
              }}
            >
              {sliderValue}
            </span>
          </div>
        </ParamField>
      );

    case 'boolean':
      return (
        <ParamField label={param.label} description={param.description}>
          <input
            type="checkbox"
            checked={(value as boolean) ?? (param as BooleanParam).default ?? false}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              accentColor: 'var(--color-accent)',
              width: '16px',
              height: '16px',
            }}
          />
        </ParamField>
      );

    default:
      return null;
  }
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '60px',
  padding: '6px 10px',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  fontSize: '12px',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--color-text)',
  fontSize: '12px',
  cursor: 'pointer',
};
