import type { MouseEvent } from 'react';
import type { TimelineNode as TimelineNodeType, SolvedPosition } from '../../types';
import './TimelineInterval.css';

interface TimelineIntervalProps {
  node: TimelineNodeType;
  position: SolvedPosition;
  isSelected: boolean;
  hasConflict?: boolean;
  onClick: (e: MouseEvent) => void;
}

export function TimelineInterval({ node, position, isSelected, hasConflict, onClick }: TimelineIntervalProps) {
  const categoryColor = node.color || getCategoryColor(node.category);
  const width = Math.max(position.end - position.start, 20);

  const classNames = [
    'timeline-interval',
    isSelected && 'selected',
    !node.enabled && 'disabled',
    hasConflict && 'conflict',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      style={{
        left: position.start,
        width,
        '--interval-color': categoryColor,
      } as React.CSSProperties}
      onClick={onClick}
      title={node.description || node.name}
    >
      <div className="timeline-interval-bar" />
      <div className="timeline-interval-label">
        {node.name}
      </div>
      <div className="timeline-interval-caps">
        <div className="timeline-interval-cap left" />
        <div className="timeline-interval-cap right" />
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
  return colors[category || ''] || '#6b7280';
}
