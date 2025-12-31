import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useTimeline } from '../../context/TimelineContext';
import type { NodeId, DurationType } from '../../types';

interface NodeEditorModalProps {
  nodeId: NodeId | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: '', label: 'None' },
  { value: 'primordial', label: 'Primordial' },
  { value: 'golden-order', label: 'Golden Order' },
  { value: 'shattering', label: 'The Shattering' },
  { value: 'demigod', label: 'Demigod' },
  { value: 'tarnished', label: 'Tarnished' },
  { value: 'ending', label: 'Ending' },
];

export function NodeEditorModal({ nodeId, isOpen, onClose }: NodeEditorModalProps) {
  const { state, updateNode, deleteNode } = useTimeline();
  const node = nodeId ? state.nodes[nodeId] : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationType, setDurationType] = useState<DurationType>('instant');
  const [category, setCategory] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form when node changes
  useEffect(() => {
    if (node) {
      setName(node.name);
      setDescription(node.description);
      setDurationType(node.durationType);
      setCategory(node.category || '');
      setEnabled(node.enabled);
      setShowDeleteConfirm(false);
    }
  }, [node]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!nodeId || !name.trim()) return;

    updateNode(nodeId, {
      name: name.trim(),
      description: description.trim(),
      durationType,
      category: category || undefined,
      enabled,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!nodeId) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    deleteNode(nodeId);
    onClose();
  };

  const handleCancel = () => {
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!node) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Event">
      <div className="form-group">
        <label className="form-label" htmlFor="node-name">Name</label>
        <input
          id="node-name"
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter event name"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="node-description">Description</label>
        <textarea
          id="node-description"
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description or evidence..."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <div className="form-radio-group">
          <label className="form-radio-label">
            <input
              type="radio"
              name="durationType"
              value="instant"
              checked={durationType === 'instant'}
              onChange={() => setDurationType('instant')}
            />
            Instant Event
          </label>
          <label className="form-radio-label">
            <input
              type="radio"
              name="durationType"
              value="interval"
              checked={durationType === 'interval'}
              onChange={() => setDurationType('interval')}
            />
            Era / Duration
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="node-category">Category</label>
        <select
          id="node-category"
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

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

      <div className="danger-zone">
        <h4 className="danger-zone-title">Danger Zone</h4>
        <p className="danger-zone-text">
          Deleting this event will also remove all relationships connected to it.
        </p>
        <button
          className="modal-btn modal-btn-danger"
          onClick={handleDelete}
        >
          {showDeleteConfirm ? 'Click again to confirm' : 'Delete Event'}
        </button>
      </div>

      <div className="modal-actions">
        <button className="modal-btn modal-btn-secondary" onClick={handleCancel}>
          Cancel
        </button>
        <button
          className="modal-btn modal-btn-primary"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
}
