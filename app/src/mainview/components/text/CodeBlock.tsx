import React, { useState, useMemo } from 'react';
import { Check, Copy, FileCode } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
// Import common languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import yaml from 'highlight.js/lib/languages/yaml';
import { cn } from '../../lib';
import { IconButton } from '../atoms';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('golang', go);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: number;
  filename?: string;
  className?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = true,
  highlightLines = [],
  maxHeight,
  filename,
  className,
  compact = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlight the code
  const highlightedCode = useMemo(() => {
    if (!code) return '';

    try {
      if (language && hljs.getLanguage(language)) {
        const result = hljs.highlight(code, { language });
        return result.value;
      } else {
        // Auto-detect language
        const result = hljs.highlightAuto(code);
        return result.value;
      }
    } catch {
      // Fallback to plain text
      return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [code, language]);

  const lines = highlightedCode.split('\n');

  // Language display name mapping
  const displayLanguage = language?.toLowerCase() || 'code';
  const langDisplayNames: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    py: 'Python',
    python: 'Python',
    rust: 'Rust',
    rs: 'Rust',
    go: 'Go',
    golang: 'Go',
    bash: 'Bash',
    sh: 'Shell',
    shell: 'Shell',
    sql: 'SQL',
    json: 'JSON',
    html: 'HTML',
    xml: 'XML',
    css: 'CSS',
    yaml: 'YAML',
    yml: 'YAML',
    md: 'Markdown',
    markdown: 'Markdown',
  };

  return (
    <div
      className={cn(
        'relative group rounded-lg overflow-hidden',
        'bg-[#0d1117] text-[#e6edf3]',
        'border border-[#30363d]',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
    >
      {/* Header with filename and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-2 text-xs text-[#7d8590]">
          <FileCode className="h-3.5 w-3.5" />
          <span className="font-medium">
            {filename || langDisplayNames[displayLanguage] || displayLanguage}
          </span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            icon={copied ? <Check className="text-green-400" size={14} /> : <Copy size={14} />}
            onClick={handleCopy}
            size="sm"
            variant="ghost"
            tooltip={copied ? 'Copied!' : 'Copy code'}
            className="text-[#7d8590] hover:text-white hover:bg-[#30363d] h-6 w-6"
          />
        </div>
      </div>

      {/* Code content */}
      <div
        className={cn(
          'overflow-auto custom-scrollbar',
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <pre className={cn('p-3 leading-relaxed font-mono', compact ? 'text-[11px]' : 'text-[13px]')}>
          <code>
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  highlightLines.includes(i + 1) && 'bg-yellow-500/10 -mx-3 px-3'
                )}
              >
                {showLineNumbers && (
                  <span className="select-none pr-4 text-[#484f58] text-right w-10 shrink-0 font-mono">
                    {i + 1}
                  </span>
                )}
                <span
                  className="flex-1 whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: line || ' ' }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
