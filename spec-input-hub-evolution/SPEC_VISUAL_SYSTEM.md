# Visual Experience Layer — Specification

> Folder: spec-input-hub-evolution
> Version: 1.0.0
> Last Updated: 2026-01-07

This specification defines the radical visual layer of the YAAI application. It leverages React Three Fiber (R3F) and specialized shaders to provide real-time, atmospheric feedback on AI activity, memory resonance, and affective states.

---

## 1. Architecture & Flow

### 1.1 Visual Signal Flow

```
[System Event] → [Signal Normalizer] → [Shader Uniforms]
       ↓                ↓                    ↓
[Streaming]        [Intensity]          [R3F Scene]
[Memory Hit]       [Duration]           [Post-Proc]
[Affect Change]    [Color Map]          [Display]
```

1. **System Event**: Occurs in the backend or artifact loader (e.g., `ai:stream-chunk`, `memory:resonance`).
2. **Signal Normalizer**: Converts raw data into visual parameters (0.0 to 1.0 intensity, hex to vec3).
3. **Shader Uniforms**: Updates the R3F components' material uniforms.
4. **Scene Update**: Particles, glows, and geometries react in the 3D space.

### 1.2 Module Structure

```
app/src/mainview/components/effects/
├── VisualSystemProvider.tsx       # Context for sync'd visual state
├── shaders/
│   ├── alchemy.frag.glsl          # Circle particle shader
│   ├── mood.frag.glsl             # Atmospheric glow shader
│   └── loom.vert.glsl             # Convergence thread shader
├── components/
│   ├── AlchemyCircle.tsx          # Rotating R3F particle ring
│   ├── SynthesisLoom.tsx          # Converging multi-model threads
│   └── MoodGlow.tsx               # Reactive background lighting
└── useVisualSignal.ts             # Hook to hook into WS events
```

---

## 2. Data Model & Schema

### 2.1 Types & Interfaces

```typescript
// app/src/mainview/types/visuals.ts

export type VisualAuraType = 'idle' | 'active' | 'success' | 'warning' | 'error';

export interface VisualSignal {
  id: string;
  type: VisualAuraType;
  intensity: number;      // 0.0 - 1.0
  velocity: number;       // Speed of particles/transitions
  palette: string[];      // HSL or Hex colors to cycle
  source: 'ai' | 'memory' | 'system';
}

export interface ShadowAuraState {
  primaryColor: string;
  secondaryColor: string;
  pulsationFreq: number;
  bloomStrength: number;
}
```

---

## 3. Component Implementation

### 3.1 The Alchemy Circle

**Path**: `app/src/mainview/components/effects/components/AlchemyCircle.tsx`

```typescript
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * R3F Particle Ring that surrounds the InputHub.
 * Rotates and changes density based on system activity signals.
 */
export const AlchemyCircle: React.FC<{ signal: VisualSignal }> = ({ signal }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const { clock } = state;
    
    // Rotate ring based on intensity
    meshRef.current.rotation.z += 0.005 + (signal.intensity * 0.1);
    
    // Update shader time/intensity uniforms
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.getElapsedTime();
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.uIntensity.value = signal.intensity;
  });

  return (
    <points ref={meshRef}>
      <circleGeometry args={[5, 128]} />
      <shaderMaterial 
        fragmentShader={alchemyFrag} 
        vertexShader={alchemyVert} 
        transparent 
      />
    </points>
  );
};
```

---

## 4. Workflows & UI

### 4.1 Mood Glow (Background Layer)

The **Mood Glow** integrates directly with the `L2 Affect` state to change the atmosphere of the entire shell.

```
┌─────────────────────────────────────────────────────────────┐
│                      [ App Header ]                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│       [Shadow Persona]                 [Chat Area]          │
│                                                             │
│         ( Reactive )                   ( Primary )          │
│          ( Glow )                     ( Content )           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      [ InputHub ]                           │
│                   (Alchemy Circle)                          │
└─────────────────────────────────────────────────────────────┘
```

* **Transition Logic**: When `affect_category` shifts from `neutral` to `insight`, the glow transitions from a muted `#222` to a vibrant electric indigo with high bloom.

---

## 5. API & Protocol

### 5.1 Visual Signal Registry

Visual signals are typically derived from WebSocket events but can be triggered manually for UI actions.

| Channel | Direction | Payload | Description |
| --- | --- | --- | --- |
| `visual:strobe` | Push | `{ duration: number, color: string }` | Triggers a global visual "flash" (e.g., on memory save) |
| `visual:mood-shift` | Push | `ShadowAuraState` | Updates the global background aura |

---

## 6. Error Handling

### 6.1 Performance Graceful Degradation

| Situation | Action | User Message |
| --- | --- | --- |
| WebGL Context Lost | Switch to CSS-only gradients | *Optional notification in console* |
| Low Frame Rate | Reduce particle count (LOD) | None |

---

## 7. Security & Performance

### 7.1 Performance Strategy

* **LOD (Level of Detail)**: If the system detects frame drops below 30FPS, the `VisualSystemProvider` drops particle counts in the Alchemy Circle and Synthesis Loom.
* **GPU Context Sharing**: One single `<Canvas>` is used for all persistent effects to avoid multiple GL context overhead.
* **Canvas Sizing**: The R3F canvas uses `dpr={1}` by default to save juice, only jumping to `dpr={[1, 2]}` if the user explicitly enables "High Quality Effects".

---

*End of Visual Experience Layer specification.*
