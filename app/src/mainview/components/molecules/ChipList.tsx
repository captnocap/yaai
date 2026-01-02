import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib';
import { Chip, IconButton, Tooltip } from '../atoms';

export interface ChipItem {
  id: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface ChipListProps {
  items: ChipItem[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  onItemClick?: (id: string) => void;
  maxVisible?: number;
  className?: string;
}

export function ChipList({
  items,
  onRemove,
  onAdd,
  onItemClick,
  maxVisible,
  className,
}: ChipListProps) {
  const visibleItems = maxVisible ? items.slice(0, maxVisible) : items;
  const hiddenCount = maxVisible ? Math.max(0, items.length - maxVisible) : 0;
  const hiddenItems = maxVisible ? items.slice(maxVisible) : [];

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visibleItems.map((item, index) => (
        <div
          key={item.id}
          className="animate-slide-in-right"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Chip
            onRemove={onRemove ? () => onRemove(item.id) : undefined}
            onClick={onItemClick ? () => onItemClick(item.id) : undefined}
            color={item.color}
            icon={item.icon}
          >
            {item.label}
          </Chip>
        </div>
      ))}

      {hiddenCount > 0 && (
        <Tooltip
          content={
            <div className="flex flex-col gap-1">
              {hiddenItems.map((item) => (
                <span key={item.id}>{item.label}</span>
              ))}
            </div>
          }
        >
          <span
            className={cn(
              'px-2 py-1 rounded-full text-sm font-medium',
              'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
              'cursor-default'
            )}
          >
            +{hiddenCount} more
          </span>
        </Tooltip>
      )}

      {onAdd && (
        <IconButton
          icon={<Plus className="h-4 w-4" />}
          onClick={onAdd}
          size="sm"
          variant="outline"
          tooltip="Add"
          className="rounded-full"
        />
      )}
    </div>
  );
}
