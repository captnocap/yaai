// =============================================================================
// HELLO WORLD ARTIFACT UI
// =============================================================================
// A simple React component for displaying the greeting.

import React from 'react';
import type { ArtifactUIProps } from '../../src/mainview/types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface HelloData {
  message: string;
  timestamp: string;
  executedBy: string;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export default function HelloWorldUI({ data, manifest, onAction, onRefresh }: ArtifactUIProps<HelloData>) {
  const [name, setName] = React.useState('');

  const handleRefresh = () => {
    onRefresh({ name: name || undefined });
  };

  return (
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Greeting display */}
      <div style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: 'var(--color-text)',
        textAlign: 'center',
      }}>
        {data?.message || 'Click "Greet" to start!'}
      </div>

      {/* Timestamp */}
      {data?.timestamp && (
        <div style={{
          fontSize: '12px',
          color: 'var(--color-text-tertiary)',
        }}>
          {new Date(data.timestamp).toLocaleString()}
        </div>
      )}

      {/* Input form */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '16px',
      }}>
        <input
          type="text"
          placeholder="Enter a name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text)',
            outline: 'none',
            width: '200px',
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
        />
        <button
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: 'var(--color-accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Greet
        </button>
      </div>

      {/* Executed by */}
      <div style={{
        marginTop: '24px',
        padding: '12px',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
      }}>
        Artifact: {manifest.name} v{manifest.version}
      </div>
    </div>
  );
}

// Register for iframe rendering
window.__ARTIFACT_RENDER__ = () => {
  const props = window.__ARTIFACT_PROPS__;
  if (!props) return;

  const root = document.getElementById('root');
  if (!root) return;

  // Simple render without React DOM (for demo)
  // In production, this would use createRoot from react-dom/client
  root.innerHTML = `
    <div style="padding: 24px; text-align: center; font-family: system-ui;">
      <div style="font-size: 32px; font-weight: bold; color: var(--color-text);">
        ${props.data?.message || 'Hello, World!'}
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: var(--color-text-tertiary);">
        ${props.data?.timestamp ? new Date(props.data.timestamp).toLocaleString() : ''}
      </div>
    </div>
  `;
};
