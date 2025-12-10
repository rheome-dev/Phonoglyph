import React, { useRef, useEffect, useState, useCallback } from 'react';
import { debugLog } from '@/lib/utils';
import type { Layer } from '@/types/video-composition';

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
    amplitude = 1,
    traceWidth = 2,
    cornerRadius = 0
  } = settings;
  // Draw background grid if enabled
  if (showGrid) {
    ctx.save();
    
    // Apply corner radius clipping if set
    if (cornerRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, cornerRadius);
      ctx.clip();
    }
    
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
  ctx.lineWidth = traceWidth;
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

function drawVuMeter(ctx: CanvasRenderingContext2D, w: number, h: number, value: number, settings: any) {
  const color = settings.color || '#00ff55';
  const style = settings.style || 'Needle';
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  if (style === 'Needle') {
    // Draw arc
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w/2, h*0.9, h*0.7, Math.PI, 2*Math.PI, false);
    ctx.stroke();
    // Draw needle
    const angle = Math.PI + value * Math.PI;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w/2, h*0.9);
    ctx.lineTo(w/2 + Math.cos(angle)*h*0.7, h*0.9 + Math.sin(angle)*h*0.7);
    ctx.stroke();
  } else {
    // Bar style
    ctx.fillStyle = color;
    ctx.fillRect(w*0.3, h*0.1, w*0.4, h*0.8*value);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(w*0.3, h*0.1, w*0.4, h*0.8);
  }
  ctx.restore();
}

function drawChromaWheel(ctx: CanvasRenderingContext2D, w: number, h: number, chroma: any, settings: any) {
  const colorSchemes = {
    Classic: [
      '#ff0000','#ff8000','#ffff00','#80ff00','#00ff00','#00ff80',
      '#00ffff','#0080ff','#0000ff','#8000ff','#ff00ff','#ff0080'
    ],
    Rainbow: [
      '#ff0000','#ff7f00','#ffff00','#7fff00','#00ff00','#00ff7f',
      '#00ffff','#007fff','#0000ff','#7f00ff','#ff00ff','#ff007f'
    ],
    Viridis: [
      '#440154','#482878','#3e4989','#31688e','#26828e','#1f9e89',
      '#35b779','#6ece58','#b5de2b','#fee825','#fde725','#f9d923'
    ],
    Inferno: [
      '#000004','#1b0c41','#4a0c6b','#781c6d','#a52c60','#cf4446',
      '#ed6925','#fb9b06','#f7d13d','#fcffa4','#fffbb4','#fff7ec'
    ]
  };
  const scheme = colorSchemes[settings.colorScheme as keyof typeof colorSchemes] || colorSchemes.Classic;
  const showNames = settings.showNoteNames;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const cx = w/2, cy = h/2, r = Math.min(w,h)*0.45;
  for (let i = 0; i < 12; i++) {
    const start = (i/12)*2*Math.PI - Math.PI/2;
    const end = ((i+1)/12)*2*Math.PI - Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end, false);
    ctx.closePath();
    ctx.fillStyle = scheme[i];
    ctx.globalAlpha = chroma && chroma[i] ? Math.max(0.2, chroma[i]) : 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (showNames) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((start+end)/2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][i], r*0.7, 0);
      ctx.restore();
    }
  }
  ctx.restore();
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

const SPECTROGRAM_BUFFER_SIZE = 200; // Number of FFT frames to keep (controls width)

type HudOverlayProps = {
  layer: Layer;
  featureData?: any;
  onOpenModal?: () => void;
  onUpdate: (updates: Partial<Layer>) => void;
  isSelected?: boolean;
  onSelect?: () => void;
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export function HudOverlay({
  layer,
  featureData,
  onOpenModal,
  onUpdate,
  isSelected,
  onSelect,
}: HudOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null); // anchor key
  const [isHovered, setIsHovered] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    width: number;
    height: number;
  } | null>(null);

  // Rolling buffer for spectrogram
  const spectrogramBufferRef = useRef<Array<Float32Array>>([]);
  
  // Scrolling text buffer for consoleFeed
  const consoleFeedLinesRef = useRef<string[]>([]);
  const consoleFeedScrollOffsetRef = useRef<number>(0);

  // Stable refs for event handlers
  const onMouseMoveRef = useRef<(e: MouseEvent) => void>();
  const onMouseUpRef = useRef<(e: MouseEvent) => void>();

  const position = layer.position || { x: 0, y: 0 };
  const scale = layer.scale || { x: 20, y: 20 };
  const widthPct = scale.x ?? 20;
  const heightPct = scale.y ?? 20;
  const settings = (layer as any).settings || {};
  const type = layer.effectType || (layer as any).type;
  const stem = (layer as any).stem;

  const updateCanvasSize = useCallback(() => {
    const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    const width = (parentRect.width * widthPct) / 100;
    const height = (parentRect.height * heightPct) / 100;
    setCanvasSize({
      width: Math.max(1, width),
      height: Math.max(1, height),
    });
  }, [widthPct, heightPct]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // Mouse move handler
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      if (dragging && dragStartRef.current) {
        const deltaX = ((e.clientX - dragStartRef.current.mouseX) / parentRect.width) * 100;
        const deltaY = ((e.clientY - dragStartRef.current.mouseY) / parentRect.height) * 100;
        const newX = clamp(dragStartRef.current.startX + deltaX, 0, 100);
        const newY = clamp(dragStartRef.current.startY + deltaY, 0, 100);
        onUpdate({ position: { x: newX, y: newY } });
      }

      if (resizing && resizeStartRef.current) {
        const anchor = ANCHORS.find(a => a.key === resizing);
        if (!anchor) return;

        const dxPct = ((e.clientX - resizeStartRef.current.startX) / parentRect.width) * 100;
        const dyPct = ((e.clientY - resizeStartRef.current.startY) / parentRect.height) * 100;

        let x = resizeStartRef.current.posX;
        let y = resizeStartRef.current.posY;
        let width = resizeStartRef.current.width;
        let height = resizeStartRef.current.height;

        if (anchor.dx === -1) { width -= dxPct; x += dxPct; }
        if (anchor.dx === 1)  { width += dxPct; }
        if (anchor.dy === -1) { height -= dyPct; y += dyPct; }
        if (anchor.dy === 1)  { height += dyPct; }

        width = clamp(width, 2, 100);
        height = clamp(height, 2, 100);
        x = clamp(x, 0, 100);
        y = clamp(y, 0, 100);

        onUpdate({ position: { x, y }, scale: { x: width, y: height } });
      }
    },
    [dragging, resizing, onUpdate],
  );

  // Mouse up handler
  const onMouseUp = useCallback(() => {
    setDragging(false);
    setResizing(null);
    dragStartRef.current = null;
    resizeStartRef.current = null;
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
    const { width, height } = canvasSize;
    const size = canvasSize;
    ctx.clearRect(0, 0, width, height);
    // Draw using featureData if available, else fallback to placeholder
    switch (type) {
      case 'waveform':
        if (Array.isArray(featureData) && featureData.length > 0) {
          // Draw bipolar waveform exactly like stem-waveform component
          const midY = height / 2;
          const lineWidth = typeof settings.lineWidth === 'number' ? settings.lineWidth : 1;
          
          // Draw center line
          ctx.beginPath();
          ctx.moveTo(0, midY);
          ctx.lineTo(width, midY);
          ctx.strokeStyle = '#444';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Draw bipolar waveform
          ctx.beginPath();
          ctx.strokeStyle = settings.color || '#4db3fa'; // Use settings color or fallback to blue
          ctx.lineWidth = lineWidth;
          
          for (let i = 0; i < width; i++) {
            const idx = Math.floor(i / width * (featureData.length - 1));
            const pointHeight = featureData[idx] * midY * 0.8; // Scale to 80% of height
            const x = i;
            ctx.moveTo(x, midY - pointHeight);
            ctx.lineTo(x, midY + pointHeight);
          }
          ctx.stroke();
        } else {
          drawWaveform(ctx, width, height);
        }
        break;
      case 'oscilloscope':
        const amplitude = typeof settings.amplitude === 'number' ? settings.amplitude : 1;
        const color = settings.color || '#00ffff';
        const glowIntensity = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : 0;
        const traceWidth = typeof settings.traceWidth === 'number' ? settings.traceWidth : 2;
        const showGrid = !!settings.showGrid;
        const gridColor = settings.gridColor || '#333333';
        if (Array.isArray(featureData) && featureData.length > 0) {
          // Draw background grid if enabled
          if (showGrid) {
            ctx.save();
            
            // Apply corner radius clipping if set
            const cornerRadius = settings.cornerRadius || 0;
            if (cornerRadius > 0) {
              ctx.beginPath();
              ctx.roundRect(0, 0, width, height, cornerRadius);
              ctx.clip();
            }
            
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 0.5;
            // Vertical grid lines
            for (let x = 0; x <= width; x += width / 10) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }
            // Horizontal grid lines
            for (let y = 0; y <= height; y += height / 8) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }
            // Center crosshair
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            ctx.restore();
          }
          // Draw soft glow effect if enabled
          if (glowIntensity > 0) {
            ctx.save();
            const glowIntensityValue = glowIntensity * 0.15;
            const step = Math.max(1, Math.floor(width / 100));
            for (let i = 0; i < width; i += step) {
              const idx = Math.floor(i / width * (featureData.length - 1));
              const val = featureData[idx];
              // Bipolar: normalize to -1 to 1 range, then center at height/2
              const normalizedVal = (val - 0.5) * 2; // Convert 0-1 to -1 to 1
              const y = height / 2 - normalizedVal * (height / 2) * amplitude;
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
          ctx.lineWidth = traceWidth;
          ctx.beginPath();
          for (let i = 0; i < width; i++) {
            const idx = Math.floor(i / width * (featureData.length - 1));
            const val = featureData[idx];
            // Bipolar: normalize to -1 to 1 range, then center at height/2
            const normalizedVal = (val - 0.5) * 2; // Convert 0-1 to -1 to 1
            const y = height / 2 - normalizedVal * (height / 2) * amplitude;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
        } else {
          drawOscilloscope(ctx, width, height, { ...settings, amplitude, traceWidth });
        }
        break;
      case 'spectrogram': {
        // Enhanced spectrogram using FFT data
        debugLog.log('🎵 Spectrogram rendering check:', {
          hasFeatureData: !!featureData,
          hasFft: !!(featureData && featureData.fft),
          isArray: !!(featureData && featureData.fft && Array.isArray(featureData.fft)),
          hasBuffer: !!(featureData && featureData.fftBuffer),
          bufferLength: featureData?.fftBuffer?.length || 0,
          fftLength: featureData?.fft?.length || 0
        });
        
        if (featureData && featureData.fft && Array.isArray(featureData.fft)) {
          debugLog.log('🎵 Spectrogram rendering with cached FFT data:', {
            fftLength: featureData.fft.length,
            sampleValues: featureData.fft.slice(0, 5),
            maxValue: Math.max(...featureData.fft),
            minValue: Math.min(...featureData.fft),
            hasBuffer: !!featureData.fftBuffer,
            bufferLength: featureData.fftBuffer?.length || 0
          });
          
          // Use the buffer from the overlay manager (contains time-based variations)
          let buffer = featureData.fftBuffer;
          
          // If no buffer available, create a simple one from current FFT data
          if (!buffer || buffer.length === 0) {
            debugLog.log('🎵 No buffer available, creating simple buffer from FFT data');
            const simpleBuffer = [];
            for (let i = 0; i < 50; i++) {
              simpleBuffer.push(Float32Array.from(featureData.fft));
            }
            buffer = simpleBuffer;
          }
          
          debugLog.log('🎵 Spectrogram buffer state:', {
            bufferLength: buffer.length,
            firstFrameLength: buffer[0]?.length || 0
          });
          
          // Clear canvas
          ctx.clearRect(0, 0, width, height);
          
          // Draw spectrogram with enhanced visualization
          const frameCount = buffer.length;
          const binCount = buffer[0]?.length || 0;
          
          if (frameCount > 0 && binCount > 0) {
            // Calculate frequency range (assuming 44.1kHz sample rate)
            const sampleRate = 44100;
            const nyquist = sampleRate / 2;
            
            // Use logarithmic frequency scaling for better visualization
            const logFreqScale = (binIndex: number) => {
              const linearFreq = (binIndex / binCount) * nyquist;
              // Map to log scale: 20Hz to 20kHz
              const minFreq = 20;
              const maxFreq = 20000;
              const logMin = Math.log10(minFreq);
              const logMax = Math.log10(maxFreq);
              const logFreq = Math.log10(Math.max(minFreq, linearFreq));
              return (logFreq - logMin) / (logMax - logMin);
            };
            
                         // Enhanced color mapping with multiple color schemes
             const colorMap = settings.colorMap || 'Classic';
             const getColor = (magnitude: number, freqRatio: number) => {
               const normalizedMagnitude = Math.log10(magnitude + 1e-10) / Math.log10(1.1);
               const clamped = Math.max(0, Math.min(1, normalizedMagnitude));
               
               switch (colorMap) {
                 case 'Inferno':
                   // Inferno colormap: black -> red -> yellow -> white
                   if (clamped < 0.25) {
                     const t = clamped / 0.25;
                     return `rgb(${Math.floor(255 * t)}, 0, 0)`;
                   } else if (clamped < 0.5) {
                     const t = (clamped - 0.25) / 0.25;
                     return `rgb(255, ${Math.floor(255 * t)}, 0)`;
                   } else if (clamped < 0.75) {
                     const t = (clamped - 0.5) / 0.25;
                     return `rgb(255, 255, ${Math.floor(255 * t)})`;
                   } else {
                     const t = (clamped - 0.75) / 0.25;
                     return `rgb(255, 255, ${Math.floor(255 * (1 - t))})`;
                   }
                 case 'Viridis':
                   // Viridis colormap: blue -> green -> yellow
                   const viridisHue = 240 - clamped * 120;
                   return `hsl(${viridisHue}, 90%, ${30 + clamped * 50}%)`;
                 case 'Rainbow':
                   // Rainbow colormap
                   const rainbowHue = (freqRatio * 240 + clamped * 60) % 360;
                   return `hsl(${rainbowHue}, 90%, ${30 + clamped * 70}%)`;
                 default: // Classic
                   // Classic spectrogram: blue (low) to red (high)
                   const classicHue = 240 - (freqRatio * 240 + clamped * 60);
                   return `hsl(${classicHue}, 90%, ${30 + clamped * 70}%)`;
               }
             };
            
            // Draw spectrogram with improved resolution and anti-aliasing
            const pixelRatio = window.devicePixelRatio || 1;
            const scaledWidth = width * pixelRatio;
            const scaledHeight = height * pixelRatio;
            
            // Create off-screen canvas for high-resolution rendering
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = scaledWidth;
            offscreenCanvas.height = scaledHeight;
            const offscreenCtx = offscreenCanvas.getContext('2d');
            
            if (offscreenCtx) {
              // Scale the offscreen context
              offscreenCtx.scale(pixelRatio, pixelRatio);
              
              // Draw each pixel with proper frequency mapping
              for (let x = 0; x < frameCount; x++) {
                const fftFrame = buffer[x];
                if (!fftFrame) continue;
                
                for (let y = 0; y < height; y++) {
                  // Map screen Y to frequency bin using log scale
                  const freqRatio = 1 - (y / height); // Invert Y axis
                  const binIndex = Math.floor(freqRatio * binCount);
                  
                  if (binIndex >= 0 && binIndex < fftFrame.length) {
                    const magnitude = fftFrame[binIndex];
                    const color = getColor(magnitude, freqRatio);
                    
                    offscreenCtx.fillStyle = color;
                    const px = Math.floor(x * width / frameCount);
                    const colWidth = Math.max(1, Math.floor(width / frameCount));
                    offscreenCtx.fillRect(px, y, colWidth, 1);
                  }
                }
              }
              
              // Draw the high-resolution result back to the main canvas
              ctx.drawImage(offscreenCanvas, 0, 0, width, height);
            } else {
              // Fallback to direct drawing if offscreen canvas not available
              for (let x = 0; x < frameCount; x++) {
                const fftFrame = buffer[x];
                if (!fftFrame) continue;
                
                for (let y = 0; y < height; y++) {
                  const freqRatio = 1 - (y / height);
                  const binIndex = Math.floor(freqRatio * binCount);
                  
                  if (binIndex >= 0 && binIndex < fftFrame.length) {
                    const magnitude = fftFrame[binIndex];
                    const color = getColor(magnitude, freqRatio);
                    
                    ctx.fillStyle = color;
                    const px = Math.floor(x * width / frameCount);
                    const colWidth = Math.max(1, Math.floor(width / frameCount));
                    ctx.fillRect(px, y, colWidth, 1);
                  }
                }
              }
            }
            
            // Add frequency labels if enabled
            if (settings.showFrequencyLabels) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
              ctx.font = '10px monospace';
              ctx.textAlign = 'right';
              
              const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
              frequencies.forEach(freq => {
                const freqRatio = 1 - (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
                const y = freqRatio * height;
                if (y >= 0 && y < height) {
                  ctx.fillText(`${freq}Hz`, width - 5, y - 5);
                }
              });
            }
          }
        } else {
          drawSpectrogram(ctx, width, height);
        }
        break;
      }
      case 'spectrumAnalyzer': {
        if (featureData && featureData.fft && Array.isArray(featureData.fft)) {
          // Enhanced FFT-based spectrum analyzer using complex spectrum data
          const fftData = featureData.fft;
          const barColor = settings.barColor || '#00ffff';
          const barCount = Math.min(128, Math.floor(size.width / 4)); // Up to 128 bars, 4px min width
          const minFreq = 20; // Hz
          const maxFreq = 20000; // Hz
          const sampleRate = 44100; // Or get from settings/featureData if available
          const binCount = fftData.length;

          // Clear canvas
          ctx.clearRect(0, 0, size.width, size.height);

          // Enhanced logarithmic frequency scaling with better resolution
          for (let bar = 0; bar < barCount; bar++) {
            // Logarithmic frequency scaling for better low-frequency resolution
            const freqStart = minFreq * Math.pow(maxFreq / minFreq, bar / barCount);
            const freqEnd = minFreq * Math.pow(maxFreq / minFreq, (bar + 1) / barCount);
            
            // Find bins in this frequency range
            let binStart = Math.floor((freqStart / (sampleRate / 2)) * binCount);
            let binEnd = Math.ceil((freqEnd / (sampleRate / 2)) * binCount);
            binStart = Math.max(0, binStart);
            binEnd = Math.min(binCount, binEnd);
            
            // Calculate weighted average magnitude in this range
            let sum = 0, weightSum = 0;
            for (let i = binStart; i < binEnd; i++) {
              const magnitude = fftData[i];
              // Apply frequency weighting (emphasize lower frequencies)
              const freq = (i / binCount) * (sampleRate / 2);
              const weight = 1 / (1 + freq / 1000); // Decay weight with frequency
              sum += magnitude * weight;
              weightSum += weight;
            }
            
            const avgMagnitude = weightSum > 0 ? sum / weightSum : 0;
            
            // Enhanced magnitude scaling with dynamic range compression
            const logMagnitude = Math.log10(avgMagnitude + 1e-10);
            const normalizedMagnitude = Math.max(0, Math.min(1, (logMagnitude + 6) / 4)); // Adjust range as needed
            
            // Draw bar with enhanced styling
            const barWidth = size.width / barCount;
            const barHeight = normalizedMagnitude * size.height * 0.95;
            
            // Create gradient for each bar
            const gradient = ctx.createLinearGradient(
              bar * barWidth, size.height - barHeight,
              bar * barWidth, size.height
            );
            
            // Color gradient based on frequency
            const freqRatio = bar / barCount;
            const lowFreqColor = `hsl(${180 + freqRatio * 60}, 90%, 60%)`; // Blue to cyan
            const highFreqColor = `hsl(${240 + freqRatio * 60}, 90%, 60%)`; // Cyan to blue
            
            gradient.addColorStop(0, lowFreqColor);
            gradient.addColorStop(1, highFreqColor);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(bar * barWidth, size.height - barHeight, barWidth - 1, barHeight);
            
            // Add subtle glow effect
            if (normalizedMagnitude > 0.7) {
              ctx.shadowColor = barColor;
              ctx.shadowBlur = 5;
              ctx.fillRect(bar * barWidth, size.height - barHeight, barWidth - 1, barHeight);
              ctx.shadowBlur = 0;
            }
          }
          
          // Add frequency labels if enabled
          if (settings.showFrequencyLabels) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            
            const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
            frequencies.forEach(freq => {
              const freqRatio = (Math.log10(freq) - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq));
              const x = freqRatio * size.width;
              if (x >= 0 && x < size.width) {
                ctx.fillText(`${freq}Hz`, x, size.height - 5);
              }
            });
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
      }
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
      case 'stereometer': {
        // True Lissajous stereometer using stereoWindow
        let stereoWindow = featureData && featureData.stereoWindow;
        // Reconstruct from flat arrays if needed
        if (!stereoWindow && featureData && featureData.stereoWindow_left && featureData.stereoWindow_right) {
          stereoWindow = {
            left: featureData.stereoWindow_left,
            right: featureData.stereoWindow_right
          };
        }
        
        const traceColor = settings.traceColor || '#00ffff';
        const glowIntensity = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : 0;
        const pointSize = typeof settings.pointSize === 'number' ? settings.pointSize : 2;
        const showGrid = !!settings.showGrid;
        const cornerRadius = typeof settings.cornerRadius === 'number' ? settings.cornerRadius : 0;
        
        if (stereoWindow && stereoWindow.left && stereoWindow.right) {
          // Debug log
          debugLog.log('[stereometer render]', {
            leftLength: stereoWindow.left.length,
            rightLength: stereoWindow.right.length,
            leftSample: stereoWindow.left.slice(0, 5),
            rightSample: stereoWindow.right.slice(0, 5),
            type: typeof stereoWindow.left[0]
          });
          const left = stereoWindow.left;
          const right = stereoWindow.right;
          const N = Math.min(left.length, right.length, 1024);
          
          ctx.save();
          
          // Apply corner radius clipping if set
          if (cornerRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(0, 0, size.width, size.height, cornerRadius);
            ctx.clip();
          }
          
          // Draw grid if enabled
          if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 0.5;
            // Vertical grid lines
            for (let x = 0; x <= size.width; x += size.width / 10) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, size.height);
              ctx.stroke();
            }
            // Horizontal grid lines
            for (let y = 0; y <= size.height; y += size.height / 10) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(size.width, y);
              ctx.stroke();
            }
            // Center crosshair
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(size.width / 2, 0);
            ctx.lineTo(size.width / 2, size.height);
            ctx.moveTo(0, size.height / 2);
            ctx.lineTo(size.width, size.height / 2);
            ctx.stroke();
          }
          
          // Draw glow effect if enabled
          if (glowIntensity > 0) {
            ctx.save();
            ctx.globalAlpha = glowIntensity * 0.3;
            for (let i = 0; i < N; i += Math.max(1, Math.floor(N / 200))) {
              const lx = left[i];
              const ry = right[i];
              const x = ((lx + 1) / 2) * size.width;
              const y = ((ry + 1) / 2) * size.height;
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, pointSize * 3);
              const rgbaColor = traceColor.startsWith('#') 
                ? `rgba(${parseInt(traceColor.slice(1, 3), 16)}, ${parseInt(traceColor.slice(3, 5), 16)}, ${parseInt(traceColor.slice(5, 7), 16)}, ${glowIntensity * 0.3})`
                : traceColor;
              gradient.addColorStop(0, rgbaColor);
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, pointSize * 3, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
          
          // Draw main trace
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = traceColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < N; i++) {
            // Normalize to [-1, 1]
            const lx = left[i];
            const ry = right[i];
            const x = ((lx + 1) / 2) * size.width;
            const y = ((ry + 1) / 2) * size.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          
          // Draw points if pointSize > 1
          if (pointSize > 1) {
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < N; i += Math.max(1, Math.floor(N / 100))) {
              const lx = left[i];
              const ry = right[i];
              const x = ((lx + 1) / 2) * size.width;
              const y = ((ry + 1) / 2) * size.height;
              ctx.beginPath();
              ctx.arc(x, y, pointSize / 2, 0, Math.PI * 2);
              ctx.fillStyle = traceColor;
              ctx.fill();
            }
          }
          
          ctx.restore();
        } else {
          drawStereometer(ctx, size.width, size.height);
        }
        break;
      }
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
      case 'vuMeter': {
        // Use RMS or peak from featureData
        let value = 0;
        if (settings.meterType === 'Peak' && typeof featureData.peak === 'number') value = featureData.peak;
        else if (typeof featureData.rms === 'number') value = featureData.rms;
        drawVuMeter(ctx, size.width, size.height, value, settings);
        break;
      }
      case 'chromaWheel': {
        // featureData.chroma should be an array of 12 values (0-1)
        drawChromaWheel(ctx, size.width, size.height, featureData && featureData.chroma, settings);
        break;
      }
      case 'consoleFeed': {
        // Draw scrolling text feed of raw audio buffer data
        const fontSize = typeof settings.fontSize === 'number' ? settings.fontSize : 12;
        const fontColor = settings.fontColor || '#00ff00';
        const maxLines = typeof settings.maxLines === 'number' ? settings.maxLines : 50;
        const scrollSpeed = typeof settings.scrollSpeed === 'number' ? settings.scrollSpeed : 1;
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'top';
        
        // Get raw audio buffer data
        if (featureData && featureData.audioBuffer && Array.isArray(featureData.audioBuffer)) {
          const audioBuffer = featureData.audioBuffer;
          
          // Sample every Nth value to create readable feed (e.g., every 10th sample)
          // This creates a reasonable number of lines per frame
          const sampleStep = Math.max(1, Math.floor(audioBuffer.length / 20)); // ~20 lines per frame
          
          // Add individual sample values as lines
          for (let i = 0; i < audioBuffer.length; i += sampleStep) {
            const value = audioBuffer[i];
            // Format as floating point with 6 decimal places
            const formatted = value.toFixed(6).padStart(12, ' ');
            const newLine = `[${i.toString().padStart(4, '0')}] ${formatted}`;
            consoleFeedLinesRef.current.push(newLine);
          }
          
          // Trim to maxLines (keep most recent)
          if (consoleFeedLinesRef.current.length > maxLines) {
            consoleFeedLinesRef.current = consoleFeedLinesRef.current.slice(-maxLines);
          }
        } else {
          // No data yet, show placeholder
          if (consoleFeedLinesRef.current.length === 0) {
            consoleFeedLinesRef.current = ['Waiting for audio data...'];
          }
        }
        
        // Update scroll offset for smooth scrolling
        consoleFeedScrollOffsetRef.current += scrollSpeed * 0.5;
        if (consoleFeedScrollOffsetRef.current > fontSize + 2) {
          consoleFeedScrollOffsetRef.current = 0;
        }
        
        // Draw lines from bottom up (scrolling upward like a console)
        const lineHeight = fontSize + 2;
        const startY = height - consoleFeedScrollOffsetRef.current;
        let y = startY;
        
        for (let i = consoleFeedLinesRef.current.length - 1; i >= 0; i--) {
          if (y < -lineHeight) break; // Off screen top
          if (y > height) continue; // Off screen bottom
          
          const line = consoleFeedLinesRef.current[i];
          // Truncate if too long to fit
          const maxChars = Math.floor(width / (fontSize * 0.6));
          const displayLine = line.length > maxChars ? line.substring(0, maxChars) : line;
          
          ctx.fillText(displayLine, 4, y);
          y -= lineHeight;
        }
        break;
      }
      case 'oscilloscope': {
        const amplitude = typeof settings.amplitude === 'number' ? settings.amplitude : 1;
        const color = settings.color || '#00ffff';
        const glowIntensity = typeof settings.glowIntensity === 'number' ? settings.glowIntensity : 0;
        const traceWidth = typeof settings.traceWidth === 'number' ? settings.traceWidth : 2;
        const showGrid = !!settings.showGrid;
        const gridColor = settings.gridColor || '#333333';
        if (Array.isArray(featureData) && featureData.length > 0) {
          // Draw background grid if enabled
          if (showGrid) {
            ctx.save();
            
            // Apply corner radius clipping if set
            const cornerRadius = settings.cornerRadius || 0;
            if (cornerRadius > 0) {
              ctx.beginPath();
              ctx.roundRect(0, 0, size.width, size.height, cornerRadius);
              ctx.clip();
            }
            
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
          ctx.lineWidth = traceWidth;
          ctx.beginPath();
          for (let i = 0; i < width; i++) {
            const idx = Math.floor(i / width * (featureData.length - 1));
            const val = featureData[idx];
            const normalizedVal = (val - 0.5) * 2;
            const y = height / 2 - normalizedVal * (height / 2) * amplitude;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
        } else {
          drawOscilloscope(ctx, width, height, { ...settings, amplitude, traceWidth });
        }
        break;
      }
      default:
        drawWaveform(ctx, width, height);
    }
  }, [type, stem, settings, featureData, canvasSize]);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('transform-anchor')) return;
    const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    setDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  }
  function onAnchorMouseDown(anchorKey: string, e: React.MouseEvent) {
    e.stopPropagation();
    const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    setResizing(anchorKey);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      width: widthPct,
      height: heightPct,
    };
  }

  return (
    <div
      ref={containerRef}
      data-overlay-id={layer.id}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        pointerEvents: 'auto',
        zIndex: 10,
        borderRadius: typeof settings.cornerRadius === 'number' ? `${settings.cornerRadius}px` : 0,
        background: settings.glass || settings.glassmorphism
          ? 'rgba(20, 40, 60, 0.25)'
          : 'rgba(0,0,0,0.2)',
        userSelect: dragging || resizing ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        backdropFilter: settings.glass || settings.glassmorphism ? 'blur(12px)' : undefined,
        WebkitBackdropFilter: settings.glass || settings.glassmorphism ? 'blur(12px)' : undefined,
        border: isSelected ? '1px dashed white' : (
          settings.outline ? `${settings.outlineWidth || 1}px solid ${settings.outlineColor || '#ffffff'}` : undefined
        ),
        boxShadow: isSelected ? '0 0 0 1px rgba(255,255,255,0.2)' : (
          settings.dropShadow ? `0 4px ${settings.shadowBlur || 8}px ${settings.shadowColor || '#000000'}40` : undefined
        ),
        transition: 'background 0.2s',
        isolation: 'isolate',
      }}
      onMouseDown={e => { onMouseDown(e); onSelect && onSelect(); }}
      onDoubleClick={onOpenModal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ width: '100%', height: '100%', display: 'block', borderRadius: typeof settings.cornerRadius === 'number' ? `${settings.cornerRadius}px` : 0 }}
      />
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