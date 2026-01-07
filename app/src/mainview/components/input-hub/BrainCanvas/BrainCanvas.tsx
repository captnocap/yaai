// =============================================================================
// BRAIN CANVAS
// =============================================================================
// Three.js brain visualization with N64/PS1 low-poly aesthetic.
// React-three-fiber wrapper for the 3D scene.

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ACTIVITY_COLORS, ACTIVITY_INTENSITY, type BrainActivity } from './useBrainActivity';

// =============================================================================
// TYPES
// =============================================================================

export interface BrainCanvasProps {
  activity: BrainActivity;
  size?: number;
  className?: string;
}

// =============================================================================
// BRAIN MESH COMPONENT
// =============================================================================

interface BrainMeshProps {
  activity: BrainActivity;
}

function BrainMesh({ activity }: BrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Create low-poly brain geometry (N64/PS1 style)
  const geometry = useMemo(() => {
    // Start with icosahedron and deform it to look brain-like
    const geo = new THREE.IcosahedronGeometry(1, 1); // Low subdivision for chunky look

    // Get position attribute
    const positions = geo.attributes.position;
    const vertex = new THREE.Vector3();

    // Deform vertices to create brain-like shape
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      // Flatten slightly on Y axis (top/bottom)
      vertex.y *= 0.75;

      // Stretch on X axis (left/right lobes)
      vertex.x *= 1.2;

      // Add asymmetric bulges for lobes
      const angle = Math.atan2(vertex.z, vertex.x);

      // Front lobe bulge
      if (vertex.z > 0) {
        vertex.z *= 1.1;
      }

      // Create central groove (corpus callosum area)
      if (Math.abs(vertex.x) < 0.3 && vertex.y > 0) {
        vertex.y -= 0.15;
      }

      // Add some noise for organic feel
      const noise = Math.sin(vertex.x * 5) * 0.05 +
                    Math.cos(vertex.y * 4) * 0.05 +
                    Math.sin(vertex.z * 6) * 0.03;
      vertex.multiplyScalar(1 + noise);

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Compute flat normals for that PS1 look
    geo.computeVertexNormals();

    return geo;
  }, []);

  // Animation
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;
    const intensity = ACTIVITY_INTENSITY[activity];
    const color = ACTIVITY_COLORS[activity];

    // Base rotation (slow idle spin)
    meshRef.current.rotation.y = time * 0.1;

    // Activity-based animations
    switch (activity) {
      case 'idle':
        // Subtle breathing pulse
        meshRef.current.scale.setScalar(1 + Math.sin(time * 0.5) * 0.02);
        break;

      case 'typing':
        // Gentle wobble
        meshRef.current.rotation.x = Math.sin(time * 2) * 0.05;
        meshRef.current.rotation.z = Math.cos(time * 2.5) * 0.03;
        meshRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.03);
        break;

      case 'memory_write':
        // Expanding pulse
        const writePulse = Math.sin(time * 8) * 0.5 + 0.5;
        meshRef.current.scale.setScalar(1 + writePulse * 0.1);
        meshRef.current.rotation.y += 0.02;
        break;

      case 'memory_retrieve':
        // Contracting pull
        const retrievePulse = Math.cos(time * 6) * 0.5 + 0.5;
        meshRef.current.scale.setScalar(1 - retrievePulse * 0.05);
        meshRef.current.rotation.y -= 0.015;
        break;

      case 'consolidating':
        // Sweep rotation
        meshRef.current.rotation.y = time * 0.8;
        meshRef.current.rotation.x = Math.sin(time * 2) * 0.2;
        meshRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.05);
        break;

      default:
        // Affect states - color pulse with intensity
        if (activity.startsWith('affect_')) {
          meshRef.current.scale.setScalar(1 + Math.sin(time * 4) * intensity * 0.08);
          meshRef.current.rotation.x = Math.sin(time * 1.5) * intensity * 0.1;
        }
        break;
    }

    // Update color with smooth transition
    const targetColor = new THREE.Color(color);
    materialRef.current.color.lerp(targetColor, 0.1);

    // Opacity based on intensity
    materialRef.current.opacity = 0.7 + intensity * 0.3;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        ref={materialRef}
        color={ACTIVITY_COLORS[activity]}
        wireframe={false}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// =============================================================================
// WIREFRAME OVERLAY
// =============================================================================

interface WireframeOverlayProps {
  activity: BrainActivity;
}

function WireframeOverlay({ activity }: WireframeOverlayProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Same geometry as brain
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const positions = geo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      vertex.y *= 0.75;
      vertex.x *= 1.2;
      if (vertex.z > 0) vertex.z *= 1.1;
      if (Math.abs(vertex.x) < 0.3 && vertex.y > 0) vertex.y -= 0.15;
      const noise = Math.sin(vertex.x * 5) * 0.05 +
                    Math.cos(vertex.y * 4) * 0.05 +
                    Math.sin(vertex.z * 6) * 0.03;
      vertex.multiplyScalar(1 + noise);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    return geo;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    // Match main brain rotation
    meshRef.current.rotation.y = time * 0.1;

    // Scale slightly larger
    meshRef.current.scale.setScalar(1.02);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        color="#ffffff"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// =============================================================================
// VERTEX PARTICLES (retro effect)
// =============================================================================

function VertexParticles({ activity }: { activity: BrainActivity }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    // Create some floating particles around the brain
    const count = 20;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.3 + Math.random() * 0.3;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.75;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    return pos;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.elapsedTime;

    // Rotate with brain
    pointsRef.current.rotation.y = time * 0.1;

    // Pulse based on activity
    const intensity = ACTIVITY_INTENSITY[activity];
    pointsRef.current.scale.setScalar(1 + Math.sin(time * 2) * intensity * 0.1);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={ACTIVITY_COLORS[activity]}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BrainCanvas({
  activity,
  size = 120,
  className,
}: BrainCanvasProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
        border: '1px solid var(--color-border)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: false, alpha: true }} // No antialiasing for retro look
        dpr={1} // Low DPR for pixelated feel
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.5} />

          <group scale={0.9}>
            <BrainMesh activity={activity} />
            <WireframeOverlay activity={activity} />
            <VertexParticles activity={activity} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
