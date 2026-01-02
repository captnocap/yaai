# Deep Research Visualization — The Knowledge Cosmos

> **Experience Goal:** A visceral, 3D representation of the research process designed as an "Ambient Waiting Room." It provides a hypnotic, screen-saver-like window into the system's cognition while the user waits for the next Human-in-the-Loop (HITL) decision point.

---

## 1. Visual Metaphor & Atmosphere

### 1.1 The Environment
-   **Style**: Dark, sci-fi data visualization (inspired by *Minority Report* UI, *GraphCommons*, or *Obsidian Graph View* but 3D).
-   **Background**: Deep void (`#050508`) with subtle nebula-like fog representing the "Unknown."
-   **Center**: The "Query Core" — a pulsing sun-like orb representing the user's initial question.

### 1.2 The Entities

| Entity | Representation | Animation |
| :--- | :--- | :--- |
| **Scout** | Fast-moving particles / trails | Launches from Core into the void. Zig-zags when searching. |
| **Source (Node)** | 3D Geometric shapes (Spheres/Cubes) | Spawns wireframe -> Fills with color upon verification. |
| **Link (Edge)** | Glowing lines | Draws from Core to Source, or Source to Source. |
| **Rejection** | Particle explosion / Disintegration | Node turns red, crumbles, pieces drift away. |
| **Knowledge** | A solidified cluster/constellation | The final stable structure of connected nodes. |

---

## 2. Interaction Data Cycle

The visualization mirrors the backend states defined in the core spec.

### 2.1 State: Searching (The Hunt)
1.  **Launch**: Streams of particles (scouts) shoot out from the Query Core.
2.  **Discovery**: Particles slow down and "orbit" a point in empty space.
3.  **Spawn**: A wireframe "Candidate Node" appears at that point.
    *   *Visual*: Low opacity, flickering.

### 2.2 State: Evaluating (The Trial)
1.  **Reading**: The Candidate Node pulses (heartbeat effect).
2.  **Connecting**: A beam connects the Core to the Candidate (data transfer).
3.  **Decision**:
    *   **Approved**: Node solidifies, glows Green/Blue. A permanent strong edge is established.
    *   **Rejected**: Node turns Red. It shakes violently and shatters. Debris fades out. The particle returns to the Core.

### 2.3 State: Synthesis (The Network)
1.  **Clustering**: Nodes start to attract each other based on "Semantic Similarity."
2.  **Cross-Linking**: New edges form between approved nodes (independent of the Core).
3.  **The Map**: The camera slowly zooms out to reveal the interconnected shape of the research topic.

---

## 3. Technical Implementation (React Three Fiber)

### 3.1 Tech Stack
-   **Renderer**: `react-three-fiber`
-   **Abstractions**: `@react-three/drei` (OrbitControls, Stars, Trails)
-   **Physics/Layout**: `d3-force-3d` (for calculating node positions) or `react-use-cannon` (if actual physics required).
-   **Post-Processing**: `@react-three/postprocessing` (Bloom, Vignette, Chromatic Aberration).

### 3.2 Component Structure

```mermaid
graph TD
    Canvas --> Scene
    Scene --> Lighting
    Scene --> PostEffects
    Scene --> DataVis
    
    DataVis --> NodeSystem
    DataVis --> EdgeSystem
    DataVis --> ParticleSystem (Scouts)
    
    NodeSystem --> NodeMesh (InstancedMesh)
    EdgeSystem --> LineSegments
```

### 3.3 Performance & Ambient Considerations
-   **Instancing**: Use `InstancedMesh` for nodes (rendering 1000s efficiently).
-   **Low Power Mode**: Since this runs while waiting, it must not consume excessive GPU. Reduce simulation tick rate when user is idle.
-   **Non-Interference**: The visualization is purely a "read-only" spectator view; it does not block or replace the main functional UI.

---

## 4. UI Overlay & Controls

The 3D view sits *behind* the translucent UI panels (Glassmorphism).

### 4.1 Overlay Controls
-   **View Modes**:
    *   *Sovereign*: Top-down, orthographic.
    *   *Galaxy*: Perspective, orbiting camera.
    *   *Immersive*: First-person "fly through" the data.
-   **Filter**: "Show Rejected" (toggle ghost nodes), "Show Citations Only".

### 4.2 Interactivity
-   **Hover**: Hovering a node highlights its edges and shows a 2D HTML tooltip (Label/Title).
-   **Click**: Focuses camera on node and opens the "Source Card" in the side panel.

---

## 5. Visual Polish Details

-   **Bloom**: High threshold bloom to make connections and "Core" look incandescent.
-   **Depth of Field**: Subtle tilt-shift effect to make the data look miniature/precious.
-   **Motion Blur**: Only for the "Scout" particles to emphasize speed.

---

---

## 6. Integration with Workflow

This component lives in the "dead space" of the application flow:

1.  **Active Research**: User triggers a long-running research task.
2.  **The Wait**: The main panel fades into this 3D visualization.
    *   *User Mindset*: "I wonder what it's finding..."
    *   *Visuals*: High activity, particles flying, graph expanding.
3.  **HITL Trigger**: The system needs a decision (e.g., "Approve Source?").
    *   *Transition*: The 3D view blurs/dims. A modal overlay appears *over* the cosmos.
    *   *Interaction*: User makes a decision in the modal.
4.  **Resumption**: Modal closes, 3D view sharpens, and the visualization reacts to the new input (e.g., a branch of the graph lights up or dies off based on the decision).
