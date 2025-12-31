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

## Implementation Checklist

### Phase 1: Foundation - COMPLETE

- [x] Project structure (folders created)
- [x] `src/types/index.ts` - All TypeScript interfaces
  - NodeId, RelationshipId, AllenRelation, ConfidenceLevel
  - TimelineNode, TemporalRelationship, SolverResult
  - TimelineState, TimelineAction, HistoryState
  - ALLEN_RELATIONS array, CONFIDENCE_WEIGHTS map
- [x] `src/context/TimelineContext.tsx` - State management
  - Reducer with all CRUD actions
  - History wrapper for undo/redo (50 states max)
  - LocalStorage auto-save (1s debounce)
  - Solver integration via useSolver hook
- [x] `src/components/layout/AppLayout.tsx` - Main layout
  - Header with title
  - Toolbar: "+ Event", "+ Era", Undo, Redo buttons
  - Help button (not yet functional)
- [x] `src/components/timeline/TimelineCanvas.tsx` - Pan/zoom container
  - Mouse drag to pan
  - Scroll wheel to zoom
  - Zoom indicator in corner
- [x] `src/components/timeline/TimelineTrack.tsx` - Main timeline
  - Renders nodes from solver positions
  - Falls back to evenly-spaced if no solver result
  - Click background to deselect
- [x] `src/components/timeline/TimelineNode.tsx` - Instant events
  - Circular marker with category color
  - Hover/selected states
  - Label on hover
- [x] `src/components/timeline/TimelineInterval.tsx` - Duration events
  - Horizontal bar with caps
  - Category color with transparency
  - Label centered
- [x] `src/App.tsx` - Wires everything together
- [x] CSS files for all components (dark theme)

### Phase 2: Constraint Solver - COMPLETE

- [x] `src/solver/constraints.ts` - Allen to numeric conversion
  - `allenToConstraints()` - all 13 relations implemented
  - `getNodeVariables()` - generates start/end variable names
  - `getNodeInternalConstraints()` - ensures start < end for intervals
- [x] `src/solver/stn.ts` - Simple Temporal Network
  - `SimpleTemporalNetwork` class with add/remove operations
  - `addVirtualSource()` for single-source shortest path
  - Edge tracking by relationship ID
- [x] `src/solver/propagation.ts` - Bellman-Ford algorithm
  - `bellmanFord()` - shortest paths + negative cycle detection
  - `extractNegativeCycle()` - identifies conflicting constraints
  - `checkNetworkConsistency()` - main consistency check
  - `findAllConflicts()` - finds multiple conflict sets
- [x] `src/solver/relaxation.ts` - Soft constraint handling
  - `buildNetwork()` - creates STN from nodes + relationships
  - `relaxConstraints()` - iterative relaxation by weight
  - Removes lowest-weight constraints until satisfiable
- [x] `src/solver/positioning.ts` - Position assignment
  - `assignPositions()` - converts distances to timeline positions
  - `assignDefaultPositions()` - fallback for no constraints
  - Normalization and padding
- [x] `src/solver/solver.ts` - Main entry point
  - `solve()` - orchestrates full pipeline
  - `validateConstraints()` - check without relaxation
  - `wouldCauseConflict()` - preview adding a constraint
- [x] `src/solver/solver.worker.ts` - Web Worker
  - Non-blocking solve execution
  - Message passing protocol
- [x] `src/hooks/useSolver.ts` - React integration
  - Auto-solve on data changes (300ms debounce)
  - Manages worker lifecycle
  - Provides result, isSolving, error states

### Phase 3: Editor UI - COMPLETE

- [x] `src/components/modals/Modal.tsx` - Base modal component
  - Overlay with click-outside to close
  - Escape key to close
  - Focus trap for accessibility
- [x] `src/components/modals/Modal.css` - Modal styling
  - Form elements (inputs, selects, textareas, radio buttons)
  - Toggle switches
  - Action buttons (primary, secondary, danger)
  - Danger zone for delete confirmations
  - Relationship preview section
- [x] `src/components/modals/NodeEditorModal.tsx`
  - Open when clicking a selected node
  - Fields: name (text), description (textarea), durationType (radio), category (select)
  - Enable/disable toggle
  - Delete button with confirmation
  - Save/Cancel buttons
- [x] `src/components/modals/RelationshipModal.tsx`
  - Create new relationship between two nodes
  - Source node selector (dropdown of all nodes)
  - Target node selector (dropdown of all nodes)
  - Relation type selector (all 13 Allen relations with descriptions)
  - Confidence level selector (explicit/inferred/speculation)
  - Reasoning field (textarea for evidence)
  - Preview of relationship being created
  - Enable/disable toggle for editing existing
  - Delete button with confirmation
- [x] `src/components/modals/HelpModal.tsx` - Documentation modal
  - Project overview
  - Getting started guide
  - Allen's Interval Relations reference
  - Confidence levels explanation
  - Keyboard shortcuts reference
  - Navigation instructions
- [x] UI to trigger relationship creation
  - "Add Relationship" button in toolbar (disabled if < 2 nodes)
- [x] `src/hooks/useKeyboardShortcuts.ts`
  - Ctrl+Z / Cmd+Z for undo
  - Ctrl+Shift+Z / Cmd+Shift+Z for redo
  - Ctrl+Y for redo (Windows)
  - Escape to close modals
  - Delete/Backspace to delete selected node
- [x] Updated `TimelineTrack.tsx` to open editor on clicking selected node

### Phase 4: Relationship Visualization - NOT STARTED

- [ ] `src/components/timeline/RelationshipLine.tsx`
  - SVG arrows/lines connecting related nodes
  - Only shown when a node is selected
  - Color by confidence: green (explicit), yellow (inferred), orange (speculation)
  - Different line styles for different relation types (optional)
  - Animate in/out on selection change
- [ ] Update `TimelineTrack.tsx` to render RelationshipLines
  - Get relationships involving selected node
  - Calculate line positions from node positions
  - Render as SVG overlay
- [ ] Conflict highlighting
  - Red border/glow on nodes involved in conflicts
  - Red relationship lines for violated constraints
  - Tooltip showing conflict details

### Phase 5: Panels & Information - NOT STARTED

- [ ] `src/components/panels/NodeList.tsx` - Sidebar listing
  - List all nodes (grouped by category?)
  - Show enabled/disabled state
  - Click to select and pan to node
  - Quick enable/disable toggle
  - Search/filter functionality
- [ ] `src/components/panels/RelationshipList.tsx` - Sidebar listing
  - List all relationships
  - Show source → relation → target
  - Color by confidence
  - Click to highlight both nodes
  - Quick enable/disable toggle
- [ ] `src/components/panels/ConflictPanel.tsx`
  - Show current solver status (satisfiable/relaxed/unsatisfiable)
  - List violated constraints with explanations
  - List unresolvable conflicts
  - Click to highlight involved nodes
  - Suggestions: "Try disabling X or Y"
- [ ] `src/components/modals/HelpModal.tsx`
  - Project explanation and purpose
  - Allen relation reference with visual diagrams
  - How to use the app (tutorial)
  - Credits
- [ ] Sidebar layout integration
  - Collapsible sidebar
  - Tabs or accordion for different panels

### Phase 6: Data & Polish - NOT STARTED

- [ ] `src/data/defaultTimeline.ts` - Pre-loaded Elden Ring events
  - Major eras: Age of Dragons, Age of Erdtree, The Shattering, etc.
  - Key events: Greater Will arrives, Godfrey's wars, Marika's actions
  - Initial relationships between them
  - Load on first visit (if localStorage empty)
- [ ] `src/data/categories.ts` - Event categories
  - primordial, golden-order, shattering, demigod, tarnished, ending
  - Colors for each
  - Icons (optional)
- [ ] Visual polish
  - Loading state while solver runs
  - Smooth animations for node position changes
  - Better zoom controls (buttons, reset)
  - Minimap for large timelines (stretch)
- [ ] Performance testing
  - Test with 100+ nodes
  - Test with 500+ relationships
  - Profile and optimize if needed
- [ ] Error handling
  - Graceful handling of localStorage errors
  - Worker crash recovery
  - Invalid data migration

---

## Current State Summary

**What works now:**
- App runs (`npm run dev`)
- Can add instant events and eras via toolbar buttons
- Timeline displays nodes with pan/zoom
- Undo/redo works (with keyboard shortcuts Ctrl+Z / Ctrl+Shift+Z)
- Solver runs automatically and positions nodes
- Data persists to localStorage
- Can edit nodes after creation (click selected node to edit)
- Can create relationships between nodes via toolbar button
- Help modal with documentation
- Delete nodes via keyboard (Delete/Backspace)

**What's missing for MVP:**
1. Cannot see relationships visually (need RelationshipLine)
2. No way to see conflicts (need ConflictPanel)
3. No pre-loaded data (need defaultTimeline.ts)

**Recommended next steps:**
1. Add RelationshipLine visualization (Phase 4)
2. Add ConflictPanel to show solver status (Phase 5)
3. Create default Elden Ring dataset (Phase 6)

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
