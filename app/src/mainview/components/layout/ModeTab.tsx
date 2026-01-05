// =============================================================================
// MODE TAB
// =============================================================================
// A horizontal tab button for switching between app modes.

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ModeTabProps {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}

export function ModeTab({ id, label, icon: Icon, active, onClick }: ModeTabProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: active ? 'var(--color-accent-subtle)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      className={active ? '' : 'hover:bg-[var(--color-bg-elevated)]'}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
