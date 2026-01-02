import React from 'react';
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  FileCode,
  FileJson2,
  Table,
  Archive,
  FileType,
} from 'lucide-react';
import { cn } from '../../lib';

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

const mimeTypeIcons: Record<string, React.ElementType> = {
  // Images
  'image/': Image,
  // Videos
  'video/': Video,
  // Audio
  'audio/': Music,
  // PDFs
  'application/pdf': FileType,
  // Archives
  'application/zip': Archive,
  'application/x-rar': Archive,
  'application/x-7z': Archive,
  'application/gzip': Archive,
  'application/x-tar': Archive,
  // Code
  'text/javascript': FileCode,
  'application/javascript': FileCode,
  'text/typescript': FileCode,
  'application/typescript': FileCode,
  'text/html': FileCode,
  'text/css': FileCode,
  'text/x-python': FileCode,
  'application/x-python': FileCode,
  // JSON
  'application/json': FileJson2,
  // Spreadsheets
  'text/csv': Table,
  'application/vnd.ms-excel': Table,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Table,
  // Text
  'text/plain': FileText,
  'text/markdown': FileText,
};

const extensionIcons: Record<string, React.ElementType> = {
  // Code
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  py: FileCode,
  rb: FileCode,
  go: FileCode,
  rs: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  h: FileCode,
  hpp: FileCode,
  html: FileCode,
  css: FileCode,
  scss: FileCode,
  sass: FileCode,
  less: FileCode,
  vue: FileCode,
  svelte: FileCode,
  php: FileCode,
  swift: FileCode,
  kt: FileCode,
  // Data
  json: FileJson2,
  yaml: FileJson2,
  yml: FileJson2,
  xml: FileCode,
  toml: FileJson2,
  // Text
  txt: FileText,
  md: FileText,
  mdx: FileText,
  rtf: FileText,
  // Spreadsheets
  csv: Table,
  xls: Table,
  xlsx: Table,
  // PDF
  pdf: FileType,
  // Archives
  zip: Archive,
  rar: Archive,
  '7z': Archive,
  tar: Archive,
  gz: Archive,
  // Images
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,
  svg: Image,
  ico: Image,
  // Video
  mp4: Video,
  webm: Video,
  mov: Video,
  avi: Video,
  mkv: Video,
  // Audio
  mp3: Music,
  wav: Music,
  ogg: Music,
  flac: Music,
  m4a: Music,
};

function getIconForType(type: string): React.ElementType {
  // Check MIME type (including prefix matches)
  for (const [key, icon] of Object.entries(mimeTypeIcons)) {
    if (type.startsWith(key) || type === key) {
      return icon;
    }
  }

  // Check extension
  const ext = type.split('.').pop()?.toLowerCase() || '';
  if (extensionIcons[ext]) {
    return extensionIcons[ext];
  }

  // Default
  return File;
}

export interface FileIconProps {
  type: string; // MIME type or extension
  size?: keyof typeof sizes;
  className?: string;
}

export function FileIcon({ type, size = 'md', className }: FileIconProps) {
  const Icon = getIconForType(type);

  return (
    <Icon
      className={cn(
        sizes[size],
        'text-[var(--color-text-secondary)]',
        className
      )}
    />
  );
}
