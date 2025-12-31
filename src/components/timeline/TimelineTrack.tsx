import { useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import { TimelineNode } from './TimelineNode';
import { TimelineInterval } from './TimelineInterval';
import { RelationshipLine } from './RelationshipLine';
import type { SolvedPosition, NodeId, RelationshipId } from '../../types';
import './TimelineTrack.css';

const TIMELINE_WIDTH = 2000; // Base width, will be scaled by zoom
const TIMELINE_HEIGHT = 400;

interface TimelineTrackProps {
  onEditNode?: (nodeId: NodeId) => void;
  onEditRelationship?: (relationshipId: RelationshipId) => void;
}

export function TimelineTrack({ onEditNode, onEditRelationship }: TimelineTrackProps) {
  const { state, solverResult, selectNode } = useTimeline();
  const { nodes, nodeOrder, relationships, relationshipOrder, selectedNodeId } = state;

  // Get positions from solver result, or create default positions
  const positions = useMemo(() => {
    if (solverResult?.positions) {
      return solverResult.positions;
    }

    // Default: spread nodes evenly if no solver result
    const enabledNodes = nodeOrder
      .map((id) => nodes[id])
      .filter((n) => n?.enabled);

    if (enabledNodes.length === 0) return [];

    const spacing = TIMELINE_WIDTH / (enabledNodes.length + 1);
    return enabledNodes.map((node, index): SolvedPosition => ({
      nodeId: node.id,
      start: spacing * (index + 1),
      end: node.durationType === 'interval'
        ? spacing * (index + 1) + spacing * 0.8
        : spacing * (index + 1),
    }));
  }, [solverResult, nodes, nodeOrder]);

  // Separate instants from intervals for layering
  const { instants, intervals } = useMemo(() => {
    const instants: { node: typeof nodes[string]; position: SolvedPosition }[] = [];
    const intervals: { node: typeof nodes[string]; position: SolvedPosition }[] = [];

    for (const pos of positions) {
      const node = nodes[pos.nodeId];
      if (!node?.enabled) continue;

      if (node.durationType === 'instant') {
        instants.push({ node, position: pos });
      } else {
        intervals.push({ node, position: pos });
      }
    }

    return { instants, intervals };
  }, [positions, nodes]);

  // Create a map from nodeId to position for quick lookup
  const positionMap = useMemo(() => {
    const map = new Map<NodeId, SolvedPosition>();
    for (const pos of positions) {
      map.set(pos.nodeId, pos);
    }
    return map;
  }, [positions]);

  // Get relationships involving the selected node
  const selectedRelationships = useMemo(() => {
    if (!selectedNodeId) return [];

    return relationshipOrder
      .map((id) => relationships[id])
      .filter((rel) => {
        if (!rel?.enabled) return false;
        return rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId;
      });
  }, [selectedNodeId, relationships, relationshipOrder]);

  // Get set of violated relationship IDs
  const violatedRelationshipIds = useMemo(() => {
    const ids = new Set<RelationshipId>();
    if (solverResult?.violations) {
      for (const violation of solverResult.violations) {
        ids.add(violation.relationshipId);
      }
    }
    return ids;
  }, [solverResult]);

  // Get set of node IDs involved in conflicts
  const conflictNodeIds = useMemo(() => {
    const ids = new Set<NodeId>();
    if (solverResult?.violations) {
      for (const violation of solverResult.violations) {
        const rel = relationships[violation.relationshipId];
        if (rel) {
          ids.add(rel.sourceId);
          ids.add(rel.targetId);
        }
      }
    }
    return ids;
  }, [solverResult, relationships]);

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodeId === nodeId && onEditNode) {
      // Clicking already-selected node opens editor
      onEditNode(nodeId);
    } else {
      selectNode(nodeId);
    }
  };

  const handleBackgroundClick = () => {
    selectNode(null);
  };

  return (
    <div className="timeline-track" onClick={handleBackgroundClick}>
      {/* Timeline axis */}
      <div className="timeline-axis" style={{ width: TIMELINE_WIDTH }}>
        <div className="timeline-axis-line" />
      </div>

      {/* Intervals (rendered below instants) */}
      <div className="timeline-intervals">
        {intervals.map(({ node, position }) => (
          <TimelineInterval
            key={node.id}
            node={node}
            position={position}
            isSelected={selectedNodeId === node.id}
            hasConflict={conflictNodeIds.has(node.id)}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(node.id);
            }}
          />
        ))}
      </div>

      {/* Instant nodes (rendered on top) */}
      <div className="timeline-instants">
        {instants.map(({ node, position }) => (
          <TimelineNode
            key={node.id}
            node={node}
            position={position}
            isSelected={selectedNodeId === node.id}
            hasConflict={conflictNodeIds.has(node.id)}
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(node.id);
            }}
          />
        ))}
      </div>

      {/* Relationship lines (SVG overlay) */}
      {selectedNodeId && selectedRelationships.length > 0 && (
        <svg
          className="relationship-lines-container"
          width={TIMELINE_WIDTH}
          height={TIMELINE_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {selectedRelationships.map((rel) => {
              const sourceNode = nodes[rel.sourceId];
              const targetNode = nodes[rel.targetId];
              const sourcePosition = positionMap.get(rel.sourceId);
              const targetPosition = positionMap.get(rel.targetId);

              if (!sourceNode || !targetNode || !sourcePosition || !targetPosition) {
                return null;
              }

              return (
                <RelationshipLine
                  key={rel.id}
                  relationship={rel}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  sourcePosition={sourcePosition}
                  targetPosition={targetPosition}
                  isViolated={violatedRelationshipIds.has(rel.id)}
                  onClick={onEditRelationship}
                />
              );
            })}
          </g>
        </svg>
      )}

      {/* Empty state */}
      {positions.length === 0 && (
        <div className="timeline-empty">
          <p>No events yet. Add your first event to begin.</p>
        </div>
      )}
    </div>
  );
}
