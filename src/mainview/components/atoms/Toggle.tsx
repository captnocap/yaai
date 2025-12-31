import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib';

const sizes = {
  sm: {
    root: 'h-5 w-9',
    thumb: 'h-4 w-4 data-[state=checked]:translate-x-4',
  },
  md: {
    root: 'h-6 w-11',
    thumb: 'h-5 w-5 data-[state=checked]:translate-x-5',
  },
} as const;

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: keyof typeof sizes;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Toggle({
  checked,
  onChange,
  size = 'md',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'transition-colors focus-ring',
        'data-[state=checked]:bg-[var(--color-accent)]',
        'data-[state=unchecked]:bg-[var(--color-border)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizes[size].root,
        className
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-sm',
          'transition-transform',
          'data-[state=unchecked]:translate-x-0.5',
          sizes[size].thumb
        )}
      />
    </SwitchPrimitive.Root>
  );
}
