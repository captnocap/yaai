// =============================================================================
// GALAXY LAYOUT
// =============================================================================
// Force-directed 3D graph layout for the knowledge galaxy visualization.
// Uses d3-force-3d for physics-based node positioning.

import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
} from 'd3-force-3d';
import type { GalaxyNode, GalaxyEdge, SourceState } from '../../../shared/research-types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface SimulationNode {
  id: string;
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  state: SourceState;
  isCore?: boolean;
}

interface SimulationLink {
  source: string | SimulationNode;
  target: string | SimulationNode;
  strength?: number;
}

interface LayoutOptions {
  /** Center position for the core */
  center?: [number, number, number];
  /** Repulsion strength between nodes */
  repulsion?: number;
  /** Link distance */
  linkDistance?: number;
  /** Collision radius */
  collisionRadius?: number;
  /** Number of simulation ticks to run */
  iterations?: number;
  /** Whether to include the query core node */
  includeCore?: boolean;
}

// -----------------------------------------------------------------------------
// DEFAULT OPTIONS
// -----------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  center: [0, 0, 0],
  repulsion: -100,
  linkDistance: 30,
  collisionRadius: 5,
  iterations: 100,
  includeCore: true,
};

// -----------------------------------------------------------------------------
// LAYOUT CALCULATOR
// -----------------------------------------------------------------------------

/**
 * Calculate positions for galaxy nodes using force-directed layout
 */
export function calculateGalaxyLayout(
  nodes: GalaxyNode[],
  edges: GalaxyEdge[],
  options: LayoutOptions = {}
): Map<string, [number, number, number]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create simulation nodes
  const simNodes: SimulationNode[] = [];

  // Add core node (fixed at center)
  if (opts.includeCore) {
    simNodes.push({
      id: 'core',
      x: opts.center[0],
      y: opts.center[1],
      z: opts.center[2],
      fx: opts.center[0],
      fy: opts.center[1],
      fz: opts.center[2],
      state: 'complete',
      isCore: true,
    });
  }

  // Add source nodes with initial random positions in a sphere
  nodes.forEach((node) => {
    // Initial position on a sphere around the center
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const radius = 20 + Math.random() * 30;

    simNodes.push({
      id: node.id,
      x: opts.center[0] + radius * Math.sin(theta) * Math.cos(phi),
      y: opts.center[1] + radius * Math.sin(theta) * Math.sin(phi),
      z: opts.center[2] + radius * Math.cos(theta),
      state: node.state,
    });
  });

  // Create simulation links
  const simLinks: SimulationLink[] = [];

  // Link all nodes to core if present
  if (opts.includeCore) {
    simNodes.forEach((node) => {
      if (!node.isCore) {
        simLinks.push({
          source: 'core',
          target: node.id,
          strength: getStateStrength(node.state),
        });
      }
    });
  }

  // Add edges between nodes
  edges.forEach((edge) => {
    simLinks.push({
      source: edge.sourceId,
      target: edge.targetId,
      strength: edge.strength || 0.5,
    });
  });

  // Create force simulation
  const simulation = forceSimulation(simNodes, 3)
    .force(
      'charge',
      forceManyBody().strength(opts.repulsion)
    )
    .force(
      'center',
      forceCenter(...opts.center)
    )
    .force(
      'link',
      forceLink(simLinks)
        .id((d: SimulationNode) => d.id)
        .distance(opts.linkDistance)
        .strength((link: SimulationLink) => {
          const l = link as { strength?: number };
          return l.strength ?? 0.5;
        })
    )
    .force(
      'collision',
      forceCollide().radius(opts.collisionRadius)
    )
    .stop();

  // Run simulation
  for (let i = 0; i < opts.iterations; i++) {
    simulation.tick();
  }

  // Extract final positions
  const positions = new Map<string, [number, number, number]>();
  simNodes.forEach((node) => {
    positions.set(node.id, [node.x, node.y, node.z]);
  });

  return positions;
}

/**
 * Get link strength based on source state
 * More complete sources are pulled closer to core
 */
function getStateStrength(state: SourceState): number {
  switch (state) {
    case 'complete':
      return 0.8;
    case 'reading':
      return 0.6;
    case 'approved':
      return 0.5;
    case 'pending':
      return 0.3;
    case 'rejected':
      return 0.1;
    case 'failed':
      return 0.2;
    default:
      return 0.4;
  }
}

// -----------------------------------------------------------------------------
// INCREMENTAL LAYOUT
// -----------------------------------------------------------------------------

/**
 * Class for managing incremental layout updates as nodes are added
 */
export class IncrementalGalaxyLayout {
  private nodes: Map<string, SimulationNode> = new Map();
  private links: SimulationLink[] = [];
  private simulation: ReturnType<typeof forceSimulation> | null = null;
  private options: Required<LayoutOptions>;

  constructor(options: LayoutOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initialize();
  }

  private initialize() {
    // Add core node
    if (this.options.includeCore) {
      this.nodes.set('core', {
        id: 'core',
        x: this.options.center[0],
        y: this.options.center[1],
        z: this.options.center[2],
        fx: this.options.center[0],
        fy: this.options.center[1],
        fz: this.options.center[2],
        state: 'complete',
        isCore: true,
      });
    }

    this.createSimulation();
  }

  private createSimulation() {
    const nodesArray = Array.from(this.nodes.values());

    this.simulation = forceSimulation(nodesArray, 3)
      .force('charge', forceManyBody().strength(this.options.repulsion))
      .force('center', forceCenter(...this.options.center))
      .force(
        'link',
        forceLink(this.links)
          .id((d: SimulationNode) => d.id)
          .distance(this.options.linkDistance)
      )
      .force('collision', forceCollide().radius(this.options.collisionRadius))
      .alphaDecay(0.02)
      .velocityDecay(0.3);
  }

  /**
   * Add a new node to the layout
   */
  addNode(node: GalaxyNode): [number, number, number] {
    // Calculate initial position near the core with some randomness
    const angle = Math.random() * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI;
    const radius = 15 + Math.random() * 10;

    const simNode: SimulationNode = {
      id: node.id,
      x: this.options.center[0] + radius * Math.cos(angle) * Math.cos(elevation),
      y: this.options.center[1] + radius * Math.sin(elevation),
      z: this.options.center[2] + radius * Math.sin(angle) * Math.cos(elevation),
      state: node.state,
    };

    this.nodes.set(node.id, simNode);

    // Link to core
    if (this.options.includeCore) {
      this.links.push({
        source: 'core',
        target: node.id,
        strength: getStateStrength(node.state),
      });
    }

    // Recreate simulation with new nodes
    this.createSimulation();

    return [simNode.x, simNode.y, simNode.z];
  }

  /**
   * Add an edge between nodes
   */
  addEdge(sourceId: string, targetId: string, strength: number = 0.5) {
    this.links.push({
      source: sourceId,
      target: targetId,
      strength,
    });

    // Update link force
    if (this.simulation) {
      const linkForce = this.simulation.force('link') as ReturnType<typeof forceLink>;
      if (linkForce) {
        linkForce.links(this.links);
      }
    }
  }

  /**
   * Update a node's state (affects its link strength)
   */
  updateNodeState(nodeId: string, state: SourceState) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.state = state;

      // Update link strength
      const link = this.links.find(
        (l) =>
          (typeof l.target === 'string' ? l.target : l.target.id) === nodeId &&
          (typeof l.source === 'string' ? l.source : l.source.id) === 'core'
      );
      if (link) {
        link.strength = getStateStrength(state);
      }

      // Reheat simulation
      this.simulation?.alpha(0.3).restart();
    }
  }

  /**
   * Tick the simulation and return current positions
   */
  tick(count: number = 1): Map<string, [number, number, number]> {
    if (!this.simulation) {
      this.createSimulation();
    }

    for (let i = 0; i < count; i++) {
      this.simulation?.tick();
    }

    const positions = new Map<string, [number, number, number]>();
    this.nodes.forEach((node, id) => {
      positions.set(id, [node.x, node.y, node.z]);
    });

    return positions;
  }

  /**
   * Get current position of a node
   */
  getPosition(nodeId: string): [number, number, number] | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    return [node.x, node.y, node.z];
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.simulation?.stop();
  }

  /**
   * Restart the simulation
   */
  restart() {
    this.simulation?.alpha(0.5).restart();
  }
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get color for a node based on its state
 */
export function getNodeColor(state: SourceState): string {
  switch (state) {
    case 'pending':
      return '#f59e0b'; // amber
    case 'approved':
      return '#3b82f6'; // blue
    case 'reading':
      return '#a855f7'; // purple
    case 'complete':
      return '#10b981'; // emerald
    case 'rejected':
      return '#6b7280'; // gray
    case 'failed':
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}

/**
 * Get emissive intensity for a node based on its state
 */
export function getNodeEmissiveIntensity(state: SourceState): number {
  switch (state) {
    case 'reading':
      return 1.0;
    case 'approved':
      return 0.5;
    case 'complete':
      return 0.3;
    case 'pending':
      return 0.2;
    default:
      return 0.1;
  }
}

/**
 * Get node scale based on state
 */
export function getNodeScale(state: SourceState): number {
  switch (state) {
    case 'reading':
      return 1.5;
    case 'complete':
      return 1.2;
    case 'approved':
      return 1.0;
    case 'pending':
      return 0.8;
    case 'rejected':
      return 0.6;
    case 'failed':
      return 0.7;
    default:
      return 1.0;
  }
}

export default {
  calculateGalaxyLayout,
  IncrementalGalaxyLayout,
  getNodeColor,
  getNodeEmissiveIntensity,
  getNodeScale,
};
