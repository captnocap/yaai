// =============================================================================
// BRAIN CANVAS
// =============================================================================
// Three.js brain visualization with authentic PS1 low-poly aesthetic.
// Features: vertex snapping, color posterization, Bayer dithering.
// Reference: https://romanliutikov.com/blog/ps1-style-graphics-in-threejs

import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Brain, Cat, Skull, Box, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import { ACTIVITY_COLORS, ACTIVITY_INTENSITY, type BrainActivity } from './useBrainActivity';

// =============================================================================
// MODEL TYPES
// =============================================================================

export type ModelType = 'brain' | 'cat' | 'skull' | 'cube' | 'orb';

interface ModelOption {
  id: ModelType;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  /** Path to GLTF/GLB file if using external model */
  modelPath?: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'brain', icon: Brain, label: 'Brain' },
  { id: 'cat', icon: Cat, label: 'Cat' },
  { id: 'skull', icon: Skull, label: 'Skull' },
  { id: 'cube', icon: Box, label: 'Cube' },
  { id: 'orb', icon: Sparkles, label: 'Orb' },
];

// For future GLTF models - place files in assets/models/ and update paths here:
// const GLTF_MODELS: Record<string, string> = {
//   'brain-jar': '/assets/models/brain-jar.glb',
//   'cat-quaternius': '/assets/models/cat.glb',
// };

// =============================================================================
// PS1 SHADER DEFINITIONS
// =============================================================================

// Vertex shader with screen-space snapping (PS1 didn't have floating-point)
const ps1VertexShader = `
  uniform float uResolution;
  uniform float uTime;
  uniform float uJitterAmount;

  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalMatrix * normal;
    vPosition = position;
    vColor = vec3(1.0);

    // Transform to clip space
    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // Snap vertices to low-resolution grid (PS1 style)
    // This creates the characteristic vertex jitter/wobble
    float gridSize = uResolution;
    clipPos.xy = floor(clipPos.xy * gridSize + 0.5) / gridSize;

    // Add subtle vertex jitter based on time (optional extra wobble)
    float jitter = sin(uTime * 10.0 + position.x * 20.0) * uJitterAmount;
    clipPos.x += jitter / gridSize;

    gl_Position = clipPos;
  }
`;

// Fragment shader with color posterization and Bayer dithering
const ps1FragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uColorDepth;
  uniform float uDitherStrength;

  varying vec3 vNormal;
  varying vec3 vPosition;

  // 8x8 Bayer matrix for ordered dithering
  float bayerMatrix[64] = float[64](
     0.0/64.0, 32.0/64.0,  8.0/64.0, 40.0/64.0,  2.0/64.0, 34.0/64.0, 10.0/64.0, 42.0/64.0,
    48.0/64.0, 16.0/64.0, 56.0/64.0, 24.0/64.0, 50.0/64.0, 18.0/64.0, 58.0/64.0, 26.0/64.0,
    12.0/64.0, 44.0/64.0,  4.0/64.0, 36.0/64.0, 14.0/64.0, 46.0/64.0,  6.0/64.0, 38.0/64.0,
    60.0/64.0, 28.0/64.0, 52.0/64.0, 20.0/64.0, 62.0/64.0, 30.0/64.0, 54.0/64.0, 22.0/64.0,
     3.0/64.0, 35.0/64.0, 11.0/64.0, 43.0/64.0,  1.0/64.0, 33.0/64.0,  9.0/64.0, 41.0/64.0,
    51.0/64.0, 19.0/64.0, 59.0/64.0, 27.0/64.0, 49.0/64.0, 17.0/64.0, 57.0/64.0, 25.0/64.0,
    15.0/64.0, 47.0/64.0,  7.0/64.0, 39.0/64.0, 13.0/64.0, 45.0/64.0,  5.0/64.0, 37.0/64.0,
    63.0/64.0, 31.0/64.0, 55.0/64.0, 23.0/64.0, 61.0/64.0, 29.0/64.0, 53.0/64.0, 21.0/64.0
  );

  float getBayer(vec2 coord) {
    int x = int(mod(coord.x, 8.0));
    int y = int(mod(coord.y, 8.0));
    return bayerMatrix[y * 8 + x] - 0.5;
  }

  vec3 posterize(vec3 color, float levels) {
    return floor(color * levels + 0.5) / levels;
  }

  void main() {
    // Simple flat shading based on normal
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
    float ambient = 0.4;
    float lighting = ambient + diffuse * 0.6;

    vec3 color = uColor * lighting;

    // Apply Bayer dithering before posterization
    float dither = getBayer(gl_FragCoord.xy) * uDitherStrength;
    color += dither;

    // Posterize to limited color palette (PS1 = 15-bit, ~32 levels per channel)
    color = posterize(color, uColorDepth);

    // Clamp to valid range
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

// =============================================================================
// TYPES
// =============================================================================

export interface BrainCanvasProps {
  activity: BrainActivity;
  size?: number;
  className?: string;
  selectedModel?: ModelType;
  onModelChange?: (model: ModelType) => void;
  /** Increment this to trigger a keystroke strobe flash */
  keystrokeCount?: number;
  /** Fill parent container (ignores size prop) */
  fill?: boolean;
  /** Remove border and border radius for edge-to-edge display */
  frameless?: boolean;
}

// =============================================================================
// PS1 BRAIN MATERIAL
// =============================================================================

function createPS1Material(color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: 80.0 }, // Lower = more vertex snapping (PS1 was ~320x240)
      uTime: { value: 0 },
      uJitterAmount: { value: 0.002 },
      uColor: { value: color },
      uOpacity: { value: opacity },
      uColorDepth: { value: 16.0 }, // 15-bit color = ~32 levels, we use 16 for more visible effect
      uDitherStrength: { value: 0.04 },
    },
    vertexShader: ps1VertexShader,
    fragmentShader: ps1FragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

// =============================================================================
// GEOMETRY GENERATORS
// =============================================================================

function createBrainGeometry(): THREE.BufferGeometry {
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
  geo.computeVertexNormals();
  return geo;
}

function createCatGeometry(): THREE.BufferGeometry {
  // Simplified low-poly cat shape
  const geo = new THREE.IcosahedronGeometry(0.8, 1);
  const positions = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    // Elongate body
    vertex.z *= 1.4;
    // Flatten bottom
    if (vertex.y < 0) vertex.y *= 0.6;
    // Cat ears (points sticking up on top)
    if (vertex.y > 0.5 && Math.abs(vertex.x) > 0.3) {
      vertex.y += 0.3;
    }
    // Snout
    if (vertex.z > 0.8) {
      vertex.z += 0.2;
      vertex.y -= 0.1;
    }
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createSkullGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const positions = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    // Elongate skull vertically
    vertex.y *= 1.3;
    // Flatten back
    if (vertex.z < 0) vertex.z *= 0.8;
    // Jaw area
    if (vertex.y < -0.3) {
      vertex.x *= 0.7;
      vertex.z *= 0.8;
    }
    // Eye socket indents
    if (vertex.y > 0 && vertex.y < 0.5 && vertex.z > 0.5) {
      if (Math.abs(vertex.x) > 0.2 && Math.abs(vertex.x) < 0.6) {
        vertex.z -= 0.15;
      }
    }
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createCubeGeometry(): THREE.BufferGeometry {
  // Low-poly cube with slight deformation for PS1 feel
  const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2, 1, 1, 1);
  const positions = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    // Add slight wobble
    const noise = Math.sin(vertex.x * 3 + vertex.y * 2) * 0.03;
    vertex.multiplyScalar(1 + noise);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createOrbGeometry(): THREE.BufferGeometry {
  // Magical orb - low poly sphere with spikes
  const geo = new THREE.IcosahedronGeometry(0.9, 1);
  const positions = geo.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    // Add random spiky protrusions
    const spike = Math.sin(vertex.x * 8) * Math.cos(vertex.y * 8) * Math.sin(vertex.z * 8);
    if (spike > 0.3) {
      vertex.multiplyScalar(1.3);
    }
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function getGeometryForModel(model: ModelType): THREE.BufferGeometry {
  switch (model) {
    case 'brain': return createBrainGeometry();
    case 'cat': return createCatGeometry();
    case 'skull': return createSkullGeometry();
    case 'cube': return createCubeGeometry();
    case 'orb': return createOrbGeometry();
    default: return createBrainGeometry();
  }
}

// =============================================================================
// BRAIN MESH COMPONENT
// =============================================================================

interface BrainMeshProps {
  activity: BrainActivity;
  model: ModelType;
  keystrokeCount?: number;
}

function BrainMesh({ activity, model, keystrokeCount = 0 }: BrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const strobeRef = useRef({ flash: 0, lastKeystroke: 0 });

  // Create PS1 material
  const material = useMemo(() => {
    const color = new THREE.Color(ACTIVITY_COLORS[activity]);
    return createPS1Material(color, 0.85);
  }, []);

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  // Trigger strobe on keystroke
  useEffect(() => {
    if (keystrokeCount > strobeRef.current.lastKeystroke) {
      strobeRef.current.flash = 1.0; // Full flash
      strobeRef.current.lastKeystroke = keystrokeCount;
    }
  }, [keystrokeCount]);

  // Create geometry based on selected model
  const geometry = useMemo(() => {
    return getGeometryForModel(model);
  }, [model]);

  // Animation
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;
    const intensity = ACTIVITY_INTENSITY[activity];
    const targetColor = new THREE.Color(ACTIVITY_COLORS[activity]);

    // Decay the strobe flash
    strobeRef.current.flash *= 0.85; // Quick decay

    // Apply strobe effect - flash to white and scale up
    const flash = strobeRef.current.flash;
    const flashColor = new THREE.Color(ACTIVITY_COLORS[activity]).lerp(
      new THREE.Color('#ffffff'),
      flash * 0.7
    );

    // Update shader uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uColor.value.lerp(flash > 0.1 ? flashColor : targetColor, flash > 0.1 ? 0.5 : 0.1);
    materialRef.current.uniforms.uOpacity.value = 0.7 + intensity * 0.3 + flash * 0.3;

    // Increase jitter based on activity intensity + flash
    materialRef.current.uniforms.uJitterAmount.value = 0.002 + intensity * 0.003 + flash * 0.01;

    // Scale pop on flash
    const flashScale = 1 + flash * 0.15;

    // Activity-based animations (with flash scale multiplier)
    switch (activity) {
      case 'idle':
        // Subtle breathing pulse
        meshRef.current.scale.setScalar((1 + Math.sin(time * 0.5) * 0.02) * flashScale);
        break;

      case 'typing':
        // Gentle wobble + keystroke strobe
        meshRef.current.rotation.x = Math.sin(time * 2) * 0.05;
        meshRef.current.rotation.z = Math.cos(time * 2.5) * 0.03;
        meshRef.current.scale.setScalar((1 + Math.sin(time * 3) * 0.03) * flashScale);
        break;

      case 'memory_write':
        // Expanding pulse
        const writePulse = Math.sin(time * 8) * 0.5 + 0.5;
        meshRef.current.scale.setScalar((1 + writePulse * 0.1) * flashScale);
        meshRef.current.rotation.y += 0.02;
        break;

      case 'memory_retrieve':
        // Contracting pull
        const retrievePulse = Math.cos(time * 6) * 0.5 + 0.5;
        meshRef.current.scale.setScalar((1 - retrievePulse * 0.05) * flashScale);
        meshRef.current.rotation.y -= 0.015;
        break;

      case 'consolidating':
        // Sweep rotation
        meshRef.current.rotation.y = time * 0.8;
        meshRef.current.rotation.x = Math.sin(time * 2) * 0.2;
        meshRef.current.scale.setScalar((1 + Math.sin(time * 4) * 0.05) * flashScale);
        break;

      default:
        // Affect states - color pulse with intensity
        if (activity.startsWith('affect_')) {
          meshRef.current.scale.setScalar((1 + Math.sin(time * 4) * intensity * 0.08) * flashScale);
          meshRef.current.rotation.x = Math.sin(time * 1.5) * intensity * 0.1;
        } else {
          meshRef.current.scale.setScalar(flashScale);
        }
        break;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}

// =============================================================================
// WIREFRAME OVERLAY (uses standard material for contrast)
// =============================================================================

interface WireframeOverlayProps {
  activity: BrainActivity;
  model: ModelType;
}

function WireframeOverlay({ activity, model }: WireframeOverlayProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Same geometry as main mesh
  const geometry = useMemo(() => {
    return getGeometryForModel(model);
  }, [model]);

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
        opacity={0.12}
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
        size={0.06}
        color={ACTIVITY_COLORS[activity]}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

// =============================================================================
// SCANLINES OVERLAY (CRT effect)
// =============================================================================

function Scanlines({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, ${opacity}) 2px,
          rgba(0, 0, 0, ${opacity}) 4px
        )`,
        mixBlendMode: 'multiply',
      }}
    />
  );
}

// =============================================================================
// MODEL SELECTOR (hover-reveal side buttons)
// =============================================================================

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  isHovered: boolean;
}

function ModelSelector({ selectedModel, onModelChange, isHovered }: ModelSelectorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
        pointerEvents: isHovered ? 'auto' : 'none',
      }}
    >
      {MODEL_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedModel === option.id;

        return (
          <button
            key={option.id}
            onClick={() => onModelChange(option.id)}
            title={option.label}
            style={{
              width: 18,
              height: 18,
              padding: 0,
              border: 'none',
              borderRadius: 3,
              background: isSelected
                ? 'rgba(255, 255, 255, 0.25)'
                : 'rgba(0, 0, 0, 0.3)',
              color: isSelected
                ? 'var(--color-accent, #60a5fa)'
                : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              boxShadow: isSelected
                ? '0 0 6px rgba(96, 165, 250, 0.5)'
                : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              }
            }}
          >
            <Icon size={12} />
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BrainCanvas({
  activity,
  size = 120,
  className,
  selectedModel: externalModel,
  onModelChange: externalOnModelChange,
  keystrokeCount = 0,
  fill = false,
  frameless = false,
}: BrainCanvasProps) {
  // Internal state for model if not controlled externally
  const [internalModel, setInternalModel] = useState<ModelType>('brain');
  const [isHovered, setIsHovered] = useState(false);

  // Use external control if provided, otherwise internal
  const currentModel = externalModel ?? internalModel;
  const handleModelChange = externalOnModelChange ?? setInternalModel;

  return (
    <div
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: fill ? '100%' : size,
        height: fill ? '100%' : size,
        borderRadius: frameless ? 0 : 8,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)',
        border: frameless ? 'none' : '1px solid var(--color-border)',
        position: 'relative',
        imageRendering: 'pixelated', // Enforce pixelated rendering
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{
          antialias: false, // Critical for PS1 look
          alpha: true,
          powerPreference: 'low-power',
        }}
        dpr={1} // Force 1:1 pixel ratio for authentic low-res feel
        style={{ imageRendering: 'pixelated' }}
      >
        <Suspense fallback={null}>
          {/* Orbit controls for drag rotation and zoom */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={1.5}
            maxDistance={6}
            rotateSpeed={0.5}
            zoomSpeed={0.5}
            // Don't auto-rotate when user is interacting
            autoRotate={false}
          />

          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={0.4} />

          <group scale={0.9}>
            <BrainMesh activity={activity} model={currentModel} keystrokeCount={keystrokeCount} />
            <WireframeOverlay activity={activity} model={currentModel} />
            <VertexParticles activity={activity} />
          </group>
        </Suspense>
      </Canvas>

      {/* CRT scanlines overlay */}
      <Scanlines opacity={0.06} />

      {/* Model selector - appears on hover */}
      <ModelSelector
        selectedModel={currentModel}
        onModelChange={handleModelChange}
        isHovered={isHovered}
      />
    </div>
  );
}
