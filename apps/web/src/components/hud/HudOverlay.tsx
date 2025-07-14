import React, { useRef, useEffect, useState } from 'react';

export function HudOverlay({ type, position, size, stem, settings, onOpenModal, onUpdate }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Draw overlay visualization
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    // Placeholder: draw a simple waveform or other type
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < size.width; i++) {
      const y = size.height / 2 + Math.sin(i / 20) * (size.height / 4);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
  }, [type, stem, size, settings]);

  // Drag logic
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    window.addEventListener('mousemove', onMouseMove as any);
    window.addEventListener('mouseup', onMouseUp as any);
  }
  function onMouseMove(e: MouseEvent) {
    if (dragging && dragStart) {
      onUpdate({ position: { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y } });
    }
    if (resizing && resizeStart) {
      const newWidth = Math.max(100, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(40, resizeStart.height + (e.clientY - resizeStart.y));
      onUpdate({ size: { width: newWidth, height: newHeight } });
    }
  }
  function onMouseUp() {
    setDragging(false);
    setResizing(false);
    setDragStart(null);
    setResizeStart(null);
    window.removeEventListener('mousemove', onMouseMove as any);
    window.removeEventListener('mouseup', onMouseUp as any);
  }
  function onResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    setResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, width: size.width, height: size.height });
    window.addEventListener('mousemove', onMouseMove as any);
    window.addEventListener('mouseup', onMouseUp as any);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        pointerEvents: 'auto',
        zIndex: 10,
        boxShadow: '0 0 16px #00ffff44',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.2)',
        userSelect: dragging || resizing ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onOpenModal}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }}
      />
      {/* Resize handle */}
      <div
        className="resize-handle"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 18,
          height: 18,
          background: '#00ffff',
          borderRadius: '0 0 8px 0',
          cursor: 'nwse-resize',
          zIndex: 11,
          opacity: 0.7,
        }}
        onMouseDown={onResizeMouseDown}
      />
    </div>
  );
}