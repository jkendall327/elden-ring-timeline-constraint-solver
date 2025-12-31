import { useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import { TimelineNode } from './TimelineNode';
import { TimelineInterval } from './TimelineInterval';
import type { SolvedPosition, NodeId } from '../../types';
import './TimelineTrack.css';

const TIMELINE_WIDTH = 2000; // Base width, will be scaled by zoom

interface TimelineTrackProps {
  onEditNode?: (nodeId: NodeId) => void;
}

export function TimelineTrack({ onEditNode }: TimelineTrackProps) {
  const { state, solverResult, selectNode } = useTimeline();
  const { nodes, nodeOrder, selectedNodeId } = state;

  // Get positions from solver result, or create default positions
  const positions = useMemo(() => {
    if (solverResult?.positions) {
      return solverResult.positions;
    }

    // Default: spread nodes evenly if no solver result
    const enabledNodes = nodeOrder
      .map((id) => nodes[id])
      .filter((n) => n && n.enabled);

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
    const instants: Array<{ node: typeof nodes[string]; position: SolvedPosition }> = [];
    const intervals: Array<{ node: typeof nodes[string]; position: SolvedPosition }> = [];

    for (const pos of positions) {
      const node = nodes[pos.nodeId];
      if (!node || !node.enabled) continue;

      if (node.durationType === 'instant') {
        instants.push({ node, position: pos });
      } else {
        intervals.push({ node, position: pos });
      }
    }

    return { instants, intervals };
  }, [positions, nodes]);

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
            onClick={(e) => {
              e.stopPropagation();
              handleNodeClick(node.id);
            }}
          />
        ))}
      </div>

      {/* Empty state */}
      {positions.length === 0 && (
        <div className="timeline-empty">
          <p>No events yet. Add your first event to begin.</p>
        </div>
      )}
    </div>
  );
}
