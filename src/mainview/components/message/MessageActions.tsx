import React, { useState } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Heart,
  Brain,
  Trash2,
  GitBranch,
  Download,
  Pencil,
} from 'lucide-react';
import { cn } from '../../lib';
import { ActionBar, type ActionBarAction } from '../molecules';

export interface MessageActionsProps {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  isLiked?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onLike?: () => void;
  onSaveToMemory?: () => void;
  onDelete?: () => void;
  onBranch?: () => void;
  onExport?: () => void;
  className?: string;
}

export function MessageActions({
  messageId,
  role,
  content,
  isLiked = false,
  onCopy,
  onEdit,
  onRegenerate,
  onLike,
  onSaveToMemory,
  onDelete,
  onBranch,
  onExport,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToMemory = () => {
    setSaved(true);
    onSaveToMemory?.();
    setTimeout(() => setSaved(false), 2000);
  };

  const userActions: ActionBarAction[] = [
    {
      id: 'copy',
      icon: copied ? <Check className="text-green-500" /> : <Copy />,
      tooltip: copied ? 'Copied!' : 'Copy',
      onClick: handleCopy,
    },
    ...(onEdit ? [{
      id: 'edit',
      icon: <Pencil />,
      tooltip: 'Edit',
      onClick: onEdit,
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      icon: <Trash2 />,
      tooltip: 'Delete',
      onClick: onDelete,
    }] : []),
  ];

  const assistantActions: ActionBarAction[] = [
    {
      id: 'copy',
      icon: copied ? <Check className="text-green-500" /> : <Copy />,
      tooltip: copied ? 'Copied!' : 'Copy',
      onClick: handleCopy,
    },
    ...(onRegenerate ? [{
      id: 'regenerate',
      icon: <RefreshCw />,
      tooltip: 'Regenerate',
      onClick: onRegenerate,
    }] : []),
    ...(onLike ? [{
      id: 'like',
      icon: <Heart className={isLiked ? 'fill-red-500 text-red-500' : ''} />,
      tooltip: isLiked ? 'Liked' : 'Like this response',
      onClick: onLike,
      active: isLiked,
    }] : []),
    ...(onSaveToMemory ? [{
      id: 'memory',
      icon: <Brain className={saved ? 'text-purple-500' : ''} />,
      tooltip: saved ? 'Saved!' : 'Save to memory',
      onClick: handleSaveToMemory,
    }] : []),
    ...(onBranch ? [{
      id: 'branch',
      icon: <GitBranch />,
      tooltip: 'Branch conversation',
      onClick: onBranch,
    }] : []),
    ...(onExport ? [{
      id: 'export',
      icon: <Download />,
      tooltip: 'Export',
      onClick: onExport,
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      icon: <Trash2 />,
      tooltip: 'Delete',
      onClick: onDelete,
    }] : []),
  ];

  return (
    <div
      className={cn(
        'opacity-0 group-hover:opacity-100 transition-opacity',
        className
      )}
    >
      <ActionBar
        actions={role === 'user' ? userActions : assistantActions}
        size="sm"
      />
    </div>
  );
}
