// =============================================================================
// QUERY CORE
// =============================================================================
// Central pulsing sphere representing the research query.

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface QueryCoreProps {
  active: boolean;
  position?: [number, number, number];
}

export function QueryCore({ active, position = [0, 0, 0] }: QueryCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Group>(null);

  // Animation
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (meshRef.current) {
      // Pulsing scale
      const pulseScale = active ? 1 + Math.sin(t * 2) * 0.1 : 1;
      meshRef.current.scale.setScalar(pulseScale);
    }

    if (glowRef.current) {
      // Glow pulse (opposite phase)
      const glowScale = active ? 1.5 + Math.sin(t * 2 + Math.PI) * 0.2 : 1.3;
      glowRef.current.scale.setScalar(glowScale);
    }

    if (ringsRef.current) {
      // Rings rotation
      ringsRef.current.rotation.y = t * 0.5;
      ringsRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
  });

  // Core material
  const coreMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: active ? '#6366f1' : '#4b5563',
      emissive: active ? '#6366f1' : '#374151',
      emissiveIntensity: active ? 2 : 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });
  }, [active]);

  // Glow material
  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: active ? '#6366f1' : '#4b5563',
      transparent: true,
      opacity: active ? 0.3 : 0.1,
      side: THREE.BackSide,
    });
  }, [active]);

  return (
    <group position={position}>
      {/* Main core sphere */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <MeshDistortMaterial
          color={active ? '#6366f1' : '#4b5563'}
          emissive={active ? '#6366f1' : '#374151'}
          emissiveIntensity={active ? 1.5 : 0.3}
          metalness={0.9}
          roughness={0.1}
          distort={active ? 0.3 : 0.1}
          speed={active ? 2 : 0.5}
        />
      </Sphere>

      {/* Outer glow sphere */}
      <Sphere ref={glowRef} args={[2.5, 32, 32]}>
        <primitive object={glowMaterial} attach="material" />
      </Sphere>

      {/* Inner bright core */}
      <Sphere args={[0.8, 32, 32]}>
        <meshBasicMaterial
          color={active ? '#ffffff' : '#9ca3af'}
          transparent
          opacity={active ? 0.8 : 0.3}
        />
      </Sphere>

      {/* Orbital rings */}
      <group ref={ringsRef}>
        <OrbitalRing radius={3.5} color="#6366f1" opacity={active ? 0.6 : 0.2} />
        <OrbitalRing radius={4.5} color="#a855f7" opacity={active ? 0.4 : 0.1} rotationOffset={Math.PI / 4} />
        <OrbitalRing radius={5.5} color="#10b981" opacity={active ? 0.3 : 0.1} rotationOffset={Math.PI / 2} />
      </group>

      {/* Energy particles around core */}
      {active && <CoreParticles />}
    </group>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function OrbitalRing({
  radius,
  color,
  opacity,
  rotationOffset = 0,
}: {
  radius: number;
  color: string;
  opacity: number;
  rotationOffset?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3 + rotationOffset;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, rotationOffset]}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

function CoreParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 100;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Random position on sphere surface
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const radius = 3 + Math.random() * 2;

      pos[i3] = radius * Math.sin(theta) * Math.cos(phi);
      pos[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      pos[i3 + 2] = radius * Math.cos(theta);

      // Random velocity
      vel[i3] = (Math.random() - 0.5) * 0.02;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const positionAttr = particlesRef.current.geometry.getAttribute('position');
      const posArray = positionAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Move particles
        posArray[i3] += velocities[i3];
        posArray[i3 + 1] += velocities[i3 + 1];
        posArray[i3 + 2] += velocities[i3 + 2];

        // Calculate distance from center
        const dist = Math.sqrt(
          posArray[i3] ** 2 + posArray[i3 + 1] ** 2 + posArray[i3 + 2] ** 2
        );

        // Reset if too far or too close
        if (dist > 6 || dist < 2.5) {
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          const radius = 3 + Math.random() * 1;

          posArray[i3] = radius * Math.sin(theta) * Math.cos(phi);
          posArray[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
          posArray[i3 + 2] = radius * Math.cos(theta);
        }
      }

      positionAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#6366f1"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default QueryCore;
