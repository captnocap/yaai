import React from 'react';
import { cn } from '../../lib';
import { IconButton } from '../atoms';

export interface ActionBarAction {
  id: string;
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export interface ActionBarProps {
  actions: ActionBarAction[];
  size?: 'sm' | 'md';
  className?: string;
}

export function ActionBar({
  actions,
  size = 'md',
  className,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5',
        'stagger-children',
        className
      )}
    >
      {actions.map((action) => (
        <IconButton
          key={action.id}
          icon={action.icon}
          onClick={action.onClick}
          size={size}
          variant="ghost"
          tooltip={action.tooltip}
          active={action.active}
          disabled={action.disabled}
          loading={action.loading}
        />
      ))}
    </div>
  );
}
