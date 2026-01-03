// =============================================================================
// GALAXY CONTROLS
// =============================================================================
// View mode controls for the galaxy visualization.

import { Eye, Globe2, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

type ViewMode = 'sovereign' | 'galaxy' | 'immersive';

interface GalaxyControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onReset?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  className?: string;
}

export function GalaxyControls({
  viewMode,
  onViewModeChange,
  onReset,
  onZoomIn,
  onZoomOut,
  className = '',
}: GalaxyControlsProps) {
  const viewModes: Array<{
    mode: ViewMode;
    icon: React.ElementType;
    label: string;
    description: string;
  }> = [
    {
      mode: 'sovereign',
      icon: Eye,
      label: 'Sovereign',
      description: 'Overview from above',
    },
    {
      mode: 'galaxy',
      icon: Globe2,
      label: 'Galaxy',
      description: 'Orbital view with rotation',
    },
    {
      mode: 'immersive',
      icon: Maximize2,
      label: 'Immersive',
      description: 'Inside the galaxy',
    },
  ];

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg bg-[var(--color-bg-primary)]/80 backdrop-blur-sm border border-[var(--color-border)] ${className}`}
    >
      {/* View mode buttons */}
      <div className="flex items-center gap-1 pr-2 border-r border-[var(--color-border)]">
        {viewModes.map((vm) => {
          const Icon = vm.icon;
          const isActive = viewMode === vm.mode;

          return (
            <button
              key={vm.mode}
              onClick={() => onViewModeChange(vm.mode)}
              title={`${vm.label}: ${vm.description}`}
              className={`p-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            title="Zoom out"
            className="p-2 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        )}
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            title="Zoom in"
            className="p-2 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            title="Reset view"
            className="p-2 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Floating version for overlay
export function GalaxyControlsFloating(props: GalaxyControlsProps) {
  return (
    <GalaxyControls
      {...props}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-lg"
    />
  );
}

export default GalaxyControls;
