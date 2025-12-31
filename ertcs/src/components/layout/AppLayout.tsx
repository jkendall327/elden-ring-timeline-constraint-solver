import type { ReactNode } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import { Sidebar } from '../panels/Sidebar';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  onAddRelationship: () => void;
  onOpenHelp: () => void;
  onPanToNode?: (nodeId: string, position: number) => void;
  onEditRelationship?: (relationshipId: string) => void;
}

export function AppLayout({ children, onAddRelationship, onOpenHelp, onPanToNode, onEditRelationship }: AppLayoutProps) {
  const { canUndo, canRedo, undo, redo, addNode, state } = useTimeline();
  const hasEnoughNodes = state.nodeOrder.length >= 2;

  const handleAddEvent = () => {
    addNode({
      name: 'New Event',
      description: '',
      durationType: 'instant',
      enabled: true,
    });
  };

  const handleAddEra = () => {
    addNode({
      name: 'New Era',
      description: '',
      durationType: 'interval',
      enabled: true,
    });
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">Elden Ring Timeline</h1>
          <span className="app-subtitle">Constraint Solver</span>
        </div>
        <div className="app-header-center">
          <div className="toolbar">
            <button
              className="toolbar-btn"
              onClick={handleAddEvent}
              title="Add instant event"
            >
              + Event
            </button>
            <button
              className="toolbar-btn"
              onClick={handleAddEra}
              title="Add era/duration"
            >
              + Era
            </button>
            <button
              className="toolbar-btn"
              onClick={onAddRelationship}
              disabled={!hasEnoughNodes}
              title={hasEnoughNodes ? 'Add relationship between events' : 'Add at least 2 events first'}
            >
              + Relationship
            </button>
            <div className="toolbar-separator" />
            <button
              className="toolbar-btn"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              className="toolbar-btn"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
          </div>
        </div>
        <div className="app-header-right">
          <button className="help-btn" onClick={onOpenHelp} title="Help">
            ?
          </button>
        </div>
      </header>
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
        <Sidebar
          onPanToNode={onPanToNode}
          onEditRelationship={onEditRelationship}
        />
      </main>
    </div>
  );
}
