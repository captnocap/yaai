/**
 * Preview utilities for detecting and rendering HTML/React code blocks
 */

export type PreviewableCodeType = 'html' | 'react' | null;

/**
 * Detect if code is previewable and what type it is
 */
export function detectPreviewableCode(code: string, language?: string): PreviewableCodeType {
  const lang = language?.toLowerCase();

  // Explicit language tags
  if (lang === 'html' || lang === 'xml') return 'html';
  if (lang === 'jsx' || lang === 'tsx') return 'react';

  // Content-based detection
  const trimmed = code.trim();

  // HTML detection - check for HTML document markers
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML')
  ) {
    return 'html';
  }

  // For JS/TS, check for React patterns
  if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
    if (hasReactPatterns(code)) {
      return 'react';
    }
  }

  // If no language specified but looks like an HTML fragment
  if (!lang && /^<[a-z]+[^>]*>/i.test(trimmed) && !hasReactPatterns(code)) {
    return 'html';
  }

  return null;
}

/**
 * Check if code contains React-specific patterns
 */
function hasReactPatterns(code: string): boolean {
  // React imports
  if (/import\s+.*from\s+['"]react['"]/.test(code)) return true;

  // React hooks
  if (/\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer)\b/.test(code)) {
    return true;
  }

  // JSX with capital letter components (e.g., <App, <Button)
  if (/<[A-Z][a-zA-Z]*[\s/>]/.test(code)) return true;

  // Export default function with JSX return
  if (/export\s+(default\s+)?function\s+\w+/.test(code) && /<[a-zA-Z]/.test(code)) {
    return true;
  }

  return false;
}

/**
 * Check if code is previewable
 */
export function isPreviewable(code: string, language?: string): boolean {
  return detectPreviewableCode(code, language) !== null;
}

/**
 * Create a full HTML document for previewing raw HTML code
 */
export function createHTMLPreview(htmlCode: string): string {
  const trimmed = htmlCode.trim();

  // If it's already a full HTML document, return as-is
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return htmlCode;
  }

  // Wrap HTML fragment in a document with base styles
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { color-scheme: dark; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: #0a0a0a;
      color: #e5e5e5;
    }
    a { color: #58a6ff; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${htmlCode}
</body>
</html>`;
}

/**
 * Create a full HTML document for previewing React/JSX code
 * Includes React, ReactDOM, and Babel for in-browser transpilation
 */
export function createReactPreviewHTML(jsxCode: string): string {
  // Escape the code for embedding in HTML
  const escapedCode = jsxCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { color-scheme: dark; }
    html, body, #root { min-height: 100%; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: #0a0a0a;
      color: #e5e5e5;
    }
    #root { padding: 16px; }
    #error-display {
      padding: 16px;
      background: #2d1f1f;
      border: 1px solid #f85149;
      border-radius: 6px;
      color: #f85149;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      margin: 16px;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="user-code" type="text/babel" data-presets="react">
${escapedCode}

// Auto-render logic
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));

  // Try to find the component to render
  let ComponentToRender = null;

  // Check for common export patterns
  if (typeof App !== 'undefined') {
    ComponentToRender = App;
  } else if (typeof Component !== 'undefined') {
    ComponentToRender = Component;
  } else if (typeof Main !== 'undefined') {
    ComponentToRender = Main;
  } else if (typeof Default !== 'undefined') {
    ComponentToRender = Default;
  }

  if (ComponentToRender) {
    root.render(React.createElement(ComponentToRender));
  } else {
    // If no component found, show a hint
    root.render(React.createElement('div', {
      style: { color: '#8b949e', fontStyle: 'italic' }
    }, 'Define an App, Component, Main, or Default function to render it here.'));
  }
} catch (err) {
  console.error('Render error:', err);
}
  </script>
  <script>
    // Global error handler for Babel/React errors
    window.onerror = function(msg, url, line, col, error) {
      const errorDiv = document.createElement('div');
      errorDiv.id = 'error-display';
      errorDiv.textContent = 'Error: ' + msg;
      document.body.insertBefore(errorDiv, document.getElementById('root'));
      return true;
    };
  </script>
</body>
</html>`;
}
