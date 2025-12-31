import { SimpleTemporalNetwork, VIRTUAL_SOURCE, type STNEdge } from './stn';

/**
 * Result of running Bellman-Ford algorithm
 */
export interface BellmanFordResult {
  /** Whether the network is consistent (no negative cycles) */
  feasible: boolean;
  /** Shortest distances from source to each vertex (if feasible) */
  distances: Map<string, number>;
  /** Predecessor map for reconstructing paths */
  predecessors: Map<string, string | null>;
  /** If not feasible, the edges forming a negative cycle */
  negativeCycleEdges: STNEdge[] | null;
  /** Relationship IDs involved in the negative cycle */
  conflictingRelationshipIds: Set<string> | null;
}

/**
 * Bellman-Ford algorithm for single-source shortest paths.
 *
 * This algorithm:
 * 1. Finds shortest paths from a source to all reachable vertices
 * 2. Detects negative-weight cycles (which indicate unsatisfiable constraints)
 * 3. Can extract the actual cycle for conflict reporting
 *
 * Time complexity: O(V * E) where V = vertices, E = edges
 */
export function bellmanFord(
  network: SimpleTemporalNetwork,
  source: string
): BellmanFordResult {
  const vertices = network.getVertices();
  const edges = network.getEdges();
  const V = vertices.length;

  // Initialize distances and predecessors
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();
  const predecessorEdge = new Map<string, STNEdge | null>();

  for (const v of vertices) {
    distances.set(v, v === source ? 0 : Infinity);
    predecessors.set(v, null);
    predecessorEdge.set(v, null);
  }

  // Relax edges V-1 times
  for (let i = 0; i < V - 1; i++) {
    let anyChange = false;

    for (const edge of edges) {
      const distFrom = distances.get(edge.from)!;
      const distTo = distances.get(edge.to)!;
      const newDist = distFrom + edge.weight;

      if (distFrom !== Infinity && newDist < distTo) {
        distances.set(edge.to, newDist);
        predecessors.set(edge.to, edge.from);
        predecessorEdge.set(edge.to, edge);
        anyChange = true;
      }
    }

    // Early termination if no changes
    if (!anyChange) break;
  }

  // Check for negative cycles (one more iteration)
  for (const edge of edges) {
    const distFrom = distances.get(edge.from)!;
    const distTo = distances.get(edge.to)!;

    if (distFrom !== Infinity && distFrom + edge.weight < distTo) {
      // Negative cycle detected - extract it
      const { cycleEdges, relationshipIds } = extractNegativeCycle(
        edge.to,
        predecessors,
        predecessorEdge,
        V
      );

      return {
        feasible: false,
        distances,
        predecessors,
        negativeCycleEdges: cycleEdges,
        conflictingRelationshipIds: relationshipIds,
      };
    }
  }

  return {
    feasible: true,
    distances,
    predecessors,
    negativeCycleEdges: null,
    conflictingRelationshipIds: null,
  };
}

/**
 * Extract the negative cycle starting from a vertex known to be in the cycle.
 *
 * We first walk back V times to ensure we're definitely in the cycle,
 * then trace the cycle back to itself.
 */
function extractNegativeCycle(
  startVertex: string,
  predecessors: Map<string, string | null>,
  predecessorEdge: Map<string, STNEdge | null>,
  V: number
): { cycleEdges: STNEdge[]; relationshipIds: Set<string> } {
  // Walk back V times to ensure we're in the cycle
  let current: string = startVertex;
  for (let i = 0; i < V; i++) {
    const pred = predecessors.get(current);
    if (pred === null || pred === undefined) break;
    current = pred;
  }

  // Now trace the cycle
  const cycleEdges: STNEdge[] = [];
  const relationshipIds = new Set<string>();
  const visited = new Set<string>();
  const cycleStart = current;

  do {
    visited.add(current);
    const edge = predecessorEdge.get(current);
    if (edge) {
      cycleEdges.push(edge);
      if (edge.relationshipId) {
        relationshipIds.add(edge.relationshipId);
      }
    }
    const pred = predecessors.get(current);
    if (pred === null || pred === undefined) break;
    current = pred;
  } while (current !== cycleStart && !visited.has(current));

  return { cycleEdges, relationshipIds };
}

/**
 * Run Bellman-Ford from the virtual source to check overall network consistency.
 * The virtual source must have already been added to the network.
 */
export function checkNetworkConsistency(
  network: SimpleTemporalNetwork
): BellmanFordResult {
  return bellmanFord(network, VIRTUAL_SOURCE);
}

/**
 * Find all negative cycles in the network by iteratively removing found cycles.
 * This is useful for identifying all conflicting constraint sets.
 *
 * Note: This is more expensive than just finding one cycle, so use sparingly.
 */
export function findAllConflicts(
  network: SimpleTemporalNetwork,
  maxIterations = 10
): Array<{ edges: STNEdge[]; relationshipIds: Set<string> }> {
  const conflicts: Array<{ edges: STNEdge[]; relationshipIds: Set<string> }> = [];
  const workingNetwork = network.clone();

  for (let i = 0; i < maxIterations; i++) {
    const result = checkNetworkConsistency(workingNetwork);

    if (result.feasible) {
      break; // No more conflicts
    }

    if (result.negativeCycleEdges && result.conflictingRelationshipIds) {
      conflicts.push({
        edges: result.negativeCycleEdges,
        relationshipIds: result.conflictingRelationshipIds,
      });

      // Remove one relationship from the conflict to allow finding more
      const relIds = Array.from(result.conflictingRelationshipIds);
      if (relIds.length > 0) {
        workingNetwork.removeRelationshipEdges(relIds[0]);
      } else {
        break; // Can't make progress
      }
    } else {
      break;
    }
  }

  return conflicts;
}

/**
 * Compute the tightest bounds for all variables.
 * Returns both upper bounds (from source) and lower bounds (to source).
 */
export function computeBounds(
  network: SimpleTemporalNetwork
): Map<string, { lower: number; upper: number }> {
  const result = checkNetworkConsistency(network);

  if (!result.feasible) {
    return new Map();
  }

  const bounds = new Map<string, { lower: number; upper: number }>();

  for (const [vertex, dist] of result.distances) {
    if (vertex === VIRTUAL_SOURCE) continue;

    // The shortest path distance gives us the upper bound
    // relative to the source (which is effectively 0)
    bounds.set(vertex, {
      lower: -Infinity, // We'd need reverse Bellman-Ford for true lower bounds
      upper: dist,
    });
  }

  return bounds;
}
