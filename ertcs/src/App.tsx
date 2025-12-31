import { useState, useCallback } from 'react';
import { TimelineProvider } from './context/TimelineContext';
import { AppLayout } from './components/layout/AppLayout';
import { TimelineCanvas } from './components/timeline/TimelineCanvas';
import { TimelineTrack } from './components/timeline/TimelineTrack';
import { NodeEditorModal } from './components/modals/NodeEditorModal';
import { RelationshipModal } from './components/modals/RelationshipModal';
import { HelpModal } from './components/modals/HelpModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { NodeId, RelationshipId, ModalType } from './types';
import './App.css';

function AppContent() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingNodeId, setEditingNodeId] = useState<NodeId | null>(null);
  const [editingRelationshipId, setEditingRelationshipId] = useState<RelationshipId | null>(null);

  const closeAllModals = useCallback(() => {
    setActiveModal(null);
    setEditingNodeId(null);
    setEditingRelationshipId(null);
  }, []);

  const handleEditNode = useCallback((nodeId: NodeId) => {
    setEditingNodeId(nodeId);
    setActiveModal('node-editor');
  }, []);

  const handleAddRelationship = useCallback(() => {
    setEditingRelationshipId(null); // null = create new
    setActiveModal('relationship-editor');
  }, []);

  const handleOpenHelp = useCallback(() => {
    setActiveModal('help');
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: closeAllModals,
    disabled: activeModal !== null, // Let modal handle its own escape
  });

  return (
    <>
      <AppLayout
        onAddRelationship={handleAddRelationship}
        onOpenHelp={handleOpenHelp}
      >
        <TimelineCanvas>
          <TimelineTrack onEditNode={handleEditNode} />
        </TimelineCanvas>
      </AppLayout>

      <NodeEditorModal
        nodeId={editingNodeId}
        isOpen={activeModal === 'node-editor'}
        onClose={closeAllModals}
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
