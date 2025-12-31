import type { MouseEvent } from 'react';
import type { TimelineNode as TimelineNodeType, SolvedPosition } from '../../types';
import './TimelineNode.css';

interface TimelineNodeProps {
  node: TimelineNodeType;
  position: SolvedPosition;
  isSelected: boolean;
  hasConflict?: boolean;
  onClick: (e: MouseEvent) => void;
}

export function TimelineNode({ node, position, isSelected, hasConflict, onClick }: TimelineNodeProps) {
  const categoryColor = node.color ?? getCategoryColor(node.category);

  const classNames = [
    'timeline-node',
    isSelected && 'selected',
    !node.enabled && 'disabled',
    hasConflict && 'conflict',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      style={{
        left: position.start,
        '--node-color': categoryColor,
      } as React.CSSProperties}
      onClick={onClick}
      title={node.description || node.name}
    >
      <div className="timeline-node-marker" />
      <div className="timeline-node-label">
        {node.name}
      </div>
    </div>
  );
}

function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    primordial: '#8b5cf6',
    'golden-order': '#fbbf24',
    shattering: '#ef4444',
    demigod: '#3b82f6',
    tarnished: '#10b981',
    ending: '#f97316',
  };
  return colors[category ?? ''] ?? '#6b7280';
}
