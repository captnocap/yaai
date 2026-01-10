// =============================================================================
// VARIABLES PANEL
// =============================================================================
// Variable resolution panel for template variables.

import React from 'react';
import { Braces } from 'lucide-react';
import { InputHubPanel } from '../InputHubPanel';
import { VariableBlocksContainer } from '../../input/VariableBlocksContainer';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface VariablesPanelProps {
  inputText: string;
  onVariablesResolved: (values: Record<string, string>) => void;
  livePreviewEnabled?: boolean;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function VariablesPanel({
  inputText,
  onVariablesResolved,
  livePreviewEnabled = true,
  className,
}: VariablesPanelProps) {
  // Check if there are any variables in the input
  const hasVariables = /\{\{[^}]+\}\}/.test(inputText);

  return (
    <InputHubPanel
      panelId="variables"
      title="Variables"
      icon={<Braces size={10} />}
      compactHeader
      className={className}
    >
      <div className="h-full overflow-auto p-1.5">
        {hasVariables ? (
          <VariableBlocksContainer
            inputText={inputText}
            onVariablesResolved={onVariablesResolved}
            livePreviewEnabled={livePreviewEnabled}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-2">
            <span className="text-[10px] text-[var(--color-text-tertiary)] text-center">
              Use {'{{variable}}'} syntax in your message to create variables
            </span>
          </div>
        )}
      </div>
    </InputHubPanel>
  );
}
