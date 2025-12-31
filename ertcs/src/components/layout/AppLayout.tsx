import type { ReactNode } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { canUndo, canRedo, undo, redo, addNode } = useTimeline();

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
          <button className="help-btn" title="Help">
            ?
          </button>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
