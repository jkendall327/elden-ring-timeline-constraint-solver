import { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { useTimeline } from '../../context/TimelineContext';
import {
  ALLEN_RELATIONS,
  ALLEN_RELATION_LABELS,
  ALLEN_RELATION_DESCRIPTIONS,
  CONFIDENCE_LEVELS,
  CONFIDENCE_LABELS,
  CONFIDENCE_DESCRIPTIONS,
  type RelationshipId,
  type NodeId,
  type AllenRelation,
  type ConfidenceLevel,
  type TemporalRelationship,
  type TimelineNode,
} from '../../types';

interface RelationshipModalProps {
  relationshipId: RelationshipId | null; // null = creating new
  isOpen: boolean;
  onClose: () => void;
  defaultSourceId?: NodeId;
  defaultTargetId?: NodeId;
}

interface RelationshipFormProps {
  relationship: TemporalRelationship | null;
  nodes: Record<NodeId, TimelineNode>;
  nodeOrder: NodeId[];
  defaultSourceId?: NodeId;
  defaultTargetId?: NodeId;
  onSave: (data: {
    sourceId: NodeId;
    targetId: NodeId;
    relation: AllenRelation;
    confidence: ConfidenceLevel;
    reasoning?: string;
    enabled: boolean;
  }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

// Separate form component that mounts fresh when modal opens
function RelationshipForm({
  relationship,
  nodes,
  nodeOrder,
  defaultSourceId,
  defaultTargetId,
  onSave,
  onDelete,
  onCancel,
}: RelationshipFormProps) {
  const isEditing = relationship !== null;

  // Initialize state from props - runs once on mount
  const [sourceId, setSourceId] = useState<NodeId | ''>(
    relationship?.sourceId ?? defaultSourceId ?? ''
  );
  const [targetId, setTargetId] = useState<NodeId | ''>(
    relationship?.targetId ?? defaultTargetId ?? ''
  );
  const [relation, setRelation] = useState<AllenRelation>(
    relationship?.relation ?? 'before'
  );
  const [confidence, setConfidence] = useState<ConfidenceLevel>(
    relationship?.confidence ?? 'explicit'
  );
  const [reasoning, setReasoning] = useState(relationship?.reasoning ?? '');
  const [enabled, setEnabled] = useState(relationship?.enabled ?? true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sortedNodes = useMemo(() => {
    return nodeOrder
      .map((id) => nodes[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nodes, nodeOrder]);

  const sourceName = sourceId ? nodes[sourceId]?.name : 'Select source';
  const targetName = targetId ? nodes[targetId]?.name : 'Select target';
  const relationLabel = ALLEN_RELATION_LABELS[relation];

  const canSave = sourceId && targetId && sourceId !== targetId;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      sourceId,
      targetId,
      relation,
      confidence,
      reasoning: reasoning.trim() || undefined,
      enabled,
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    onDelete();
  };

  return (
    <>
      {/* Preview */}
      <div className="relationship-preview">
        <div className="relationship-preview-nodes">
          <span>{sourceName}</span>
          <span className="relationship-preview-arrow">→</span>
          <span>{targetName}</span>
        </div>
        <div className="relationship-preview-relation">
          {relationLabel}
        </div>
      </div>

      {/* Source Node */}
      <div className="form-group">
        <label className="form-label" htmlFor="rel-source">Source Event (A)</label>
        <select
          id="rel-source"
          className="form-select"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value as NodeId)}
        >
          <option value="">Select an event...</option>
          {sortedNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </select>
      </div>

      {/* Relation Type */}
      <div className="form-group">
        <label className="form-label" htmlFor="rel-type">Relation</label>
        <select
          id="rel-type"
          className="form-select"
          value={relation}
          onChange={(e) => setRelation(e.target.value as AllenRelation)}
        >
          {ALLEN_RELATIONS.map((rel) => (
            <option key={rel} value={rel}>
              {ALLEN_RELATION_LABELS[rel]} — {ALLEN_RELATION_DESCRIPTIONS[rel]}
            </option>
          ))}
        </select>
      </div>

      {/* Target Node */}
      <div className="form-group">
        <label className="form-label" htmlFor="rel-target">Target Event (B)</label>
        <select
          id="rel-target"
          className="form-select"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value as NodeId)}
        >
          <option value="">Select an event...</option>
          {sortedNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </select>
      </div>

      {/* Confidence Level */}
      <div className="form-group">
        <label className="form-label" htmlFor="rel-confidence">Confidence Level</label>
        <select
          id="rel-confidence"
          className="form-select"
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as ConfidenceLevel)}
        >
          {CONFIDENCE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {CONFIDENCE_LABELS[level]} — {CONFIDENCE_DESCRIPTIONS[level]}
            </option>
          ))}
        </select>
      </div>

      {/* Reasoning */}
      <div className="form-group">
        <label className="form-label" htmlFor="rel-reasoning">Reasoning / Evidence</label>
        <textarea
          id="rel-reasoning"
          className="form-textarea"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Why do you believe this relationship exists? Cite item descriptions, dialogue, etc."
        />
      </div>

      {/* Enabled Toggle (only for editing) */}
      {isEditing && (
        <div className="form-toggle">
          <span className="form-toggle-label">Enabled</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      )}

      {/* Same node warning */}
      {sourceId && targetId && sourceId === targetId && (
        <div className="conflict-warning">
          <span className="conflict-warning-icon">⚠</span>
          <span className="conflict-warning-text">
            Source and target must be different events.
          </span>
        </div>
      )}

      {/* Delete section (only for editing) */}
      {isEditing && onDelete && (
        <div className="danger-zone">
          <h4 className="danger-zone-title">Danger Zone</h4>
          <p className="danger-zone-text">
            This will remove the relationship constraint.
          </p>
          <button
            className="modal-btn modal-btn-danger"
            onClick={handleDelete}
          >
            {showDeleteConfirm ? 'Click again to confirm' : 'Delete Relationship'}
          </button>
        </div>
      )}

      <div className="modal-actions">
        <button className="modal-btn modal-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="modal-btn modal-btn-primary"
          onClick={handleSave}
          disabled={!canSave}
        >
          {isEditing ? 'Save Changes' : 'Create Relationship'}
        </button>
      </div>
    </>
  );
}

export function RelationshipModal({
  relationshipId,
  isOpen,
  onClose,
  defaultSourceId,
  defaultTargetId,
}: RelationshipModalProps) {
  const {
    state,
    addRelationship,
    updateRelationship,
    deleteRelationship,
  } = useTimeline();

  const isEditing = relationshipId !== null;
  const relationship = relationshipId ? state.relationships[relationshipId] : null;

  const handleSave = (data: {
    sourceId: NodeId;
    targetId: NodeId;
    relation: AllenRelation;
    confidence: ConfidenceLevel;
    reasoning?: string;
    enabled: boolean;
  }) => {
    if (isEditing && relationshipId) {
      updateRelationship(relationshipId, data);
    } else {
      addRelationship(data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (relationshipId) {
      deleteRelationship(relationshipId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Relationship' : 'Create Relationship'}
      width={520}
    >
      {/* Form component mounts fresh each time modal opens */}
      {isOpen && (
        <RelationshipForm
          relationship={relationship}
          nodes={state.nodes}
          nodeOrder={state.nodeOrder}
          defaultSourceId={defaultSourceId}
          defaultTargetId={defaultTargetId}
          onSave={handleSave}
          onDelete={isEditing ? handleDelete : undefined}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
