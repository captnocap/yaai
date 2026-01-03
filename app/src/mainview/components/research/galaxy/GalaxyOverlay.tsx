// =============================================================================
// GALAXY OVERLAY
// =============================================================================
// 2D HUD overlay showing stats and controls on top of the 3D visualization.

import { Search, BookOpen, CheckCircle, Users, Eye } from 'lucide-react';

type ViewMode = 'sovereign' | 'galaxy' | 'immersive';

interface GalaxyStats {
  totalNodes: number;
  pendingNodes: number;
  readingNodes: number;
  completeNodes: number;
  activeScouts: number;
  totalScouts: number;
}

interface GalaxyOverlayProps {
  stats: GalaxyStats;
  viewMode: ViewMode;
}

export function GalaxyOverlay({ stats, viewMode }: GalaxyOverlayProps) {
  return (
    <>
      {/* Top-left: Stats */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/80 backdrop-blur-sm border border-[var(--color-border)]">
          <h3 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
            Knowledge Galaxy
          </h3>
          <div className="space-y-1.5">
            <StatRow
              icon={<Search className="w-3.5 h-3.5" />}
              label="Sources"
              value={stats.totalNodes}
              color="text-blue-400"
            />
            <StatRow
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label="Reading"
              value={stats.readingNodes}
              color="text-purple-400"
              pulse={stats.readingNodes > 0}
            />
            <StatRow
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              label="Complete"
              value={stats.completeNodes}
              color="text-emerald-400"
            />
            <StatRow
              icon={<Users className="w-3.5 h-3.5" />}
              label="Scouts"
              value={`${stats.activeScouts}/${stats.totalScouts}`}
              color="text-amber-400"
              pulse={stats.activeScouts > 0}
            />
          </div>
        </div>
      </div>

      {/* Top-right: View mode indicator */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-primary)]/80 backdrop-blur-sm border border-[var(--color-border)]">
          <Eye className="w-4 h-4 text-[var(--color-accent)]" />
          <span className="text-xs font-medium text-[var(--color-text)]">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
          </span>
        </div>
      </div>

      {/* Bottom: Legend */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/80 backdrop-blur-sm border border-[var(--color-border)]">
          <h4 className="text-[10px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
            Legend
          </h4>
          <div className="space-y-1">
            <LegendItem color="#f59e0b" label="Pending" />
            <LegendItem color="#3b82f6" label="Approved" />
            <LegendItem color="#a855f7" label="Reading" />
            <LegendItem color="#10b981" label="Complete" />
            <LegendItem color="#6b7280" label="Rejected" />
          </div>
        </div>
      </div>

      {/* Center: Loading state */}
      {stats.totalNodes === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] animate-pulse" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Waiting for sources...
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Scouts are exploring the web
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function StatRow({
  icon,
  label,
  value,
  color,
  pulse = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <span
        className={`text-xs font-medium text-[var(--color-text)] tabular-nums ${
          pulse ? 'animate-pulse' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] text-[var(--color-text-tertiary)]">{label}</span>
    </div>
  );
}

export default GalaxyOverlay;
