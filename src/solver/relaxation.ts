import type {
  TimelineNode,
  TemporalRelationship,
  RelationshipId,
} from '../types';
import { CONFIDENCE_WEIGHTS } from '../types';
import { SimpleTemporalNetwork, addVirtualSource } from './stn';
import {
  allenToConstraints,
  getNodeInternalConstraints,
  getNodeVariables,
} from './constraints';
import { checkNetworkConsistency, type BellmanFordResult } from './propagation';

/**
 * A relationship with its calculated weight for relaxation priority
 */
interface WeightedRelationship {
  relationship: TemporalRelationship;
  weight: number;
}

/**
 * Result of the relaxation process
 */
export interface RelaxationResult {
  /** The consistent network after relaxation (if achievable) */
  network: SimpleTemporalNetwork;
  /** Bellman-Ford result from the final network */
  bellmanFordResult: BellmanFordResult;
  /** Relationships that were violated/relaxed to achieve consistency */
  violatedRelationshipIds: RelationshipId[];
  /** Relationships that remain active and satisfied */
  satisfiedRelationshipIds: RelationshipId[];
  /** Whether full consistency was achieved */
  isFullySatisfied: boolean;
  /** Number of relaxation iterations performed */
  iterations: number;
}

/**
 * Build an STN from nodes and relationships.
 * Does not add virtual source - call addVirtualSource separately if needed.
 */
export function buildNetwork(
  nodes: TimelineNode[],
  relationships: TemporalRelationship[]
): SimpleTemporalNetwork {
  const network = new SimpleTemporalNetwork();

  // Add node variables and internal constraints
  for (const node of nodes) {
    const { start, end } = getNodeVariables(node.id);
    network.addVertex(start);
    network.addVertex(end);

    // Add internal constraints (start < end for intervals, start = end for instants)
    const internalConstraints = getNodeInternalConstraints(
      node.id,
      node.durationType === 'interval'
    );
    network.addConstraints(internalConstraints, `__internal_${node.id}`);
  }

  // Add relationship constraints
  for (const rel of relationships) {
    const constraints = allenToConstraints(rel.sourceId, rel.targetId, rel.relation);
    network.addConstraints(constraints, rel.id);
  }

  return network;
}

/**
 * Perform weighted constraint relaxation.
 *
 * This algorithm iteratively removes the lowest-weight (least confident)
 * constraints from conflict sets until the network becomes consistent.
 *
 * @param nodes - Enabled nodes to include in the network
 * @param relationships - Enabled relationships to include
 * @param maxIterations - Maximum relaxation iterations to prevent infinite loops
 */
export function relaxConstraints(
  nodes: TimelineNode[],
  relationships: TemporalRelationship[],
  maxIterations = 100
): RelaxationResult {
  // Sort relationships by weight (ascending - lowest weight first to remove)
  const weightedRelationships: WeightedRelationship[] = relationships.map((r) => ({
    relationship: r,
    weight: CONFIDENCE_WEIGHTS[r.confidence],
  }));
  weightedRelationships.sort((a, b) => a.weight - b.weight);

  // Track which relationships are still active
  const activeRelationshipIds = new Set(relationships.map((r) => r.id));
  const violatedRelationshipIds: RelationshipId[] = [];

  let network = buildNetwork(nodes, relationships);
  addVirtualSource(network);

  let iterations = 0;

  while (iterations < maxIterations) {
    const result = checkNetworkConsistency(network);
    iterations++;

    if (result.feasible) {
      // Network is consistent!
      return {
        network,
        bellmanFordResult: result,
        violatedRelationshipIds,
        satisfiedRelationshipIds: Array.from(activeRelationshipIds),
        isFullySatisfied: violatedRelationshipIds.length === 0,
        iterations,
      };
    }

    // Network has conflicts - find the lowest-weight relationship in the conflict
    if (!result.conflictingRelationshipIds || result.conflictingRelationshipIds.size === 0) {
      // No relationship IDs in conflict - might be internal constraints
      // This shouldn't happen with valid input, but handle it gracefully
      break;
    }

    // Find the lowest-weight relationship that's in the conflict set
    const conflictingIds = result.conflictingRelationshipIds;
    let toRemove: RelationshipId | null = null;

    for (const wr of weightedRelationships) {
      if (
        conflictingIds.has(wr.relationship.id) &&
        activeRelationshipIds.has(wr.relationship.id)
      ) {
        toRemove = wr.relationship.id;
        break;
      }
    }

    if (!toRemove) {
      // All conflicting relationships are already removed or internal
      // This indicates an unsolvable conflict with internal constraints
      break;
    }

    // Remove this relationship from the network
    activeRelationshipIds.delete(toRemove);
    violatedRelationshipIds.push(toRemove);

    // Rebuild the network without the removed relationship
    const activeRels = relationships.filter((r) => activeRelationshipIds.has(r.id));
    network = buildNetwork(nodes, activeRels);
    addVirtualSource(network);
  }

  // Final check after all iterations
  const finalResult = checkNetworkConsistency(network);

  return {
    network,
    bellmanFordResult: finalResult,
    violatedRelationshipIds,
    satisfiedRelationshipIds: Array.from(activeRelationshipIds),
    isFullySatisfied: finalResult.feasible && violatedRelationshipIds.length === 0,
    iterations,
  };
}

/**
 * Get a sorted list of relationships by confidence weight.
 * Useful for UI display of constraint priorities.
 */
export function sortByConfidence(
  relationships: TemporalRelationship[],
  ascending = true
): TemporalRelationship[] {
  const sorted = [...relationships].sort((a, b) => {
    const weightA = CONFIDENCE_WEIGHTS[a.confidence];
    const weightB = CONFIDENCE_WEIGHTS[b.confidence];
    return ascending ? weightA - weightB : weightB - weightA;
  });
  return sorted;
}

/**
 * Calculate the total weight of a set of relationships.
 * Useful for comparing different relaxation strategies.
 */
export function calculateTotalWeight(relationships: TemporalRelationship[]): number {
  return relationships.reduce(
    (sum, r) => sum + CONFIDENCE_WEIGHTS[r.confidence],
    0
  );
}

/**
 * Find the minimum set of relationships to remove to achieve consistency.
 * This uses a greedy approach - not guaranteed to be globally optimal,
 * but fast and produces good results in practice.
 */
export function findMinimalRelaxation(
  nodes: TimelineNode[],
  relationships: TemporalRelationship[]
): RelationshipId[] {
  const result = relaxConstraints(nodes, relationships);
  return result.violatedRelationshipIds;
}
