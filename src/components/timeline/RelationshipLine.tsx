import type {
  TemporalRelationship,
  TimelineNode,
  SolvedPosition,
  ConfidenceLevel,
  RelationshipId,
} from '../../types';
import './RelationshipLine.css';

interface RelationshipLineProps {
  relationship: TemporalRelationship;
  sourceNode: TimelineNode;
  targetNode: TimelineNode;
  sourcePosition: SolvedPosition;
  targetPosition: SolvedPosition;
  isViolated: boolean;
  onClick?: (relationshipId: RelationshipId) => void;
}

// Colors by confidence level
const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  explicit: '#22c55e',   // green
  inferred: '#eab308',   // yellow
  speculation: '#f97316', // orange
};

const VIOLATED_COLOR = '#ef4444'; // red

// Get the center point of a node for drawing lines
function getNodeCenter(
  node: TimelineNode,
  position: SolvedPosition
): { x: number; y: number } {
  const y = 200; // Center of timeline (50% of 400px height)

  if (node.durationType === 'instant') {
    return { x: position.start, y };
  } else {
    // For intervals, use the center
    return { x: (position.start + position.end) / 2, y };
  }
}

// Get edge points for connecting to nodes (for cleaner line connections)
function getConnectionPoints(
  sourceNode: TimelineNode,
  targetNode: TimelineNode,
  sourcePosition: SolvedPosition,
  targetPosition: SolvedPosition
): { source: { x: number; y: number }; target: { x: number; y: number } } {
  const sourceCenter = getNodeCenter(sourceNode, sourcePosition);
  const targetCenter = getNodeCenter(targetNode, targetPosition);

  // Determine if we're going left-to-right or right-to-left
  const goingRight = targetCenter.x > sourceCenter.x;

  // For instant nodes, offset from the marker edge (8px radius + some padding)
  // For interval nodes, offset from the bar edge
  const sourceOffset = sourceNode.durationType === 'instant'
    ? 12
    : (sourcePosition.end - sourcePosition.start) / 2 + 8;
  const targetOffset = targetNode.durationType === 'instant'
    ? 12
    : (targetPosition.end - targetPosition.start) / 2 + 8;

  return {
    source: {
      x: sourceCenter.x + (goingRight ? sourceOffset : -sourceOffset),
      y: sourceCenter.y,
    },
    target: {
      x: targetCenter.x + (goingRight ? -targetOffset : targetOffset),
      y: targetCenter.y,
    },
  };
}

// Create a curved path between two points
function createCurvedPath(
  source: { x: number; y: number },
  target: { x: number; y: number },
  curveOffset: number = 0
): string {
  const midX = (source.x + target.x) / 2;
  const midY = source.y - 40 - curveOffset; // Curve above the timeline

  // Use quadratic bezier for smooth curves
  return `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;
}

export function RelationshipLine({
  relationship,
  sourceNode,
  targetNode,
  sourcePosition,
  targetPosition,
  isViolated,
  onClick,
}: RelationshipLineProps) {
  const { source, target } = getConnectionPoints(
    sourceNode,
    targetNode,
    sourcePosition,
    targetPosition
  );

  const color = isViolated ? VIOLATED_COLOR : CONFIDENCE_COLORS[relationship.confidence];

  // Calculate curve offset to avoid overlapping lines (based on relationship id hash)
  const curveOffset = (relationship.id.charCodeAt(0) % 5) * 15;

  const path = createCurvedPath(source, target, curveOffset);

  // Calculate arrow rotation
  const dx = target.x - source.x;
  const angle = dx >= 0 ? 0 : 180;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(relationship.id);
  };

  return (
    <g
      className={`relationship-line ${isViolated ? 'violated' : ''} confidence-${relationship.confidence}`}
      onClick={handleClick}
    >
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        className="relationship-line-hitarea"
      />

      {/* Visible line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.8}
        className="relationship-line-path"
      />

      {/* Arrowhead at target */}
      <polygon
        points="0,-5 10,0 0,5"
        fill={color}
        transform={`translate(${target.x}, ${target.y}) rotate(${angle})`}
        className="relationship-line-arrow"
      />

      {/* Glow effect for violated relationships */}
      {isViolated && (
        <path
          d={path}
          fill="none"
          stroke={VIOLATED_COLOR}
          strokeWidth={6}
          strokeOpacity={0.3}
          className="relationship-line-glow"
        />
      )}
    </g>
  );
}
