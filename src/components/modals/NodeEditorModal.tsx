import { useState } from 'react';
import { Modal } from './Modal';
import { useTimeline } from '../../context/TimelineContext';
import type { NodeId, DurationType, TimelineNode } from '../../types';

interface NodeEditorModalProps {
  nodeId: NodeId | null;
  isOpen: boolean;
  onClose: () => void;
  /** When creating a new node (nodeId is null), this sets the initial type */
  initialDurationType?: DurationType;
}

interface NodeFormProps {
  node: TimelineNode;
  onSave: (data: {
    name: string;
    description: string;
    durationType: DurationType;
    category?: string;
    enabled: boolean;
  }) => void;
  onDelete?: () => void;
  onCancel: () => void;
  isCreateMode?: boolean;
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

// Separate form component that mounts fresh when modal opens
function NodeForm({ node, onSave, onDelete, onCancel, isCreateMode }: NodeFormProps) {
  // Initialize state from props - runs once on mount
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description);
  const [durationType, setDurationType] = useState<DurationType>(node.durationType);
  const [category, setCategory] = useState(node.category ?? '');
  const [enabled, setEnabled] = useState(node.enabled);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      durationType,
      category: category || undefined,
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
      <div className="form-group">
        <label className="form-label" htmlFor="node-name">Name</label>
        <input
          id="node-name"
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => { setName(e.target.value); }}
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
          onChange={(e) => { setDescription(e.target.value); }}
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
              onChange={() => { setDurationType('instant'); }}
            />
            Instant Event
          </label>
          <label className="form-radio-label">
            <input
              type="radio"
              name="durationType"
              value="interval"
              checked={durationType === 'interval'}
              onChange={() => { setDurationType('interval'); }}
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
          onChange={(e) => { setCategory(e.target.value); }}
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
            onChange={(e) => { setEnabled(e.target.checked); }}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {!isCreateMode && (
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
      )}

      <div className="modal-actions">
        <button className="modal-btn modal-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="modal-btn modal-btn-primary"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {isCreateMode ? 'Create' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}

export function NodeEditorModal({ nodeId, isOpen, onClose, initialDurationType = 'instant' }: NodeEditorModalProps) {
  const { state, updateNode, deleteNode, addNode } = useTimeline();
  const existingNode = nodeId ? state.nodes[nodeId] : null;
  const isCreateMode = !nodeId;

  // Default node for create mode
  const defaultNode: TimelineNode = {
    id: '',
    name: '',
    description: '',
    durationType: initialDurationType,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  };

  const node = existingNode ?? defaultNode;

  const handleSave = (data: {
    name: string;
    description: string;
    durationType: DurationType;
    category?: string;
    enabled: boolean;
  }) => {
    if (isCreateMode) {
      addNode(data);
    } else {
      updateNode(nodeId, data);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!nodeId) return;
    deleteNode(nodeId);
    onClose();
  };

  const title = isCreateMode
    ? initialDurationType === 'interval' ? 'New Era' : 'New Event'
    : 'Edit Event';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {/* Form component mounts fresh each time modal opens */}
      {isOpen && (
        <NodeForm
          node={node}
          onSave={handleSave}
          onDelete={isCreateMode ? undefined : handleDelete}
          onCancel={onClose}
          isCreateMode={isCreateMode}
        />
      )}
    </Modal>
  );
}
