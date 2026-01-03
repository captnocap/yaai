// =============================================================================
// GALAXY SCENE
// =============================================================================
// Main 3D scene with lighting, post-processing, and all galaxy elements.

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { GalaxyNode, GalaxyEdge, ScoutAgent } from '../../../../shared/research-types';
import { QueryCore } from './QueryCore';
import { SourceNode } from './SourceNode';
import { ScoutParticles } from './ScoutParticles';
import { ConnectionLines } from './ConnectionLines';

interface GalaxySceneProps {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  scouts: ScoutAgent[];
  coreActive: boolean;
  viewMode: 'sovereign' | 'galaxy' | 'immersive';
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}

export function GalaxyScene({
  nodes,
  edges,
  scouts,
  coreActive,
  viewMode,
  onNodeClick,
  onNodeHover,
}: GalaxySceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Gentle rotation for galaxy view
  useFrame((state, delta) => {
    if (viewMode === 'galaxy' && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  // Camera position based on view mode
  useMemo(() => {
    switch (viewMode) {
      case 'sovereign':
        camera.position.set(0, 50, 80);
        break;
      case 'galaxy':
        camera.position.set(0, 30, 60);
        break;
      case 'immersive':
        camera.position.set(0, 0, 20);
        break;
    }
  }, [viewMode, camera]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />

      {/* Main directional light */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        color="#ffffff"
      />

      {/* Point lights for drama */}
      <pointLight position={[0, 0, 0]} intensity={2} color="#6366f1" distance={50} />
      <pointLight position={[30, 10, -20]} intensity={0.5} color="#a855f7" distance={40} />
      <pointLight position={[-30, -10, 20]} intensity={0.5} color="#10b981" distance={40} />

      {/* Fog for depth */}
      <fog attach="fog" args={['#0a0a0f', 50, 150]} />

      {/* Background stars */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Main galaxy group */}
      <group ref={groupRef}>
        {/* Central query core */}
        <Float
          speed={2}
          rotationIntensity={0.2}
          floatIntensity={0.5}
          floatingRange={[-0.1, 0.1]}
        >
          <QueryCore active={coreActive} />
        </Float>

        {/* Connection lines */}
        <ConnectionLines nodes={nodes} edges={edges} />

        {/* Source nodes */}
        {nodes.map((node) => (
          <SourceNode
            key={node.id}
            node={node}
            onClick={() => onNodeClick?.(node.id)}
            onHover={(hovered) => onNodeHover?.(hovered ? node.id : null)}
          />
        ))}

        {/* Scout particles */}
        <ScoutParticles scouts={scouts} />
      </group>

      {/* Camera controls */}
      <OrbitControls
        enablePan={viewMode !== 'immersive'}
        enableZoom={true}
        enableRotate={viewMode !== 'immersive'}
        autoRotate={viewMode === 'galaxy'}
        autoRotateSpeed={0.5}
        minDistance={10}
        maxDistance={150}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI - Math.PI / 6}
        dampingFactor={0.05}
        enableDamping
      />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.002, 0.002)}
          blendFunction={BlendFunction.NORMAL}
        />
        <Vignette
          offset={0.3}
          darkness={0.6}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  );
}

export default GalaxyScene;
