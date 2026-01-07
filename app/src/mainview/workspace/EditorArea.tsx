// =============================================================================
// EDITOR AREA
// =============================================================================
// Main container for the workspace pane system. Renders the layout tree.

import React from 'react';
import { EditorGroupContainer } from './EditorGroupContainer';
import { useWorkspacePanesContext } from './useWorkspacePanes';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface EditorAreaProps {
  className?: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function EditorArea({ className }: EditorAreaProps) {
  const { state, computed } = useWorkspacePanesContext();

  // If no views are open, show empty state
  if (!computed.hasViews) {
    return <EmptyWorkspace />;
  }

  return (
    <div
      className={className}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <EditorGroupContainer node={state.layout} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// EMPTY STATE
// -----------------------------------------------------------------------------

function EmptyWorkspace() {
  const { actions } = useWorkspacePanesContext();

  const handleQuickOpen = (type: 'chat' | 'code' | 'image') => {
    actions.openView(type);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '48px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '8px',
          }}
        >
          Welcome to YAAI
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            marginBottom: '32px',
            lineHeight: 1.5,
          }}
        >
          Start a new conversation, code session, or generate images.
          Open multiple views and arrange them however you like.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <QuickOpenButton
            label="New Chat"
            onClick={() => handleQuickOpen('chat')}
          />
          <QuickOpenButton
            label="Code Session"
            onClick={() => handleQuickOpen('code')}
          />
          <QuickOpenButton
            label="Image Gen"
            onClick={() => handleQuickOpen('image')}
          />
        </div>

        <div
          style={{
            marginTop: '48px',
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <p style={{ marginBottom: '8px' }}>Keyboard shortcuts:</p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <span><kbd style={kbdStyle}>Ctrl+Tab</kbd> Switch views</span>
            <span><kbd style={kbdStyle}>Ctrl+\</kbd> Split pane</span>
            <span><kbd style={kbdStyle}>Ctrl+W</kbd> Close tab</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  backgroundColor: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'monospace',
};

// -----------------------------------------------------------------------------
// QUICK OPEN BUTTON
// -----------------------------------------------------------------------------

interface QuickOpenButtonProps {
  label: string;
  onClick: () => void;
}

function QuickOpenButton({ label, onClick }: QuickOpenButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        color: 'var(--color-text)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      className="hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)]"
    >
      {label}
    </button>
  );
}
