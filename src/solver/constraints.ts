import type { AllenRelation, NodeId } from '../types';

/**
 * A difference constraint represents: to - from <= maxDiff
 * This is the standard form for Simple Temporal Networks.
 */
export interface DifferenceConstraint {
  from: string; // Variable name (e.g., "node1_start")
  to: string; // Variable name (e.g., "node2_end")
  maxDiff: number; // to - from <= maxDiff
}

/**
 * Represents a constraint with metadata for tracking which relationship it came from
 */
export interface TrackedConstraint {
  constraint: DifferenceConstraint;
  relationshipId: string;
  description: string;
}

// Small epsilon for strict inequalities (< becomes <= with epsilon)
const EPSILON = 0.001;

// Minimum duration for intervals to ensure they have some width
const MIN_DURATION = 1;

/**
 * Get variable names for a node's start and end points
 */
export function getNodeVariables(nodeId: NodeId): { start: string; end: string } {
  return {
    start: `${nodeId}_start`,
    end: `${nodeId}_end`,
  };
}

/**
 * Convert an Allen relation between two intervals to difference constraints.
 *
 * Allen's Interval Algebra defines 13 relations between time intervals:
 * - before/after: One interval completely precedes the other
 * - meets/met-by: One interval ends exactly when the other starts
 * - overlaps/overlapped-by: Intervals partially overlap
 * - starts/started-by: Intervals share the same start point
 * - finishes/finished-by: Intervals share the same end point
 * - during/contains: One interval is entirely within the other
 * - equals: Intervals are identical
 *
 * Each relation is converted to a set of difference constraints on the
 * start and end variables of the two intervals.
 */
export function allenToConstraints(
  sourceId: NodeId,
  targetId: NodeId,
  relation: AllenRelation
): DifferenceConstraint[] {
  const A = getNodeVariables(sourceId);
  const B = getNodeVariables(targetId);

  switch (relation) {
    // ========================================
    // before(A, B): A ends before B starts
    // A.end < B.start
    // ========================================
    case 'before':
      return [
        // A.end - B.start <= -EPSILON (i.e., A.end < B.start)
        { from: B.start, to: A.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // after(A, B): A starts after B ends
    // B.end < A.start
    // ========================================
    case 'after':
      return [
        // B.end - A.start <= -EPSILON (i.e., B.end < A.start)
        { from: A.start, to: B.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // meets(A, B): A ends exactly when B starts
    // A.end = B.start
    // ========================================
    case 'meets':
      return [
        // A.end - B.start <= 0
        { from: B.start, to: A.end, maxDiff: 0 },
        // B.start - A.end <= 0
        { from: A.end, to: B.start, maxDiff: 0 },
      ];

    // ========================================
    // met-by(A, B): A starts exactly when B ends
    // B.end = A.start
    // ========================================
    case 'met-by':
      return [
        // B.end - A.start <= 0
        { from: A.start, to: B.end, maxDiff: 0 },
        // A.start - B.end <= 0
        { from: B.end, to: A.start, maxDiff: 0 },
      ];

    // ========================================
    // overlaps(A, B): A starts before B, A ends during B
    // A.start < B.start < A.end < B.end
    // ========================================
    case 'overlaps':
      return [
        // A.start < B.start
        { from: B.start, to: A.start, maxDiff: -EPSILON },
        // B.start < A.end
        { from: A.end, to: B.start, maxDiff: -EPSILON },
        // A.end < B.end
        { from: B.end, to: A.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // overlapped-by(A, B): B starts before A, B ends during A
    // B.start < A.start < B.end < A.end
    // ========================================
    case 'overlapped-by':
      return [
        // B.start < A.start
        { from: A.start, to: B.start, maxDiff: -EPSILON },
        // A.start < B.end
        { from: B.end, to: A.start, maxDiff: -EPSILON },
        // B.end < A.end
        { from: A.end, to: B.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // starts(A, B): A and B start together, A ends first
    // A.start = B.start AND A.end < B.end
    // ========================================
    case 'starts':
      return [
        // A.start = B.start
        { from: B.start, to: A.start, maxDiff: 0 },
        { from: A.start, to: B.start, maxDiff: 0 },
        // A.end < B.end
        { from: B.end, to: A.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // started-by(A, B): A and B start together, B ends first
    // A.start = B.start AND B.end < A.end
    // ========================================
    case 'started-by':
      return [
        // A.start = B.start
        { from: B.start, to: A.start, maxDiff: 0 },
        { from: A.start, to: B.start, maxDiff: 0 },
        // B.end < A.end
        { from: A.end, to: B.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // finishes(A, B): A and B end together, A starts later
    // B.start < A.start AND A.end = B.end
    // ========================================
    case 'finishes':
      return [
        // B.start < A.start
        { from: A.start, to: B.start, maxDiff: -EPSILON },
        // A.end = B.end
        { from: B.end, to: A.end, maxDiff: 0 },
        { from: A.end, to: B.end, maxDiff: 0 },
      ];

    // ========================================
    // finished-by(A, B): A and B end together, B starts later
    // A.start < B.start AND A.end = B.end
    // ========================================
    case 'finished-by':
      return [
        // A.start < B.start
        { from: B.start, to: A.start, maxDiff: -EPSILON },
        // A.end = B.end
        { from: B.end, to: A.end, maxDiff: 0 },
        { from: A.end, to: B.end, maxDiff: 0 },
      ];

    // ========================================
    // during(A, B): A is entirely contained within B
    // B.start < A.start AND A.end < B.end
    // ========================================
    case 'during':
      return [
        // B.start < A.start
        { from: A.start, to: B.start, maxDiff: -EPSILON },
        // A.end < B.end
        { from: B.end, to: A.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // contains(A, B): A entirely contains B
    // A.start < B.start AND B.end < A.end
    // ========================================
    case 'contains':
      return [
        // A.start < B.start
        { from: B.start, to: A.start, maxDiff: -EPSILON },
        // B.end < A.end
        { from: A.end, to: B.end, maxDiff: -EPSILON },
      ];

    // ========================================
    // equals(A, B): A and B are identical
    // A.start = B.start AND A.end = B.end
    // ========================================
    case 'equals':
      return [
        // A.start = B.start
        { from: B.start, to: A.start, maxDiff: 0 },
        { from: A.start, to: B.start, maxDiff: 0 },
        // A.end = B.end
        { from: B.end, to: A.end, maxDiff: 0 },
        { from: A.end, to: B.end, maxDiff: 0 },
      ];

    default:
      return [];
  }
}

/**
 * Generate internal constraints for a node to ensure valid intervals.
 * For intervals: start < end (with minimum duration)
 * For instants: start = end
 */
export function getNodeInternalConstraints(
  nodeId: NodeId,
  isInterval: boolean
): DifferenceConstraint[] {
  const { start, end } = getNodeVariables(nodeId);

  if (isInterval) {
    // For intervals: end - start >= MIN_DURATION
    // Rewritten as: start - end <= -MIN_DURATION
    return [{ from: end, to: start, maxDiff: -MIN_DURATION }];
  } else {
    // For instants: start = end
    return [
      { from: end, to: start, maxDiff: 0 },
      { from: start, to: end, maxDiff: 0 },
    ];
  }
}

/**
 * Get a human-readable description of an Allen relation
 */
export function getRelationDescription(
  sourceName: string,
  targetName: string,
  relation: AllenRelation
): string {
  const descriptions: Record<AllenRelation, string> = {
    before: `"${sourceName}" ends before "${targetName}" starts`,
    after: `"${sourceName}" starts after "${targetName}" ends`,
    meets: `"${sourceName}" ends exactly when "${targetName}" starts`,
    'met-by': `"${sourceName}" starts exactly when "${targetName}" ends`,
    overlaps: `"${sourceName}" overlaps with the start of "${targetName}"`,
    'overlapped-by': `"${sourceName}" is overlapped by "${targetName}"`,
    starts: `"${sourceName}" starts with "${targetName}" but ends earlier`,
    'started-by': `"${sourceName}" starts with "${targetName}" but ends later`,
    finishes: `"${sourceName}" finishes with "${targetName}" but starts later`,
    'finished-by': `"${sourceName}" finishes with "${targetName}" but starts earlier`,
    during: `"${sourceName}" occurs during "${targetName}"`,
    contains: `"${sourceName}" contains "${targetName}"`,
    equals: `"${sourceName}" equals "${targetName}"`,
  };
  return descriptions[relation];
}
