// =============================================================================
// PROJECT LIST ITEM
// =============================================================================
// VS Code-style project item: icon left, title same height, overflow ellipsis.

import React from 'react';
import { MessageSquare, Terminal, ImagePlus, Telescope, Pin } from 'lucide-react';
import type { ProjectType } from '../../../bun/lib/stores/chat-store.types';

// Color coding for project types
const PROJECT_COLORS: Record<ProjectType, { icon: string; activeBg: string }> = {
  chat: { icon: '#3B82F6', activeBg: 'rgba(59, 130, 246, 0.12)' },
  code: { icon: '#F97316', activeBg: 'rgba(249, 115, 22, 0.12)' },
  image: { icon: '#EC4899', activeBg: 'rgba(236, 72, 153, 0.12)' },
  research: { icon: '#8B5CF6', activeBg: 'rgba(139, 92, 246, 0.12)' },
};

const PROJECT_ICONS: Record<ProjectType, React.FC<{ size: number; style?: React.CSSProperties }>> = {
  chat: MessageSquare,
  code: Terminal,
  image: ImagePlus,
  research: Telescope,
};

export interface ProjectListItemProps {
  id: string;
  type: ProjectType;
  title: string;
  preview?: string;
  isPinned: boolean;
  active: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function ProjectListItem({
  id,
  type,
  title,
  preview,
  isPinned,
  active,
  onClick,
  onContextMenu,
}: ProjectListItemProps) {
  const colors = PROJECT_COLORS[type];
  const Icon = PROJECT_ICONS[type];

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title} // Tooltip showing full title on hover
      style={{
        display: 'flex',
        alignItems: 'center', // Icon and text same height/line
        gap: '8px',
        padding: '6px 8px',
        marginBottom: '2px',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: active ? colors.activeBg : 'transparent',
        transition: 'background-color 0.1s ease',
      }}
      className={active ? '' : 'hover:bg-[var(--color-bg-elevated)]'}
    >
      {/* Icon - same height as text */}
      <Icon
        size={16}
        style={{
          color: colors.icon,
          flexShrink: 0,
        }}
      />

      {/* Title - single line, overflow ellipsis */}
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          lineHeight: '16px', // Match icon height
          fontWeight: active ? 500 : 400,
          color: 'var(--color-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>

      {/* Pin indicator */}
      {isPinned && (
        <Pin
          size={12}
          style={{
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}
