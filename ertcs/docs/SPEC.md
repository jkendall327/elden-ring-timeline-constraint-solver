# Elden Ring Timeline Constraint Solver (ERTCS) - Specification

## Overview

A React web app for building an interactive Elden Ring lore timeline using constraint-based positioning. Users define temporal relationships between events (before, after, during, etc.) and a constraint solver positions them on the timeline.

---

## Core Decisions

| Decision | Choice |
|----------|--------|
| Time model | Eras as duration nodes; all positioning via constraints |
| Temporal relations | Full Allen's Interval Algebra (13 relations) |
| Conflict handling | Highlight visually; allow contradictions to exist |
| Confidence levels | Explicit, Inferred, Speculation (weighted soft constraints) |
| Data persistence | LocalStorage with auto-save |
| Undo/redo | Full history support |
| Relationship display | On-demand (shown when node selected) |
| Durations | Purely relative (no numeric estimates) |

---

## Data Model

### TimelineNode
```typescript
interface TimelineNode {
  id: string;
  name: string;
  description: string;
  durationType: 'instant' | 'interval';
  category?: string;
  color?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### TemporalRelationship
```typescript
type AllenRelation =
  | 'before' | 'after'
  | 'meets' | 'met-by'
  | 'overlaps' | 'overlapped-by'
  | 'starts' | 'started-by'
  | 'finishes' | 'finished-by'
  | 'during' | 'contains'
  | 'equals';

type ConfidenceLevel = 'explicit' | 'inferred' | 'speculation';

interface TemporalRelationship {
  id: string;
  sourceId: string;  // "A" in "A before B"
  targetId: string;  // "B"
  relation: AllenRelation;
  confidence: ConfidenceLevel;
  reasoning?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### SolverResult
```typescript
interface SolverResult {
  status: 'satisfiable' | 'relaxed' | 'unsatisfiable';
  positions: Array<{ nodeId: string; start: number; end: number }>;
  violations: Array<{ relationshipId: string; message: string }>;
  conflicts: Array<{ relationshipIds: string[]; description: string }>;
}
```

---

## Constraint Solver Architecture

### Approach: Simple Temporal Network (STN) + Weighted Relaxation

1. **Convert Allen relations to difference constraints**
   - Each Allen relation becomes numeric inequalities on interval endpoints
   - Example: `before(A, B)` → `A.end < B.start`

2. **Build STN graph**
   - Vertices: `{nodeId}_start` and `{nodeId}_end` for each node
   - Edges: Difference constraints as weighted directed edges

3. **Detect conflicts via Bellman-Ford**
   - Negative cycle = unsatisfiable constraints
   - Extract cycle to identify conflicting relationships

4. **Soft constraint relaxation**
   - Weight by confidence: explicit=1000, inferred=100, speculation=10
   - When conflicts found, remove lowest-weight constraint first
   - Iterate until satisfiable or only hard conflicts remain

5. **Position assignment**
   - Use shortest-path distances as positions
   - Normalize to display scale
   - Run in Web Worker to avoid blocking UI

### Allen Relation Constraint Mappings

| Relation | Constraint(s) |
|----------|---------------|
| before(A,B) | A.end < B.start |
| meets(A,B) | A.end = B.start |
| overlaps(A,B) | A.start < B.start < A.end < B.end |
| starts(A,B) | A.start = B.start, A.end < B.end |
| during(A,B) | B.start < A.start, A.end < B.end |
| finishes(A,B) | A.end = B.end, B.start < A.start |
| equals(A,B) | A.start = B.start, A.end = B.end |
| (inverses) | Swap A and B |

---

## Component Architecture

```
src/
├── components/
│   ├── timeline/
│   │   ├── TimelineCanvas.tsx    # Pan/zoom container
│   │   ├── TimelineTrack.tsx     # Horizontal track with axis
│   │   ├── TimelineNode.tsx      # Instant event (tick)
│   │   ├── TimelineInterval.tsx  # Duration event (bar)
│   │   └── RelationshipLine.tsx  # Connection arrows (on-demand)
│   ├── panels/
│   │   ├── NodeList.tsx          # Sidebar node listing
│   │   └── ConflictPanel.tsx     # Violation warnings
│   ├── modals/
│   │   ├── NodeEditorModal.tsx   # Create/edit node
│   │   ├── RelationshipModal.tsx # Create/edit relationship
│   │   └── HelpModal.tsx         # Documentation
│   └── layout/
│       └── AppLayout.tsx         # Main shell
├── context/
│   └── TimelineContext.tsx       # State + undo/redo
├── solver/
│   ├── solver.worker.ts          # Web Worker entry
│   ├── constraints.ts            # Allen → numeric
│   ├── stn.ts                    # Graph structure
│   ├── propagation.ts            # Bellman-Ford
│   ├── relaxation.ts             # Soft constraint handling
│   └── positioning.ts            # Final positions
├── hooks/
│   ├── useTimeline.ts            # Context access
│   ├── useSolver.ts              # Worker integration
│   └── usePanZoom.ts             # Gesture handling
├── data/
│   └── defaultTimeline.ts        # Pre-loaded events
└── types/
    └── index.ts                  # All interfaces
```

---

## State Management

### History-Aware Reducer Pattern

```typescript
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

// Actions: UNDO, REDO, EXECUTE
// Max history: 50 states
// Clear future on new action
```

### Auto-Save
- Debounced save to localStorage (1 second delay)
- Version field for future migrations

---

## UI/UX Specifications

### Timeline Canvas
- Horizontal scrolling timeline
- Pan: Click and drag
- Zoom: Scroll wheel or pinch
- Click node to select → shows relationships + opens editor

### Node Display
- **Instant events**: Vertical tick marks with label
- **Interval events**: Horizontal bars with label inside/above
- **States**: Normal, selected (highlighted), disabled (faded), conflicting (red border)

### Relationship Display
- Shown only when a node is selected
- Arrows connecting source → target
- Color by confidence: green (explicit), yellow (inferred), orange (speculation)
- Conflicting relationships: red with warning icon

### Modals
- **Node Editor**: Name, description, type (instant/interval), category, delete button
- **Relationship Editor**: Source/target selectors, relation dropdown, confidence, reasoning text
- **Help**: Project explanation, Allen relation reference, credits

### Conflict Panel
- Sidebar section showing current violations
- Click to highlight involved nodes/relationships
- Suggestions for resolution

---

## Implementation Phases

### Phase 1: Foundation
- Project structure and TypeScript interfaces
- TimelineContext with reducer + undo/redo
- LocalStorage persistence
- Basic static timeline view (no solver)

### Phase 2: Constraint Solver
- Allen relation → constraint conversion
- STN graph implementation
- Bellman-Ford algorithm
- Conflict detection
- Web Worker setup

### Phase 3: Soft Constraints
- Weighted constraint model
- Iterative relaxation algorithm
- Violation tracking and reporting

### Phase 4: Timeline Visualization
- Pan/zoom implementation
- TimelineNode and TimelineInterval components
- Selection interactions
- Relationship line rendering

### Phase 5: Editor UI
- Modal system
- NodeEditorModal
- RelationshipModal
- Keyboard shortcuts (Ctrl+Z, etc.)

### Phase 6: Polish
- Pre-loaded Elden Ring dataset
- HelpModal with documentation
- ConflictPanel in sidebar
- Visual styling
- Performance testing

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `uuid` | Generate unique IDs |
| `immer` | Immutable state updates |

---

## Pre-loaded Dataset (Examples)

**Nodes:**
- Age of the Ancient Dragons (interval)
- Greater Will contacts Lands Between (instant)
- War against the Giants (interval)
- The Shattering (instant)
- Malenia vs Radahn (instant)
- Age of the Erdtree (interval)

**Relationships:**
- Age of Dragons `before` Age of Erdtree (explicit)
- Greater Will contact `during` Age of Dragons (inferred)
- War against Giants `during` Age of Erdtree (explicit)
- Malenia vs Radahn `after` The Shattering (explicit)

---

## Out of Scope (Stretch Goals)

- Import/export JSON files
- Multiple theory packs
- Collaborative editing
- Backend/cloud sync
