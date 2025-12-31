// =====================================
// Core ID Types
// =====================================

export type NodeId = string;
export type RelationshipId = string;

// =====================================
// Allen's Interval Algebra Relations
// =====================================

export type AllenRelation =
  | 'before'
  | 'after'
  | 'meets'
  | 'met-by'
  | 'overlaps'
  | 'overlapped-by'
  | 'starts'
  | 'started-by'
  | 'finishes'
  | 'finished-by'
  | 'during'
  | 'contains'
  | 'equals';

export const ALLEN_RELATIONS: AllenRelation[] = [
  'before',
  'after',
  'meets',
  'met-by',
  'overlaps',
  'overlapped-by',
  'starts',
  'started-by',
  'finishes',
  'finished-by',
  'during',
  'contains',
  'equals',
];

export const ALLEN_RELATION_LABELS: Record<AllenRelation, string> = {
  before: 'Before',
  after: 'After',
  meets: 'Meets',
  'met-by': 'Met by',
  overlaps: 'Overlaps',
  'overlapped-by': 'Overlapped by',
  starts: 'Starts',
  'started-by': 'Started by',
  finishes: 'Finishes',
  'finished-by': 'Finished by',
  during: 'During',
  contains: 'Contains',
  equals: 'Equals',
};

export const ALLEN_RELATION_DESCRIPTIONS: Record<AllenRelation, string> = {
  before: 'A ends before B starts',
  after: 'A starts after B ends',
  meets: 'A ends exactly when B starts',
  'met-by': 'A starts exactly when B ends',
  overlaps: 'A starts before B, and A ends during B',
  'overlapped-by': 'A starts during B, and A ends after B',
  starts: 'A and B start together, A ends first',
  'started-by': 'A and B start together, B ends first',
  finishes: 'A and B end together, A starts later',
  'finished-by': 'A and B end together, B starts later',
  during: 'A is entirely contained within B',
  contains: 'A entirely contains B',
  equals: 'A and B have identical start and end',
};

// Get the inverse of an Allen relation
export function getInverseRelation(relation: AllenRelation): AllenRelation {
  const inverses: Record<AllenRelation, AllenRelation> = {
    before: 'after',
    after: 'before',
    meets: 'met-by',
    'met-by': 'meets',
    overlaps: 'overlapped-by',
    'overlapped-by': 'overlaps',
    starts: 'started-by',
    'started-by': 'starts',
    finishes: 'finished-by',
    'finished-by': 'finishes',
    during: 'contains',
    contains: 'during',
    equals: 'equals',
  };
  return inverses[relation];
}

// =====================================
// Confidence Levels
// =====================================

export type ConfidenceLevel = 'explicit' | 'inferred' | 'speculation';

export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  'explicit',
  'inferred',
  'speculation',
];

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  explicit: 'Explicit',
  inferred: 'Inferred',
  speculation: 'Speculation',
};

export const CONFIDENCE_DESCRIPTIONS: Record<ConfidenceLevel, string> = {
  explicit: 'Stated directly in-game',
  inferred: 'Reasonable inference from evidence',
  speculation: 'Uncertain guess or theory',
};

export const CONFIDENCE_WEIGHTS: Record<ConfidenceLevel, number> = {
  explicit: 1000,
  inferred: 100,
  speculation: 10,
};

// =====================================
// Timeline Node (Event)
// =====================================

export type DurationType = 'instant' | 'interval';

export interface TimelineNode {
  id: NodeId;
  name: string;
  description: string;
  durationType: DurationType;
  category?: string;
  color?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// =====================================
// Temporal Relationship (Constraint)
// =====================================

export interface TemporalRelationship {
  id: RelationshipId;
  sourceId: NodeId;
  targetId: NodeId;
  relation: AllenRelation;
  confidence: ConfidenceLevel;
  reasoning?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// =====================================
// Solver Types
// =====================================

export interface SolvedPosition {
  nodeId: NodeId;
  start: number;
  end: number;
}

export interface ConstraintViolation {
  relationshipId: RelationshipId;
  severity: 'hard' | 'soft';
  message: string;
}

export interface ConflictSet {
  relationshipIds: RelationshipId[];
  description: string;
}

export type SolverStatus = 'satisfiable' | 'relaxed' | 'unsatisfiable';

export interface SolverResult {
  status: SolverStatus;
  positions: SolvedPosition[];
  violations: ConstraintViolation[];
  conflicts: ConflictSet[];
  solveTimeMs: number;
}

// =====================================
// Application State
// =====================================

export interface Viewport {
  panX: number;
  zoom: number;
}

export interface TimelineState {
  nodes: Record<NodeId, TimelineNode>;
  relationships: Record<RelationshipId, TemporalRelationship>;
  nodeOrder: NodeId[];
  relationshipOrder: RelationshipId[];
  selectedNodeId: NodeId | null;
  selectedRelationshipId: RelationshipId | null;
  viewport: Viewport;
}

// =====================================
// Actions
// =====================================

export type TimelineAction =
  | { type: 'ADD_NODE'; payload: TimelineNode }
  | { type: 'UPDATE_NODE'; payload: { id: NodeId; changes: Partial<TimelineNode> } }
  | { type: 'DELETE_NODE'; payload: NodeId }
  | { type: 'TOGGLE_NODE'; payload: NodeId }
  | { type: 'ADD_RELATIONSHIP'; payload: TemporalRelationship }
  | { type: 'UPDATE_RELATIONSHIP'; payload: { id: RelationshipId; changes: Partial<TemporalRelationship> } }
  | { type: 'DELETE_RELATIONSHIP'; payload: RelationshipId }
  | { type: 'TOGGLE_RELATIONSHIP'; payload: RelationshipId }
  | { type: 'SELECT_NODE'; payload: NodeId | null }
  | { type: 'SELECT_RELATIONSHIP'; payload: RelationshipId | null }
  | { type: 'SET_VIEWPORT'; payload: Viewport }
  | { type: 'LOAD_STATE'; payload: TimelineState }
  | { type: 'RESET_STATE' };

// =====================================
// History (Undo/Redo)
// =====================================

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export type HistoryAction<A> =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'EXECUTE'; action: A };

// =====================================
// Serialization (LocalStorage)
// =====================================

export interface SerializedTimeline {
  version: number;
  nodes: TimelineNode[];
  relationships: TemporalRelationship[];
  viewport: Viewport;
}

// =====================================
// UI State
// =====================================

export type ModalType = 'node-editor' | 'relationship-editor' | 'help' | null;

export interface UIState {
  activeModal: ModalType;
  editingNodeId: NodeId | null;
  editingRelationshipId: RelationshipId | null;
}
