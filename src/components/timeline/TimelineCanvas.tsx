import { useRef, useCallback, type ReactNode, type WheelEvent, type MouseEvent } from 'react';
import { useTimeline } from '../../context/TimelineContext';
import './TimelineCanvas.css';

interface TimelineCanvasProps {
  children?: ReactNode;
}

export function TimelineCanvas({ children }: TimelineCanvasProps) {
  const { state, setViewport } = useTimeline();
  const { viewport } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);

  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault();

      // Zoom with scroll
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * zoomFactor));

      // Zoom towards mouse position
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const timelineX = (mouseX - viewport.panX) / viewport.zoom;
        const newPanX = mouseX - timelineX * newZoom;

        setViewport({ panX: newPanX, zoom: newZoom });
      } else {
        setViewport({ ...viewport, zoom: newZoom });
      }
    },
    [viewport, setViewport]
  );

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      isDragging.current = true;
      lastMouseX.current = e.clientX;
      e.currentTarget.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastMouseX.current;
      lastMouseX.current = e.clientX;

      setViewport({
        ...viewport,
        panX: viewport.panX + deltaX,
      });
    },
    [viewport, setViewport]
  );

  const handleMouseUp = useCallback((e: MouseEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = 'grab';
  }, []);

  const handleMouseLeave = useCallback((e: MouseEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = 'grab';
  }, []);

  return (
    <div
      ref={containerRef}
      className="timeline-canvas"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="timeline-content"
        style={{
          transform: `translateX(${viewport.panX}px) scale(${viewport.zoom})`,
          transformOrigin: 'left center',
        }}
      >
        {children}
      </div>
      <div className="timeline-controls">
        <span className="timeline-zoom-label">
          Zoom: {Math.round(viewport.zoom * 100)}%
        </span>
      </div>
    </div>
  );
}
