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
│   │   ├── RelationshipList.tsx  # Sidebar relationship listing
│   │   ├── ConflictPanel.tsx     # Solver status & violations
│   │   ├── Sidebar.tsx           # Tabbed sidebar container
│   │   ├── Panels.css            # Panel styling
│   │   └── index.ts              # Exports
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

### Phase 4: Relationship Visualization - COMPLETE

- [x] `src/components/timeline/RelationshipLine.tsx`
  - SVG curved arrows connecting related nodes
  - Only shown when a node is selected
  - Color by confidence: green (explicit), yellow (inferred), orange (speculation)
  - Different line styles: solid (explicit), dashed (inferred), dotted (speculation)
  - Clickable lines for future editing support
  - Arrowheads indicating direction
- [x] `src/components/timeline/RelationshipLine.css`
  - Hover effects for lines
  - Animated glow for violated relationships
  - Fade-in animation when appearing
- [x] Updated `TimelineTrack.tsx` to render RelationshipLines
  - Get relationships involving selected node
  - Calculate line positions from node positions
  - SVG overlay for rendering lines
  - Position map for quick lookups
  - Track violated relationship IDs
- [x] Conflict highlighting
  - Red pulsing border/glow on nodes involved in conflicts
  - Red relationship lines for violated constraints
  - Updated `TimelineNode.tsx` with `hasConflict` prop
  - Updated `TimelineInterval.tsx` with `hasConflict` prop
  - Animated conflict indicators

### Phase 5: Panels & Information - COMPLETE

User notes:
- Categories feature removed per user request.

- [x] `src/components/panels/NodeList.tsx` - Sidebar listing
  - List all nodes
  - Show enabled/disabled state
  - Click to select and pan to node
  - Quick enable/disable toggle
  - Search/filter functionality
- [x] `src/components/panels/RelationshipList.tsx` - Sidebar listing
  - List all relationships
  - Show source → relation → target
  - Color by confidence
  - Click to highlight involved nodes
  - Quick enable/disable toggle
- [x] `src/components/panels/ConflictPanel.tsx`
  - Show current solver status (satisfiable/relaxed/unsatisfiable)
  - Solve time display
  - List violated/relaxed constraints with explanations
  - List unresolvable conflicts
  - Click to highlight involved nodes
  - Suggestions: "Try disabling X or Y"
- [x] `src/components/panels/Sidebar.tsx` - Sidebar container
  - Collapsible sidebar
  - Tabbed interface (Events, Relations, Status)
  - Badge counts for items and warnings
- [x] `src/components/panels/Panels.css` - Panel styling
- [x] Sidebar layout integration in AppLayout
- Note: HelpModal was already completed in Phase 3

### Phase 6: Data & Polish - COMPLETE

- [x] `src/data/defaultTimeline.ts` - Pre-loaded Elden Ring events
  - Stub with example events (Age of Dragons, Age of Erdtree, The Shattering)
  - Example relationships demonstrating the system
  - Loads on first visit (if localStorage empty)
  - TODO: Fill in with actual Elden Ring lore
- [x] Error handling
  - Graceful handling of localStorage errors (with fallback to defaults)
  - Worker crash recovery (auto-restart with retry, max 3 attempts)
  - Invalid data migration and validation
  - `storageError` exposed in context for UI feedback
- [x] GitHub Actions deployment pipeline
  - `.github/workflows/deploy.yml` for GitHub Pages deployment
  - Auto-deploys on push to main/master
  - Vite config updated with base path for GitHub Pages

## Phase 7 - final stuff
- Add tests!
- Find places where we can remove useMemo etc. because we are using the React Compiler.
- Button to reset to the default timeline.

## Other assorted changes
- Should show modal for editing a node when adding a new one.
- Should have a bin area for nodes with zero relations? Otherwise they are all clustered on each other.
- Should represent graphically when multiple nodes occupy the same space.

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
- Relationship lines shown when node is selected
- Lines colored by confidence level (green/yellow/orange)
- Conflict highlighting on nodes and relationships (red pulsing glow)
- Sidebar with three tabbed panels:
  - Events panel: List, search, filter nodes; click to select/pan; toggle enabled state
  - Relations panel: List all relationships with confidence colors; toggle enabled state
  - Status panel: Solver status, solve time, violations, conflicts, resolution suggestions
- Collapsible sidebar
- Default timeline data loads on first visit (stub - fill in with actual lore)
- Error handling: localStorage errors, invalid data migration, worker crash recovery
- GitHub Actions deployment pipeline ready

**What's missing for MVP:**
1. Actual Elden Ring lore data (currently stub)

**Recommended next steps:**
1. Fill in defaultTimeline.ts with actual Elden Ring lore
2. Add tests (Phase 7)
3. Enable GitHub Pages in repository settings to activate deployment

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
