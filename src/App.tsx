import { useState, useCallback } from 'react';
import { TimelineProvider, useTimeline } from './context/TimelineContext';
import { AppLayout } from './components/layout/AppLayout';
import { TimelineCanvas } from './components/timeline/TimelineCanvas';
import { TimelineTrack } from './components/timeline/TimelineTrack';
import { NodeEditorModal } from './components/modals/NodeEditorModal';
import { RelationshipModal } from './components/modals/RelationshipModal';
import { HelpModal } from './components/modals/HelpModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { NodeId, RelationshipId, ModalType, DurationType } from './types';
import './App.css';

function AppContent() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingNodeId, setEditingNodeId] = useState<NodeId | null>(null);
  const [editingRelationshipId, setEditingRelationshipId] = useState<RelationshipId | null>(null);
  const [newNodeDurationType, setNewNodeDurationType] = useState<DurationType>('instant');
  const { setViewport, state } = useTimeline();

  const closeAllModals = useCallback(() => {
    setActiveModal(null);
    setEditingNodeId(null);
    setEditingRelationshipId(null);
  }, []);

  const handleEditNode = useCallback((nodeId: NodeId) => {
    setEditingNodeId(nodeId);
    setActiveModal('node-editor');
  }, []);

  const handleAddEvent = useCallback(() => {
    setEditingNodeId(null);
    setNewNodeDurationType('instant');
    setActiveModal('node-editor');
  }, []);

  const handleAddEra = useCallback(() => {
    setEditingNodeId(null);
    setNewNodeDurationType('interval');
    setActiveModal('node-editor');
  }, []);

  const handleAddRelationship = useCallback(() => {
    setEditingRelationshipId(null); // null = create new
    setActiveModal('relationship-editor');
  }, []);

  const handleOpenHelp = useCallback(() => {
    setActiveModal('help');
  }, []);

  const handlePanToNode = useCallback((_nodeId: string, position: number) => {
    // Pan viewport to center the node position
    // position is in timeline coordinates (0-1 range typically)
    // We'll estimate a center position based on an assumed container width
    const estimatedContainerWidth = 800;
    const panX = estimatedContainerWidth / 2 - position * state.viewport.zoom;
    setViewport({ ...state.viewport, panX });
  }, [setViewport, state.viewport]);

  const handleEditRelationship = useCallback((relationshipId: string) => {
    setEditingRelationshipId(relationshipId);
    setActiveModal('relationship-editor');
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: closeAllModals,
    disabled: activeModal !== null, // Let modal handle its own escape
  });

  return (
    <>
      <AppLayout
        onAddEvent={handleAddEvent}
        onAddEra={handleAddEra}
        onAddRelationship={handleAddRelationship}
        onOpenHelp={handleOpenHelp}
        onPanToNode={handlePanToNode}
        onEditRelationship={handleEditRelationship}
      >
        <TimelineCanvas>
          <TimelineTrack onEditNode={handleEditNode} />
        </TimelineCanvas>
      </AppLayout>

      <NodeEditorModal
        nodeId={editingNodeId}
        isOpen={activeModal === 'node-editor'}
        onClose={closeAllModals}
        initialDurationType={newNodeDurationType}
      />

      <RelationshipModal
        relationshipId={editingRelationshipId}
        isOpen={activeModal === 'relationship-editor'}
        onClose={closeAllModals}
      />

      <HelpModal
        isOpen={activeModal === 'help'}
        onClose={closeAllModals}
      />
    </>
  );
}

function App() {
  return (
    <TimelineProvider>
      <AppContent />
    </TimelineProvider>
  );
}

export default App;
