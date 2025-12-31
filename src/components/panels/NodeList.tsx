import { useState, useMemo } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import type { TimelineNode } from '../../types';

interface NodeListProps {
  onPanToNode?: (nodeId: string, position: number) => void;
}

export function NodeList({ onPanToNode }: NodeListProps) {
  const { state, selectNode, toggleNode, solverResult } = useTimeline();
  const [searchTerm, setSearchTerm] = useState('');

  const nodes = useMemo(() => {
    return state.nodeOrder
      .map((id) => state.nodes[id])
      .filter((node): node is TimelineNode => node !== undefined);
  }, [state.nodes, state.nodeOrder]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes;
    const term = searchTerm.toLowerCase();
    return nodes.filter(
      (node) =>
        node.name.toLowerCase().includes(term) ||
        node.description.toLowerCase().includes(term)
    );
  }, [nodes, searchTerm]);

  const positionMap = useMemo(() => {
    const map = new Map<string, number>();
    if (solverResult?.positions) {
      for (const pos of solverResult.positions) {
        map.set(pos.nodeId, (pos.start + pos.end) / 2);
      }
    }
    return map;
  }, [solverResult]);

  const handleNodeClick = (node: TimelineNode) => {
    selectNode(node.id);
    const position = positionMap.get(node.id);
    if (onPanToNode && position !== undefined) {
      onPanToNode(node.id, position);
    }
  };

  const handleToggle = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    toggleNode(nodeId);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Events ({nodes.length})</h3>
      </div>
      <div className="panel-search">
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="panel-search-input"
        />
        {searchTerm && (
          <button
            className="panel-search-clear"
            onClick={() => setSearchTerm('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <div className="panel-list">
        {filteredNodes.length === 0 ? (
          <div className="panel-empty">
            {searchTerm ? 'No matching events' : 'No events yet'}
          </div>
        ) : (
          filteredNodes.map((node) => (
            <div
              key={node.id}
              className={`panel-item ${state.selectedNodeId === node.id ? 'selected' : ''} ${!node.enabled ? 'disabled' : ''}`}
              onClick={() => handleNodeClick(node)}
            >
              <div className="panel-item-icon">
                {node.durationType === 'instant' ? (
                  <span className="node-icon instant">●</span>
                ) : (
                  <span className="node-icon interval">━━</span>
                )}
              </div>
              <div className="panel-item-content">
                <div className="panel-item-name">{node.name}</div>
                {node.description && (
                  <div className="panel-item-desc">{node.description}</div>
                )}
              </div>
              <button
                className={`panel-toggle ${node.enabled ? 'enabled' : ''}`}
                onClick={(e) => handleToggle(e, node.id)}
                title={node.enabled ? 'Disable' : 'Enable'}
              >
                {node.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
