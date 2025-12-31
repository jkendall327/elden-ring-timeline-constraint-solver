import { useState, useEffect, useMemo } from 'react';
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
} from '../../types';

interface RelationshipModalProps {
  relationshipId: RelationshipId | null; // null = creating new
  isOpen: boolean;
  onClose: () => void;
  defaultSourceId?: NodeId;
  defaultTargetId?: NodeId;
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

  const [sourceId, setSourceId] = useState<NodeId | ''>('');
  const [targetId, setTargetId] = useState<NodeId | ''>('');
  const [relation, setRelation] = useState<AllenRelation>('before');
  const [confidence, setConfidence] = useState<ConfidenceLevel>('explicit');
  const [reasoning, setReasoning] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get sorted nodes for dropdowns
  const sortedNodes = useMemo(() => {
    return state.nodeOrder
      .map((id) => state.nodes[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.nodes, state.nodeOrder]);

  // Populate form when relationship changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (relationship) {
        // Editing existing
        setSourceId(relationship.sourceId);
        setTargetId(relationship.targetId);
        setRelation(relationship.relation);
        setConfidence(relationship.confidence);
        setReasoning(relationship.reasoning || '');
        setEnabled(relationship.enabled);
      } else {
        // Creating new
        setSourceId(defaultSourceId || '');
        setTargetId(defaultTargetId || '');
        setRelation('before');
        setConfidence('explicit');
        setReasoning('');
        setEnabled(true);
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, relationship, defaultSourceId, defaultTargetId]);

  const sourceName = sourceId ? state.nodes[sourceId]?.name : 'Select source';
  const targetName = targetId ? state.nodes[targetId]?.name : 'Select target';
  const relationLabel = ALLEN_RELATION_LABELS[relation];

  const canSave = sourceId && targetId && sourceId !== targetId;

  const handleSave = () => {
    if (!canSave) return;

    if (isEditing && relationshipId) {
      updateRelationship(relationshipId, {
        sourceId,
        targetId,
        relation,
        confidence,
        reasoning: reasoning.trim() || undefined,
        enabled,
      });
    } else {
      addRelationship({
        sourceId,
        targetId,
        relation,
        confidence,
        reasoning: reasoning.trim() || undefined,
        enabled,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!relationshipId) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    deleteRelationship(relationshipId);
    onClose();
  };

  const handleCancel = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={isEditing ? 'Edit Relationship' : 'Create Relationship'}
      width={520}
    >
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
      {isEditing && (
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
        <button className="modal-btn modal-btn-secondary" onClick={handleCancel}>
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
    </Modal>
  );
}
