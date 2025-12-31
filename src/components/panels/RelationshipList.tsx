import { useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import {
  ALLEN_RELATION_LABELS,
  CONFIDENCE_LABELS,
  type TemporalRelationship,
  type ConfidenceLevel,
} from '../../types';

interface RelationshipListProps {
  onEditRelationship?: (relationshipId: string) => void;
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  explicit: '#22c55e',
  inferred: '#eab308',
  speculation: '#f97316',
};

export function RelationshipList({ onEditRelationship }: RelationshipListProps) {
  const { state, selectNode, toggleRelationship, solverResult } = useTimeline();

  const relationships = useMemo(() => {
    return state.relationshipOrder
      .map((id) => state.relationships[id])
      .filter((rel): rel is TemporalRelationship => rel !== undefined);
  }, [state.relationships, state.relationshipOrder]);

  const violatedIds = useMemo(() => {
    const ids = new Set<string>();
    if (solverResult?.violations) {
      for (const v of solverResult.violations) {
        ids.add(v.relationshipId);
      }
    }
    return ids;
  }, [solverResult]);

  const getNodeName = (nodeId: string): string => {
    return state.nodes[nodeId]?.name ?? 'Unknown';
  };

  const handleRelationshipClick = (rel: TemporalRelationship) => {
    // Select the source node to show the relationship on timeline
    selectNode(rel.sourceId);
    if (onEditRelationship) {
      onEditRelationship(rel.id);
    }
  };

  const handleToggle = (e: React.MouseEvent, relId: string) => {
    e.stopPropagation();
    toggleRelationship(relId);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Relationships ({relationships.length})</h3>
      </div>
      <div className="panel-list">
        {relationships.length === 0 ? (
          <div className="panel-empty">No relationships yet</div>
        ) : (
          relationships.map((rel) => {
            const isViolated = violatedIds.has(rel.id);
            return (
              <div
                key={rel.id}
                className={`panel-item relationship-item ${!rel.enabled ? 'disabled' : ''} ${isViolated ? 'violated' : ''}`}
                onClick={() => { handleRelationshipClick(rel); }}
              >
                <div
                  className="relationship-confidence-dot"
                  style={{ backgroundColor: CONFIDENCE_COLORS[rel.confidence] }}
                  title={CONFIDENCE_LABELS[rel.confidence]}
                />
                <div className="panel-item-content">
                  <div className="relationship-summary">
                    <span className="relationship-node">{getNodeName(rel.sourceId)}</span>
                    <span className="relationship-arrow">→</span>
                    <span className="relationship-relation">
                      {ALLEN_RELATION_LABELS[rel.relation]}
                    </span>
                    <span className="relationship-arrow">→</span>
                    <span className="relationship-node">{getNodeName(rel.targetId)}</span>
                  </div>
                  {rel.reasoning && (
                    <div className="panel-item-desc">{rel.reasoning}</div>
                  )}
                  {isViolated && (
                    <div className="relationship-violation">Constraint violated</div>
                  )}
                </div>
                <button
                  className={`panel-toggle ${rel.enabled ? 'enabled' : ''}`}
                  onClick={(e) => { handleToggle(e, rel.id); }}
                  title={rel.enabled ? 'Disable' : 'Enable'}
                >
                  {rel.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
