import React, { useRef, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { cn } from '../../lib';

export type MonacoTheme = 'vs-dark' | 'light' | 'hc-black';

export interface MonacoEditorProps {
  /** The code/text content */
  value: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Editor height (CSS value or number in px) */
  height?: string | number;
  /** Color theme */
  theme?: MonacoTheme;
  /** Additional Monaco editor options */
  options?: editor.IStandaloneEditorConstructionOptions;
  /** Callback when editor is mounted */
  onMount?: OnMount;
  /** Lines to highlight (1-indexed) */
  highlightLines?: number[];
  /** CSS class for container */
  className?: string;
  /** Show loading indicator while Monaco loads */
  loading?: React.ReactNode;
}

// Language detection from file extension
export function detectLanguage(filename?: string): string {
  if (!filename) return 'plaintext';

  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    mjs: 'javascript',
    cjs: 'javascript',

    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',

    // Data
    json: 'json',
    jsonc: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    toml: 'ini',

    // Scripting
    py: 'python',
    rb: 'ruby',
    php: 'php',
    lua: 'lua',
    pl: 'perl',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    ps1: 'powershell',

    // Systems
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    hpp: 'cpp',
    rs: 'rust',
    go: 'go',
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    swift: 'swift',
    cs: 'csharp',
    fs: 'fsharp',

    // Functional
    hs: 'haskell',
    ml: 'ocaml',
    ex: 'elixir',
    exs: 'elixir',
    erl: 'erlang',
    clj: 'clojure',
    cljs: 'clojure',

    // Markup
    md: 'markdown',
    mdx: 'markdown',
    rst: 'restructuredtext',
    tex: 'latex',

    // Config
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    cmake: 'cmake',
    gradle: 'groovy',

    // SQL
    sql: 'sql',

    // GraphQL
    graphql: 'graphql',
    gql: 'graphql',

    // Other
    r: 'r',
    scala: 'scala',
    vue: 'vue',
    svelte: 'svelte',
  };

  return languageMap[ext || ''] || 'plaintext';
}

export function MonacoEditor({
  value,
  language = 'plaintext',
  readOnly = false,
  onChange,
  height = '100%',
  theme = 'vs-dark',
  options,
  onMount,
  highlightLines,
  className,
  loading,
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // Handle editor mount
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Apply line highlighting if specified
    if (highlightLines && highlightLines.length > 0) {
      const decorations = highlightLines.map(line => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-highlighted-line',
          glyphMarginClassName: 'monaco-highlighted-glyph',
        },
      }));

      decorationsRef.current = editor.deltaDecorations([], decorations);
    }

    // Call user's onMount if provided
    onMount?.(editor, monaco);
  }, [highlightLines, onMount]);

  // Handle content change
  const handleChange: OnChange = useCallback((newValue) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }
  }, [onChange]);

  // Calculate height
  const heightValue = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn('overflow-hidden rounded-lg', className)}
      style={{ height: heightValue }}
    >
      <Editor
        value={value}
        language={language}
        theme={theme}
        height="100%"
        onChange={handleChange}
        onMount={handleMount}
        loading={loading || (
          <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-[var(--color-text-tertiary)]">
            Loading editor...
          </div>
        )}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          tabSize: 2,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 12, bottom: 12 },
          ...options,
        }}
      />
    </div>
  );
}

// Inline Monaco for smaller code blocks (e.g., in chat messages)
export interface InlineMonacoProps {
  value: string;
  language?: string;
  maxLines?: number;
  className?: string;
}

export function InlineMonaco({
  value,
  language = 'plaintext',
  maxLines = 20,
  className,
}: InlineMonacoProps) {
  const lineCount = value.split('\n').length;
  const displayLines = Math.min(lineCount, maxLines);
  const lineHeight = 20; // Approximate line height
  const padding = 24; // Top + bottom padding
  const height = displayLines * lineHeight + padding;

  return (
    <MonacoEditor
      value={value}
      language={language}
      readOnly
      height={height}
      className={className}
      options={{
        lineNumbers: lineCount > 5 ? 'on' : 'off',
        folding: false,
        glyphMargin: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
      }}
    />
  );
}
