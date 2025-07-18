import React, { useRef, useState } from 'react';

interface BoundingBoxOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  parentWidth: number;
  parentHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onChange: (box: { x: number; y: number; width: number; height: number }) => void;
  onSelect?: () => void;
  children?: React.ReactNode;
}

// 8 handles: corners (nw, ne, sw, se), sides (n, e, s, w)
const handles = [
  { key: 'nw', cursor: 'nwse-resize' },
  { key: 'n', cursor: 'ns-resize' },
  { key: 'ne', cursor: 'nesw-resize' },
  { key: 'e', cursor: 'ew-resize' },
  { key: 'se', cursor: 'nwse-resize' },
  { key: 's', cursor: 'ns-resize' },
  { key: 'sw', cursor: 'nesw-resize' },
  { key: 'w', cursor: 'ew-resize' },
];

type HandleKey = typeof handles[number]['key'];

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  x, y, width, height, selected, parentWidth, parentHeight,
  minWidth = 32, minHeight = 32, maxWidth, maxHeight, onChange, onSelect, children
}) => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState<null | { startX: number; startY: number; origX: number; origY: number }> (null);
  const [resizing, setResizing] = useState<null | { handle: HandleKey; startX: number; startY: number; orig: { x: number; y: number; width: number; height: number } }>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Mouse/touch move logic for drag/resize
  React.useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      if (dragging) {
        let newX = dragging.origX + (clientX - dragging.startX);
        let newY = dragging.origY + (clientY - dragging.startY);
        // Clamp to parent
        newX = Math.max(0, Math.min(parentWidth - width, newX));
        newY = Math.max(0, Math.min(parentHeight - height, newY));
        onChange({ x: newX, y: newY, width, height });
      } else if (resizing) {
        let { x: ox, y: oy, width: ow, height: oh } = resizing.orig;
        let dx = clientX - resizing.startX;
        let dy = clientY - resizing.startY;
        let newBox = { x: ox, y: oy, width: ow, height: oh };
        switch (resizing.handle) {
          case 'nw':
            newBox.x = Math.min(ox + dx, ox + ow - minWidth);
            newBox.y = Math.min(oy + dy, oy + oh - minHeight);
            newBox.width = ow - (newBox.x - ox);
            newBox.height = oh - (newBox.y - oy);
            break;
          case 'n':
            newBox.y = Math.min(oy + dy, oy + oh - minHeight);
            newBox.height = oh - (newBox.y - oy);
            break;
          case 'ne':
            newBox.y = Math.min(oy + dy, oy + oh - minHeight);
            newBox.width = Math.max(minWidth, Math.min(maxWidth || parentWidth, ow + dx));
            newBox.height = oh - (newBox.y - oy);
            break;
          case 'e':
            newBox.width = Math.max(minWidth, Math.min(maxWidth || parentWidth, ow + dx));
            break;
          case 'se':
            newBox.width = Math.max(minWidth, Math.min(maxWidth || parentWidth, ow + dx));
            newBox.height = Math.max(minHeight, Math.min(maxHeight || parentHeight, oh + dy));
            break;
          case 's':
            newBox.height = Math.max(minHeight, Math.min(maxHeight || parentHeight, oh + dy));
            break;
          case 'sw':
            newBox.x = Math.min(ox + dx, ox + ow - minWidth);
            newBox.width = ow - (newBox.x - ox);
            newBox.height = Math.max(minHeight, Math.min(maxHeight || parentHeight, oh + dy));
            break;
          case 'w':
            newBox.x = Math.min(ox + dx, ox + ow - minWidth);
            newBox.width = ow - (newBox.x - ox);
            break;
        }
        // Clamp to parent
        newBox.x = Math.max(0, Math.min(parentWidth - newBox.width, newBox.x));
        newBox.y = Math.max(0, Math.min(parentHeight - newBox.height, newBox.y));
        newBox.width = Math.max(minWidth, Math.min(maxWidth || parentWidth, newBox.width));
        newBox.height = Math.max(minHeight, Math.min(maxHeight || parentHeight, newBox.height));
        onChange(newBox);
      }
    };
    const onUp = () => {
      setDragging(null);
      setResizing(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, resizing, parentWidth, parentHeight, minWidth, minHeight, maxWidth, maxHeight, width, height, onChange]);

  // Keyboard nudge
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selected) return;
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -1;
    if (e.key === 'ArrowRight') dx = 1;
    if (e.key === 'ArrowUp') dy = -1;
    if (e.key === 'ArrowDown') dy = 1;
    if (dx !== 0 || dy !== 0) {
      e.preventDefault();
      let newX = Math.max(0, Math.min(parentWidth - width, x + dx));
      let newY = Math.max(0, Math.min(parentHeight - height, y + dy));
      onChange({ x: newX, y: newY, width, height });
    }
  };

  // Always show the bounding box for debugging
  const show = true; // selected || hovered;

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      className="absolute z-30 group outline-none"
      style={{
        left: x,
        top: y,
        width,
        height,
        border: '2px solid red', // Debug: always visible red border
        zIndex: 1000,
        pointerEvents: 'auto', // Ensure overlay receives pointer events
        boxSizing: 'border-box',
        background: show ? 'rgba(255,0,0,0.05)' : 'transparent', // subtle debug bg
        transition: 'border 0.1s',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => onSelect?.()}
      onClick={e => { e.stopPropagation(); onSelect?.(); }}
      onKeyDown={handleKeyDown}
      aria-label="Bounding box overlay"
    >
      {children}
      {show && handles.map(h => (
        <div
          key={h.key}
          className="absolute bg-white border border-purple-500 rounded-full shadow-md"
          style={{
            width: 12, height: 12, zIndex: 2, cursor: h.cursor,
            left: h.key.includes('w') ? -6 : h.key.includes('e') ? width - 6 : width / 2 - 6,
            top: h.key.includes('n') ? -6 : h.key.includes('s') ? height - 6 : height / 2 - 6,
            opacity: 0.95,
            boxShadow: '0 0 2px #7c3aed',
          }}
          onMouseDown={e => {
            e.stopPropagation();
            setResizing({ handle: h.key as HandleKey, startX: e.clientX, startY: e.clientY, orig: { x, y, width, height } });
          }}
          onTouchStart={e => {
            e.stopPropagation();
            setResizing({ handle: h.key as HandleKey, startX: e.touches[0].clientX, startY: e.touches[0].clientY, orig: { x, y, width, height } });
          }}
          tabIndex={-1}
        />
      ))}
      {/* Drag area (invisible, but pointer events) */}
      {show && (
        <div
          className="absolute inset-0 cursor-move"
          style={{ zIndex: 1, background: 'transparent' }}
          onMouseDown={e => {
            e.stopPropagation();
            setDragging({ startX: e.clientX, startY: e.clientY, origX: x, origY: y });
          }}
          onTouchStart={e => {
            e.stopPropagation();
            setDragging({ startX: e.touches[0].clientX, startY: e.touches[0].clientY, origX: x, origY: y });
          }}
          tabIndex={-1}
        />
      )}
    </div>
  );
}; 