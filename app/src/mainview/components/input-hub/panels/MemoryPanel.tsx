// =============================================================================
// MEMORY PANEL
// =============================================================================
// Wraps the existing MemoryStream component as a grid panel.

import React from 'react';
import { Brain } from 'lucide-react';
import { InputHubPanel } from '../InputHubPanel';
import { MemoryStream } from '../MemoryStream/MemoryStream';
import type { MemoryResult } from '../../../types/memory';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface MemoryPanelProps {
  chatId: string | null;
  query: string;
  attachedMemoryIds: string[];
  onSelect: (memory: MemoryResult) => void;
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function MemoryPanel({
  chatId,
  query,
  attachedMemoryIds,
  onSelect,
  className,
}: MemoryPanelProps) {
  return (
    <InputHubPanel
      panelId="memory"
      title="Memory"
      icon={<Brain size={10} />}
      compactHeader
      className={className}
    >
      <div className="h-full overflow-hidden">
        {query.length >= 3 ? (
          <MemoryStream
            chatId={chatId}
            query={query}
            onSelect={onSelect}
            attachedMemoryIds={attachedMemoryIds}
            horizontal={false}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-2">
            <span className="text-[10px] text-[var(--color-text-tertiary)] text-center">
              Type 3+ characters to search memories
            </span>
          </div>
        )}
      </div>
    </InputHubPanel>
  );
}
