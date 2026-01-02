import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../../../lib';
import { X, Plus, Copy, Check } from 'lucide-react';
import type { CodeSnippet } from '../../../types/snippet';

export interface FileViewerProps {
  filePath: string;
  content: string;
  language: string;
  onClose: () => void;
  onAddSnippet: (snippet: CodeSnippet) => void;
  className?: string;
}

// Language detection from file extension
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    sql: 'sql',
  };
  return langMap[ext || ''] || 'text';
}

// Demo file content
function getDemoContent(filePath: string): string {
  if (filePath.includes('Button.tsx')) {
    return `import React from 'react';
import { cn } from '../lib';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium',
        'transition-colors focus:outline-none focus:ring-2',
        // Variants
        variant === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        variant === 'ghost' && 'bg-transparent hover:bg-gray-100',
        // Sizes
        size === 'sm' && 'px-3 py-1.5 text-sm rounded',
        size === 'md' && 'px-4 py-2 text-base rounded-md',
        size === 'lg' && 'px-6 py-3 text-lg rounded-lg',
        // States
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <span className="animate-spin mr-2">⏳</span>
      ) : null}
      {children}
    </button>
  );
}`;
  }

  if (filePath.includes('useAuth.ts')) {
    return `import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check for existing session
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        setState({ user, loading: false, error: null });
      } else {
        setState({ user: null, loading: false, error: null });
      }
    } catch (error) {
      setState({ user: null, loading: false, error: 'Failed to check auth' });
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      const user = await response.json();
      setState({ user, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: 'Login failed' }));
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, login, logout };
}`;
  }

  if (filePath.includes('App.tsx')) {
    return `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}`;
  }

  return `// ${filePath}
// This is demo content for the file viewer.

export function example() {
  console.log("Hello from ${filePath}");
  return true;
}`;
}

export function FileViewer({
  filePath,
  content: initialContent,
  language: initialLanguage,
  onClose,
  onAddSnippet,
  className,
}: FileViewerProps) {
  const [content] = useState(() => initialContent || getDemoContent(filePath));
  const [language] = useState(() => initialLanguage || detectLanguage(filePath));
  const [selection, setSelection] = useState<{
    startLine: number;
    endLine: number;
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const lines = content.split('\n');
  const fileName = filePath.split('/').pop() || filePath;

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !codeRef.current) {
      setSelection(null);
      return;
    }

    const selectedText = sel.toString();
    if (!selectedText.trim()) {
      setSelection(null);
      return;
    }

    // Find line numbers
    const range = sel.getRangeAt(0);
    const preRect = codeRef.current.getBoundingClientRect();
    const startY = range.getBoundingClientRect().top - preRect.top;
    const endY = range.getBoundingClientRect().bottom - preRect.top;

    // Estimate line numbers based on position
    const lineHeight = 20; // Approximate
    const startLine = Math.max(1, Math.floor(startY / lineHeight) + 1);
    const endLine = Math.max(startLine, Math.ceil(endY / lineHeight));

    setSelection({
      startLine,
      endLine,
      text: selectedText,
    });
  }, []);

  // Handle adding snippet
  const handleAddSnippet = () => {
    if (!selection) return;

    const snippet: CodeSnippet = {
      id: `snippet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      filePath,
      fileName,
      language,
      content: selection.text,
      startLine: selection.startLine,
      endLine: selection.endLine,
      createdAt: new Date().toISOString(),
    };

    onAddSnippet(snippet);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Handle copy
  const handleCopy = async () => {
    if (!selection) return;
    await navigator.clipboard.writeText(selection.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full bg-[var(--color-bg)]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[var(--color-text)] truncate">
            {fileName}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {language}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selection toolbar */}
      {selection && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-subtle)] border-b border-[var(--color-accent)]/20">
          <span className="text-xs text-[var(--color-text-secondary)]">
            Lines {selection.startLine}-{selection.endLine} selected
          </span>
          <div className="flex-1" />
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs',
              'bg-[var(--color-bg)] border border-[var(--color-border)]',
              'hover:bg-[var(--color-bg-secondary)] transition-colors'
            )}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleAddSnippet}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs',
              'bg-[var(--color-accent)] text-white',
              'hover:opacity-90 transition-opacity'
            )}
          >
            <Plus className="w-3 h-3" />
            Add to message
          </button>
        </div>
      )}

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre
          ref={codeRef}
          onMouseUp={handleMouseUp}
          className="p-4 text-sm font-mono leading-5 select-text"
          style={{ tabSize: 2 }}
        >
          <code className={`language-${language}`}>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-10 pr-4 text-right text-[var(--color-text-tertiary)] select-none flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-[var(--color-text)]">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
        Select code to add it to your message
      </div>
    </div>
  );
}
