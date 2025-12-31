import type {
  TimelineNode,
  TemporalRelationship,
  SolverResult,
  SolverStatus,
  ConstraintViolation,
  ConflictSet,
  SolvedPosition,
} from '../types';
import { relaxConstraints, buildNetwork, type RelaxationResult } from './relaxation';
import { assignPositions, assignDefaultPositions } from './positioning';
import { findAllConflicts } from './propagation';
import { addVirtualSource } from './stn';

/**
 * Input to the solver
 */
export interface SolverInput {
  nodes: TimelineNode[];
  relationships: TemporalRelationship[];
}

/**
 * Main solver function.
 *
 * Takes nodes and relationships, runs the constraint solver,
 * and returns positions along with any violations or conflicts.
 */
export function solve(input: SolverInput): SolverResult {
  const startTime = performance.now();
  const { nodes, relationships } = input;

  // Handle empty input
  if (nodes.length === 0) {
    return {
      status: 'satisfiable',
      positions: [],
      violations: [],
      conflicts: [],
      solveTimeMs: performance.now() - startTime,
    };
  }

  // Handle no relationships - just assign default positions
  if (relationships.length === 0) {
    return {
      status: 'satisfiable',
      positions: assignDefaultPositions(nodes),
      violations: [],
      conflicts: [],
      solveTimeMs: performance.now() - startTime,
    };
  }

  // Run the relaxation algorithm
  const relaxationResult = relaxConstraints(nodes, relationships);

  // Build result
  const result = buildSolverResult(
    nodes,
    relationships,
    relaxationResult,
    startTime
  );

  return result;
}

/**
 * Build the solver result from relaxation output
 */
function buildSolverResult(
  nodes: TimelineNode[],
  relationships: TemporalRelationship[],
  relaxationResult: RelaxationResult,
  startTime: number
): SolverResult {
  const { bellmanFordResult, violatedRelationshipIds } = relaxationResult;

  // Determine status
  let status: SolverStatus;
  if (!bellmanFordResult.feasible) {
    status = 'unsatisfiable';
  } else if (violatedRelationshipIds.length > 0) {
    status = 'relaxed';
  } else {
    status = 'satisfiable';
  }

  // Assign positions
  let positions: SolvedPosition[];
  if (bellmanFordResult.feasible) {
    positions = assignPositions(nodes, bellmanFordResult);
  } else {
    // Fall back to default positions if still unsatisfiable
    positions = assignDefaultPositions(nodes);
  }

  // Build violations list
  const violations: ConstraintViolation[] = violatedRelationshipIds.map((id) => {
    const rel = relationships.find((r) => r.id === id);
    return {
      relationshipId: id,
      severity: rel?.confidence === 'speculation' ? 'soft' : 'hard',
      message: rel
        ? `Constraint "${rel.relation}" between nodes was relaxed due to conflicts`
        : 'Constraint was relaxed',
    };
  });

  // Build conflicts list (for unsatisfiable cases)
  const conflicts: ConflictSet[] = [];
  if (!bellmanFordResult.feasible && bellmanFordResult.conflictingRelationshipIds) {
    conflicts.push({
      relationshipIds: Array.from(bellmanFordResult.conflictingRelationshipIds),
      description: 'These constraints form a contradictory cycle',
    });
  }

  return {
    status,
    positions,
    violations,
    conflicts,
    solveTimeMs: performance.now() - startTime,
  };
}

/**
 * Validate that a set of constraints is satisfiable without relaxation.
 * Useful for checking before adding a new constraint.
 */
export function validateConstraints(
  nodes: TimelineNode[],
  relationships: TemporalRelationship[]
): { valid: boolean; conflicts: ConflictSet[] } {
  if (nodes.length === 0 || relationships.length === 0) {
    return { valid: true, conflicts: [] };
  }

  const network = buildNetwork(nodes, relationships);
  addVirtualSource(network);

  const allConflicts = findAllConflicts(network);

  if (allConflicts.length === 0) {
    return { valid: true, conflicts: [] };
  }

  const conflicts: ConflictSet[] = allConflicts.map((c) => ({
    relationshipIds: Array.from(c.relationshipIds),
    description: 'These constraints form a contradictory cycle',
  }));

  return { valid: false, conflicts };
}

/**
 * Check if adding a new relationship would cause conflicts.
 * Returns the conflicts that would be introduced.
 */
export function wouldCauseConflict(
  nodes: TimelineNode[],
  existingRelationships: TemporalRelationship[],
  newRelationship: TemporalRelationship
): ConflictSet | null {
  const allRelationships = [...existingRelationships, newRelationship];
  const { valid, conflicts } = validateConstraints(nodes, allRelationships);

  if (valid) {
    return null;
  }

  // Find a conflict that includes the new relationship
  for (const conflict of conflicts) {
    if (conflict.relationshipIds.includes(newRelationship.id)) {
      return conflict;
    }
  }

  // Return first conflict if new relationship not directly involved
  return conflicts[0] || null;
}
