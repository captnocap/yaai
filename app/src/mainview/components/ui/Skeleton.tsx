import React from 'react';
import { cn } from '../../lib/cn';

// -----------------------------------------------------------------------------
// Base Skeleton
// -----------------------------------------------------------------------------

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    animate?: boolean; // Defaults to true
}

export function Skeleton({ className, animate = true, ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                'bg-primary/10 rounded-md',
                animate && 'animate-pulse',
                className
            )}
            {...props}
        />
    );
}

// -----------------------------------------------------------------------------
// Skeleton Variants
// -----------------------------------------------------------------------------

export function SkeletonCircle({ className, size = 12 }: { className?: string; size?: number }) {
    return (
        <Skeleton
            className={cn('rounded-full flex-shrink-0', className)}
            style={{ width: size * 4, height: size * 4 }} // Tailwind spacing units are roughly 4px
        />
    );
}

export function SkeletonRect({ className, width, height }: { className?: string; width?: string | number; height?: string | number }) {
    return (
        <Skeleton
            className={className}
            style={{ width, height }}
        />
    );
}

// Simulates lines of text
export function SkeletonText({
    lines = 1,
    className,
    lastLinePercent = 60
}: {
    lines?: number;
    className?: string;
    lastLinePercent?: number;
}) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-4 w-full"
                    style={{
                        width: lines > 1 && i === lines - 1 ? `${lastLinePercent}%` : undefined
                    }}
                />
            ))}
        </div>
    );
}

// -----------------------------------------------------------------------------
// Composite Skeletons
// -----------------------------------------------------------------------------

export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn('border border-border rounded-lg p-4 space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center space-x-4">
                <SkeletonCircle size={10} />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
            </div>
            {/* Content */}
            <SkeletonText lines={3} />
        </div>
    );
}

export function SkeletonChat({ align = 'left' }: { align?: 'left' | 'right' }) {
    const isRight = align === 'right';

    return (
        <div className={cn('flex items-end gap-3', isRight && 'flex-row-reverse')}>
            <SkeletonCircle size={8} />
            <div className={cn('space-y-2 max-w-[70%]', isRight && 'items-end flex flex-col')}>
                <Skeleton
                    className={cn(
                        'h-10 w-48 rounded-2xl',
                        isRight ? 'rounded-br-sm' : 'rounded-bl-sm'
                    )}
                />
                {/* Optional longer bubble */}
                {Math.random() > 0.5 && (
                    <Skeleton
                        className={cn(
                            'h-16 w-64 rounded-2xl',
                            isRight ? 'rounded-tr-sm' : 'rounded-tl-sm'
                        )}
                    />
                )}
            </div>
        </div>
    );
}
