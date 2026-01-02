// =============================================================================
// SNIPPET TYPES
// =============================================================================
// Types for code snippets selected from files.

export interface CodeSnippet {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
  /** Timestamp when snippet was created */
  createdAt: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  /** File extension (for files) */
  extension?: string;
  /** File size in bytes */
  size?: number;
  /** Last modified timestamp */
  modifiedAt?: string;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  /** Line count */
  lineCount: number;
}
