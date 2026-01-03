// =============================================================================
// SCOUT PARTICLES
// =============================================================================
// Animated particles representing scout agents exploring the galaxy.

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { ScoutAgent } from '../../../../shared/research-types';

interface ScoutParticlesProps {
  scouts: ScoutAgent[];
}

export function ScoutParticles({ scouts }: ScoutParticlesProps) {
  return (
    <group>
      {scouts.map((scout) => (
        <ScoutParticle key={scout.id} scout={scout} />
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------------
// INDIVIDUAL SCOUT
// -----------------------------------------------------------------------------

interface ScoutParticleProps {
  scout: ScoutAgent;
}

function ScoutParticle({ scout }: ScoutParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  // Calculate path based on scout status
  const { startPos, endPos, color } = useMemo(() => {
    const start: [number, number, number] = [0, 0, 0]; // Core
    let end: [number, number, number] = scout.targetPosition || [
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 60,
    ];

    let col = '#6366f1'; // Default indigo

    switch (scout.status) {
      case 'searching':
        col = '#6366f1'; // Indigo - searching
        break;
      case 'approaching':
        col = '#a855f7'; // Purple - found something
        break;
      case 'returning':
        // Reverse direction
        end = start;
        col = '#10b981'; // Emerald - bringing back data
        break;
      case 'idle':
        col = '#6b7280'; // Gray
        break;
    }

    return { startPos: start, endPos: end, color: col };
  }, [scout.status, scout.targetPosition]);

  // Animate along path
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const speed = scout.status === 'returning' ? 2 : 1;
    progressRef.current += delta * speed * 0.3;

    if (progressRef.current > 1) {
      progressRef.current = 0;
    }

    // Smooth path with some curve
    const t = progressRef.current;
    const easedT = easeInOutCubic(t);

    // Add some waviness to the path
    const wobble = Math.sin(t * Math.PI * 4) * 2;

    meshRef.current.position.x = THREE.MathUtils.lerp(startPos[0], endPos[0], easedT) + wobble * 0.3;
    meshRef.current.position.y = THREE.MathUtils.lerp(startPos[1], endPos[1], easedT) + Math.sin(t * Math.PI * 2) * 3;
    meshRef.current.position.z = THREE.MathUtils.lerp(startPos[2], endPos[2], easedT) + wobble * 0.3;
  });

  if (scout.status === 'idle') {
    return null; // Don't render idle scouts
  }

  return (
    <Trail
      width={0.5}
      length={8}
      color={new THREE.Color(color)}
      attenuation={(t) => t * t}
    >
      <Sphere ref={meshRef} args={[0.15, 16, 16]} position={startPos}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
        />
      </Sphere>
    </Trail>
  );
}

// -----------------------------------------------------------------------------
// UTILITY
// -----------------------------------------------------------------------------

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// -----------------------------------------------------------------------------
// PARTICLE SWARM (for many scouts)
// -----------------------------------------------------------------------------

interface ParticleSwarmProps {
  count: number;
  active: boolean;
}

export function ParticleSwarm({ count, active }: ParticleSwarmProps) {
  const particlesRef = useRef<THREE.Points>(null);

  const { positions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const baseColor = new THREE.Color('#6366f1');

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Start near center
      pos[i3] = (Math.random() - 0.5) * 5;
      pos[i3 + 1] = (Math.random() - 0.5) * 5;
      pos[i3 + 2] = (Math.random() - 0.5) * 5;

      // Random outward velocity
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      vel[i3] = Math.cos(angle) * Math.cos(elevation) * (0.1 + Math.random() * 0.2);
      vel[i3 + 1] = Math.sin(elevation) * (0.1 + Math.random() * 0.2);
      vel[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * (0.1 + Math.random() * 0.2);

      // Color
      col[i3] = baseColor.r;
      col[i3 + 1] = baseColor.g;
      col[i3 + 2] = baseColor.b;
    }

    return { positions: pos, velocities: vel, colors: col };
  }, [count]);

  useFrame(() => {
    if (!particlesRef.current || !active) return;

    const posAttr = particlesRef.current.geometry.getAttribute('position');
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Move particles
      posArray[i3] += velocities[i3];
      posArray[i3 + 1] += velocities[i3 + 1];
      posArray[i3 + 2] += velocities[i3 + 2];

      // Check distance
      const dist = Math.sqrt(
        posArray[i3] ** 2 +
        posArray[i3 + 1] ** 2 +
        posArray[i3 + 2] ** 2
      );

      // Reset if too far
      if (dist > 50) {
        posArray[i3] = (Math.random() - 0.5) * 5;
        posArray[i3 + 1] = (Math.random() - 0.5) * 5;
        posArray[i3 + 2] = (Math.random() - 0.5) * 5;

        // New random velocity
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        velocities[i3] = Math.cos(angle) * Math.cos(elevation) * (0.1 + Math.random() * 0.2);
        velocities[i3 + 1] = Math.sin(elevation) * (0.1 + Math.random() * 0.2);
        velocities[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * (0.1 + Math.random() * 0.2);
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={active ? 0.8 : 0.2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default ScoutParticles;
