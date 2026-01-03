// =============================================================================
// SOURCE CARD SKELETON
// =============================================================================
// Loading placeholder for source cards during initial fetch.

export function SourceCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] animate-pulse">
      <div className="flex items-start gap-3">
        {/* Favicon skeleton */}
        <div className="w-5 h-5 rounded bg-[var(--color-bg-tertiary)]" />

        <div className="flex-1 min-w-0">
          {/* Title skeleton */}
          <div className="h-4 w-3/4 rounded bg-[var(--color-bg-tertiary)] mb-2" />

          {/* Domain skeleton */}
          <div className="h-3 w-1/3 rounded bg-[var(--color-bg-tertiary)] mb-2" />

          {/* Snippet skeleton */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-[var(--color-bg-tertiary)]" />
            <div className="h-3 w-2/3 rounded bg-[var(--color-bg-tertiary)]" />
          </div>
        </div>

        {/* State indicator skeleton */}
        <div className="w-7 h-7 rounded-full bg-[var(--color-bg-tertiary)]" />
      </div>

      {/* Footer skeleton */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded bg-[var(--color-bg-tertiary)]" />
          <div className="h-6 w-16 rounded bg-[var(--color-bg-tertiary)]" />
        </div>
      </div>
    </div>
  );
}

// Multiple skeletons for initial loading
export function SourceCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SourceCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default SourceCardSkeleton;
