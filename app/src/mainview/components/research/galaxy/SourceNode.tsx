// =============================================================================
// SOURCE NODE
// =============================================================================
// 3D representation of a research source in the galaxy.

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { GalaxyNode } from '../../../../shared/research-types';
import { getNodeColor, getNodeEmissiveIntensity, getNodeScale } from '../../../lib/research/galaxy-layout';

interface SourceNodeProps {
  node: GalaxyNode;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export function SourceNode({ node, onClick, onHover }: SourceNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Get state-based styling
  const color = getNodeColor(node.state);
  const emissiveIntensity = getNodeEmissiveIntensity(node.state);
  const baseScale = getNodeScale(node.state);

  // Animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const t = state.clock.elapsedTime;

    // Pulsing for reading state
    if (node.state === 'reading') {
      const pulse = 1 + Math.sin(t * 4) * 0.2;
      meshRef.current.scale.setScalar(baseScale * pulse);
    }

    // Hover scale
    if (hovered) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(baseScale * 1.3, baseScale * 1.3, baseScale * 1.3),
        0.1
      );
    } else if (node.state !== 'reading') {
      meshRef.current.scale.lerp(
        new THREE.Vector3(baseScale, baseScale, baseScale),
        0.1
      );
    }

    // Glow animation
    if (glowRef.current) {
      const glowPulse = node.state === 'reading' ? 1.5 + Math.sin(t * 3) * 0.3 : 1.3;
      glowRef.current.scale.setScalar(baseScale * glowPulse);
    }
  });

  // Handle interactions
  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(false);
    document.body.style.cursor = 'auto';
  };

  // Materials
  const mainMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: emissiveIntensity,
      metalness: 0.7,
      roughness: 0.3,
    });
  }, [color, emissiveIntensity]);

  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
  }, [color]);

  return (
    <group position={node.position}>
      {/* Main node sphere */}
      <Sphere
        ref={meshRef}
        args={[0.8, 32, 32]}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <primitive object={mainMaterial} attach="material" />
      </Sphere>

      {/* Outer glow */}
      <Sphere ref={glowRef} args={[1, 16, 16]}>
        <primitive object={glowMaterial} attach="material" />
      </Sphere>

      {/* Reading progress ring */}
      {node.state === 'reading' && (
        <ReadingProgressRing color={color} />
      )}

      {/* Label on hover */}
      {hovered && (
        <Billboard>
          <Html
            center
            distanceFactor={10}
            style={{
              pointerEvents: 'none',
              transform: 'translateY(-20px)',
            }}
          >
            <div className="px-2 py-1 rounded bg-[var(--color-bg-primary)]/90 border border-[var(--color-border)] backdrop-blur-sm whitespace-nowrap">
              <span className="text-xs text-[var(--color-text)]">
                {node.sourceId || node.id}
              </span>
              <span
                className="ml-2 text-[10px] font-medium"
                style={{ color }}
              >
                {node.state}
              </span>
            </div>
          </Html>
        </Billboard>
      )}

      {/* State indicator particles */}
      {(node.state === 'reading' || node.state === 'approved') && (
        <StateParticles color={color} intensity={node.state === 'reading' ? 1 : 0.5} />
      )}
    </group>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENTS
// -----------------------------------------------------------------------------

function ReadingProgressRing({ color }: { color: string }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 2;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.2, 0.03, 8, 32, Math.PI * 1.5]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

function StateParticles({ color, intensity }: { color: string; intensity: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.floor(20 * intensity);

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 0.5;
      pos[i3] = Math.cos(angle) * radius;
      pos[i3 + 1] = (Math.random() - 0.5) * 0.5;
      pos[i3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, [particleCount]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 2;
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
        size={0.1}
        color={color}
        transparent
        opacity={0.8 * intensity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default SourceNode;
