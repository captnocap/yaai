
import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, ChevronUp, DollarSign, TrendingUp, Zap, Image, FileText, Database } from 'lucide-react';
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
// COMPONENT
// -----------------------------------------------------------------------------

export interface UsageTrackerProps {
    expanded: boolean;
    className?: string;
}

export function UsageTracker({ expanded, className }: UsageTrackerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close popup when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div
            ref={containerRef}
            className={cn('relative', className)}
        >
            {/* Detailed Popup */}
            {isOpen && (
                <div
                    className="absolute bottom-full left-0 mb-2 w-64 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50"
                    style={{ left: expanded ? '0' : '48px' }}
                >
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
            )}

            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 w-full p-2.5 rounded-lg transition-all duration-200 border border-transparent",
                    isOpen
                        ? "bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
                        : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                )}
                style={{
                    justifyContent: expanded ? 'flex-start' : 'center',
                }}
            >
                <div className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-md transition-colors",
                    isOpen ? "text-[var(--color-accent)]" : ""
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
                                isOpen ? "rotate-180" : ""
                            )}
                        />
                    </div>
                )}
            </button>
        </div>
    );
}
