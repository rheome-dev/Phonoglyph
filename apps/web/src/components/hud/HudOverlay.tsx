import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { debugLog } from '@/lib/utils';
import type { Layer } from '@/types/video-composition';

// Minimeters-inspired palettes
const PALETTES = {
  MAGMA: [
    [0, 0, 4], [27, 12, 65], [74, 12, 107], [120, 28, 109],
    [165, 44, 96], [207, 68, 70], [237, 105, 37], [251, 155, 6],
    [252, 202, 99], [252, 253, 191]
  ] as [number, number, number][],
  VIRIDIS: [
    [68, 1, 84], [72, 35, 116], [64, 67, 135], [52, 94, 141],
    [42, 119, 142], [32, 143, 140], [30, 168, 130], [83, 197, 103],
    [138, 214, 87], [253, 231, 37]
  ] as [number, number, number][]
};

function getGradientColor(value: number, palette: [number, number, number][]) {
  const clamped = Math.max(0, Math.min(1, value));
  const idx = clamped * (palette.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  const c1 = palette[i];
  const c2 = palette[Math.min(i + 1, palette.length - 1)];
  const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
  return `rgb(${r},${g},${b})`;
}

// Logarithmic scaling helper for frequency displays
function getLogIndex(value: number, min: number, max: number, maxIndex: number) {
  const exp = value / maxIndex;
  const freq = min * Math.pow(max / min, exp);
  return (freq - min) / (max - min) * maxIndex; // Map back to linear index for array access approx
}

function drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number, data?: number[], settings: any = {}) {
  const color = settings.color || '#4db3fa';
  const lineWidth = settings.lineWidth || 2;
  const showTransients = settings.showTransients;
  
  ctx.clearRect(0, 0, w, h);
  
  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h/2);
  ctx.lineTo(w, h/2);
  ctx.stroke();

  const buffer = data || new Array(100).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.5 + 0.5);
  const sliceWidth = w / buffer.length;

  // Draw Filled Background style (Minimeters style)
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  
  for (let i = 0; i < buffer.length; i++) {
    const v = buffer[i]; // assumed normalized 0-1
    const y = v * h;
    const x = i * sliceWidth;
    
    // Mirror effect for solid look
    ctx.lineTo(x, y);
  }
  
  // Create gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, `${color}40`); // Transparent in middle
  grad.addColorStop(1, color);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  
  // Add glow
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.stroke();
  ctx.shadowBlur = 0;
}
function drawSpectrogram(ctx: CanvasRenderingContext2D, w: number, h: number, featureData: any, settings: any) {
  // Use the buffer provided by the manager
  const buffer = featureData?.fftBuffer || [];
  if (!buffer.length) {
    // Placeholder pattern
    for(let i=0; i<w; i+=4) {
      ctx.fillStyle = `hsl(${(i/w)*240}, 80%, 50%)`;
      ctx.fillRect(i, 0, 2, h);
    }
    return;
  }

  // Draw waterfall
  const frameCount = buffer.length;
  const binCount = buffer[0].length;
  const colWidth = Math.max(1, w / frameCount);
  const colorMap = settings.colorMap === 'Viridis' ? PALETTES.VIRIDIS : PALETTES.MAGMA;

  // Create an offscreen image data approach would be faster, but for surgical fix we draw rects
  // Optimize: Draw inversely. Oldest data at left.
  
  for (let x = 0; x < frameCount; x++) {
    const fft = buffer[x];
    const screenX = x * colWidth;
    
    // Draw vertical strip
    // Logarithmic Y axis (Low freq at bottom, High at top)
    // We iterate pixels Y to map to Frequency bins
    const resolution = 4; // Skip pixels for performance
    for (let y = 0; y < h; y += resolution) {
      // Map screen Y (height-y) to Log Frequency
      // 0 = bottom = 20Hz, h = top = 20kHz
      const normY = 1 - (y / h); 
      // Log mapping: bin = minFreq * (maxFreq/minFreq)^normY
      // Simple approx for array index:
      const binIdx = Math.floor(Math.pow(binCount, normY) - 1);
      const val = fft[Math.max(0, Math.min(binCount-1, binIdx))]; // 0-1 magnitude

      // Thresholding for cleaner look
      const displayVal = Math.max(0, (val - 0.2) * 1.5); // Contrast boost

      if (displayVal > 0.05) {
        ctx.fillStyle = getGradientColor(displayVal, colorMap);
        ctx.fillRect(screenX, y, colWidth + 0.5, resolution + 0.5);
      }
    }
  }
}
function drawPeakMeter(ctx: CanvasRenderingContext2D, w: number, h: number, featureData: any, settings: any) {
  // Expecting featureData to be a number (RMS) or object {rms, peak}
  let val = 0;
  if (typeof featureData === 'number') val = featureData;
  else if (featureData?.rms) val = featureData.rms;
  
  const peak = featureData?.peak || val;
  const color = settings.peakColor || '#00ff00';
  
  // Draw Background Track
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, w, h);
  
  // Gradient Bars
  // Green (-inf to -12dB), Yellow (-12 to -3), Red (-3 to 0)
  // Mapping linear 0-1 input to log dB approx for visual spacing
  // Let's stick to linear drawing for simplicity of the prompt but color it by threshold
  
  const drawBar = (value: number, x: number, width: number) => {
    const height = value * h;
    const y = h - height;
    
    // Segmented look
    const segmentHeight = 4;
    const gap = 1;
    
    for(let sy = h; sy > y; sy -= (segmentHeight + gap)) {
        // Determine color based on height percentage
        const pct = 1 - (sy / h);
        let segColor = '#00cc44';
        if (pct > 0.6) segColor = '#ffcc00';
        if (pct > 0.85) segColor = '#ff0000';
        
        ctx.fillStyle = segColor;
        ctx.fillRect(x, sy - segmentHeight, width, segmentHeight);
    }
  };

  drawBar(val, w * 0.1, w * 0.35); // RMS Bar
  drawBar(peak, w * 0.55, w * 0.35); // Peak Bar (typically narrower or same)
  
  // Labels
  ctx.fillStyle = '#fff';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RMS', w * 0.27, h - 2);
  ctx.fillText('PEAK', w * 0.72, h - 2);
}
function drawStereometer(ctx: CanvasRenderingContext2D, w: number, h: number, featureData: any, settings: any) {
  // Need stereo data. If featureData contains stereoWindow object
  const left = featureData?.stereoWindow?.left || [];
  const right = featureData?.stereoWindow?.right || [];
  
  if (!left.length || !right.length) return;

  const color = settings.traceColor || '#ff00ff';
  const glow = settings.glowIntensity || 0.5;

  // Goniometer Plot (L+R, L-R)
  // Rotate 45 deg: X = L-R, Y = L+R
  const centerX = w/2;
  const centerY = h/2;
  const scale = Math.min(w, h) * 0.4; // 40% margin

  ctx.fillStyle = `rgba(0,0,0, ${0.2})`; // Fade effect
  ctx.fillRect(0,0,w,h);

  ctx.globalCompositeOperation = 'lighter'; // Additive blending for "cloud" look
  
  // Draw dots
  ctx.fillStyle = color;
  const step = 2; // Skip points for performance if buffer is huge
  
  for(let i=0; i<left.length; i+=step) {
    const l = (left[i]); // assumed -1 to 1
    const r = (right[i]);
    
    // M/S processing for Goniometer
    const mid = (l + r) / 2;
    const side = (l - r) / 2;
    
    const x = centerX + side * scale * 2; // Side is X
    const y = centerY - mid * scale * 2;  // Mid is Y (up)

    // Opacity based on amplitude
    const amp = Math.sqrt(l*l + r*r);
    ctx.globalAlpha = Math.min(1, amp * glow + 0.1);
    
    ctx.beginPath();
    ctx.rect(x, y, 1.5, 1.5); // Fast square dot
    ctx.fill();
  }
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
function drawOscilloscope(ctx: CanvasRenderingContext2D, w: number, h: number, data: number[], settings: any) {
  const { color = '#00ff00', traceWidth = 2, lissajous = false } = settings;
  
  if (!data || !data.length) return;

  ctx.lineWidth = traceWidth;
  ctx.strokeStyle = color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = color;
  
  ctx.beginPath();

  if (lissajous && data.length >= 2) {
    // Split buffer for fake stereo if only mono provided, or expect stereo structure
    // Assuming 'data' is mono here for simplicity unless it's an object
    // If it's mono, we can't do real lissajous, so fallback to standard
    // But if we pretend half is L and half is R:
    const half = Math.floor(data.length / 2);
    for(let i = 0; i < half; i++) {
        const l = (data[i] - 0.5) * 2; // -1 to 1
        const r = (data[i + half] - 0.5) * 2;
        
        // Map L to X, R to Y, rotated 45 degrees usually looks best (Goniometer)
        // Simple XY mode:
        const x = (l + 1) * 0.5 * w;
        const y = (1 - (r + 1) * 0.5) * h;
        
        if (i===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
    }
  } else {
    // Standard Time Domain
    for (let i = 0; i < w; i++) {
        const idx = Math.floor((i / w) * (data.length - 1));
        const val = data[idx];
        const y = h - (val * h); // 0 is bottom, 1 is top
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}
function drawSpectrumAnalyzer(ctx: CanvasRenderingContext2D, w: number, h: number, featureData: any, settings: any) {
  const fft = featureData?.fft || [];
  if (!fft.length) return;

  const barColor = settings.barColor || '#00ffff';
  const showLabels = settings.showFrequencyLabels;
  
  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  [100, 1000, 10000].forEach(f => {
    // Approx log positions assuming 20-20k range
    const pos = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
    const x = pos * w;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    if(showLabels) {
      ctx.fillStyle = '#666';
      ctx.font = '9px monospace';
      ctx.fillText(f < 1000 ? `${f}Hz` : `${f/1000}k`, x + 2, h - 5);
    }
  });
  ctx.stroke();

  // Draw Bars with Log X spacing
  const barCount = 64;
  const barWidth = (w / barCount) * 0.8;
  const spacing = (w / barCount) * 0.2;

  ctx.fillStyle = barColor;
  ctx.shadowBlur = 15;
  ctx.shadowColor = barColor;

  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    // Map linear bar index to log frequency bin
    // frequency = 20 * (20000/20)^t
    // index ~ frequency / (sampleRate/fftSize)
    // Simplify: map t (0..1) to binIndex (0..fftLength) exponentially
    const binIdx = Math.floor(Math.pow(fft.length, t));
    
    // Average a few bins for smoothness
    let val = fft[binIdx] || 0;
    if (binIdx < fft.length - 1) val = (val + fft[binIdx+1]) / 2;

    const barHeight = Math.max(2, val * h * 0.9); // Scale
    
    const x = i * (barWidth + spacing);
    const y = h - barHeight;

    // Gradient fill for bar
    const grad = ctx.createLinearGradient(0, y, 0, h);
    grad.addColorStop(0, '#ffffff'); // White tip
    grad.addColorStop(0.2, barColor);
    grad.addColorStop(1, `${barColor}00`); // Fade out bottom

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
  ctx.shadowBlur = 0;
}
function drawVuMeter(ctx: CanvasRenderingContext2D, w: number, h: number, value: number, settings: any) {
  // Classic Analog VU Style
  ctx.clearRect(0, 0, w, h);

  // Geometry: Pivot point is well below the bottom of the canvas to create a shallow arc
  const pivotY = h * 1.5; 
  const pivotX = w / 2;
  const arcRadius = pivotY - (h * 0.2); // Top of tick marks
  
  // Angle range (Left to Right)
  const angleStart = -Math.PI / 4.5; // ~-40 deg
  const angleEnd = Math.PI / 4.5;    // ~+40 deg
  const totalAngle = angleEnd - angleStart;

  // VU Scale: -20 to +3 dB
  const minDb = -20;
  const maxDb = 3;
  
  // Helper: Map dB to Angle
  const getAngle = (db: number) => {
    // Clamp range
    const d = Math.max(minDb, Math.min(maxDb, db));
    // Normalize 0..1 based on range
    const t = (d - minDb) / (maxDb - minDb);
    // Map to angle (Subtract PI/2 because 0 radians is 3 o'clock)
    return angleStart + t * totalAngle - (Math.PI / 2);
  };

  // Draw Background Scale Ticks & Labels
  ctx.lineCap = 'butt';
  
  // Specific tick marks for VU scale
  const ticks = [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3];
  
  ticks.forEach(db => {
    const angle = getAngle(db);
    const isRed = db > 0;
    
    // Calculate Tick position
    const rOuter = arcRadius;
    const rInner = arcRadius - (h * (db === 0 || db === -20 || db === 3 ? 0.15 : 0.08));
    
    const x1 = pivotX + Math.cos(angle) * rOuter;
    const y1 = pivotY + Math.sin(angle) * rOuter;
    const x2 = pivotX + Math.cos(angle) * rInner;
    const y2 = pivotY + Math.sin(angle) * rInner;

    // Draw Tick
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = isRed ? '#ff4444' : '#e0e0e0';
    ctx.lineWidth = w * 0.008; // responsive line width
    ctx.stroke();

    // Draw Label (numbers)
    if ([-20, -10, -5, 0, 3].includes(db)) {
      const rText = rInner - (h * 0.1);
      const tx = pivotX + Math.cos(angle) * rText;
      const ty = pivotY + Math.sin(angle) * rText;
      
      ctx.fillStyle = isRed ? '#ff4444' : '#e0e0e0';
      ctx.font = `bold ${Math.round(h * 0.12)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.abs(db).toString(), tx, ty);
    }
  });

  // Draw "Red Zone" Arc line connecting the tops of positive ticks
  const angleZero = getAngle(0);
  const angleMax = getAngle(3);
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, arcRadius, angleZero, angleMax);
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = w * 0.008;
  ctx.stroke();

  // Draw Needle
  // 1. Convert linear input (0-1) to dB
  // We align 1.0 (max) to +3dB
  let db = -60; // Floor
  if (value > 0.001) {
    db = 20 * Math.log10(value);
  }
  const displayDb = db + 3; // Offset so 1.0 input = +3dB

  const needleAngle = getAngle(displayDb);
  
  ctx.strokeStyle = '#ff8800'; // Classic Orange Needle
  ctx.lineWidth = w * 0.012;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY); // From Pivot
  // Needle length (slightly past the ticks)
  const tipX = pivotX + Math.cos(needleAngle) * (arcRadius + h * 0.05);
  const tipY = pivotY + Math.sin(needleAngle) * (arcRadius + h * 0.05);
  ctx.lineTo(tipX, tipY);
  
  // Needle Glow
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Draw Pivot Cover (The black box at the bottom)
  ctx.fillStyle = '#111'; // Or match background color
  ctx.beginPath();
  ctx.fillRect(0, h * 0.85, w, h * 0.15);
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
  videoWidth?: number;  // Explicit dimensions for headless rendering
  videoHeight?: number;
  onOpenModal?: () => void;
  onUpdate: (updates: Partial<Layer>) => void;
  isSelected?: boolean;
  onSelect?: () => void;
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export function HudOverlay({
  layer,
  featureData,
  videoWidth,
  videoHeight,
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

  // Remotion frame hooks - these drive per-frame rendering
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Force re-render on frame change - more reliable than deps in useLayoutEffect
  // for headless/lambda rendering
  const [, forceUpdate] = useState(0);
  useLayoutEffect(() => {
    forceUpdate((f) => f + 1);
  }, [frame]);

  const updateCanvasSize = useCallback(() => {
    const parentRect = containerRef.current?.parentElement?.getBoundingClientRect();

    // FIX: Use video dimensions as fallback for headless rendering
    // When getBoundingClientRect returns 0x0 (headless), use explicit dimensions
    const parentWidth = parentRect?.width ?? 0;
    const parentHeight = parentRect?.height ?? 0;

    // If parent rect is 0x0 (headless), use video dimensions
    const effectiveParentWidth = parentWidth > 0 ? parentWidth : (videoWidth ?? 1080);
    const effectiveParentHeight = parentHeight > 0 ? parentHeight : (videoHeight ?? 1920);

    const width = (effectiveParentWidth * widthPct) / 100;
    const height = (effectiveParentHeight * heightPct) / 100;
    setCanvasSize({
      width: Math.max(1, width),
      height: Math.max(1, height),
    });
  }, [widthPct, heightPct, videoWidth, videoHeight]);

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

  // Use useLayoutEffect for synchronous per-frame drawing in Remotion
  // This ensures canvas draws synchronously before paint, which is critical for
  // headless/lambda rendering where useEffect may be deferred
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvasSize;
    const size = canvasSize;
    ctx.clearRect(0, 0, width, height);
    // Draw using featureData if available, else fallback to placeholder
    switch (type) {
      case 'waveform':
        // Ensure data is array
        const waveData = Array.isArray(featureData) ? featureData : [];
        drawWaveform(ctx, width, height, waveData, settings);
        break;
      case 'oscilloscope':
        // Force array
        const oscData = Array.isArray(featureData) ? featureData : [];
        drawOscilloscope(ctx, width, height, oscData, settings);
        break;
      case 'spectrogram':
        // featureData should contain { fftBuffer: [...] }
        drawSpectrogram(ctx, width, height, featureData, settings);
        break;
      case 'spectrumAnalyzer':
        drawSpectrumAnalyzer(ctx, width, height, featureData, settings);
        break;
      case 'peakMeter':
        drawPeakMeter(ctx, width, height, featureData, settings);
        break;
      case 'stereometer':
        drawStereometer(ctx, width, height, featureData, settings);
        break;
      case 'vuMeter':
        // Handle both simple number or object {rms, peak}
        // If it's an object, prefer RMS for the needle
        const vuVal = typeof featureData === 'number' ? featureData : (featureData?.rms || 0);
        drawVuMeter(ctx, width, height, vuVal, settings);
        break;
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
      default:
        drawWaveform(ctx, width, height, [], settings);
    }
  }, [type, stem, settings, featureData, canvasSize, frame]);

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