# Visual Experience Layer - Complete Specification

> **Purpose:** Transform any structured report into an immersive, multimedia documentary experience
> **Philosophy:** The rendering pipeline is decoupled from content creation. Any report in, visual experience out.
> **Approach:** Prioritize immersion over speed. A 30-second theatrical presentation beats instant raw text.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Input Contract](#2-input-contract)
3. [Galaxy Visualization](#3-galaxy-visualization)
4. [Report-Galaxy Synchronization](#4-report-galaxy-synchronization)
5. [Cinematic Mode](#5-cinematic-mode)
6. [Media Generation Pipeline](#6-media-generation-pipeline)
7. [Assembly & Rendering](#7-assembly--rendering)
8. [Export Options](#8-export-options)
9. [User Controls & Settings](#9-user-controls--settings)
10. [Performance & Optimization](#10-performance--optimization)
11. [Cost Analysis](#11-cost-analysis)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Architecture Overview

### 1.1 Core Principle

The Visual Experience Layer is **content-agnostic**. It accepts any structured report and transforms it into multiple presentation formats. The research pipeline (scouts, readers, orchestrator) is just one source of input.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTENT SOURCES                                   │
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│   │   DEEP      │   │   MANUAL    │   │   IMPORT    │   │   API       │   │
│   │   RESEARCH  │   │   WRITE     │   │   (MD/JSON) │   │   WEBHOOK   │   │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   │
│          │                 │                 │                 │           │
│          └─────────────────┴─────────────────┴─────────────────┘           │
│                                      │                                      │
│                                      ▼                                      │
│                        ┌─────────────────────────┐                         │
│                        │   STRUCTURED REPORT     │                         │
│                        │   (Universal Format)    │                         │
│                        └────────────┬────────────┘                         │
│                                     │                                       │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUAL EXPERIENCE LAYER                                │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      MEDIA GENERATION                                │  │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│   │   │  IMAGES  │  │  CHARTS  │  │  VIDEO   │  │  VOICE   │           │  │
│   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘           │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         ASSEMBLY                                     │  │
│   │   • Asset mapping          • Timestamp sync                         │  │
│   │   • Galaxy node generation • Camera path computation                │  │
│   │   • Playback script        • Transition planning                    │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      PRESENTATION MODES                              │  │
│   │                                                                      │  │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│   │   │   MANUAL     │  │   SYNCED     │  │  CINEMATIC   │              │  │
│   │   │   Reading    │  │   Scroll     │  │  Autopilot   │              │  │
│   │   └──────────────┘  └──────────────┘  └──────────────┘              │  │
│   │                                                                      │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                     │                                       │
│                                     ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         EXPORT                                       │  │
│   │   PDF • Slideshow • Interactive HTML • Video (MP4) • Audio (MP3)    │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Processing Timeline

```
PHASE              TIME          DESCRIPTION
─────────────────────────────────────────────────────────────────────────────
Content Input      0s            Report data received
Analysis           1-2s          Identify media opportunities
Media Generation   30-90s        Parallel asset creation (images, video, TTS)
Assembly           5-10s         Map assets, compute sync, plan transitions
Ready              ~2 min        Full experience available

Note: User can begin Manual reading immediately while media generates in background.
Cinematic mode unlocks when generation complete.
```

---

## 2. Input Contract

### 2.1 Universal Report Format

Any content source must conform to this schema to use the Visual Experience Layer:

```typescript
interface VisualExperienceInput {
  // Identity
  id: string
  title: string
  subtitle?: string
  date: string
  
  // Content
  sections: Section[]
  
  // Sources (for galaxy visualization)
  sources: Source[]
  
  // Metadata
  meta: {
    author?: string
    word_count: number
    estimated_read_time_minutes: number
    topics: string[]              // For image generation context
    content_type: "research" | "article" | "report" | "analysis" | "custom"
  }
}

interface Section {
  id: string
  order: number
  title: string
  content: string                  // Markdown or plain text
  
  // Inline citations reference source IDs
  citations: InlineCitation[]
  
  // Statistics for auto chart generation
  statistics?: Statistic[]
  
  // Key concepts for illustration generation
  concepts?: string[]
  
  // Subsections (optional nesting)
  subsections?: Section[]
}

interface InlineCitation {
  marker: string                   // "[1]"
  position: number                 // Character position in content
  source_id: string
  claim_snippet: string
}

interface Source {
  id: string
  url?: string                     // Optional - might be offline source
  title: string
  domain?: string
  
  // For thumbnail display
  thumbnail?: {
    url: string
    favicon: string
  }
  
  // Metadata
  author?: string
  publish_date?: string
  source_type: "primary" | "secondary" | "tertiary"
  
  // Relationships
  relationships: {
    target_id: string
    type: "cites" | "contradicts" | "supports" | "same_topic"
  }[]
  
  // Which sections cite this source
  cited_in_sections: string[]
}

interface Statistic {
  id: string
  description: string
  value: number
  unit: string
  comparison_value?: number
  comparison_label?: string
  source_id: string
  visualization_hint?: "bar" | "line" | "pie" | "comparison" | "timeline"
}
```

### 2.2 Minimum Viable Input

For basic functionality, only these fields are required:

```typescript
const minimalInput: VisualExperienceInput = {
  id: "report_001",
  title: "My Report",
  date: "2025-01-15",
  sections: [
    {
      id: "s1",
      order: 1,
      title: "Introduction",
      content: "This is the introduction text...",
      citations: []
    }
  ],
  sources: [],
  meta: {
    word_count: 500,
    estimated_read_time_minutes: 2,
    topics: ["general"],
    content_type: "article"
  }
}
```

---

## 3. Galaxy Visualization

### 3.1 Concept

The Galaxy is a 3D visualization representing the knowledge structure of a report. The central "Query Core" represents the main topic, with sources orbiting as nodes, connected by relationship lines.

### 3.2 Node Types

```
NODE TYPE           VISUAL                      DESCRIPTION
─────────────────────────────────────────────────────────────────────────────

QUERY CORE          Bright glowing sphere       Central topic/query
                    Pulsing energy              
                    Largest node                

SUB-QUERY           Medium glowing orb          Branch topics (if applicable)
                    Connected to core           
                    Section-colored             

SOURCE (Pending)    Wireframe cube              Discovered but not processed
                    Semi-transparent            
                    Subtle pulse                

SOURCE (Approved)   Glass panel with thumbnail  Processed source
                    Solid edges                 
                    Section-colored glow        

SOURCE (Rejected)   Shattered fragments         User/system rejected
                    Red particles               
                    Fading away                 

SOURCE (Active)     Bright glow + scale 1.1x    Currently referenced in view
                    Full thumbnail visible      
                    Connection lines bright     

LINK                Particle stream             Relationship between sources
                    Color indicates type        
                    Animated flow direction     
```

### 3.3 Visual Specifications

```typescript
interface GalaxyConfig {
  // Rendering
  renderer: "webgl" | "canvas"          // WebGL preferred, canvas fallback
  targetFPS: 60
  
  // Scene
  scene: {
    background: "#0A0A0F"               // Deep space blue-black
    ambientLight: 0.2
    fogDensity: 0.002                   // Distant nodes fade
  }
  
  // Camera
  camera: {
    fov: 60
    near: 0.1
    far: 2000
    defaultPosition: { x: 0, y: 50, z: 150 }
    autoRotate: true
    autoRotateSpeed: 0.2                // Subtle drift
    enableZoom: true
    enablePan: true
    zoomRange: [50, 500]
  }
  
  // Core node
  core: {
    radius: 8
    color: "#6366F1"                    // Primary indigo
    glowIntensity: 2.0
    pulseSpeed: 2000                    // ms per cycle
  }
  
  // Source nodes
  sourceNodes: {
    // Size based on citation count
    baseRadius: 3
    maxRadius: 6
    radiusScale: (citations: number) => 3 + Math.min(citations, 5) * 0.6
    
    // Thumbnail panel
    thumbnailSize: { width: 80, height: 60 }
    thumbnailBorderRadius: 4
    
    // Spacing
    minDistance: 20                     // Between nodes
    orbitRadius: { min: 40, max: 120 }  // From core
    
    // Section clustering
    sectionArcSpread: 72                // Degrees per section (360/5)
  }
  
  // Connection lines
  connections: {
    particleCount: 50
    particleSize: 0.5
    flowSpeed: 0.02
    colors: {
      cites: "#3B82F6"                  // Blue
      supports: "#10B981"               // Green
      contradicts: "#EF4444"            // Red
      same_topic: "#8B5CF6"             // Purple
    }
  }
  
  // Section colors
  sectionColors: [
    "#F59E0B",  // Amber
    "#3B82F6",  // Blue
    "#10B981",  // Green
    "#EF4444",  // Red
    "#8B5CF6",  // Purple
    "#EC4899",  // Pink
    "#06B6D4",  // Cyan
    "#84CC16"   // Lime
  ]
}
```

### 3.4 Node Data Structure

```typescript
interface GalaxyNode {
  id: string
  type: "core" | "sub_query" | "source"
  
  // Position (computed by layout algorithm)
  position: Vector3
  targetPosition: Vector3             // For animations
  
  // Visual state
  state: "pending" | "approved" | "active" | "inactive" | "rejected"
  opacity: number
  scale: number
  glowIntensity: number
  
  // Section association
  sectionId: string | null
  sectionColor: string
  
  // Source-specific data
  source?: {
    url: string
    title: string
    domain: string
    thumbnail: {
      url: string
      loaded: boolean
      texture?: Texture
    }
    citationCount: number
  }
  
  // Connections to other nodes
  connections: {
    targetId: string
    type: "cites" | "contradicts" | "supports" | "same_topic"
    visible: boolean
    intensity: number
  }[]
}
```

### 3.5 Layout Algorithm

```typescript
class GalaxyLayout {
  private nodes: Map<string, GalaxyNode>
  private config: GalaxyConfig
  
  /**
   * Position nodes in 3D space based on:
   * - Section clustering (nodes from same section grouped)
   * - Citation relationships (related nodes closer)
   * - Importance (highly cited nodes closer to center)
   */
  computeLayout(sources: Source[], sections: Section[]): void {
    // 1. Place core at origin
    this.placeCore()
    
    // 2. Assign sections to arc segments
    const sectionArcs = this.assignSectionArcs(sections)
    
    // 3. For each source, compute position
    for (const source of sources) {
      const primarySection = source.cited_in_sections[0]
      const arc = sectionArcs.get(primarySection)
      
      // Radial distance based on citation count (more citations = closer)
      const citationCount = source.cited_in_sections.length
      const radius = this.computeRadius(citationCount)
      
      // Angle within section arc
      const angle = this.computeAngleInArc(source, arc)
      
      // Vertical offset for depth
      const y = (Math.random() - 0.5) * 30
      
      // Convert to cartesian
      const position = {
        x: Math.cos(angle) * radius,
        y: y,
        z: Math.sin(angle) * radius
      }
      
      this.nodes.get(source.id).position = position
    }
    
    // 4. Run force-directed refinement to prevent overlaps
    this.applyForceDirectedRefinement(50) // 50 iterations
  }
  
  private computeRadius(citationCount: number): number {
    // More citations = closer to center
    const { min, max } = this.config.sourceNodes.orbitRadius
    const normalized = Math.min(citationCount / 5, 1)
    return max - (normalized * (max - min))
  }
  
  private applyForceDirectedRefinement(iterations: number): void {
    for (let i = 0; i < iterations; i++) {
      for (const [id, node] of this.nodes) {
        if (node.type === "core") continue
        
        let force = { x: 0, y: 0, z: 0 }
        
        // Repulsion from other nodes
        for (const [otherId, other] of this.nodes) {
          if (id === otherId) continue
          const dist = this.distance(node.position, other.position)
          if (dist < this.config.sourceNodes.minDistance) {
            const repulsion = this.normalize(this.subtract(node.position, other.position))
            const strength = (this.config.sourceNodes.minDistance - dist) * 0.1
            force = this.add(force, this.scale(repulsion, strength))
          }
        }
        
        // Apply force
        node.position = this.add(node.position, force)
      }
    }
  }
}
```

### 3.6 Thumbnail Integration

```typescript
interface ThumbnailManager {
  // Loading strategy based on camera distance
  loadingStrategy: {
    immediate: 100,      // Load if within 100 units
    lazy: 200,           // Queue for load if within 200 units
    unload: 300          // Unload textures beyond 300 units
  }
  
  // Quality tiers
  qualityTiers: {
    close: { width: 400, height: 300 },    // < 50 units
    medium: { width: 200, height: 150 },   // 50-150 units
    far: { width: 100, height: 75 }        // > 150 units
  }
  
  // Thumbnail sources (waterfall)
  async getThumbnail(url: string): Promise<ThumbnailResult> {
    // 1. Check cache
    const cached = await this.cache.get(url)
    if (cached) return cached
    
    // 2. Try Open Graph image (free)
    const ogImage = await this.fetchOGImage(url)
    if (ogImage) return this.cacheAndReturn(url, ogImage)
    
    // 3. Try screenshot API
    const screenshot = await this.screenshotAPI.capture(url)
    if (screenshot) return this.cacheAndReturn(url, screenshot)
    
    // 4. Fallback to favicon + generated card
    return this.generateFallbackCard(url)
  }
}
```

### 3.7 Interaction Handlers

```typescript
interface GalaxyInteractions {
  // Hover behavior
  onNodeHover(node: GalaxyNode): void {
    // Show tooltip
    this.tooltip.show({
      title: node.source.title,
      domain: node.source.domain,
      citations: node.source.citationCount,
      hint: "Click to open in new tab"
    })
    
    // Visual feedback
    node.scale = 1.15
    node.glowIntensity = 2.0
  }
  
  onNodeHoverEnd(node: GalaxyNode): void {
    this.tooltip.hide()
    node.scale = 1.0
    node.glowIntensity = 1.0
  }
  
  // Click behavior
  onNodeClick(node: GalaxyNode): void {
    if (node.source?.url) {
      // Launch animation
      this.playLaunchAnimation(node)
      
      // Open in new tab after brief delay
      setTimeout(() => {
        window.open(node.source.url, '_blank')
      }, 300)
      
      // Toast notification
      this.toast.show(`Opened ${node.source.domain} in new tab`)
    }
  }
  
  // Right-click context menu
  onNodeContextMenu(node: GalaxyNode, event: MouseEvent): void {
    this.contextMenu.show(event, [
      { label: "Open in new tab", action: () => this.openUrl(node) },
      { label: "Copy URL", action: () => this.copyUrl(node) },
      { label: "View findings", action: () => this.showFindings(node) },
      { label: "Scroll to citation", action: () => this.scrollToCitation(node) },
      { divider: true },
      { label: "Hide from view", action: () => this.hideNode(node) }
    ])
  }
}
```

### 3.8 Animation System

```typescript
interface GalaxyAnimations {
  // Node appearance (when source discovered)
  nodeAppear(node: GalaxyNode): Animation {
    return {
      duration: 600,
      easing: "easeOutBack",
      keyframes: {
        0: { scale: 0, opacity: 0 },
        100: { scale: 1, opacity: 1 }
      }
    }
  }
  
  // Node rejection (shatter effect)
  nodeReject(node: GalaxyNode): Animation {
    return {
      duration: 800,
      easing: "easeOutQuad",
      steps: [
        { at: 0, action: "addCracks" },
        { at: 200, action: "shatter", fragments: 25 },
        { at: 400, action: "fragmentsFloat", direction: "outward" },
        { at: 600, action: "fragmentsFade" },
        { at: 800, action: "removeNode" }
      ]
    }
  }
  
  // Node activation (when cited text is visible)
  nodeActivate(node: GalaxyNode): Animation {
    return {
      duration: 300,
      easing: "easeOutCubic",
      keyframes: {
        0: { scale: 1.0, glowIntensity: 1.0 },
        100: { scale: 1.1, glowIntensity: 2.5 }
      }
    }
  }
  
  // Camera transitions
  cameraToCluster(sectionId: string): Animation {
    const clusterCenter = this.computeClusterCenter(sectionId)
    return {
      duration: 1200,
      easing: "easeInOutCubic",
      from: this.camera.position,
      to: this.computeCameraPositionForTarget(clusterCenter)
    }
  }
  
  // Connection line appearance
  connectionDraw(from: GalaxyNode, to: GalaxyNode): Animation {
    return {
      duration: 500,
      easing: "easeOutQuad",
      type: "line_draw",
      particleSpawn: "staggered"
    }
  }
}
```

---

## 4. Report-Galaxy Synchronization

### 4.1 Sync Modes

```typescript
type SyncMode = 
  | "manual"      // User controls everything, galaxy reacts to explicit actions
  | "scroll"      // Galaxy follows scroll position
  | "cinematic"   // Playback controls both report and galaxy

interface SyncController {
  mode: SyncMode
  
  // Bidirectional mapping
  citationToNode: Map<string, string>
  nodeToCitations: Map<string, string[]>
  sectionToNodes: Map<string, string[]>
  
  // Current state
  state: {
    activeNodes: Set<string>
    activeSection: string | null
    visibleCitations: string[]
    cameraTarget: Vector3
  }
}
```

### 4.2 Scroll-Linked Sync (Mode: "scroll")

```typescript
class ScrollSyncController {
  private reportContainer: HTMLElement
  private galaxy: Galaxy
  private lastScrollPosition: number = 0
  private scrollVelocity: number = 0
  
  initialize(): void {
    this.reportContainer.addEventListener('scroll', this.onScroll.bind(this))
  }
  
  private onScroll(): void {
    const currentPosition = this.reportContainer.scrollTop
    this.scrollVelocity = Math.abs(currentPosition - this.lastScrollPosition)
    this.lastScrollPosition = currentPosition
    
    // Determine visible content
    const visibleRange = this.getVisibleRange()
    const visibleCitations = this.findCitationsInRange(visibleRange)
    const visibleSection = this.findSectionAtPosition(currentPosition)
    
    // Update galaxy based on scroll velocity
    if (this.scrollVelocity > 50) {
      // Fast scrolling - only show section-level highlighting
      this.galaxy.highlightSection(visibleSection)
    } else {
      // Slow reading - show citation-level highlighting
      this.galaxy.highlightNodes(visibleCitations.map(c => c.source_id))
      this.galaxy.showConnections(visibleCitations.map(c => c.source_id))
    }
    
    // Smooth camera drift toward active cluster
    const clusterCenter = this.galaxy.computeClusterCenter(visibleSection)
    this.galaxy.animateCameraToward(clusterCenter, {
      duration: 800,
      easing: 'easeOutCubic'
    })
  }
  
  private getVisibleRange(): { start: number, end: number } {
    const rect = this.reportContainer.getBoundingClientRect()
    return {
      start: this.reportContainer.scrollTop,
      end: this.reportContainer.scrollTop + rect.height
    }
  }
}
```

### 4.3 Highlight States

```typescript
interface HighlightSystem {
  // Visual intensity levels
  levels: {
    active: {
      opacity: 1.0,
      scale: 1.1,
      glow: 2.5,
      thumbnailVisible: true,
      labelVisible: true
    },
    related: {
      opacity: 0.7,
      scale: 1.0,
      glow: 1.2,
      thumbnailVisible: true,
      labelVisible: false
    },
    inactive: {
      opacity: 0.25,
      scale: 0.9,
      glow: 0.3,
      thumbnailVisible: false,
      labelVisible: false
    }
  }
  
  // Transition timing
  transitionDuration: 300  // ms
  
  // Apply highlight state to node
  applyState(node: GalaxyNode, level: "active" | "related" | "inactive"): void {
    const config = this.levels[level]
    
    gsap.to(node, {
      opacity: config.opacity,
      scale: config.scale,
      glowIntensity: config.glow,
      duration: this.transitionDuration / 1000,
      ease: "power2.out"
    })
    
    node.thumbnail.visible = config.thumbnailVisible
    node.label.visible = config.labelVisible
  }
}
```

### 4.4 Citation Hover Integration

```typescript
// In report text rendering
function renderCitation(citation: InlineCitation): HTMLElement {
  const element = document.createElement('span')
  element.className = 'citation'
  element.textContent = citation.marker
  element.dataset.sourceId = citation.source_id
  
  element.addEventListener('mouseenter', () => {
    // Highlight node in galaxy
    galaxy.setActiveNodes([citation.source_id])
    
    // Show tooltip with source details
    const source = sources.get(citation.source_id)
    tooltip.show({
      title: source.title,
      domain: source.domain,
      quote: citation.claim_snippet,
      position: element.getBoundingClientRect()
    })
  })
  
  element.addEventListener('mouseleave', () => {
    galaxy.clearActiveNodes()
    tooltip.hide()
  })
  
  element.addEventListener('click', () => {
    // Zoom galaxy to this node
    galaxy.focusOnNode(citation.source_id)
  })
  
  return element
}
```

### 4.5 Narrative Thread View

Visualize the order sources appear in the report:

```typescript
interface NarrativeThread {
  // Sources in order of first citation
  orderedSources: string[]
  
  // Visual representation
  render(): void {
    // Dim all regular connections
    this.galaxy.setAllConnectionsOpacity(0.1)
    
    // Draw narrative path
    for (let i = 0; i < this.orderedSources.length - 1; i++) {
      const from = this.orderedSources[i]
      const to = this.orderedSources[i + 1]
      
      this.galaxy.drawNarrativeLine(from, to, {
        color: "#FFFFFF",
        width: 2,
        animated: true,
        delay: i * 200  // Staggered appearance
      })
    }
    
    // Add sequence numbers to nodes
    this.orderedSources.forEach((sourceId, index) => {
      this.galaxy.addNodeBadge(sourceId, `${index + 1}`)
    })
  }
}
```

---

## 5. Cinematic Mode

### 5.1 Overview

Cinematic mode transforms the report into an auto-playing documentary with synchronized text reveal, voice narration, and galaxy animations.

### 5.2 Playback Architecture

```typescript
interface CinematicEngine {
  // State
  state: CinematicState
  currentTime: number          // ms
  duration: number             // total ms
  playbackSpeed: number        // 0.5 - 2.0
  
  // Components
  audioPlayer: AudioPlayer
  textRevealer: TextRevealer
  galaxyController: GalaxyController
  transitionManager: TransitionManager
  
  // Script (pre-computed timeline)
  script: CinematicScript
}

interface CinematicScript {
  totalDuration: number
  
  // Ordered events
  events: CinematicEvent[]
  
  // Pre-computed sync points
  wordTimestamps: WordTimestamp[]
  citationTimestamps: CitationTimestamp[]
  sectionTimestamps: SectionTimestamp[]
}

type CinematicEvent = 
  | { type: "section_start", time: number, sectionId: string, title: string }
  | { type: "paragraph_start", time: number, paragraphIndex: number }
  | { type: "word_reveal", time: number, wordIndex: number }
  | { type: "citation_highlight", time: number, citationId: string, nodeId: string }
  | { type: "camera_move", time: number, target: Vector3, duration: number }
  | { type: "node_activate", time: number, nodeId: string }
  | { type: "node_deactivate", time: number, nodeId: string }
  | { type: "connection_show", time: number, fromId: string, toId: string }
  | { type: "media_show", time: number, assetId: string, position: string }
  | { type: "transition", time: number, transitionType: string }
```

### 5.3 State Machine

```typescript
type CinematicState = 
  | { mode: "idle" }
  | { mode: "loading", progress: number }
  | { mode: "ready" }
  | { mode: "playing", section: number, timestamp: number }
  | { mode: "paused", section: number, timestamp: number }
  | { mode: "seeking", targetTime: number }
  | { mode: "buffering" }
  | { mode: "transitioning", from: number, to: number }
  | { mode: "complete" }

class CinematicStateMachine {
  private state: CinematicState = { mode: "idle" }
  
  async load(report: VisualExperienceInput): Promise<void> {
    this.state = { mode: "loading", progress: 0 }
    
    // Generate TTS audio
    this.state.progress = 0.2
    const audio = await this.ttsService.generate(report)
    
    // Build script from audio timestamps
    this.state.progress = 0.6
    const script = this.buildScript(report, audio.timestamps)
    
    // Preload first section's media
    this.state.progress = 0.8
    await this.preloadMedia(script.events.filter(e => e.time < 30000))
    
    this.state = { mode: "ready" }
  }
  
  play(): void {
    if (this.state.mode === "ready" || this.state.mode === "paused") {
      this.audioPlayer.play()
      this.startPlaybackLoop()
      this.state = { 
        mode: "playing", 
        section: this.currentSection,
        timestamp: this.currentTime 
      }
    }
  }
  
  private playbackLoop(): void {
    if (this.state.mode !== "playing") return
    
    const currentTime = this.audioPlayer.currentTime * 1000
    
    // Process all events up to current time
    const dueEvents = this.script.events.filter(
      e => e.time <= currentTime && e.time > this.lastProcessedTime
    )
    
    for (const event of dueEvents) {
      this.processEvent(event)
    }
    
    this.lastProcessedTime = currentTime
    requestAnimationFrame(() => this.playbackLoop())
  }
  
  private processEvent(event: CinematicEvent): void {
    switch (event.type) {
      case "word_reveal":
        this.textRevealer.revealUpTo(event.wordIndex)
        break
        
      case "citation_highlight":
        this.textRevealer.highlightCitation(event.citationId)
        this.galaxyController.activateNode(event.nodeId)
        break
        
      case "camera_move":
        this.galaxyController.animateCamera(event.target, event.duration)
        break
        
      case "section_start":
        this.transitionManager.playTransition("section_change")
        this.textRevealer.setSection(event.sectionId)
        break
        
      case "media_show":
        this.mediaOverlay.show(event.assetId, event.position)
        break
    }
  }
}
```

### 5.4 Text Reveal System

```typescript
interface TextRevealer {
  // Reveal styles
  style: "typewriter" | "word" | "phrase" | "sentence"
  
  // Current state
  currentSection: string
  revealedUpTo: number         // Character index
  
  // Visual treatment
  revealedStyle: {
    opacity: 1.0,
    color: "#F9FAFB"
  }
  
  pendingStyle: {
    opacity: 0.0,              // Or 0.2 for "visible but dimmed"
    color: "#6B7280"
  }
  
  cursorStyle: {
    show: true,
    type: "highlight" | "underline" | "block"
    color: "#6366F1"
    width: "3px"
  }
}

class TextRevealRenderer {
  private container: HTMLElement
  private words: HTMLSpanElement[]
  private revealedCount: number = 0
  
  prepare(content: string): void {
    // Split content into words, preserving whitespace and punctuation
    const tokens = this.tokenize(content)
    
    this.container.innerHTML = ''
    this.words = tokens.map((token, index) => {
      const span = document.createElement('span')
      span.textContent = token
      span.className = 'word pending'
      span.dataset.index = index.toString()
      this.container.appendChild(span)
      return span
    })
  }
  
  revealUpTo(wordIndex: number): void {
    for (let i = this.revealedCount; i <= wordIndex && i < this.words.length; i++) {
      const word = this.words[i]
      word.classList.remove('pending')
      word.classList.add('revealed')
      
      // Brief highlight on newly revealed word
      word.classList.add('just-revealed')
      setTimeout(() => word.classList.remove('just-revealed'), 200)
    }
    
    this.revealedCount = wordIndex + 1
    this.updateCursor(wordIndex)
  }
  
  private updateCursor(wordIndex: number): void {
    // Remove cursor from previous word
    this.words.forEach(w => w.classList.remove('cursor'))
    
    // Add cursor to current word
    if (wordIndex < this.words.length) {
      this.words[wordIndex].classList.add('cursor')
    }
  }
}
```

### 5.5 TTS Integration

```typescript
interface TTSService {
  provider: "elevenlabs" | "openai" | "azure" | "browser"
  
  // Voice configuration
  voice: {
    id: string
    name: string
    style: "narrative" | "conversational" | "professional"
  }
  
  // Generate audio with word-level timestamps
  async generate(report: VisualExperienceInput): Promise<TTSResult>
}

interface TTSResult {
  audioUrl: string
  duration: number
  
  // Word-level timestamps for sync
  timestamps: {
    word: string
    start: number      // ms
    end: number        // ms
    sentenceIndex: number
    paragraphIndex: number
    sectionId: string
  }[]
}

class ElevenLabsTTS implements TTSService {
  async generate(report: VisualExperienceInput): Promise<TTSResult> {
    // Convert report to speech text
    const speechText = this.buildSpeechText(report)
    
    // Call ElevenLabs API with timestamp request
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech', {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: speechText,
        voice_id: this.voice.id,
        model_id: 'eleven_turbo_v2',
        output_format: 'mp3_44100_128',
        // Request word timestamps
        timestamp_granularity: 'word'
      })
    })
    
    return this.parseResponse(response)
  }
  
  private buildSpeechText(report: VisualExperienceInput): string {
    let text = ''
    
    for (const section of report.sections) {
      // Section header
      text += `${section.title}. `
      
      // Content with citation handling
      let content = section.content
      
      // Replace citation markers with spoken form
      // "[1][2]" -> "according to source one and two"
      content = content.replace(/\[(\d+)\]/g, (match, num) => {
        const source = report.sources.find(s => s.id === num)
        if (source?.domain) {
          return `, according to ${source.domain},`
        }
        return ''
      })
      
      text += content + ' '
    }
    
    return text
  }
}

// Browser fallback
class BrowserTTS implements TTSService {
  async generate(report: VisualExperienceInput): Promise<TTSResult> {
    const speechText = this.buildSpeechText(report)
    const utterance = new SpeechSynthesisUtterance(speechText)
    
    // Estimate timestamps (less accurate than API)
    const timestamps = this.estimateTimestamps(speechText, utterance.rate)
    
    return {
      audioUrl: null,  // Browser TTS doesn't produce URL
      duration: timestamps[timestamps.length - 1].end,
      timestamps
    }
  }
}
```

### 5.6 Section Transitions

```typescript
interface TransitionManager {
  // Transition types
  transitions: {
    section_change: {
      duration: 2000,
      animation: "fade_slide",
      galaxy: "camera_pan",
      audio: "brief_pause"        // 500ms pause in narration
    },
    
    contradiction: {
      duration: 3000,
      animation: "split_screen",
      galaxy: "highlight_conflict",
      audio: "dramatic_pause"     // 1s pause
    },
    
    statistic: {
      duration: 1500,
      animation: "number_pop",
      galaxy: "none",
      audio: "emphasis"
    },
    
    conclusion: {
      duration: 2500,
      animation: "fade_gather",
      galaxy: "zoom_out_full",
      audio: "slower_pace"
    }
  }
  
  async playTransition(type: string): Promise<void> {
    const config = this.transitions[type]
    
    // Coordinate all systems
    await Promise.all([
      this.animateText(config.animation, config.duration),
      this.animateGalaxy(config.galaxy, config.duration),
      this.adjustAudio(config.audio)
    ])
  }
}
```

### 5.7 Playback Controls UI

```typescript
interface PlaybackControlsConfig {
  // Layout
  position: "bottom" | "overlay_bottom"
  height: 64
  
  // Elements
  elements: {
    // Transport
    playPause: { icon: "play" | "pause", size: 40 }
    skipBack: { icon: "skip_back", seconds: 10 }
    skipForward: { icon: "skip_forward", seconds: 10 }
    prevSection: { icon: "prev", tooltip: "Previous section" }
    nextSection: { icon: "next", tooltip: "Next section" }
    
    // Progress
    progressBar: {
      height: 4,
      bufferedColor: "#3E3E45",
      playedColor: "#6366F1",
      hoverPreview: true,
      sectionMarkers: true
    }
    
    // Time display
    timeDisplay: {
      format: "current / total",   // "1:24 / 8:45"
      font: "JetBrains Mono",
      size: 12
    }
    
    // Right side
    speedControl: {
      options: [0.5, 0.75, 1, 1.25, 1.5, 2],
      default: 1
    }
    volumeControl: {
      showSlider: "on_hover"
    }
    settingsButton: true
    fullscreenButton: true
  }
  
  // Keyboard shortcuts
  shortcuts: {
    "Space": "playPause",
    "ArrowLeft": "skipBack",
    "ArrowRight": "skipForward",
    "ArrowUp": "prevSection",
    "ArrowDown": "nextSection",
    "[": "decreaseSpeed",
    "]": "increaseSpeed",
    "M": "mute",
    "F": "fullscreen",
    "Escape": "exitCinematic"
  }
}
```

---

## 6. Media Generation Pipeline

### 6.1 Overview

The media pipeline analyzes report content and generates visual assets to enhance the experience.

```typescript
interface MediaPipeline {
  // Input
  report: VisualExperienceInput
  
  // Configuration
  config: MediaGenerationConfig
  
  // Stages
  stages: [
    "analysis",       // Identify media opportunities
    "generation",     // Create assets in parallel
    "postprocess",    // Optimize, resize, format
    "mapping"         // Associate assets with report elements
  ]
  
  // Output
  output: GeneratedMediaBundle
}
```

### 6.2 Content Analysis

```typescript
interface MediaAnalyzer {
  analyze(report: VisualExperienceInput): MediaOpportunity[] {
    const opportunities: MediaOpportunity[] = []
    
    for (const section of report.sections) {
      // 1. Section hero image
      opportunities.push({
        type: "hero_image",
        sectionId: section.id,
        prompt: this.buildHeroPrompt(section),
        priority: "required"
      })
      
      // 2. Statistics -> Charts
      if (section.statistics?.length) {
        for (const stat of section.statistics) {
          opportunities.push({
            type: "chart",
            sectionId: section.id,
            data: stat,
            chartType: stat.visualization_hint || this.inferChartType(stat),
            priority: "required"
          })
        }
      }
      
      // 3. Concepts -> Diagrams
      if (section.concepts?.length) {
        for (const concept of section.concepts) {
          opportunities.push({
            type: "concept_diagram",
            sectionId: section.id,
            concept: concept,
            prompt: this.buildConceptPrompt(concept, section),
            priority: "enhancing"
          })
        }
      }
      
      // 4. Detect comparison patterns in text
      const comparisons = this.detectComparisons(section.content)
      for (const comparison of comparisons) {
        opportunities.push({
          type: "comparison_graphic",
          sectionId: section.id,
          data: comparison,
          priority: "enhancing"
        })
      }
    }
    
    return opportunities
  }
  
  private detectComparisons(content: string): Comparison[] {
    // Pattern matching for comparison language
    const patterns = [
      /(\w+)\s+vs\.?\s+(\w+)/gi,
      /compared to (.+?),/gi,
      /unlike (.+?), (.+?) /gi,
      /(\d+%?) .+ versus (\d+%?)/gi
    ]
    
    // Extract and structure comparisons
    // ...
  }
  
  private buildHeroPrompt(section: Section): string {
    const topics = section.concepts?.join(', ') || section.title
    
    return `
      Abstract visualization representing: ${topics}
      Style: modern, minimal, dark background (#0F0F12)
      Colors: indigo (#6366F1), emerald (#10B981), purple accents
      Mood: professional, technological, ethereal
      No text, no faces, abstract forms only
    `.trim()
  }
}
```

### 6.3 Generation Services

```typescript
interface ImageGenerator {
  provider: "nanogpt" | "openai" | "stability" | "replicate"
  
  async generate(prompt: string, config: ImageConfig): Promise<GeneratedImage> {
    // Apply style consistency
    const styledPrompt = this.applyStyleGuide(prompt)
    
    const response = await this.client.generate({
      prompt: styledPrompt,
      width: config.width,
      height: config.height,
      style: config.style
    })
    
    return {
      url: response.url,
      width: config.width,
      height: config.height,
      prompt: styledPrompt,
      cost: response.cost
    }
  }
  
  private applyStyleGuide(prompt: string): string {
    const stylePostfix = `
      Dark background, color palette: deep navy (#0F0F12), 
      indigo (#6366F1), emerald (#10B981), purple (#8B5CF6).
      Clean, minimal, high contrast, professional quality.
      No watermarks, no text overlays.
    `
    return `${prompt}\n\nStyle requirements: ${stylePostfix}`
  }
}

interface VideoGenerator {
  provider: "nanogpt" | "runway" | "pika" | "stable_video"
  
  async generate(prompt: string, config: VideoConfig): Promise<GeneratedVideo> {
    return this.client.generate({
      prompt: this.applyVideoStyle(prompt),
      duration: config.duration,
      aspectRatio: config.aspectRatio,
      fps: config.fps || 24
    })
  }
}

interface ChartGenerator {
  // Use canvas/SVG rendering, not AI
  generate(data: Statistic, type: ChartType): Promise<GeneratedChart> {
    const chartConfig = this.buildChartConfig(data, type)
    
    // Render using Chart.js or D3
    const svg = await this.renderChart(chartConfig)
    
    // Convert to image
    return this.svgToImage(svg)
  }
  
  private buildChartConfig(data: Statistic, type: ChartType): ChartConfig {
    return {
      type,
      data: {
        labels: [data.comparison_label || 'Before', 'Current'],
        values: [data.comparison_value, data.value]
      },
      style: {
        backgroundColor: '#1A1A1F',
        textColor: '#F9FAFB',
        accentColor: '#6366F1',
        gridColor: '#2E2E35'
      }
    }
  }
}
```

### 6.4 Parallel Generation

```typescript
class MediaGenerationOrchestrator {
  private imageGenerator: ImageGenerator
  private videoGenerator: VideoGenerator
  private chartGenerator: ChartGenerator
  private ttsService: TTSService
  
  async generateAll(
    report: VisualExperienceInput,
    config: MediaGenerationConfig
  ): Promise<GeneratedMediaBundle> {
    
    const opportunities = this.analyzer.analyze(report)
    
    // Group by type for parallel processing
    const imageOps = opportunities.filter(o => o.type === "hero_image" || o.type === "concept_diagram")
    const chartOps = opportunities.filter(o => o.type === "chart" || o.type === "comparison_graphic")
    const videoOps = opportunities.filter(o => o.type === "video_broll")
    
    // Run all in parallel
    const [images, charts, videos, tts] = await Promise.all([
      // Images (with concurrency limit)
      this.generateImages(imageOps, { concurrency: 3 }),
      
      // Charts (fast, local rendering)
      this.generateCharts(chartOps),
      
      // Videos (if enabled)
      config.enableVideo 
        ? this.generateVideos(videoOps, { concurrency: 1 })
        : Promise.resolve([]),
      
      // TTS (single call)
      config.enableVoice
        ? this.ttsService.generate(report)
        : Promise.resolve(null)
    ])
    
    return {
      images,
      charts,
      videos,
      tts,
      totalCost: this.calculateTotalCost(images, charts, videos, tts)
    }
  }
  
  private async generateImages(
    ops: MediaOpportunity[],
    options: { concurrency: number }
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = []
    
    // Process in batches
    for (let i = 0; i < ops.length; i += options.concurrency) {
      const batch = ops.slice(i, i + options.concurrency)
      const batchResults = await Promise.all(
        batch.map(op => this.imageGenerator.generate(op.prompt, {
          width: op.type === "hero_image" ? 1200 : 800,
          height: op.type === "hero_image" ? 400 : 600
        }))
      )
      results.push(...batchResults)
      
      // Emit progress
      this.emit('progress', {
        stage: 'images',
        completed: results.length,
        total: ops.length
      })
    }
    
    return results
  }
}
```

### 6.5 Asset Mapping

```typescript
interface AssetMapper {
  // Map generated assets to report elements
  map(
    report: VisualExperienceInput,
    media: GeneratedMediaBundle
  ): MappedAssets {
    
    const mapped: MappedAssets = {
      sections: new Map(),
      inline: [],
      background: []
    }
    
    // Map hero images to section headers
    for (const image of media.images) {
      if (image.type === "hero_image") {
        mapped.sections.set(image.sectionId, {
          heroImage: image.url,
          heroImageAlt: `Visualization for ${image.sectionId}`
        })
      }
    }
    
    // Map charts to inline positions
    for (const chart of media.charts) {
      mapped.inline.push({
        assetUrl: chart.url,
        sectionId: chart.sectionId,
        position: "after_statistic",
        statisticId: chart.statisticId
      })
    }
    
    // Map videos to cinematic backgrounds
    for (const video of media.videos) {
      mapped.background.push({
        assetUrl: video.url,
        sectionId: video.sectionId,
        playAt: video.timestamp,
        duration: video.duration
      })
    }
    
    return mapped
  }
}
```

---

## 7. Assembly & Rendering

### 7.1 Assembly Process

```typescript
interface AssemblyPipeline {
  // Inputs
  report: VisualExperienceInput
  media: GeneratedMediaBundle
  config: AssemblyConfig
  
  // Process
  async assemble(): Promise<AssembledExperience> {
    // 1. Build galaxy graph
    const galaxyGraph = await this.buildGalaxyGraph()
    
    // 2. Compute node positions
    const layout = this.computeLayout(galaxyGraph)
    
    // 3. Build cinematic script
    const script = await this.buildCinematicScript()
    
    // 4. Map media assets to timeline
    const mediaTimeline = this.mapMediaToTimeline()
    
    // 5. Compute camera paths
    const cameraPaths = this.computeCameraPaths(script, layout)
    
    // 6. Generate transition points
    const transitions = this.planTransitions(script)
    
    return {
      galaxyGraph,
      layout,
      script,
      mediaTimeline,
      cameraPaths,
      transitions,
      ready: true
    }
  }
}
```

### 7.2 Galaxy Graph Construction

```typescript
interface GalaxyGraphBuilder {
  build(report: VisualExperienceInput): GalaxyGraph {
    const nodes: GalaxyNode[] = []
    const edges: GalaxyEdge[] = []
    
    // 1. Create core node (main topic)
    nodes.push({
      id: "core",
      type: "core",
      label: report.title,
      position: { x: 0, y: 0, z: 0 }
    })
    
    // 2. Create section nodes (sub-topics)
    for (const section of report.sections) {
      nodes.push({
        id: `section_${section.id}`,
        type: "sub_query",
        label: section.title,
        sectionId: section.id,
        color: this.getSectionColor(section.order)
      })
      
      // Connect to core
      edges.push({
        from: "core",
        to: `section_${section.id}`,
        type: "parent"
      })
    }
    
    // 3. Create source nodes
    for (const source of report.sources) {
      nodes.push({
        id: `source_${source.id}`,
        type: "source",
        label: source.title,
        domain: source.domain,
        thumbnail: source.thumbnail,
        citedInSections: source.cited_in_sections,
        primarySection: source.cited_in_sections[0]
      })
      
      // Connect to primary section
      edges.push({
        from: `section_${source.cited_in_sections[0]}`,
        to: `source_${source.id}`,
        type: "contains"
      })
      
      // Add relationship edges
      for (const rel of source.relationships) {
        edges.push({
          from: `source_${source.id}`,
          to: `source_${rel.target_id}`,
          type: rel.type
        })
      }
    }
    
    return { nodes, edges }
  }
}
```

### 7.3 Cinematic Script Builder

```typescript
interface CinematicScriptBuilder {
  async build(
    report: VisualExperienceInput,
    tts: TTSResult
  ): Promise<CinematicScript> {
    
    const events: CinematicEvent[] = []
    let currentTime = 0
    
    // Title card (3 seconds)
    events.push({
      type: "title_card",
      time: 0,
      duration: 3000,
      title: report.title,
      subtitle: report.subtitle
    })
    currentTime = 3000
    
    // Process each section
    for (const section of report.sections) {
      // Section transition
      events.push({
        type: "section_start",
        time: currentTime,
        sectionId: section.id,
        title: section.title
      })
      
      // Camera move to section cluster
      events.push({
        type: "camera_move",
        time: currentTime,
        target: this.getSectionClusterCenter(section.id),
        duration: 1500
      })
      
      currentTime += 2000
      
      // Process words with TTS timestamps
      const sectionWords = tts.timestamps.filter(
        w => w.sectionId === section.id
      )
      
      for (const word of sectionWords) {
        events.push({
          type: "word_reveal",
          time: currentTime + word.start,
          wordIndex: word.index,
          word: word.word
        })
      }
      
      // Process citations
      for (const citation of section.citations) {
        const citationWord = sectionWords.find(
          w => w.position === citation.position
        )
        
        if (citationWord) {
          events.push({
            type: "citation_highlight",
            time: currentTime + citationWord.start,
            citationId: citation.marker,
            nodeId: `source_${citation.source_id}`
          })
          
          events.push({
            type: "node_activate",
            time: currentTime + citationWord.start,
            nodeId: `source_${citation.source_id}`,
            duration: 2000
          })
        }
      }
      
      // Update current time based on section audio duration
      const sectionEnd = Math.max(...sectionWords.map(w => w.end))
      currentTime += sectionEnd + 1000  // 1s buffer between sections
    }
    
    // Closing sequence
    events.push({
      type: "conclusion",
      time: currentTime,
      duration: 3000
    })
    
    events.push({
      type: "camera_move",
      time: currentTime,
      target: { x: 0, y: 100, z: 200 },  // Zoom out
      duration: 3000
    })
    
    return {
      events: events.sort((a, b) => a.time - b.time),
      totalDuration: currentTime + 3000,
      wordTimestamps: tts.timestamps
    }
  }
}
```

### 7.4 Camera Path Computation

```typescript
interface CameraPathComputer {
  compute(
    script: CinematicScript,
    layout: GalaxyLayout
  ): CameraPath[] {
    
    const paths: CameraPath[] = []
    const cameraMoves = script.events.filter(e => e.type === "camera_move")
    
    for (let i = 0; i < cameraMoves.length; i++) {
      const move = cameraMoves[i]
      const prevPosition = i > 0 
        ? cameraMoves[i - 1].target 
        : { x: 0, y: 50, z: 150 }
      
      // Compute smooth bezier path between positions
      const controlPoints = this.computeBezierControl(
        prevPosition,
        move.target
      )
      
      paths.push({
        startTime: move.time,
        duration: move.duration,
        from: prevPosition,
        to: move.target,
        controlPoints,
        easing: "easeInOutCubic"
      })
    }
    
    // Add idle drift between major moves
    return this.addIdleDrift(paths)
  }
  
  private addIdleDrift(paths: CameraPath[]): CameraPath[] {
    // Between camera moves, add subtle orbital drift
    const withDrift: CameraPath[] = []
    
    for (let i = 0; i < paths.length; i++) {
      withDrift.push(paths[i])
      
      if (i < paths.length - 1) {
        const gapStart = paths[i].startTime + paths[i].duration
        const gapEnd = paths[i + 1].startTime
        
        if (gapEnd - gapStart > 2000) {
          // Add slow orbital drift during gap
          withDrift.push({
            startTime: gapStart,
            duration: gapEnd - gapStart,
            type: "orbital_drift",
            center: paths[i].to,
            radius: 10,
            speed: 0.1
          })
        }
      }
    }
    
    return withDrift
  }
}
```

### 7.5 Render Pipeline

```typescript
interface RenderPipeline {
  // Three.js / WebGL setup
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  
  // Layers
  layers: {
    galaxy: GalaxyLayer
    text: TextOverlayLayer
    media: MediaOverlayLayer
    ui: UILayer
  }
  
  // Render loop
  render(time: number): void {
    // Update camera position from path
    this.updateCamera(time)
    
    // Update galaxy node states
    this.layers.galaxy.update(time)
    
    // Update text reveal
    this.layers.text.update(time)
    
    // Update media overlays
    this.layers.media.update(time)
    
    // Render scene
    this.renderer.render(this.scene, this.camera)
    
    // Render UI overlay (separate canvas)
    this.layers.ui.render()
  }
}
```

---

## 8. Export Options

### 8.1 Export Formats Matrix

```
┌──────────────────┬──────┬────────┬────────┬───────┬───────┬────────┐
│ FORMAT           │ Text │ Images │ Charts │ Video │ Voice │ Galaxy │
├──────────────────┼──────┼────────┼────────┼───────┼───────┼────────┤
│ Markdown (.md)   │  ✓   │   ✓*   │   -    │   -   │   -   │   -    │
│ PDF              │  ✓   │   ✓    │   ✓    │   -   │   -   │   -    │
│ Slideshow (PPTX) │  ✓   │   ✓    │   ✓    │   -   │   -   │   -    │
│ Interactive HTML │  ✓   │   ✓    │   ✓    │   ✓   │   ✓   │   ✓    │
│ Video (MP4)      │  ✓   │   ✓    │   ✓    │   ✓   │   ✓   │   ✓    │
│ Audio (MP3)      │  -   │   -    │   -    │   -   │   ✓   │   -    │
│ JSON (data)      │  ✓   │   ✓**  │   ✓**  │   -   │   -   │   ✓**  │
└──────────────────┴──────┴────────┴────────┴───────┴───────┴────────┘

* Markdown includes image URLs as references
** JSON includes URLs/data, not embedded assets
```

### 8.2 Video Export

```typescript
interface VideoExporter {
  config: {
    resolution: "720p" | "1080p" | "4k"
    fps: 30 | 60
    format: "mp4" | "webm"
    codec: "h264" | "h265" | "vp9"
    quality: "draft" | "standard" | "high"
  }
  
  async export(experience: AssembledExperience): Promise<VideoFile> {
    // Option 1: Client-side recording (Remotion/Canvas)
    if (this.config.quality === "draft") {
      return this.clientSideRecord(experience)
    }
    
    // Option 2: Server-side rendering (higher quality)
    return this.serverSideRender(experience)
  }
  
  private async clientSideRecord(
    experience: AssembledExperience
  ): Promise<VideoFile> {
    // Use MediaRecorder API to capture canvas
    const stream = this.canvas.captureStream(this.config.fps)
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: this.getBitrate()
    })
    
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    
    // Play through experience at real-time
    recorder.start()
    await this.playExperience(experience)
    recorder.stop()
    
    // Combine chunks
    const blob = new Blob(chunks, { type: 'video/webm' })
    
    // Convert to MP4 if needed (using ffmpeg.wasm)
    if (this.config.format === 'mp4') {
      return this.convertToMp4(blob)
    }
    
    return { blob, duration: experience.script.totalDuration }
  }
  
  private async serverSideRender(
    experience: AssembledExperience
  ): Promise<VideoFile> {
    // Send experience data to render server
    // Server uses headless browser + ffmpeg for high-quality output
    const response = await fetch('/api/render-video', {
      method: 'POST',
      body: JSON.stringify({
        experience,
        config: this.config
      })
    })
    
    const { jobId } = await response.json()
    
    // Poll for completion
    return this.pollForCompletion(jobId)
  }
}
```

### 8.3 Interactive HTML Export

```typescript
interface InteractiveHTMLExporter {
  async export(experience: AssembledExperience): Promise<HTMLBundle> {
    // Generate self-contained HTML with embedded:
    // - Report content
    // - Galaxy visualization (Three.js)
    // - All media assets (base64 or blob URLs)
    // - Playback engine
    // - Styles
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${experience.report.title}</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div id="app">
    <div id="galaxy-container"></div>
    <div id="report-container">
      ${this.renderReportHTML(experience.report)}
    </div>
    <div id="controls"></div>
  </div>
  
  <!-- Embedded assets -->
  <script>
    window.EXPERIENCE_DATA = ${JSON.stringify(experience)};
    window.MEDIA_ASSETS = {
      ${await this.embedMediaAssets(experience.media)}
    };
  </script>
  
  <!-- Runtime -->
  <script src="https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js"></script>
  <script>${this.getRuntime()}</script>
</body>
</html>
    `
    
    return {
      html,
      size: new Blob([html]).size
    }
  }
}
```

### 8.4 Slideshow Export

```typescript
interface SlideshowExporter {
  async export(experience: AssembledExperience): Promise<SlideshowFile> {
    const slides: Slide[] = []
    
    // Title slide
    slides.push({
      type: "title",
      title: experience.report.title,
      subtitle: experience.report.subtitle,
      backgroundImage: experience.media.images.find(i => i.type === "title")?.url
    })
    
    // Section slides
    for (const section of experience.report.sections) {
      // Section header slide
      slides.push({
        type: "section_header",
        title: section.title,
        backgroundImage: experience.media.images.find(
          i => i.sectionId === section.id && i.type === "hero_image"
        )?.url
      })
      
      // Content slides (split long content)
      const contentSlides = this.splitContent(section.content, {
        maxWordsPerSlide: 50,
        maxBulletsPerSlide: 5
      })
      
      for (const content of contentSlides) {
        slides.push({
          type: "content",
          content: content.text,
          bullets: content.bullets,
          image: content.relatedImage
        })
      }
      
      // Statistics slides
      const sectionCharts = experience.media.charts.filter(
        c => c.sectionId === section.id
      )
      
      for (const chart of sectionCharts) {
        slides.push({
          type: "statistic",
          title: chart.title,
          chartImage: chart.url,
          caption: chart.caption
        })
      }
    }
    
    // Sources slide
    slides.push({
      type: "sources",
      title: "Sources",
      sources: experience.report.sources.map(s => ({
        title: s.title,
        url: s.url,
        domain: s.domain
      }))
    })
    
    // Generate PPTX
    return this.generatePPTX(slides)
  }
}
```

---

## 9. User Controls & Settings

### 9.1 Settings Panel Structure

```typescript
interface SettingsConfig {
  // Generation settings
  generation: {
    enabled: {
      heroImages: boolean        // Default: true
      conceptDiagrams: boolean   // Default: false
      dataCharts: boolean        // Default: true
      videoBroll: boolean        // Default: false
      voiceNarration: boolean    // Default: true
    }
    
    style: "technical" | "abstract" | "corporate" | "custom"
    customStylePrompt?: string
    
    voice: {
      provider: "elevenlabs" | "openai" | "browser"
      voiceId: string
      speed: number              // 0.5 - 2.0
    }
  }
  
  // Playback settings
  playback: {
    defaultMode: "manual" | "scroll" | "cinematic"
    autoPlayCinematic: boolean
    
    textReveal: "typewriter" | "word" | "phrase" | "sentence"
    transitionDuration: number   // ms
    
    galaxy: {
      enabled: boolean
      syncWithScroll: boolean
      showThumbnails: boolean
      autoRotate: boolean
    }
  }
  
  // Quality settings
  quality: {
    galaxyDetail: "low" | "medium" | "high"
    thumbnailResolution: "low" | "medium" | "high"
    videoExportQuality: "draft" | "standard" | "high"
  }
  
  // Accessibility
  accessibility: {
    reducedMotion: boolean
    highContrast: boolean
    fontSize: "small" | "medium" | "large"
    screenReaderOptimized: boolean
  }
}
```

### 9.2 Settings UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings                                                  [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Media Generation                                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  Generate on completion:                                 │   │
│  │  [●] Section hero images                                 │   │
│  │  [ ] Concept diagrams                                    │   │
│  │  [●] Data visualizations                                 │   │
│  │  [ ] Video backgrounds (+ ~$0.50)                        │   │
│  │  [●] Voice narration                                     │   │
│  │                                                          │   │
│  │  Visual Style                                            │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ [Technical] [Abstract] [Corporate] [Custom...]  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  Voice                                                   │   │
│  │  [Rachel - Narrative        ▼]  [▶ Preview]              │   │
│  │  Speed: [━━━━━●━━━] 1.0x                                 │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Playback                                                │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  Default mode:  ( ) Manual  (●) Scroll-sync  ( ) Cinema  │   │
│  │                                                          │   │
│  │  Text reveal:   [Word-by-word          ▼]                │   │
│  │                                                          │   │
│  │  Galaxy visualization:                                   │   │
│  │  [●] Enabled                                             │   │
│  │  [●] Sync with reading position                          │   │
│  │  [●] Show source thumbnails                              │   │
│  │  [●] Auto-rotate when idle                               │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Performance                                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  Galaxy quality:        [Low] [Medium] [High]            │   │
│  │  Thumbnail resolution:  [Low] [Medium] [High]            │   │
│  │                                                          │   │
│  │  [●] Reduce motion (accessibility)                       │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                          [Reset to Defaults]    [Save]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Real-time Cost Estimator

```typescript
interface CostEstimator {
  estimate(config: SettingsConfig, report: VisualExperienceInput): CostEstimate {
    let total = 0
    const breakdown: CostBreakdown = {}
    
    // Image generation
    if (config.generation.enabled.heroImages) {
      const imageCount = report.sections.length
      breakdown.heroImages = imageCount * 0.02
      total += breakdown.heroImages
    }
    
    if (config.generation.enabled.conceptDiagrams) {
      const conceptCount = report.sections.reduce(
        (sum, s) => sum + (s.concepts?.length || 0), 0
      )
      breakdown.conceptDiagrams = conceptCount * 0.02
      total += breakdown.conceptDiagrams
    }
    
    if (config.generation.enabled.dataCharts) {
      const statCount = report.sections.reduce(
        (sum, s) => sum + (s.statistics?.length || 0), 0
      )
      breakdown.dataCharts = statCount * 0.01
      total += breakdown.dataCharts
    }
    
    // Video
    if (config.generation.enabled.videoBroll) {
      const videoCount = Math.min(report.sections.length, 5)
      breakdown.videoBroll = videoCount * 0.10
      total += breakdown.videoBroll
    }
    
    // Voice
    if (config.generation.enabled.voiceNarration) {
      const wordCount = report.meta.word_count
      const minutes = wordCount / 150  // ~150 words per minute
      breakdown.voiceNarration = minutes * 0.04  // ~$0.04 per minute
      total += breakdown.voiceNarration
    }
    
    return {
      total,
      breakdown,
      formatted: `~$${total.toFixed(2)}`
    }
  }
}
```

### 9.4 View Mode Toggle

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  View Mode                                                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   📖         │  │   🔗         │  │   🎬         │          │
│  │   Manual     │  │   Synced     │  │   Cinematic  │          │
│  │              │  │              │  │              │          │
│  │  Read at     │  │  Galaxy      │  │  Sit back    │          │
│  │  your pace   │  │  follows     │  │  and watch   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│       Active           ○                  ○                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Performance & Optimization

### 10.1 Performance Budgets

```typescript
interface PerformanceBudgets {
  // Initial load
  timeToFirstPaint: 1000        // ms
  timeToInteractive: 3000       // ms
  
  // Runtime
  targetFPS: 60
  maxFrameTime: 16.67           // ms (60fps)
  
  // Memory
  maxGalaxyMemory: 150          // MB
  maxTextureMemory: 100         // MB
  maxTotalMemory: 300           // MB
  
  // Network
  maxInitialBundle: 500         // KB
  maxLazyChunk: 200             // KB
}
```

### 10.2 Galaxy Optimization Strategies

```typescript
interface GalaxyOptimization {
  // Level of Detail (LOD)
  lod: {
    // Node detail based on distance
    nodeDetail: {
      close: { geometry: "high", texture: "full", effects: "all" },
      medium: { geometry: "medium", texture: "compressed", effects: "glow" },
      far: { geometry: "low", texture: "tiny", effects: "none" },
      veryFar: { geometry: "point", texture: "none", effects: "none" }
    },
    
    // Distance thresholds
    thresholds: {
      close: 50,
      medium: 150,
      far: 300
    }
  }
  
  // Frustum culling
  culling: {
    enabled: true,
    margin: 50                   // Units outside frustum to keep rendered
  }
  
  // Instance rendering for particles
  instancing: {
    enabled: true,
    maxInstances: 10000
  }
  
  // Thumbnail management
  thumbnails: {
    maxLoaded: 50,
    preloadDistance: 100,
    unloadDistance: 200,
    compressionQuality: 0.7
  }
  
  // Connection lines
  connections: {
    maxVisible: 100,
    simplifyWhenMany: true,
    particlePoolSize: 5000
  }
}
```

### 10.3 Lazy Loading Strategy

```typescript
class LazyLoader {
  // Load media assets progressively
  async loadForSection(sectionId: string): Promise<void> {
    const section = this.sections.get(sectionId)
    
    // Load hero image first (visible immediately)
    if (section.heroImage && !this.loaded.has(section.heroImage)) {
      await this.loadImage(section.heroImage, "high")
      this.loaded.add(section.heroImage)
    }
    
    // Queue inline assets
    for (const asset of section.inlineAssets) {
      this.queue.add(asset, "normal")
    }
    
    // Pre-fetch next section
    const nextSection = this.getNextSection(sectionId)
    if (nextSection) {
      this.queue.add(nextSection.heroImage, "low")
    }
  }
  
  // Unload distant sections
  unloadDistantSections(currentSectionId: string): void {
    const current = this.sectionOrder.indexOf(currentSectionId)
    
    for (const [sectionId, section] of this.sections) {
      const index = this.sectionOrder.indexOf(sectionId)
      const distance = Math.abs(index - current)
      
      if (distance > 2) {
        this.unloadSection(sectionId)
      }
    }
  }
}
```

### 10.4 Web Worker Offloading

```typescript
// Main thread
const galaxyWorker = new Worker('galaxy-worker.js')

// Offload heavy computations
galaxyWorker.postMessage({
  type: 'compute_layout',
  nodes: graphData.nodes,
  edges: graphData.edges
})

galaxyWorker.onmessage = (e) => {
  if (e.data.type === 'layout_complete') {
    applyLayout(e.data.positions)
  }
}

// galaxy-worker.js
self.onmessage = (e) => {
  if (e.data.type === 'compute_layout') {
    const positions = computeForceDirectedLayout(
      e.data.nodes,
      e.data.edges
    )
    
    self.postMessage({
      type: 'layout_complete',
      positions
    })
  }
}
```

---

## 11. Cost Analysis

### 11.1 Per-Component Costs

```
COMPONENT                    PROVIDER           COST
─────────────────────────────────────────────────────────────────
IMAGES
├─ Hero images              nano-gpt/DALL-E    ~$0.02/image
├─ Concept diagrams         nano-gpt/DALL-E    ~$0.02/image
└─ Data visualizations      Local render       ~$0.00

VIDEO
├─ B-roll clips (5s)        nano-gpt/Runway    ~$0.10/clip
└─ Explainer animations     nano-gpt/Pika      ~$0.15/clip

VOICE
├─ ElevenLabs               Per character      ~$0.04/minute
├─ OpenAI TTS               Per character      ~$0.03/minute
└─ Browser TTS              Free               $0.00

THUMBNAILS
├─ Screenshot API           Microlink/etc      ~$0.01/screenshot
├─ OG Image fetch           Free               $0.00
└─ Fallback generation      Local render       $0.00
```

### 11.2 Cost Per Experience Level

```
LEVEL              INCLUDES                           ESTIMATED COST
─────────────────────────────────────────────────────────────────────

MINIMAL            Text only, no media                $0.00
                   Galaxy with favicons only

STANDARD           Hero images (5)                    ~$0.25
                   Data charts (3)
                   Voice narration (5 min)
                   Thumbnails (OG images)

ENHANCED           Hero images (5)                    ~$0.50
                   Concept diagrams (3)
                   Data charts (5)
                   Voice narration (5 min)
                   Full thumbnails

CINEMATIC          All images (10)                    ~$1.00
                   Video b-roll (3 clips)
                   Voice narration (10 min)
                   Full thumbnails
                   All transitions

FULL PRODUCTION    All media types                    ~$1.50-2.00
                   High-quality video export
                   Multiple voice options
```

### 11.3 Monthly Budget Scenarios

```
USAGE PATTERN         REPORTS/MO    LEVEL        MONTHLY COST
─────────────────────────────────────────────────────────────────────

Casual               5             Standard      ~$1.25
Regular              20            Standard      ~$5.00
Power User           50            Enhanced      ~$25.00
Creator/Presenter    20            Cinematic     ~$20.00
Production Studio    100           Full          ~$150-200
```

---

## 12. Implementation Phases

### 12.1 Phase 1: Foundation (Weeks 1-2)

```
[ ] Universal report input schema
[ ] Basic report renderer (text + sections)
[ ] Settings infrastructure
[ ] Export: Markdown, PDF

DELIVERABLE: Static report viewing with export options
```

### 12.2 Phase 2: Galaxy Core (Weeks 3-4)

```
[ ] Three.js scene setup
[ ] Node rendering (core, sources)
[ ] Basic layout algorithm
[ ] Camera controls (orbit, zoom)
[ ] Favicon thumbnail fallback
[ ] Citation hover → node highlight

DELIVERABLE: Interactive galaxy with report sync on hover
```

### 12.3 Phase 3: Scroll Sync (Week 5)

```
[ ] Scroll position tracking
[ ] Section detection
[ ] Node highlighting system
[ ] Camera drift animation
[ ] Connection line rendering

DELIVERABLE: Galaxy follows reading position
```

### 12.4 Phase 4: Media Generation (Weeks 6-7)

```
[ ] Image generation integration (nano-gpt)
[ ] Chart generation (local)
[ ] Asset mapping to sections
[ ] Generation progress UI
[ ] Cost estimation display

DELIVERABLE: Auto-generated images and charts
```

### 12.5 Phase 5: Voice & Cinematic (Weeks 8-9)

```
[ ] TTS integration (ElevenLabs/OpenAI)
[ ] Word timestamp extraction
[ ] Text reveal animation
[ ] Cinematic script builder
[ ] Playback controls
[ ] Section transitions

DELIVERABLE: Full cinematic playback mode
```

### 12.6 Phase 6: Thumbnails & Polish (Week 10)

```
[ ] Screenshot API integration
[ ] OG image fallback
[ ] Thumbnail LOD system
[ ] Full thumbnail in galaxy
[ ] Click to open source

DELIVERABLE: Rich source thumbnails in galaxy
```

### 12.7 Phase 7: Video Export (Weeks 11-12)

```
[ ] Canvas recording
[ ] Client-side video encoding
[ ] Server-side render option
[ ] Slideshow export (PPTX)
[ ] Interactive HTML export

DELIVERABLE: Full export suite
```

### 12.8 Phase 8: Optimization & Launch (Week 13+)

```
[ ] Performance profiling
[ ] LOD implementation
[ ] Web worker offloading
[ ] Memory optimization
[ ] Mobile responsiveness
[ ] Accessibility audit

DELIVERABLE: Production-ready system
```

---

## Appendix A: Quick Reference

### A.1 Keyboard Shortcuts

```
GLOBAL
──────────────────────────────────────
Space          Play/Pause (cinematic)
Escape         Exit mode / Close modal
?              Show shortcuts help
F              Toggle fullscreen
M              Toggle mute

READING
──────────────────────────────────────
↑/↓            Navigate sections
G              Toggle galaxy panel
C              Enter cinematic mode

CINEMATIC
──────────────────────────────────────
←              Rewind 5 seconds
→              Forward 5 seconds
↑              Previous section
↓              Next section
[/]            Decrease/Increase speed

GALAXY
──────────────────────────────────────
Click+Drag     Rotate view
Scroll         Zoom in/out
Double-click   Focus on node
R              Reset camera
T              Toggle thumbnails
```

### A.2 File Structure

```
/visual-experience/
├── core/
│   ├── input-schema.ts
│   ├── settings.ts
│   └── types.ts
├── galaxy/
│   ├── galaxy.ts
│   ├── nodes.ts
│   ├── connections.ts
│   ├── layout.ts
│   ├── camera.ts
│   └── thumbnails.ts
├── cinematic/
│   ├── engine.ts
│   ├── script-builder.ts
│   ├── text-reveal.ts
│   ├── transitions.ts
│   └── controls.ts
├── media/
│   ├── analyzer.ts
│   ├── image-generator.ts
│   ├── video-generator.ts
│   ├── chart-generator.ts
│   ├── tts-service.ts
│   └── asset-mapper.ts
├── sync/
│   ├── scroll-sync.ts
│   ├── highlight-system.ts
│   └── narrator-sync.ts
├── export/
│   ├── markdown.ts
│   ├── pdf.ts
│   ├── slideshow.ts
│   ├── video.ts
│   └── interactive-html.ts
├── ui/
│   ├── settings-panel.tsx
│   ├── playback-controls.tsx
│   ├── mode-toggle.tsx
│   └── export-modal.tsx
└── workers/
    ├── layout-worker.ts
    └── render-worker.ts
```

### A.3 Event Types

```typescript
type VisualExperienceEvent =
  // Lifecycle
  | { type: "experience_loading" }
  | { type: "experience_ready" }
  | { type: "media_generating", progress: number }
  | { type: "media_complete" }
  
  // Playback
  | { type: "mode_changed", mode: ViewMode }
  | { type: "playback_started" }
  | { type: "playback_paused" }
  | { type: "playback_seeked", time: number }
  | { type: "section_changed", sectionId: string }
  
  // Galaxy
  | { type: "node_hovered", nodeId: string }
  | { type: "node_clicked", nodeId: string }
  | { type: "camera_moved", position: Vector3 }
  
  // Export
  | { type: "export_started", format: string }
  | { type: "export_progress", percent: number }
  | { type: "export_complete", url: string }
```

---

## Appendix B: Shadow Model Configuration

The Visual Experience Layer uses the Shadow Model for background AI tasks. See **SPEC_DEFAULT_MODELS.md** for full settings specification.

### B.1 Shadow Model Uses

The shadow model handles lightweight background tasks that don't require user-facing quality:

| Task | Purpose | Typical Tokens |
|------|---------|----------------|
| **TTS Script Generation** | Convert report text to speech-optimized script | 500-2000 |
| **Title Generation** | Generate titles for reports/sections | 50-100 |
| **Summarization** | Compress long content for context | 200-500 |
| **Media Prompts** | Generate image/video generation prompts | 100-300 |

### B.2 Configuration

The shadow model is configured in `defaultModels.shadowModel`:

```typescript
interface ShadowModelConfig {
  provider: ProviderType
  modelId: string
}

// Default: claude-3-5-haiku for speed and cost
const DEFAULT_SHADOW_MODEL = {
  provider: 'anthropic',
  modelId: 'claude-3-5-haiku-20241022'
}
```

### B.3 Integration with TTS Service

The TTS script builder uses the shadow model:

```typescript
// cinematic/tts-service.ts

class TTSScriptBuilder {
  async buildSpeechText(report: VisualExperienceInput): Promise<string> {
    const shadowModel = settingsStore.getShadowModel()

    // Transform report content into speech-optimized text
    const response = await aiProvider.chat({
      provider: shadowModel.provider,
      model: shadowModel.modelId,
      messages: [{
        role: 'system',
        content: `Transform the following report section into natural speech.
                  Rules:
                  - Replace citation markers [1][2] with "according to source one"
                  - Spell out abbreviations and acronyms
                  - Add natural pauses with commas
                  - Keep technical terms but make them pronounceable`
      }, {
        role: 'user',
        content: report.sections.map(s => s.content).join('\n\n')
      }],
      maxTokens: 4000
    })

    return response.ok ? response.value.content : this.fallbackTransform(report)
  }
}
```

### B.4 Integration with Media Pipeline

Image prompts are refined using the shadow model:

```typescript
// media/image-generator.ts

class MediaAnalyzer {
  async buildHeroPrompt(section: Section): Promise<string> {
    const shadowModel = settingsStore.getShadowModel()

    const response = await aiProvider.chat({
      provider: shadowModel.provider,
      model: shadowModel.modelId,
      messages: [{
        role: 'system',
        content: `Generate a detailed image prompt for an abstract visualization.
                  Style: modern, minimal, dark background (#0F0F12)
                  Colors: indigo (#6366F1), emerald (#10B981), purple accents
                  Requirements: No text, no faces, abstract forms only`
      }, {
        role: 'user',
        content: `Create an image prompt for this section: "${section.title}"
                  Key concepts: ${section.concepts?.join(', ') || 'general topic'}`
      }],
      maxTokens: 200
    })

    return response.ok ? response.value.content : this.fallbackPrompt(section)
  }
}
```

### B.5 Cost Optimization

The shadow model is chosen for cost efficiency:

| Model | Speed | Cost (per 1M tokens) | Use Case |
|-------|-------|---------------------|----------|
| claude-3-5-haiku | Fastest | ~$0.25 input / $1.25 output | Default shadow model |
| gpt-4o-mini | Fast | ~$0.15 input / $0.60 output | Alternative |
| gemini-2.0-flash | Very fast | ~$0.075 input / $0.30 output | Budget option |

Users can select faster/cheaper models for shadow tasks without affecting primary chat quality.

### B.6 Fallback Behavior

If the shadow model fails, the system falls back to rule-based transformations:

```typescript
function fallbackTransform(report: VisualExperienceInput): string {
  return report.sections
    .map(s => s.content)
    .join('\n\n')
    .replace(/\[(\d+)\]/g, '') // Remove citation markers
    .replace(/&/g, 'and')      // Spell out ampersand
    .replace(/(\d+)%/g, '$1 percent') // Spell out percentages
}
```

---

*End of Visual Experience Layer Specification*