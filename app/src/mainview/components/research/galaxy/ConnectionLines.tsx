// =============================================================================
// CONNECTION LINES
// =============================================================================
// Glowing lines connecting nodes in the galaxy visualization.

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GalaxyNode, GalaxyEdge } from '../../../../shared/research-types';
import { getNodeColor } from '../../../lib/research/galaxy-layout';

interface ConnectionLinesProps {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
}

export function ConnectionLines({ nodes, edges }: ConnectionLinesProps) {
  // Create a map for quick node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GalaxyNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Generate lines from edges
  const lines = useMemo(() => {
    return edges
      .map((edge) => {
        const sourceNode = nodeMap.get(edge.sourceId);
        const targetNode = nodeMap.get(edge.targetId);

        if (!sourceNode || !targetNode) return null;

        return {
          id: `${edge.sourceId}-${edge.targetId}`,
          points: [sourceNode.position, targetNode.position],
          color: getNodeColor(targetNode.state),
          strength: edge.strength || 0.5,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        points: [[number, number, number], [number, number, number]];
        color: string;
        strength: number;
      }>;
  }, [edges, nodeMap]);

  // Also create lines from core to each node
  const coreLines = useMemo(() => {
    return nodes.map((node) => ({
      id: `core-${node.id}`,
      points: [[0, 0, 0] as [number, number, number], node.position],
      color: getNodeColor(node.state),
      strength: node.state === 'complete' ? 0.8 : node.state === 'reading' ? 0.6 : 0.3,
    }));
  }, [nodes]);

  return (
    <group>
      {/* Core connections */}
      {coreLines.map((line) => (
        <ConnectionLine
          key={line.id}
          points={line.points}
          color={line.color}
          strength={line.strength}
        />
      ))}

      {/* Edge connections */}
      {lines.map((line) => (
        <ConnectionLine
          key={line.id}
          points={line.points}
          color={line.color}
          strength={line.strength}
        />
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------------
// INDIVIDUAL LINE
// -----------------------------------------------------------------------------

interface ConnectionLineProps {
  points: [[number, number, number], [number, number, number]];
  color: string;
  strength: number;
}

function ConnectionLine({ points, color, strength }: ConnectionLineProps) {
  const lineRef = useRef<THREE.Line>(null);

  // Create curved path between points
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...points[0]);
    const end = new THREE.Vector3(...points[1]);

    // Calculate midpoint with some lift
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    // Add some curve based on distance
    const distance = start.distanceTo(end);
    const lift = distance * 0.1;
    mid.y += lift;

    // Create quadratic bezier curve
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(20);
  }, [points]);

  // Animate line opacity based on strength
  useFrame((state) => {
    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      // Subtle pulse
      const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      material.opacity = strength * pulse;
    }
  });

  return (
    <Line
      ref={lineRef}
      points={curve}
      color={color}
      lineWidth={1}
      transparent
      opacity={strength * 0.3}
      // @ts-ignore - drei types
      dashed={false}
    />
  );
}

// -----------------------------------------------------------------------------
// DATA FLOW ANIMATION
// -----------------------------------------------------------------------------

interface DataFlowProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  active: boolean;
}

export function DataFlow({ start, end, color, active }: DataFlowProps) {
  const particleRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const mid = new THREE.Vector3()
      .addVectors(startVec, endVec)
      .multiplyScalar(0.5);
    mid.y += startVec.distanceTo(endVec) * 0.15;

    return new THREE.QuadraticBezierCurve3(startVec, mid, endVec);
  }, [start, end]);

  useFrame((state, delta) => {
    if (!particleRef.current || !active) return;

    progressRef.current += delta * 0.5;
    if (progressRef.current > 1) progressRef.current = 0;

    const point = curve.getPoint(progressRef.current);
    particleRef.current.position.copy(point);
  });

  if (!active) return null;

  return (
    <mesh ref={particleRef}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} />
    </mesh>
  );
}

export default ConnectionLines;
