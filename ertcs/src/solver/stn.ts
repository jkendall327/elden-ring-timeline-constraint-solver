import type { DifferenceConstraint } from './constraints';

/**
 * Edge in the STN graph with metadata for tracking origin
 */
export interface STNEdge {
  from: string;
  to: string;
  weight: number;
  relationshipId?: string; // Which relationship this edge came from
}

/**
 * Simple Temporal Network (STN) implementation.
 *
 * An STN represents temporal constraints as a weighted directed graph where:
 * - Vertices are time variables (e.g., event start/end times)
 * - Edges represent difference constraints: edge (u, v, w) means v - u <= w
 *
 * The network is consistent (satisfiable) if and only if it contains no
 * negative-weight cycles, which can be detected using Bellman-Ford.
 */
export class SimpleTemporalNetwork {
  private vertices: Set<string> = new Set();
  private adjacencyList: Map<string, STNEdge[]> = new Map();
  private edgeCount = 0;

  /**
   * Add a vertex to the network
   */
  addVertex(v: string): void {
    if (!this.vertices.has(v)) {
      this.vertices.add(v);
      this.adjacencyList.set(v, []);
    }
  }

  /**
   * Add a difference constraint as an edge.
   * Constraint: to - from <= weight
   *
   * If an edge already exists between the same vertices, we keep
   * the tighter constraint (smaller weight).
   */
  addConstraint(
    constraint: DifferenceConstraint,
    relationshipId?: string
  ): void {
    const { from, to, maxDiff } = constraint;

    // Ensure both vertices exist
    this.addVertex(from);
    this.addVertex(to);

    // Check if edge already exists
    const edges = this.adjacencyList.get(from)!;
    const existingEdge = edges.find((e) => e.to === to);

    if (existingEdge) {
      // Keep the tighter constraint
      if (maxDiff < existingEdge.weight) {
        existingEdge.weight = maxDiff;
        existingEdge.relationshipId = relationshipId;
      }
    } else {
      // Add new edge
      edges.push({
        from,
        to,
        weight: maxDiff,
        relationshipId,
      });
      this.edgeCount++;
    }
  }

  /**
   * Add multiple constraints at once
   */
  addConstraints(
    constraints: DifferenceConstraint[],
    relationshipId?: string
  ): void {
    for (const constraint of constraints) {
      this.addConstraint(constraint, relationshipId);
    }
  }

  /**
   * Get all vertices in the network
   */
  getVertices(): string[] {
    return Array.from(this.vertices);
  }

  /**
   * Get all edges in the network
   */
  getEdges(): STNEdge[] {
    const edges: STNEdge[] = [];
    for (const edgeList of this.adjacencyList.values()) {
      edges.push(...edgeList);
    }
    return edges;
  }

  /**
   * Get outgoing edges from a vertex
   */
  getOutgoingEdges(vertex: string): STNEdge[] {
    return this.adjacencyList.get(vertex) || [];
  }

  /**
   * Get the number of vertices
   */
  get vertexCount(): number {
    return this.vertices.size;
  }

  /**
   * Get the number of edges
   */
  getEdgeCount(): number {
    return this.edgeCount;
  }

  /**
   * Check if a vertex exists
   */
  hasVertex(v: string): boolean {
    return this.vertices.has(v);
  }

  /**
   * Create a copy of this network
   */
  clone(): SimpleTemporalNetwork {
    const copy = new SimpleTemporalNetwork();
    for (const v of this.vertices) {
      copy.addVertex(v);
    }
    for (const edges of this.adjacencyList.values()) {
      for (const edge of edges) {
        copy.addConstraint(
          { from: edge.from, to: edge.to, maxDiff: edge.weight },
          edge.relationshipId
        );
      }
    }
    return copy;
  }

  /**
   * Remove all edges associated with a specific relationship
   */
  removeRelationshipEdges(relationshipId: string): void {
    for (const [vertex, edges] of this.adjacencyList) {
      const filtered = edges.filter((e) => e.relationshipId !== relationshipId);
      const removed = edges.length - filtered.length;
      this.edgeCount -= removed;
      this.adjacencyList.set(vertex, filtered);
    }
  }

  /**
   * Get all relationship IDs that have edges in this network
   */
  getRelationshipIds(): Set<string> {
    const ids = new Set<string>();
    for (const edges of this.adjacencyList.values()) {
      for (const edge of edges) {
        if (edge.relationshipId) {
          ids.add(edge.relationshipId);
        }
      }
    }
    return ids;
  }

  /**
   * Get all edges associated with a specific relationship
   */
  getEdgesForRelationship(relationshipId: string): STNEdge[] {
    const result: STNEdge[] = [];
    for (const edges of this.adjacencyList.values()) {
      for (const edge of edges) {
        if (edge.relationshipId === relationshipId) {
          result.push(edge);
        }
      }
    }
    return result;
  }
}

/**
 * Virtual source vertex name used for single-source shortest path
 */
export const VIRTUAL_SOURCE = '__source__';

/**
 * Add a virtual source vertex connected to all other vertices with weight 0.
 * This allows running single-source shortest path to detect negative cycles
 * anywhere in the graph.
 */
export function addVirtualSource(network: SimpleTemporalNetwork): void {
  network.addVertex(VIRTUAL_SOURCE);
  for (const v of network.getVertices()) {
    if (v !== VIRTUAL_SOURCE) {
      network.addConstraint({
        from: VIRTUAL_SOURCE,
        to: v,
        maxDiff: 0,
      });
    }
  }
}
