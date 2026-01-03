// =============================================================================
// VARIABLE PANEL
// =============================================================================
// Panel for editing variable values detected in the prompt.

import React from 'react';
import { Variable } from 'lucide-react';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface VariablePanelProps {
  variables: string[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function VariablePanel({ variables, values, onChange }: VariablePanelProps) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Variable size={14} className="text-[var(--color-text-secondary)]" />
        <h4 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
          Variables
        </h4>
        <span className="text-xs text-[var(--color-text-secondary)]">
          ({variables.length})
        </span>
      </div>

      <div className="space-y-3">
        {variables.map((name) => (
          <div key={name}>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              <code className="px-1 py-0.5 bg-[var(--color-bg)] rounded text-amber-500">
                {`{{${name}}}`}
              </code>
            </label>
            <textarea
              value={values[name] || ''}
              onChange={(e) => onChange(name, e.target.value)}
              placeholder={`Enter value for ${name}...`}
              rows={2}
              className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]/50 resize-none focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
        Variables are detected from your prompt messages. Values will be substituted when you run.
      </p>
    </div>
  );
}
