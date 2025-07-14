import React, { useRef, useEffect, useState } from 'react';

function drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < w; i++) {
    const y = h / 2 + Math.sin(i / 20) * (h / 4);
    if (i === 0) ctx.moveTo(i, y);
    else ctx.lineTo(i, y);
  }
  ctx.stroke();
}
function drawSpectrogram(ctx: CanvasRenderingContext2D, w: number, h: number) {
  for (let x = 0; x < w; x += 2) {
    for (let y = 0; y < h; y += 2) {
      ctx.fillStyle = `hsl(${(x + y) % 360}, 80%, ${40 + 30 * Math.sin(x / 30)}%)`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
}
function drawPeakMeter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0f0';
  ctx.fillRect(0, h * 0.7, w, h * 0.2);
  ctx.fillStyle = '#ff0';
  ctx.fillRect(0, h * 0.5, w, h * 0.2);
  ctx.fillStyle = '#f00';
  ctx.fillRect(0, h * 0.3, w, h * 0.2);
}
function drawStereometer(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#ff00ff';
  ctx.beginPath();
  for (let i = 0; i < 360; i += 2) {
    const angle = (i * Math.PI) / 180;
    const r = h / 2 * (0.7 + 0.3 * Math.sin(i / 30));
    const x = w / 2 + r * Math.cos(angle);
    const y = h / 2 + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}
function drawOscilloscope(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  for (let i = 0; i < w; i++) {
    const y = h / 2 + Math.sin(i / 10) * (h / 3) * Math.sin(i / 60);
    if (i === 0) ctx.moveTo(i, y);
    else ctx.lineTo(i, y);
  }
  ctx.stroke();
}
function drawSpectrumAnalyzer(ctx: CanvasRenderingContext2D, w: number, h: number) {
  for (let i = 0; i < w; i += 8) {
    const barHeight = h * (0.2 + 0.7 * Math.abs(Math.sin(i / 40)));
    ctx.fillStyle = `hsl(${180 + i % 120}, 90%, 60%)`;
    ctx.fillRect(i, h - barHeight, 6, barHeight);
  }
}
function drawMidiMeter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('MIDI', w / 2 - 30, h / 2);
  ctx.strokeStyle = '#0ff';
  ctx.strokeRect(w / 2 - 40, h / 2 - 20, 80, 40);
}

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

export function HudOverlay({ type, position, size, stem, settings, onOpenModal, onUpdate }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null); // anchor key
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    switch (type) {
      case 'waveform': drawWaveform(ctx, size.width, size.height); break;
      case 'spectrogram': drawSpectrogram(ctx, size.width, size.height); break;
      case 'peakMeter': drawPeakMeter(ctx, size.width, size.height); break;
      case 'stereometer': drawStereometer(ctx, size.width, size.height); break;
      case 'oscilloscope': drawOscilloscope(ctx, size.width, size.height); break;
      case 'spectrumAnalyzer': drawSpectrumAnalyzer(ctx, size.width, size.height); break;
      case 'midiMeter': drawMidiMeter(ctx, size.width, size.height); break;
      default: drawWaveform(ctx, size.width, size.height);
    }
  }, [type, stem, size, settings]);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('transform-anchor')) return;
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
      width = Math.max(60, width);
      height = Math.max(40, height);
      onUpdate({ position: { x, y }, size: { width, height } });
    }
  }
  function onMouseUp() {
    setDragging(false);
    setResizing(null);
    setDragStart(null);
    setResizeStart(null);
    window.removeEventListener('mousemove', onMouseMove as any);
    window.removeEventListener('mouseup', onMouseUp as any);
  }
  function onAnchorMouseDown(anchorKey: string, e: React.MouseEvent) {
    e.stopPropagation();
    setResizing(anchorKey);
    setResizeStart({
      startX: e.clientX,
      startY: e.clientY,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    });
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
      {/* Photoshop-style transform anchors */}
      {ANCHORS.map(anchor => (
        <div
          key={anchor.key}
          className="transform-anchor"
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            background: '#fff',
            border: '2px solid #00ffff',
            borderRadius: 4,
            boxShadow: '0 0 4px #00ffff99',
            zIndex: 20,
            ...anchor.style,
            marginLeft: anchor.style.left === 0 ? -7 : undefined,
            marginTop: anchor.style.top === 0 ? -7 : undefined,
            marginRight: anchor.style.right === 0 ? -7 : undefined,
            marginBottom: anchor.style.bottom === 0 ? -7 : undefined,
          }}
          onMouseDown={e => onAnchorMouseDown(anchor.key, e)}
        />
      ))}
    </div>
  );
}