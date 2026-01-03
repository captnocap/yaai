
import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CreditCard, ChevronUp, Zap, Image, FileText, Database } from 'lucide-react';
import { cn } from '../../lib';

// -----------------------------------------------------------------------------
// MOCK DATA
// -----------------------------------------------------------------------------

const USAGE_DATA = {
    total: 42.87,
    currency: '$',
    period: 'Current Billing Period',
    breakdown: [
        { id: 'inference', label: 'Model Inference', icon: Zap, cost: 28.50, color: 'text-blue-400' },
        { id: 'research', label: 'Deep Research', icon: FileText, cost: 8.20, color: 'text-purple-400' },
        { id: 'image', label: 'Image Generation', icon: Image, cost: 4.50, color: 'text-pink-400' },
        { id: 'storage', label: 'Vector Storage', icon: Database, cost: 1.67, color: 'text-green-400' },
    ]
};

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function UsageDetails({ className }: { className?: string }) {
    return (
        <div className={cn("flex flex-col", className)}>
            <div className="p-3 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider mb-1">
                    {USAGE_DATA.period}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[var(--color-text)]">
                        {USAGE_DATA.currency}{USAGE_DATA.total.toFixed(2)}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">USD</span>
                </div>
            </div>

            <div className="p-2">
                {USAGE_DATA.breakdown.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-[var(--color-bg-tertiary)] rounded-md transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded bg-[var(--color-bg-primary)] ${item.color}`}>
                                <item.icon size={12} />
                            </div>
                            <span className="text-sm text-[var(--color-text-secondary)]">{item.label}</span>
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text)]">
                            {USAGE_DATA.currency}{item.cost.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/50">
                <div className="text-xs text-center text-[var(--color-text-tertiary)]">
                    Resets in 12 days
                </div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export interface UsageTrackerProps {
    expanded: boolean;
    className?: string;
}

export function UsageTracker({ expanded, className }: UsageTrackerProps) {
    const [open, setOpen] = useState(false);

    // Common trigger button content
    const TriggerContent = (
        <>
            <div className={cn(
                "flex items-center justify-center w-5 h-5 rounded-md transition-colors",
                open ? "text-[var(--color-accent)]" : ""
            )}>
                <CreditCard size={18} />
            </div>

            {expanded && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <div className="flex flex-col items-start leading-none gap-0.5">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Usage Cost</span>
                        <span className="text-sm font-semibold text-[var(--color-text)]">
                            {USAGE_DATA.currency}{USAGE_DATA.total.toFixed(2)}
                        </span>
                    </div>
                    <ChevronUp
                        size={14}
                        className={cn(
                            "text-[var(--color-text-tertiary)] transition-transform duration-200",
                            open ? "rotate-180" : ""
                        )}
                    />
                </div>
            )}
        </>
    );

    // INLINE ACCORDION MODE (Expanded Navigation)
    if (expanded) {
        return (
            <div className={cn("flex flex-col gap-2 w-full", className)}>
                {open && (
                    <div className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                        <UsageDetails />
                    </div>
                )}

                <button
                    onClick={() => setOpen(!open)}
                    className={cn(
                        "flex items-center gap-3 w-full p-2.5 rounded-lg transition-all duration-200 border border-transparent",
                        open
                            ? "bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                            : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                    )}
                    style={{ justifyContent: 'flex-start' }}
                >
                    {TriggerContent}
                </button>
            </div>
        );
    }

    // POPOVER MODE (Collapsed Navigation)
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <div className={cn('relative', className)}>
                    <button
                        className={cn(
                            "flex items-center gap-3 w-full p-2.5 rounded-lg transition-all duration-200 border border-transparent",
                            open
                                ? "bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                                : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                        )}
                        style={{ justifyContent: 'center' }}
                    >
                        {TriggerContent}
                    </button>
                </div>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    side="right"
                    align="end"
                    sideOffset={15}
                    className="w-64 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]"
                >
                    <UsageDetails />
                    <Popover.Arrow className="fill-[var(--color-border)]" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
