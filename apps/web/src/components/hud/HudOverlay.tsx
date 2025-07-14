import React, { useRef, useEffect } from 'react';

export function HudOverlay({ type, position, size, stem, settings, onOpenModal, onUpdate }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // TODO: Add drag/resize logic and more overlay types

  return (
    <canvas
      ref={canvasRef}
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
        background: 'rgba(0,0,0,0.2)'
      }}
      width={size.width}
      height={size.height}
      onDoubleClick={onOpenModal}
    />
  );
}