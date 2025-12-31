import { useState } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import { NodeList } from './NodeList';
import { RelationshipList } from './RelationshipList';
import { ConflictPanel } from './ConflictPanel';
import './Panels.css';

type TabId = 'events' | 'relationships' | 'conflicts';

interface SidebarProps {
  onPanToNode?: (nodeId: string, position: number) => void;
  onEditRelationship?: (relationshipId: string) => void;
}

export function Sidebar({ onPanToNode, onEditRelationship }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabId>('events');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { state, solverResult } = useTimeline();

  const nodeCount = state.nodeOrder.length;
  const relationshipCount = state.relationshipOrder.length;
  const conflictCount = (solverResult?.violations.length ?? 0) + (solverResult?.conflicts.length ?? 0);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Inspector</h2>
        <button
          className="sidebar-toggle"
          onClick={() => { setIsCollapsed(!isCollapsed); }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => { setActiveTab('events'); }}
            >
              Events
              <span className="sidebar-tab-badge">{nodeCount}</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'relationships' ? 'active' : ''}`}
              onClick={() => { setActiveTab('relationships'); }}
            >
              Relations
              <span className="sidebar-tab-badge">{relationshipCount}</span>
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'conflicts' ? 'active' : ''}`}
              onClick={() => { setActiveTab('conflicts'); }}
            >
              Status
              {conflictCount > 0 && (
                <span className="sidebar-tab-badge warning">{conflictCount}</span>
              )}
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === 'events' && <NodeList onPanToNode={onPanToNode} />}
            {activeTab === 'relationships' && (
              <RelationshipList onEditRelationship={onEditRelationship} />
            )}
            {activeTab === 'conflicts' && <ConflictPanel />}
          </div>
        </>
      )}
    </aside>
  );
}
