import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  NodeId,
  RelationshipId,
  TimelineNode,
  TemporalRelationship,
  TimelineState,
  TimelineAction,
  HistoryState,
  HistoryAction,
  Viewport,
  SerializedTimeline,
  SolverResult,
} from '../types';

// =====================================
// Constants
// =====================================

const MAX_HISTORY = 50;
const STORAGE_KEY = 'ertcs_timeline_v1';
const AUTO_SAVE_DELAY = 1000;

// =====================================
// Initial State
// =====================================

const createInitialTimelineState = (): TimelineState => ({
  nodes: {},
  relationships: {},
  nodeOrder: [],
  relationshipOrder: [],
  selectedNodeId: null,
  selectedRelationshipId: null,
  viewport: { panX: 0, zoom: 1 },
});

// =====================================
// Timeline Reducer
// =====================================

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'ADD_NODE': {
        const node = action.payload;
        draft.nodes[node.id] = node;
        draft.nodeOrder.push(node.id);
        break;
      }

      case 'UPDATE_NODE': {
        const { id, changes } = action.payload;
        if (draft.nodes[id]) {
          Object.assign(draft.nodes[id], changes, { updatedAt: Date.now() });
        }
        break;
      }

      case 'DELETE_NODE': {
        const id = action.payload;
        delete draft.nodes[id];
        draft.nodeOrder = draft.nodeOrder.filter((nid) => nid !== id);
        // Also delete relationships involving this node
        const relationsToDelete = Object.values(draft.relationships)
          .filter((r) => r.sourceId === id || r.targetId === id)
          .map((r) => r.id);
        for (const rid of relationsToDelete) {
          delete draft.relationships[rid];
        }
        draft.relationshipOrder = draft.relationshipOrder.filter(
          (rid) => !relationsToDelete.includes(rid)
        );
        // Clear selection if deleted node was selected
        if (draft.selectedNodeId === id) {
          draft.selectedNodeId = null;
        }
        break;
      }

      case 'TOGGLE_NODE': {
        const id = action.payload;
        if (draft.nodes[id]) {
          draft.nodes[id].enabled = !draft.nodes[id].enabled;
          draft.nodes[id].updatedAt = Date.now();
        }
        break;
      }

      case 'ADD_RELATIONSHIP': {
        const rel = action.payload;
        draft.relationships[rel.id] = rel;
        draft.relationshipOrder.push(rel.id);
        break;
      }

      case 'UPDATE_RELATIONSHIP': {
        const { id, changes } = action.payload;
        if (draft.relationships[id]) {
          Object.assign(draft.relationships[id], changes, { updatedAt: Date.now() });
        }
        break;
      }

      case 'DELETE_RELATIONSHIP': {
        const id = action.payload;
        delete draft.relationships[id];
        draft.relationshipOrder = draft.relationshipOrder.filter((rid) => rid !== id);
        if (draft.selectedRelationshipId === id) {
          draft.selectedRelationshipId = null;
        }
        break;
      }

      case 'TOGGLE_RELATIONSHIP': {
        const id = action.payload;
        if (draft.relationships[id]) {
          draft.relationships[id].enabled = !draft.relationships[id].enabled;
          draft.relationships[id].updatedAt = Date.now();
        }
        break;
      }

      case 'SELECT_NODE': {
        draft.selectedNodeId = action.payload;
        draft.selectedRelationshipId = null;
        break;
      }

      case 'SELECT_RELATIONSHIP': {
        draft.selectedRelationshipId = action.payload;
        break;
      }

      case 'SET_VIEWPORT': {
        draft.viewport = action.payload;
        break;
      }

      case 'LOAD_STATE': {
        return action.payload;
      }

      case 'RESET_STATE': {
        return createInitialTimelineState();
      }
    }
  });
}

// =====================================
// History Reducer (Undo/Redo)
// =====================================

function createHistoryReducer<T, A>(
  reducer: (state: T, action: A) => T,
  maxHistory: number
) {
  return function historyReducer(
    state: HistoryState<T>,
    historyAction: HistoryAction<A>
  ): HistoryState<T> {
    switch (historyAction.type) {
      case 'UNDO': {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        return {
          past: newPast,
          present: previous,
          future: [state.present, ...state.future],
        };
      }

      case 'REDO': {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        return {
          past: [...state.past, state.present].slice(-maxHistory),
          present: next,
          future: newFuture,
        };
      }

      case 'EXECUTE': {
        const newPresent = reducer(state.present, historyAction.action);
        // Don't add to history if state didn't change
        if (newPresent === state.present) return state;
        return {
          past: [...state.past, state.present].slice(-maxHistory),
          present: newPresent,
          future: [], // Clear redo stack on new action
        };
      }
    }
  };
}

const historyReducer = createHistoryReducer(timelineReducer, MAX_HISTORY);

// =====================================
// Persistence
// =====================================

function serializeState(state: TimelineState): SerializedTimeline {
  return {
    version: 1,
    nodes: Object.values(state.nodes),
    relationships: Object.values(state.relationships),
    viewport: state.viewport,
  };
}

function deserializeState(data: SerializedTimeline): TimelineState {
  const nodes: Record<NodeId, TimelineNode> = {};
  const relationships: Record<RelationshipId, TemporalRelationship> = {};

  for (const node of data.nodes) {
    nodes[node.id] = node;
  }
  for (const rel of data.relationships) {
    relationships[rel.id] = rel;
  }

  return {
    nodes,
    relationships,
    nodeOrder: data.nodes.map((n) => n.id),
    relationshipOrder: data.relationships.map((r) => r.id),
    selectedNodeId: null,
    selectedRelationshipId: null,
    viewport: data.viewport,
  };
}

function saveToStorage(state: TimelineState): void {
  try {
    const serialized = serializeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.error('Failed to save timeline to localStorage:', e);
  }
}

function loadFromStorage(): TimelineState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SerializedTimeline;
    // Future: handle migrations based on data.version
    return deserializeState(data);
  } catch (e) {
    console.error('Failed to load timeline from localStorage:', e);
    return null;
  }
}

// =====================================
// Context
// =====================================

interface TimelineContextValue {
  state: TimelineState;
  canUndo: boolean;
  canRedo: boolean;
  solverResult: SolverResult | null;
  isSolving: boolean;

  // Node actions
  addNode: (node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt'>) => NodeId;
  updateNode: (id: NodeId, changes: Partial<TimelineNode>) => void;
  deleteNode: (id: NodeId) => void;
  toggleNode: (id: NodeId) => void;

  // Relationship actions
  addRelationship: (rel: Omit<TemporalRelationship, 'id' | 'createdAt' | 'updatedAt'>) => RelationshipId;
  updateRelationship: (id: RelationshipId, changes: Partial<TemporalRelationship>) => void;
  deleteRelationship: (id: RelationshipId) => void;
  toggleRelationship: (id: RelationshipId) => void;

  // Selection
  selectNode: (id: NodeId | null) => void;
  selectRelationship: (id: RelationshipId | null) => void;

  // Viewport
  setViewport: (viewport: Viewport) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Bulk
  loadState: (state: TimelineState) => void;
  resetState: () => void;

  // Solver
  setSolverResult: (result: SolverResult | null) => void;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

// =====================================
// Provider
// =====================================

interface TimelineProviderProps {
  children: ReactNode;
}

export function TimelineProvider({ children }: TimelineProviderProps) {
  // Initialize with loaded state or default
  const initialState = useMemo(() => {
    const loaded = loadFromStorage();
    return {
      past: [] as TimelineState[],
      present: loaded ?? createInitialTimelineState(),
      future: [] as TimelineState[],
    };
  }, []);

  const [historyState, dispatch] = useReducer(historyReducer, initialState);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [isSolving] = useState(false); // TODO: setIsSolving will be used by solver

  const state = historyState.present;
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  // Auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      saveToStorage(state);
    }, AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [state]);

  // Action creators
  const execute = useCallback((action: TimelineAction) => {
    dispatch({ type: 'EXECUTE', action });
  }, []);

  const addNode = useCallback(
    (node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt'>): NodeId => {
      const id = uuidv4();
      const now = Date.now();
      execute({
        type: 'ADD_NODE',
        payload: { ...node, id, createdAt: now, updatedAt: now },
      });
      return id;
    },
    [execute]
  );

  const updateNode = useCallback(
    (id: NodeId, changes: Partial<TimelineNode>) => {
      execute({ type: 'UPDATE_NODE', payload: { id, changes } });
    },
    [execute]
  );

  const deleteNode = useCallback(
    (id: NodeId) => {
      execute({ type: 'DELETE_NODE', payload: id });
    },
    [execute]
  );

  const toggleNode = useCallback(
    (id: NodeId) => {
      execute({ type: 'TOGGLE_NODE', payload: id });
    },
    [execute]
  );

  const addRelationship = useCallback(
    (rel: Omit<TemporalRelationship, 'id' | 'createdAt' | 'updatedAt'>): RelationshipId => {
      const id = uuidv4();
      const now = Date.now();
      execute({
        type: 'ADD_RELATIONSHIP',
        payload: { ...rel, id, createdAt: now, updatedAt: now },
      });
      return id;
    },
    [execute]
  );

  const updateRelationship = useCallback(
    (id: RelationshipId, changes: Partial<TemporalRelationship>) => {
      execute({ type: 'UPDATE_RELATIONSHIP', payload: { id, changes } });
    },
    [execute]
  );

  const deleteRelationship = useCallback(
    (id: RelationshipId) => {
      execute({ type: 'DELETE_RELATIONSHIP', payload: id });
    },
    [execute]
  );

  const toggleRelationship = useCallback(
    (id: RelationshipId) => {
      execute({ type: 'TOGGLE_RELATIONSHIP', payload: id });
    },
    [execute]
  );

  const selectNode = useCallback(
    (id: NodeId | null) => {
      execute({ type: 'SELECT_NODE', payload: id });
    },
    [execute]
  );

  const selectRelationship = useCallback(
    (id: RelationshipId | null) => {
      execute({ type: 'SELECT_RELATIONSHIP', payload: id });
    },
    [execute]
  );

  const setViewport = useCallback(
    (viewport: Viewport) => {
      // Viewport changes don't go through history (too noisy)
      dispatch({
        type: 'EXECUTE',
        action: { type: 'SET_VIEWPORT', payload: viewport },
      });
    },
    []
  );

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const loadStateAction = useCallback(
    (newState: TimelineState) => {
      execute({ type: 'LOAD_STATE', payload: newState });
    },
    [execute]
  );

  const resetState = useCallback(() => {
    execute({ type: 'RESET_STATE' });
  }, [execute]);

  const value: TimelineContextValue = {
    state,
    canUndo,
    canRedo,
    solverResult,
    isSolving,
    addNode,
    updateNode,
    deleteNode,
    toggleNode,
    addRelationship,
    updateRelationship,
    deleteRelationship,
    toggleRelationship,
    selectNode,
    selectRelationship,
    setViewport,
    undo,
    redo,
    loadState: loadStateAction,
    resetState,
    setSolverResult,
  };

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

// =====================================
// Hook
// =====================================

export function useTimeline(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a TimelineProvider');
  }
  return context;
}

// Re-export for convenience
export { TimelineContext };
