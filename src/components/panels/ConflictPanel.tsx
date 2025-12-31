import { useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import { ALLEN_RELATION_LABELS, CONFIDENCE_LABELS } from '../../types';
import type { SolverStatus } from '../../types';

const STATUS_LABELS: Record<SolverStatus, string> = {
  satisfiable: 'All constraints satisfied',
  relaxed: 'Some constraints relaxed',
  unsatisfiable: 'Conflicting constraints',
};

const STATUS_COLORS: Record<SolverStatus, string> = {
  satisfiable: '#22c55e',
  relaxed: '#eab308',
  unsatisfiable: '#ef4444',
};

export function ConflictPanel() {
  const { state, selectNode, solverResult, isSolving } = useTimeline();

  const violations = useMemo(() => {
    if (!solverResult?.violations) return [];
    return solverResult.violations.map((v) => {
      const rel = state.relationships[v.relationshipId];
      return {
        ...v,
        relationship: rel,
        sourceName: rel ? state.nodes[rel.sourceId]?.name : 'Unknown',
        targetName: rel ? state.nodes[rel.targetId]?.name : 'Unknown',
      };
    });
  }, [solverResult, state.relationships, state.nodes]);

  const conflicts = useMemo(() => {
    if (!solverResult?.conflicts) return [];
    return solverResult.conflicts.map((c) => ({
      ...c,
      relationships: c.relationshipIds
        .map((id) => {
          const rel = state.relationships[id];
          if (!rel) return null;
          return {
            id,
            relationship: rel,
            sourceName: state.nodes[rel.sourceId]?.name ?? 'Unknown',
            targetName: state.nodes[rel.targetId]?.name ?? 'Unknown',
          };
        })
        .filter(Boolean),
    }));
  }, [solverResult, state.relationships, state.nodes]);

  const handleViolationClick = (sourceId: string) => {
    selectNode(sourceId);
  };

  const status = solverResult?.status ?? 'satisfiable';
  const hasIssues = violations.length > 0 || conflicts.length > 0;

  return (
    <div className="panel conflict-panel">
      <div className="panel-header">
        <h3 className="panel-title">Solver Status</h3>
      </div>
      <div className="conflict-status">
        <div
          className="status-indicator"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        />
        <span className="status-label">
          {isSolving ? 'Solving...' : STATUS_LABELS[status]}
        </span>
        {solverResult && (
          <span className="status-time">
            ({solverResult.solveTimeMs}ms)
          </span>
        )}
      </div>

      {!hasIssues && !isSolving && (
        <div className="conflict-empty">
          No conflicts detected. All temporal relationships are consistent.
        </div>
      )}

      {violations.length > 0 && (
        <div className="conflict-section">
          <h4 className="conflict-section-title">
            Relaxed Constraints ({violations.length})
          </h4>
          <p className="conflict-section-desc">
            These constraints were relaxed to find a valid timeline:
          </p>
          <div className="conflict-list">
            {violations.map((v) => (
              <div
                key={v.relationshipId}
                className="conflict-item"
                onClick={() => {
                  if (v.relationship) handleViolationClick(v.relationship.sourceId);
                }}
              >
                <div className="conflict-item-header">
                  <span className="conflict-item-relation">
                    {v.sourceName} {v.relationship && ALLEN_RELATION_LABELS[v.relationship.relation]} {v.targetName}
                  </span>
                  {v.relationship && (
                    <span className="conflict-item-confidence">
                      {CONFIDENCE_LABELS[v.relationship.confidence]}
                    </span>
                  )}
                </div>
                <div className="conflict-item-message">{v.message}</div>
                {v.relationship && (
                  <div className="conflict-item-suggestion">
                    Try disabling this {CONFIDENCE_LABELS[v.relationship.confidence].toLowerCase()} constraint
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="conflict-section">
          <h4 className="conflict-section-title conflict-section-title--error">
            Unresolvable Conflicts ({conflicts.length})
          </h4>
          <p className="conflict-section-desc">
            These constraint groups cannot all be satisfied:
          </p>
          <div className="conflict-list">
            {conflicts.map((c, idx) => (
              <div key={idx} className="conflict-item conflict-item--error">
                <div className="conflict-item-description">{c.description}</div>
                <div className="conflict-involved">
                  {c.relationships.map((r) =>
                    r ? (
                      <div
                        key={r.id}
                        className="conflict-involved-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViolationClick(r.relationship.sourceId);
                        }}
                      >
                        {r.sourceName} → {ALLEN_RELATION_LABELS[r.relationship.relation]} → {r.targetName}
                      </div>
                    ) : null
                  )}
                </div>
                <div className="conflict-item-suggestion">
                  Disable one of the above constraints to resolve this conflict
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
