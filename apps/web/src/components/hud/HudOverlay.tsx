import React, { useRef, useEffect, useState, useCallback } from 'react';

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
function drawOscilloscope(ctx: CanvasRenderingContext2D, w: number, h: number, settings: any = {}) {
  const { 
    color = '#00ffff', 
    glowIntensity = 0, 
    showGrid = false, 
    gridColor = '#333333',
    amplitude = 1
  } = settings;
  // Draw background grid if enabled
  if (showGrid) {
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    // Vertical grid lines
    for (let x = 0; x <= w; x += w / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Horizontal grid lines
    for (let y = 0; y <= h; y += h / 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Center crosshair
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.restore();
  }
  // Draw soft glow effect if enabled
  if (glowIntensity > 0) {
    ctx.save();
    const glowIntensityValue = glowIntensity * 0.15;
    const step = Math.max(1, Math.floor(w / 100));
    for (let i = 0; i < w; i += step) {
      // Bipolar: center at height/2, scale amplitude both ways
      const y = h / 2 + Math.sin(i / 10) * (h / 3) * Math.sin(i / 60) * amplitude;
      const gradient = ctx.createRadialGradient(i, y, 0, i, y, glowIntensity * 2.5);
      const rgbaColor = color.startsWith('#') 
        ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${glowIntensityValue})`
        : color;
      gradient.addColorStop(0, rgbaColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(i, y, glowIntensity * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Draw main oscilloscope trace (bipolar)
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < w; i++) {
    // Bipolar: center at height/2, scale amplitude both ways
    const y = h / 2 + Math.sin(i / 10) * (h / 3) * Math.sin(i / 60) * amplitude;
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

export function HudOverlay({ type, position, size, stem, settings, featureData, onOpenModal, onUpdate }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  }, [dragging, dragStart, resizing, resizeStart, onUpdate]);

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

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    // Draw using featureData if available, else fallback to placeholder
    switch (type) {
      case 'waveform':
        if (Array.isArray(featureData) && featureData.length > 0) {
          // Draw bipolar waveform exactly like stem-waveform component
          const midY = size.height / 2;
          
          // Draw center line
          ctx.beginPath();
          ctx.moveTo(0, midY);
          ctx.lineTo(size.width, midY);
          ctx.strokeStyle = '#444';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Draw bipolar waveform
          ctx.beginPath();
          ctx.strokeStyle = '#4db3fa'; // Same blue as stem-waveform
          ctx.lineWidth = 1;
          
          for (let i = 0; i < size.width; i++) {
            const idx = Math.floor(i / size.width * (featureData.length - 1));
            const pointHeight = featureData[idx] * midY * 0.8; // Scale to 80% of height
            const x = i;
            ctx.moveTo(x, midY - pointHeight);
            ctx.lineTo(x, midY + pointHeight);
          }
          ctx.stroke();
        } else {
          drawWaveform(ctx, size.width, size.height);
        }
        break;
      case 'oscilloscope':
        const amplitude = typeof settings.amplitude === 'number' ? settings.amplitude : 1;
        const color = settings.color || '#00ffff';
        const glowIntensity = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : 0;
        const showGrid = !!settings.showGrid;
        const gridColor = settings.gridColor || '#333333';
        if (Array.isArray(featureData) && featureData.length > 0) {
          // Draw background grid if enabled
          if (showGrid) {
            ctx.save();
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 0.5;
            // Vertical grid lines
            for (let x = 0; x <= size.width; x += size.width / 10) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, size.height);
              ctx.stroke();
            }
            // Horizontal grid lines
            for (let y = 0; y <= size.height; y += size.height / 8) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(size.width, y);
              ctx.stroke();
            }
            // Center crosshair
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(size.width / 2, 0);
            ctx.lineTo(size.width / 2, size.height);
            ctx.moveTo(0, size.height / 2);
            ctx.lineTo(size.width, size.height / 2);
            ctx.stroke();
            ctx.restore();
          }
          // Draw soft glow effect if enabled
          if (glowIntensity > 0) {
            ctx.save();
            const glowIntensityValue = glowIntensity * 0.15;
            const step = Math.max(1, Math.floor(size.width / 100));
            for (let i = 0; i < size.width; i += step) {
              const idx = Math.floor(i / size.width * (featureData.length - 1));
              const val = featureData[idx];
              // Bipolar: normalize to -1 to 1 range, then center at height/2
              const normalizedVal = (val - 0.5) * 2; // Convert 0-1 to -1 to 1
              const y = size.height / 2 - normalizedVal * (size.height / 2) * amplitude;
              const gradient = ctx.createRadialGradient(i, y, 0, i, y, glowIntensity * 2.5);
              const rgbaColor = color.startsWith('#') 
                ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${glowIntensityValue})`
                : color;
              gradient.addColorStop(0, rgbaColor);
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(i, y, glowIntensity * 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
          // Draw main oscilloscope trace (bipolar)
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < size.width; i++) {
            const idx = Math.floor(i / size.width * (featureData.length - 1));
            const val = featureData[idx];
            // Bipolar: normalize to -1 to 1 range, then center at height/2
            const normalizedVal = (val - 0.5) * 2; // Convert 0-1 to -1 to 1
            const y = size.height / 2 - normalizedVal * (size.height / 2) * amplitude;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
        } else {
          drawOscilloscope(ctx, size.width, size.height, { ...settings, amplitude });
        }
        break;
      case 'spectrogram':
      case 'spectrumAnalyzer':
        if (featureData && featureData.fft && Array.isArray(featureData.fft)) {
          // High-resolution FFT-based spectrum analyzer
          const fftData = featureData.fft;
          const barCount = Math.min(fftData.length, size.width / 2); // Limit bars to prevent overcrowding
          const barWidth = size.width / barCount;
          
          // Find max value for normalization
          const maxMagnitude = Math.max(...fftData);
          
          for (let i = 0; i < barCount; i++) {
            const magnitude = fftData[i] || 0;
            const normalizedMagnitude = maxMagnitude > 0 ? magnitude / maxMagnitude : 0;
            
            // Apply logarithmic scaling for better visual representation
            const logMagnitude = Math.log10(normalizedMagnitude + 1e-10) / Math.log10(1.1);
            const clampedMagnitude = Math.max(0, Math.min(1, logMagnitude));
            
            const barHeight = Math.max(2, clampedMagnitude * size.height * 0.9);
            
            // Color based on frequency (low = red, high = blue)
            const frequencyRatio = i / barCount;
            const hue = 240 - (frequencyRatio * 240); // Blue to red
            ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
            
            ctx.fillRect(i * barWidth, size.height - barHeight, barWidth - 1, barHeight);
          }
        } else if (Array.isArray(featureData) && featureData.length > 0) {
          // Draw real spectrum using other features
          const barWidth = size.width / featureData.length;
          for (let i = 0; i < featureData.length; i++) {
            const val = featureData[i];
            const h = Math.max(2, val * size.height * 0.9);
            ctx.fillStyle = `hsl(${180 + i % 120}, 90%, 60%)`;
            ctx.fillRect(i * barWidth, size.height - h, barWidth - 1, h);
          }
        } else {
          drawSpectrumAnalyzer(ctx, size.width, size.height);
        }
        break;
      case 'peakMeter':
        if (typeof featureData === 'number') {
          // Draw real peak meter
          const peak = Math.max(0, Math.min(1, featureData));
          ctx.fillStyle = peak > 0.8 ? '#f00' : peak > 0.5 ? '#ff0' : '#0f0';
          ctx.fillRect(0, size.height * (1 - peak), size.width, size.height * peak);
        } else {
          drawPeakMeter(ctx, size.width, size.height);
        }
        break;
      case 'stereometer':
        if (typeof featureData === 'number') {
          // Draw real stereo spread
          ctx.strokeStyle = '#ff00ff';
          ctx.beginPath();
          const spread = Math.max(-1, Math.min(1, featureData));
          for (let i = 0; i < 360; i += 2) {
            const angle = (i * Math.PI) / 180;
            const r = size.height / 2 * (0.7 + 0.3 * spread);
            const x = size.width / 2 + r * Math.cos(angle);
            const y = size.height / 2 + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        } else {
          drawStereometer(ctx, size.width, size.height);
        }
        break;
      case 'midiMeter':
        if (typeof featureData === 'number') {
          // Draw real MIDI pitch/note
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px monospace';
          ctx.fillText('MIDI: ' + featureData, size.width / 2 - 40, size.height / 2);
          ctx.strokeStyle = '#0ff';
          ctx.strokeRect(size.width / 2 - 40, size.height / 2 - 20, 80, 40);
        } else {
          drawMidiMeter(ctx, size.width, size.height);
        }
        break;
      default:
        drawWaveform(ctx, size.width, size.height);
    }
  }, [type, stem, size, settings, featureData]);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('transform-anchor')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
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
        borderRadius: 8,
        background: 'rgba(0,0,0,0.2)',
        userSelect: dragging || resizing ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        // Ensure this element can receive pointer events
        isolation: 'isolate',
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onOpenModal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }}
      />
      {/* Photoshop-style transform anchors - only visible on hover */}
      {isHovered && ANCHORS.map(anchor => (
        <div
          key={anchor.key}
          className="transform-anchor"
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            background: '#fff',
            border: '1px solid #333',
            borderRadius: 1,
            zIndex: 20,
            ...anchor.style,
            marginLeft: anchor.style.left === 0 ? -4 : undefined,
            marginTop: anchor.style.top === 0 ? -4 : undefined,
            marginRight: anchor.style.right === 0 ? -4 : undefined,
            marginBottom: anchor.style.bottom === 0 ? -4 : undefined,
          }}
          onMouseDown={e => onAnchorMouseDown(anchor.key, e)}
        />
      ))}
    </div>
  );
}