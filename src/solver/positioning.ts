import type { TimelineNode, SolvedPosition, NodeId } from '../types';
import { getNodeVariables } from './constraints';
import type { BellmanFordResult } from './propagation';

/**
 * Default timeline scale (arbitrary units)
 */
const DEFAULT_SCALE = 1000;

/**
 * Minimum width for interval display
 */
const MIN_INTERVAL_WIDTH = 20;

/**
 * Padding at timeline edges
 */
const EDGE_PADDING = 50;

/**
 * Convert Bellman-Ford distances to timeline positions.
 *
 * The shortest-path distances from the virtual source represent
 * the "earliest possible time" for each variable. We normalize
 * these to a pleasant display scale.
 */
export function assignPositions(
  nodes: TimelineNode[],
  bellmanFordResult: BellmanFordResult,
  scale = DEFAULT_SCALE
): SolvedPosition[] {
  const { distances } = bellmanFordResult;

  if (nodes.length === 0) {
    return [];
  }

  // Collect all start/end values
  const values: number[] = [];
  const nodeValues = new Map<
    NodeId,
    { start: number | null; end: number | null }
  >();

  for (const node of nodes) {
    const { start, end } = getNodeVariables(node.id);
    const startDist = distances.get(start);
    const endDist = distances.get(end);

    // Only include finite values
    const startVal =
      startDist !== undefined && isFinite(startDist) ? startDist : null;
    const endVal = endDist !== undefined && isFinite(endDist) ? endDist : null;

    nodeValues.set(node.id, { start: startVal, end: endVal });

    if (startVal !== null) values.push(startVal);
    if (endVal !== null) values.push(endVal);
  }

  // Handle edge case: no valid positions
  if (values.length === 0) {
    // Fall back to evenly spaced positions
    return assignDefaultPositions(nodes, scale);
  }

  // Find min/max for normalization
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  // Normalization function
  const normalize = (v: number): number => {
    if (range === 0) {
      return scale / 2 + EDGE_PADDING;
    }
    return EDGE_PADDING + ((v - minVal) / range) * (scale - 2 * EDGE_PADDING);
  };

  // Build positions
  const positions: SolvedPosition[] = [];

  for (const node of nodes) {
    const vals = nodeValues.get(node.id);

    if (!vals || vals.start === null) {
      // Node has no valid position - skip it
      continue;
    }

    const startPos = normalize(vals.start);
    let endPos: number;

    if (node.durationType === 'instant' || vals.end === null) {
      // Instant: start = end
      endPos = startPos;
    } else {
      endPos = normalize(vals.end);
      // Ensure minimum width for visibility
      if (endPos - startPos < MIN_INTERVAL_WIDTH) {
        endPos = startPos + MIN_INTERVAL_WIDTH;
      }
    }

    positions.push({
      nodeId: node.id,
      start: startPos,
      end: endPos,
    });
  }

  return positions;
}

/**
 * Assign default evenly-spaced positions when no constraints exist
 * or constraints couldn't be solved.
 */
export function assignDefaultPositions(
  nodes: TimelineNode[],
  scale = DEFAULT_SCALE
): SolvedPosition[] {
  if (nodes.length === 0) return [];

  const spacing = (scale - 2 * EDGE_PADDING) / (nodes.length + 1);

  return nodes.map((node, index) => {
    const start = EDGE_PADDING + spacing * (index + 1);
    const end =
      node.durationType === 'interval'
        ? start + spacing * 0.8
        : start;

    return {
      nodeId: node.id,
      start,
      end: Math.max(end, start + (node.durationType === 'interval' ? MIN_INTERVAL_WIDTH : 0)),
    };
  });
}

/**
 * Reorder positions to reduce visual overlap.
 * This is a simple heuristic that sorts intervals by start time
 * and adjusts vertical layering (which would be handled by the component).
 */
export function optimizePositions(
  positions: SolvedPosition[]
): SolvedPosition[] {
  // Sort by start position
  return [...positions].sort((a, b) => a.start - b.start);
}

/**
 * Calculate the bounding box of all positions.
 * Useful for setting viewport bounds.
 */
export function calculateBounds(positions: SolvedPosition[]): {
  minX: number;
  maxX: number;
  width: number;
} {
  if (positions.length === 0) {
    return { minX: 0, maxX: DEFAULT_SCALE, width: DEFAULT_SCALE };
  }

  let minX = Infinity;
  let maxX = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.start);
    maxX = Math.max(maxX, pos.end);
  }

  return {
    minX,
    maxX,
    width: maxX - minX,
  };
}

/**
 * Check if two positions overlap (for intervals).
 */
export function positionsOverlap(a: SolvedPosition, b: SolvedPosition): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Group overlapping intervals for vertical stacking.
 * Returns groups where each group contains overlapping intervals.
 */
export function groupOverlappingIntervals(
  positions: SolvedPosition[]
): SolvedPosition[][] {
  const sorted = [...positions].sort((a, b) => a.start - b.start);
  const groups: SolvedPosition[][] = [];

  for (const pos of sorted) {
    // Find a group where this position overlaps with at least one member
    let foundGroup = false;
    for (const group of groups) {
      if (group.some((other) => positionsOverlap(pos, other))) {
        group.push(pos);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push([pos]);
    }
  }

  return groups;
}
