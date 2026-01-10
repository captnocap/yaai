// =============================================================================
// MODELS PANEL
// =============================================================================
// Model selection panel for parallel responses.

import React from 'react';
import { Cpu, Check, Plus } from 'lucide-react';
import { cn } from '../../../lib';
import { InputHubPanel } from '../InputHubPanel';
import type { ModelInfo } from '../../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ModelsPanelProps {
  models: ModelInfo[];
  selectedModels: ModelInfo[];
  onToggleModel: (model: ModelInfo) => void;
  maxSelections?: number;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ModelsPanel({
  models,
  selectedModels,
  onToggleModel,
  maxSelections = 4,
  className,
}: ModelsPanelProps) {
  const selectedIds = new Set(selectedModels.map((m) => m.id));
  const canSelectMore = selectedModels.length < maxSelections;

  return (
    <InputHubPanel
      panelId="models"
      title="Models"
      icon={<Cpu size={10} />}
      compactHeader
      className={className}
    >
      <div className="h-full overflow-auto p-1.5">
        <div className="space-y-1">
          {models.map((model) => {
            const isSelected = selectedIds.has(model.id);
            const canToggle = isSelected || canSelectMore;

            return (
              <button
                key={model.id}
                onClick={() => canToggle && onToggleModel(model)}
                disabled={!canToggle}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded',
                  'text-left text-[11px]',
                  'transition-colors duration-100',
                  isSelected
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-text)]'
                    : canToggle
                    ? 'hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                    : 'opacity-50 cursor-not-allowed text-[var(--color-text-tertiary)]'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'border border-[var(--color-border)]'
                  )}
                >
                  {isSelected ? <Check size={10} /> : <Plus size={10} className="opacity-50" />}
                </span>
                <span className="truncate flex-1">{model.name}</span>
                <span className="text-[9px] text-[var(--color-text-tertiary)] shrink-0">
                  {model.provider}
                </span>
              </button>
            );
          })}
        </div>

        {models.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              No models available
            </span>
          </div>
        )}
      </div>
    </InputHubPanel>
  );
}
