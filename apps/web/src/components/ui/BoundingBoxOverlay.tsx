import React, { useRef, useEffect, useState, useCallback } from 'react';

const ANCHORS = [
  { key: 'nw', style: { left: 0, top: 0, cursor: 'nwse-resize' }, dx: -1, dy: -1 },
  { key: 'n',  style: { left: '50%', top: 0, transform: 'translateX(-50%)', cursor: 'ns-resize' }, dx: 0, dy: -1 },
  { key: 'ne', style: { right: 0, top: 0, cursor: 'nesw-resize' }, dx: 1, dy: -1 },
  { key: 'e',  style: { right: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }, dx: 1, dy: 0 },
  { key: 'se', style: { right: 0, bottom: 0, cursor: 'nwse-resize' }, dx: 1, dy: 1 },
  { key: 's',  style: { left: '50%', bottom: 0, transform: 'translateX(-50%)', cursor: 'ns-resize' }, dx: 0, dy: 1 },
  { key: 'sw', style: { left: 0, bottom: 0, cursor: 'nesw-resize' }, dx: -1, dy: 1 },
  { key: 'w',  style: { left: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }, dx: -1, dy: 0 },
];

interface BoundingBoxOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  parentWidth: number;
  parentHeight: number;
  onChange: (box: { x: number; y: number; width: number; height: number }) => void;
  onSelect?: () => void;
}

export function BoundingBoxOverlay({
  x,
  y,
  width,
  height,
  selected = false,
  parentWidth,
  parentHeight,
  onChange,
  onSelect
}: BoundingBoxOverlayProps) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null); // anchor key
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Stable refs for event handlers
  const onMouseMoveRef = useRef<(e: MouseEvent) => void>();
  const onMouseUpRef = useRef<(e: MouseEvent) => void>();

  // Mouse move handler
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (dragging && dragStart) {
      const newX = Math.max(0, Math.min(parentWidth - width, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(parentHeight - height, e.clientY - dragStart.y));
      onChange({ x: newX, y: newY, width, height });
    }
    if (resizing && resizeStart) {
      const anchor = ANCHORS.find(a => a.key === resizing);
      if (!anchor) return;
      let { x, y, width, height } = resizeStart;
      const dx = e.clientX - resizeStart.startX;
      const dy = e.clientY - resizeStart.startY;
      // Corner/side logic
      if (anchor.dx === -1) { width -= dx; x += dx; }
      if (anchor.dx === 1)  { width += dx; }
      if (anchor.dy === -1) { height -= dy; y += dy; }
      if (anchor.dy === 1)  { height += dy; }
      // Clamp to minimum size and parent bounds
      width = Math.max(60, Math.min(parentWidth - x, width));
      height = Math.max(40, Math.min(parentHeight - y, height));
      x = Math.max(0, Math.min(parentWidth - width, x));
      y = Math.max(0, Math.min(parentHeight - height, y));
      onChange({ x, y, width, height });
    }
  }, [dragging, dragStart, resizing, resizeStart, onChange, width, height, parentWidth, parentHeight]);

  // Mouse up handler
  const onMouseUp = useCallback(() => {
    setDragging(false);
    setResizing(null);
    setDragStart(null);
    setResizeStart(null);
  }, []);

  // Keep refs up to date
  useEffect(() => {
    onMouseMoveRef.current = onMouseMove;
    onMouseUpRef.current = onMouseUp;
  }, [onMouseMove, onMouseUp]);

  // Attach/detach listeners when dragging or resizing
  useEffect(() => {
    if (dragging || resizing) {
      const move = (e: MouseEvent) => onMouseMoveRef.current && onMouseMoveRef.current(e);
      const up = (e: MouseEvent) => onMouseUpRef.current && onMouseUpRef.current(e);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      return () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
      };
    }
  }, [dragging, resizing]);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('transform-anchor')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - x, y: e.clientY - y });
  }

  function onAnchorMouseDown(anchorKey: string, e: React.MouseEvent) {
    e.stopPropagation();
    setResizing(anchorKey);
    setResizeStart({
      startX: e.clientX,
      startY: e.clientY,
      x: x,
      y: y,
      width: width,
      height: height,
    });
  }

  // Always show the bounding box for debugging
  const show = true; // selected || hovered;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: width,
        height: height,
        pointerEvents: 'auto',
        zIndex: 1000,
        borderRadius: 0,
        background: show ? 'rgba(255,0,0,0.05)' : 'transparent',
        userSelect: dragging || resizing ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        border: '2px solid red', // Debug: always visible red border
        boxShadow: selected ? '0 0 0 1px rgba(255,255,255,0.2)' : undefined,
        transition: 'background 0.2s',
        isolation: 'isolate',
      }}
      onMouseDown={e => { onMouseDown(e); onSelect && onSelect(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Photoshop-style transform anchors - only visible on hover */}
      {isHovered && ANCHORS.map(anchor => (
        <div
          key={anchor.key}
          className="transform-anchor"
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            ...anchor.style,
            zIndex: 20,
            opacity: 0.95,
            transition: 'background 0.2s, box-shadow 0.2s'
          }}
          onMouseDown={e => onAnchorMouseDown(anchor.key, e)}
        />
      ))}
    </div>
  );
} 