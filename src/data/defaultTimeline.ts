import type { TimelineNode, TemporalRelationship, SerializedTimeline } from '../types';

/**
 * Default timeline data loaded on first visit.
 *
 * TODO: Fill in with actual Elden Ring lore events and relationships.
 *
 * Example structure:
 * - Nodes: Major eras (Age of Dragons, Age of Erdtree, etc.) and key events
 * - Relationships: Temporal constraints between events (before, after, during, etc.)
 */

const defaultNodes: TimelineNode[] = [
  // Example stub nodes - replace with actual Elden Ring lore
  {
    id: 'age-of-dragons',
    name: 'Age of the Ancient Dragons',
    description: 'The primordial age when dragons ruled the Lands Between.',
    durationType: 'interval',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'age-of-erdtree',
    name: 'Age of the Erdtree',
    description: 'The golden age under the Erdtree and the Greater Will.',
    durationType: 'interval',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'the-shattering',
    name: 'The Shattering',
    description: 'The cataclysmic war among the demigods after the Elden Ring was shattered.',
    durationType: 'instant',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const defaultRelationships: TemporalRelationship[] = [
  // Example stub relationships - replace with actual Elden Ring lore
  {
    id: 'dragons-before-erdtree',
    sourceId: 'age-of-dragons',
    targetId: 'age-of-erdtree',
    relation: 'before',
    confidence: 'explicit',
    reasoning: 'The dragons ruled before the Erdtree arrived with the Greater Will.',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'shattering-during-erdtree',
    sourceId: 'the-shattering',
    targetId: 'age-of-erdtree',
    relation: 'during',
    confidence: 'explicit',
    reasoning: 'The Shattering occurred during the Age of the Erdtree.',
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEFAULT_TIMELINE: SerializedTimeline = {
  version: 1,
  nodes: defaultNodes,
  relationships: defaultRelationships,
  viewport: { panX: 0, zoom: 1 },
};

/**
 * Check if this is the first visit (no saved data).
 */
export function isFirstVisit(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === null;
  } catch {
    return true;
  }
}
