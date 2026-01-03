// =============================================================================
// GALAXY CANVAS
// =============================================================================
// React Three Fiber canvas wrapper for the 3D galaxy visualization.

import { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import type { GalaxyNode, GalaxyEdge, ScoutAgent, SourceState } from '../../../../shared/research-types';
import { GalaxyScene } from './GalaxyScene';
import { GalaxyOverlay } from './GalaxyOverlay';

interface GalaxyCanvasProps {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  scouts: ScoutAgent[];
  coreActive: boolean;
  viewMode: 'sovereign' | 'galaxy' | 'immersive';
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  className?: string;
}

export function GalaxyCanvas({
  nodes,
  edges,
  scouts,
  coreActive,
  viewMode,
  onNodeClick,
  onNodeHover,
  className = '',
}: GalaxyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate stats for overlay
  const stats = {
    totalNodes: nodes.length,
    pendingNodes: nodes.filter((n) => n.state === 'pending').length,
    readingNodes: nodes.filter((n) => n.state === 'reading').length,
    completeNodes: nodes.filter((n) => n.state === 'complete').length,
    activeScouts: scouts.filter((s) => s.status === 'searching' || s.status === 'approaching').length,
    totalScouts: scouts.length,
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {/* R3F Canvas */}
      <Canvas
        camera={{
          position: viewMode === 'immersive' ? [0, 0, 20] : [0, 30, 60],
          fov: viewMode === 'immersive' ? 90 : 60,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <GalaxyScene
            nodes={nodes}
            edges={edges}
            scouts={scouts}
            coreActive={coreActive}
            viewMode={viewMode}
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
          />
          <Preload all />
        </Suspense>
      </Canvas>

      {/* 2D Overlay */}
      <GalaxyOverlay stats={stats} viewMode={viewMode} />
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

export default GalaxyCanvas;
