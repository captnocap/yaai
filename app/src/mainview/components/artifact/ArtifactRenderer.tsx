// =============================================================================
// ARTIFACT RENDERER
// =============================================================================
// Renders artifact UI components in a sandboxed iframe.
// Handles postMessage communication between parent and artifact.

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ArtifactManifest, ArtifactUIMessage, ArtifactUIProps } from '../../types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ArtifactRendererProps {
  /** The artifact manifest */
  manifest: ArtifactManifest;

  /** Data from handler execution to pass to UI */
  data: unknown;

  /** Compiled UI component code (bundled JS) */
  componentCode?: string;

  /** Whether currently loading */
  loading?: boolean;

  /** Error message if load failed */
  error?: string;

  /** Handle action from artifact UI */
  onAction?: (action: string, payload?: unknown) => void;

  /** Handle refresh request from artifact UI */
  onRefresh?: (input?: unknown) => void;

  /** Handle height change from artifact (auto-resize) */
  onResize?: (height: number) => void;

  /** Handle error from artifact UI */
  onError?: (error: string) => void;

  /** Theme variables to pass to iframe */
  theme?: Record<string, string>;

  /** Sandbox permissions (CSP) */
  sandbox?: string;

  className?: string;
  style?: React.CSSProperties;
}

// -----------------------------------------------------------------------------
// DEFAULT VALUES
// -----------------------------------------------------------------------------

// Default sandbox restrictions - very restrictive
const DEFAULT_SANDBOX = 'allow-scripts';

// HTML template for the iframe
function createIframeHTML(componentCode: string, theme: Record<string, string>): string {
  const themeCSS = Object.entries(theme)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
${themeCSS}
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: transparent;
      color: var(--color-text, #e5e5e5);
    }
    #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // Artifact bridge - communication with parent
    const artifactBridge = {
      sendAction: (action, payload) => {
        window.parent.postMessage({
          type: 'action',
          action,
          payload
        }, '*');
      },
      sendRefresh: (input) => {
        window.parent.postMessage({
          type: 'refresh',
          payload: input
        }, '*');
      },
      sendReady: () => {
        window.parent.postMessage({ type: 'ready' }, '*');
      },
      sendError: (error) => {
        window.parent.postMessage({
          type: 'error',
          error: error.toString()
        }, '*');
      },
      sendResize: (height) => {
        window.parent.postMessage({
          type: 'resize',
          height
        }, '*');
      }
    };

    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      artifactBridge.sendError(message);
      return true;
    };

    // Auto-resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        artifactBridge.sendResize(entry.contentRect.height);
      }
    });
    resizeObserver.observe(document.getElementById('root'));

    // Props injected by parent
    window.__ARTIFACT_PROPS__ = null;

    // Listen for props updates from parent
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'props') {
        window.__ARTIFACT_PROPS__ = {
          data: event.data.data,
          manifest: event.data.manifest,
          onAction: artifactBridge.sendAction,
          onRefresh: artifactBridge.sendRefresh,
          theme: event.data.theme
        };
        // Re-render if component is mounted
        if (window.__ARTIFACT_RENDER__) {
          window.__ARTIFACT_RENDER__();
        }
      }
    });

    // Component code
    try {
      ${componentCode}
      artifactBridge.sendReady();
    } catch (err) {
      artifactBridge.sendError(err);
    }
  </script>
</body>
</html>`;
}

// Default theme (pulled from CSS variables)
const DEFAULT_THEME: Record<string, string> = {
  '--color-bg': '#0a0a0a',
  '--color-bg-secondary': '#141414',
  '--color-bg-tertiary': '#1a1a1a',
  '--color-bg-elevated': '#1e1e1e',
  '--color-text': '#e5e5e5',
  '--color-text-secondary': '#a3a3a3',
  '--color-text-tertiary': '#666666',
  '--color-border': '#2a2a2a',
  '--color-accent': '#06b6d4',
  '--color-accent-subtle': 'rgba(6, 182, 212, 0.1)',
  '--color-success': '#22c55e',
  '--color-warning': '#f59e0b',
  '--color-error': '#ef4444',
  '--color-info': '#3b82f6',
  '--radius-sm': '4px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function ArtifactRenderer({
  manifest,
  data,
  componentCode,
  loading = false,
  error,
  onAction,
  onRefresh,
  onResize,
  onError,
  theme = DEFAULT_THEME,
  sandbox = DEFAULT_SANDBOX,
  className,
  style,
}: ArtifactRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);

  // Handle messages from iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Security: only handle messages from our iframe
    if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
      return;
    }

    const message = event.data as ArtifactUIMessage;
    if (!message || typeof message.type !== 'string') return;

    switch (message.type) {
      case 'ready':
        setIframeReady(true);
        setIframeError(null);
        break;

      case 'action':
        onAction?.(message.action!, message.payload);
        break;

      case 'refresh':
        onRefresh?.(message.payload);
        break;

      case 'resize':
        onResize?.(message.height!);
        break;

      case 'error':
        setIframeError(message.error || 'Unknown error');
        onError?.(message.error || 'Unknown error');
        break;
    }
  }, [onAction, onRefresh, onResize, onError]);

  // Listen for messages
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Send props to iframe when ready or when data changes
  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage({
      type: 'props',
      data,
      manifest,
      theme,
    }, '*');
  }, [iframeReady, data, manifest, theme]);

  // Generate iframe srcDoc
  const srcDoc = componentCode
    ? createIframeHTML(componentCode, theme)
    : undefined;

  // Loading state
  if (loading) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: 'var(--color-bg-secondary)',
          ...style,
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            Loading {manifest.name}...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || iframeError) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          backgroundColor: 'var(--color-bg-secondary)',
          ...style,
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: '32px',
          }}>
            ⚠️
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-error)',
          }}>
            Failed to render artifact
          </span>
          <span style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            wordBreak: 'break-word',
          }}>
            {error || iframeError}
          </span>
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // No component code - show placeholder
  if (!componentCode) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          backgroundColor: 'var(--color-bg-secondary)',
          ...style,
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--color-text-tertiary)',
        }}>
          <span style={{ fontSize: '24px' }}>
            {manifest.icon || '📦'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            {manifest.name}
          </span>
          <span style={{ fontSize: '12px' }}>
            No UI component available
          </span>
        </div>
      </div>
    );
  }

  // Render iframe
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--color-bg-secondary)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Loading overlay while iframe initializes */}
      {!iframeReady && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-secondary)',
          zIndex: 10,
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox={sandbox}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent',
          opacity: iframeReady ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
        title={`Artifact: ${manifest.name}`}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// STATIC RENDERER (for simple data display without iframe)
// -----------------------------------------------------------------------------

export interface ArtifactStaticRendererProps {
  manifest: ArtifactManifest;
  data: unknown;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Simple renderer for artifacts without custom UI.
 * Displays the data as formatted JSON.
 */
export function ArtifactStaticRenderer({
  manifest,
  data,
  className,
  style,
}: ArtifactStaticRendererProps) {
  return (
    <div
      className={className}
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '16px',
        backgroundColor: 'var(--color-bg-secondary)',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>
          {manifest.icon || '📦'}
        </span>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text)',
          }}>
            {manifest.name}
          </h3>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
          }}>
            v{manifest.version}
          </p>
        </div>
      </div>

      {/* Data display */}
      <div style={{
        padding: '12px',
        backgroundColor: 'var(--color-bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}>
        <pre style={{
          margin: 0,
          fontSize: '12px',
          fontFamily: 'monospace',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.5,
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
