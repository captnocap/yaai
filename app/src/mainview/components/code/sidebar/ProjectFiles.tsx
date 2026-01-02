import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib';
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileJson,
  Image,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import type { FileNode } from '../../../types/snippet';

export interface ProjectFilesProps {
  projectPath: string;
  onFileSelect: (filePath: string) => void;
  selectedFile?: string;
  className?: string;
}

// File icon mapping
function getFileIcon(name: string, isOpen?: boolean): React.ReactNode {
  if (name.endsWith('/')) {
    return isOpen ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />;
  }

  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'go':
    case 'rs':
    case 'java':
    case 'cpp':
    case 'c':
    case 'h':
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case 'md':
    case 'txt':
    case 'yml':
    case 'yaml':
      return <FileText className="w-4 h-4 text-gray-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image className="w-4 h-4 text-green-400" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
}

// Demo file tree
function createDemoFileTree(projectPath: string): FileNode[] {
  return [
    {
      name: 'src',
      path: `${projectPath}/src`,
      type: 'directory',
      children: [
        {
          name: 'components',
          path: `${projectPath}/src/components`,
          type: 'directory',
          children: [
            { name: 'Button.tsx', path: `${projectPath}/src/components/Button.tsx`, type: 'file', extension: 'tsx' },
            { name: 'Input.tsx', path: `${projectPath}/src/components/Input.tsx`, type: 'file', extension: 'tsx' },
            { name: 'Modal.tsx', path: `${projectPath}/src/components/Modal.tsx`, type: 'file', extension: 'tsx' },
          ],
        },
        {
          name: 'hooks',
          path: `${projectPath}/src/hooks`,
          type: 'directory',
          children: [
            { name: 'useAuth.ts', path: `${projectPath}/src/hooks/useAuth.ts`, type: 'file', extension: 'ts' },
            { name: 'useApi.ts', path: `${projectPath}/src/hooks/useApi.ts`, type: 'file', extension: 'ts' },
          ],
        },
        { name: 'App.tsx', path: `${projectPath}/src/App.tsx`, type: 'file', extension: 'tsx' },
        { name: 'index.tsx', path: `${projectPath}/src/index.tsx`, type: 'file', extension: 'tsx' },
        { name: 'styles.css', path: `${projectPath}/src/styles.css`, type: 'file', extension: 'css' },
      ],
    },
    {
      name: 'public',
      path: `${projectPath}/public`,
      type: 'directory',
      children: [
        { name: 'index.html', path: `${projectPath}/public/index.html`, type: 'file', extension: 'html' },
        { name: 'favicon.ico', path: `${projectPath}/public/favicon.ico`, type: 'file', extension: 'ico' },
      ],
    },
    { name: 'package.json', path: `${projectPath}/package.json`, type: 'file', extension: 'json' },
    { name: 'tsconfig.json', path: `${projectPath}/tsconfig.json`, type: 'file', extension: 'json' },
    { name: 'README.md', path: `${projectPath}/README.md`, type: 'file', extension: 'md' },
  ];
}

export function ProjectFiles({
  projectPath,
  onFileSelect,
  selectedFile,
  className,
}: ProjectFilesProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load file tree (demo mode uses mock data)
  useEffect(() => {
    setLoading(true);
    // Simulate loading
    setTimeout(() => {
      setFileTree(createDemoFileTree(projectPath));
      // Expand src by default
      setExpandedDirs(new Set([`${projectPath}/src`]));
      setLoading(false);
    }, 300);
  }, [projectPath]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setFileTree(createDemoFileTree(projectPath));
      setLoading(false);
    }, 300);
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFile === node.path;
    const isDir = node.type === 'directory';

    return (
      <div key={node.path}>
        <button
          onClick={() => isDir ? toggleDir(node.path) : onFileSelect(node.path)}
          className={cn(
            'w-full flex items-center gap-1.5 py-1 px-2 text-left',
            'text-sm rounded transition-colors',
            isSelected
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isDir && (
            <span className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          )}
          {!isDir && <span className="w-4" />}
          {getFileIcon(node.name, isExpanded)}
          <span className="truncate flex-1">{node.name}</span>
        </button>

        {isDir && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-6 bg-[var(--color-bg-secondary)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-tertiary)] truncate flex-1">
          {projectPath || 'No project'}
        </span>
        <button
          onClick={handleRefresh}
          className="p-1 rounded hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {fileTree.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">
            No files found
          </div>
        ) : (
          fileTree.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
}
