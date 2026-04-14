This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/remotion/**/*.ts, src/remotion/**/*.tsx, src/components/hud/**/*.ts, src/components/hud/**/*.tsx, src/lib/visualizer/core/**/*.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
src/
  components/
    hud/
      HudOverlay.tsx
      HudOverlayManager.tsx
      HudOverlayParameterModal.tsx
  lib/
    visualizer/
      core/
        AudioTextureManager.ts
        MediaLayerManager.ts
        MultiLayerCompositor.ts
        VisualizerManager.ts
  remotion/
    Debug.tsx
    index.ts
    RayboxComposition.tsx
    RemotionOverlayRenderer.tsx
    Root.tsx
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/components/hud/HudOverlay.tsx">
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
</file>

<file path="src/components/hud/HudOverlayManager.tsx">
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { HudOverlay } from './HudOverlay';
import { useTimelineStore } from '@/stores/timelineStore';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import type { Layer } from '@/types/video-composition';

type HudOverlayRendererProps = {
  stemUrlMap?: Record<string, string>;
  cachedAnalysis?: any[];
};

const getOverlayStem = (layer: Layer, stemUrlMap: Record<string, string>) => {
  const settings = (layer as any).settings || {};
  const stemId = settings.stemId || settings.stem?.id;
  if (!stemId) return null;
  const url = stemUrlMap[stemId] || settings.stem?.url || '';
  return { id: stemId, url };
};

// Helper: get feature keys for overlay type
function getFeatureKeyForOverlay(type: string): string[] {
  switch (type) {
    case 'waveform':
    case 'oscilloscope':
      return ['rms', 'loudness'];
    case 'spectrogram':
    case 'spectrumAnalyzer':
      return ['fft', 'spectralCentroid', 'rms', 'loudness'];
    case 'peakMeter':
      return ['rms', 'loudness'];
    case 'stereometer':
      return ['spectralCentroid', 'rms'];
    case 'vuMeter':
      return ['rms', 'loudness'];
    case 'chromaWheel':
      return ['chroma', 'rms'];
    default:
      return ['rms'];
  }
}

export function HudOverlayRenderer({ stemUrlMap = {}, cachedAnalysis = [] }: HudOverlayRendererProps) {
  const { layers, currentTime, duration, updateLayer } = useTimelineStore((state) => ({
    layers: state.layers,
    currentTime: state.currentTime,
    duration: state.duration,
    updateLayer: state.updateLayer,
  }));

  const audioController = useStemAudioController();
  const { loadStems, getStereoWindow, getAudioBuffer } = audioController;
  
  // Force re-render on animation frame for real-time updates
  const [frame, setFrame] = useState(0);
  
  useEffect(() => {
    let raf: number;
    const loop = () => {
      setFrame(f => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  useEffect(() => {
    if (!loadStems) return;
    const stems = new Map<string, { id: string; url: string; label?: string; isMaster: boolean }>();
    overlayLayers.forEach((layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;
      const url = stemId ? stemUrlMap[stemId] || settings.stem?.url : undefined;
      if (!stemId || !url) return;
      if (!stems.has(stemId)) {
        stems.set(stemId, {
          id: stemId,
          url,
          label: layer.name,
          isMaster: Boolean(settings.isMaster),
        });
      }
    });
    const stemsToLoad = Array.from(stems.values());
    if (stemsToLoad.length > 0) {
      loadStems(stemsToLoad);
    }
  }, [overlayLayers, stemUrlMap, loadStems]);

  // Compute feature data for an overlay layer
  const getFeatureDataForOverlay = useCallback((layer: Layer) => {
    const settings = (layer as any).settings || {};
    const stemId = settings.stemId || settings.stem?.id;
    
    if (!stemId || cachedAnalysis.length === 0) {
      return null;
    }
    
    // Find the analysis for this stem
    const analysis = cachedAnalysis.find(a => a.fileMetadataId === stemId);
    if (!analysis || !analysis.analysisData) {
      return null;
    }

    const overlayType = layer.effectType as string;
    const featureKeys = getFeatureKeyForOverlay(overlayType);
    
    // Get duration and compute progress
    const analysisDuration = analysis.metadata?.duration || duration || 1;
    const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));

    // For spectrum overlays
    if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
      if (analysis.analysisData.fft && Array.isArray(analysis.analysisData.fft) && analysis.analysisData.fft.length > 0) {
        const baseFft = analysis.analysisData.fft;
        
        // Create a buffer of FFT frames with time-based variations
        const buffer = [];
        const numFrames = 200;
        
        for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
          const frameTime = currentTime - (numFrames - frameIdx) * 0.1;
          const newFrame = new Float32Array(baseFft.length);
          
          const timePhase = frameTime * 2 * Math.PI;
          const frequencyPhase = frameTime * Math.PI;
          
          for (let i = 0; i < baseFft.length; i++) {
            const freqRatio = i / baseFft.length;
            const baseValue = baseFft[i];
            
            const amplitudeMod = 1 + 0.3 * Math.sin(timePhase + freqRatio * Math.PI * 4);
            const frequencyMod = 1 + 0.2 * Math.sin(frequencyPhase + freqRatio * Math.PI * 2);
            const noiseMod = 1 + 0.1 * Math.sin(timePhase * 3 + i * 0.1);
            
            newFrame[i] = Math.max(0, baseValue * amplitudeMod * frequencyMod * noiseMod);
          }
          
          buffer.push(newFrame);
        }
        
        return { 
          fft: buffer[buffer.length - 1],
          fftBuffer: buffer
        };
      }
    }

    // For stereometer, use real-time stereo window if available
    if (overlayType === 'stereometer') {
      if (getStereoWindow && stemId) {
        // Pass currentTime (which is loop-aware) to getStereoWindow
        // This ensures the stereometer works correctly when audio loops
        const stereoWindow = getStereoWindow(stemId, 1024, currentTime);
        if (stereoWindow) {
          return { stereoWindow };
        }
      }
      return null;
    }

    // For consoleFeed, use real-time raw audio buffer data
    if (overlayType === 'consoleFeed') {
      if (getAudioBuffer && stemId) {
        // Get a window of raw audio samples (512 samples = ~11ms at 44.1kHz)
        const audioBuffer = getAudioBuffer(stemId, 512, currentTime);
        if (audioBuffer) {
          return { audioBuffer: Array.from(audioBuffer) };
        }
      }
      return null;
    }
    
    // For chroma wheel
    if (overlayType === 'chromaWheel') {
      if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
        return { chroma: analysis.analysisData.chroma };
      }
      return null;
    }
    
    // For VU meter
    if (overlayType === 'vuMeter') {
      let rmsValue = 0;
      let peakValue = 0;
      
      if (analysis.analysisData.rms && Array.isArray(analysis.analysisData.rms)) {
        const idx = Math.floor(progress * (analysis.analysisData.rms.length - 1));
        rmsValue = analysis.analysisData.rms[idx] || 0;
      }
      if (analysis.analysisData.loudness && Array.isArray(analysis.analysisData.loudness)) {
        const idx = Math.floor(progress * (analysis.analysisData.loudness.length - 1));
        peakValue = analysis.analysisData.loudness[idx] || 0;
      }
      
      return { rms: rmsValue, peak: peakValue };
    }

    // Find the first available feature for this overlay type
    let featureArr = null;
    for (const key of featureKeys) {
      if (analysis.analysisData[key] && Array.isArray(analysis.analysisData[key])) {
        featureArr = analysis.analysisData[key];
        break;
      }
    }

    if (!featureArr) {
      // Fallback: try any available array feature
      const availableFeatures = Object.keys(analysis.analysisData).filter(key => 
        Array.isArray(analysis.analysisData[key]) && analysis.analysisData[key].length > 0
      );
      if (availableFeatures.length > 0) {
        featureArr = analysis.analysisData[availableFeatures[0]];
      }
    }

    if (!featureArr) return null;

    const idx = Math.floor(progress * (featureArr.length - 1));

    // For waveform and oscilloscope, return a window of values
    if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
      const windowSize = 100;
      const endIdx = idx + 1;
      const startIdx = Math.max(0, endIdx - windowSize);
      return featureArr.slice(startIdx, endIdx);
    }
    
    // For peak meter, return single value
    if (overlayType === 'peakMeter') {
      return featureArr[idx] || 0;
    }

    // Default: return single value
    return featureArr[idx];
  }, [cachedAnalysis, currentTime, duration, getStereoWindow, getAudioBuffer]);

  return (
    <div
      id="hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const stem = getOverlayStem(layer, stemUrlMap);
        const layerWithStem = stem
          ? {
              ...layer,
              settings: { ...(layer as any).settings, stem },
            }
          : layer;
        const featureData = getFeatureDataForOverlay(layer);
        return (
          <HudOverlay
            key={layer.id}
            layer={layerWithStem}
            featureData={featureData}
            onOpenModal={() => {}}
            onUpdate={(updates: Partial<Layer>) => updateLayer(layer.id, updates)}
            isSelected={false}
            onSelect={() => {}}
          />
        );
      })}
    </div>
  );
}
</file>

<file path="src/components/hud/HudOverlayParameterModal.tsx">
import React from 'react';
import { useDrop } from 'react-dnd';
import { PortalModal } from '../ui/portal-modal';
import { DroppableParameter } from '../ui/droppable-parameter';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';

// Add OverlaySetting type to allow min, max, step

type OverlaySetting = {
  label: string;
  key: string;
  type: string;
  options?: any[];
  min?: number;
  max?: number;
  step?: number;
};

const OVERLAY_SETTINGS: Record<string, OverlaySetting[]> = {
  waveform: [
    { label: 'Color', key: 'color', type: 'color' },
    { label: 'Line Width', key: 'lineWidth', type: 'number' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  spectrogram: [
    { label: 'Color Map', key: 'colorMap', type: 'select', options: ['Classic', 'Inferno', 'Viridis', 'Rainbow'] },
    { label: 'Show Frequency Labels', key: 'showFrequencyLabels', type: 'checkbox' },
    { label: 'Brightness', key: 'brightness', type: 'number', min: 0, max: 2, step: 0.01 },
    { label: 'Contrast', key: 'contrast', type: 'number', min: 0, max: 2, step: 0.01 },
    { label: 'Scroll Speed', key: 'scrollSpeed', type: 'number', min: 0.1, max: 5, step: 0.1 },
    { label: 'FFT Size', key: 'fftSize', type: 'number', min: 256, max: 4096, step: 256 },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  peakMeter: [
    { label: 'Peak Color', key: 'peakColor', type: 'color' },
    { label: 'Hold Time (ms)', key: 'holdTime', type: 'number' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  stereometer: [
    { label: 'Trace Color', key: 'traceColor', type: 'color' },
    { label: 'Glow Intensity', key: 'glowIntensity', type: 'number', min: 0, max: 1, step: 0.01 },
    { label: 'Point Size', key: 'pointSize', type: 'number', min: 1, max: 10, step: 1 },
    { label: 'Show Grid', key: 'showGrid', type: 'checkbox' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  oscilloscope: [
    { label: 'Follow Pitch', key: 'followPitch', type: 'checkbox' },
    { label: 'Color', key: 'color', type: 'color' },
    { label: 'Glow Intensity', key: 'glowIntensity', type: 'slider' },
    { label: 'Amplitude', key: 'amplitude', type: 'slider' },
    { label: 'Trace Width', key: 'traceWidth', type: 'slider', min: 0.5, max: 2, step: 0.1 },
    { label: 'Show Grid', key: 'showGrid', type: 'checkbox' },
    { label: 'Grid Color', key: 'gridColor', type: 'color' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  spectrumAnalyzer: [
    { label: 'Bar Color', key: 'barColor', type: 'color' },
    { label: 'Show Frequency Labels', key: 'showFrequencyLabels', type: 'checkbox' },
    { label: 'FFT Size', key: 'fftSize', type: 'number' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  consoleFeed: [
    { label: 'Data Source', key: 'dataSource', type: 'select', options: ['MIDI', 'LUFS/RMS', 'FFT Summary', 'All'] },
    { label: 'Font Size', key: 'fontSize', type: 'number', min: 8, max: 20, step: 1 },
    { label: 'Font Color', key: 'fontColor', type: 'color' },
    { label: 'Max Lines', key: 'maxLines', type: 'number', min: 10, max: 100, step: 1 },
    { label: 'Scroll Speed', key: 'scrollSpeed', type: 'number', min: 0.1, max: 5, step: 0.1 },
    { label: 'Glassmorphism Background', key: 'glassmorphism', type: 'checkbox' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  vuMeter: [
    { label: 'Color', key: 'color', type: 'color' },
    { label: 'Style', key: 'style', type: 'select', options: ['Needle', 'Bar'] },
    { label: 'Meter Type', key: 'meterType', type: 'select', options: ['RMS', 'Peak'] },
    { label: 'Glassmorphism Background', key: 'glassmorphism', type: 'checkbox' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
  chromaWheel: [
    { label: 'Color Scheme', key: 'colorScheme', type: 'select', options: ['Classic', 'Rainbow', 'Viridis', 'Inferno'] },
    { label: 'Show Note Names', key: 'showNoteNames', type: 'checkbox' },
    { label: 'Glassmorphism Background', key: 'glassmorphism', type: 'checkbox' },
    { label: 'Corner Radius', key: 'cornerRadius', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Drop Shadow', key: 'dropShadow', type: 'checkbox' },
    { label: 'Shadow Color', key: 'shadowColor', type: 'color' },
    { label: 'Shadow Blur', key: 'shadowBlur', type: 'number', min: 0, max: 50, step: 1 },
    { label: 'Outline', key: 'outline', type: 'checkbox' },
    { label: 'Outline Color', key: 'outlineColor', type: 'color' },
    { label: 'Outline Width', key: 'outlineWidth', type: 'number', min: 1, max: 10, step: 1 },
  ],
};

// Add glassmorphism toggle to all overlays
Object.keys(OVERLAY_SETTINGS).forEach(type => {
  OVERLAY_SETTINGS[type].push({ label: 'Glassmorphism Background', key: 'glassmorphism', type: 'checkbox' });
});

// Add transient detector to waveform
OVERLAY_SETTINGS.waveform.push({ label: 'Show Transient Detector', key: 'showTransients', type: 'checkbox' });
OVERLAY_SETTINGS.waveform.push({ label: 'Transient Color', key: 'transientColor', type: 'color' });
OVERLAY_SETTINGS.waveform.push({ label: 'Transient Sensitivity', key: 'transientSensitivity', type: 'number', min: 0.01, max: 1, step: 0.01 });
// Add Lissajous mode to oscilloscope
OVERLAY_SETTINGS.oscilloscope.push({ label: 'Lissajous Stereo Mode', key: 'lissajous', type: 'checkbox' });

export function HudOverlayParameterModal({ overlay, onClose, onUpdate }: any) {
  const settings = overlay.settings || {};
  const settingsConfig = OVERLAY_SETTINGS[overlay.type] || [];

  function handleSettingChange(key: string, value: any) {
    onUpdate({ settings: { ...settings, [key]: value } });
  }

  // Custom drop area that accepts both features and audio stems
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['feature', 'AUDIO_STEM'],
    drop: (item: any) => {
      if (item.type === 'AUDIO_STEM') {
        // Handle audio stem drop
        onUpdate({ stem: { id: item.id, name: item.name, stemType: item.stemType } });
      } else {
        // Handle feature drop (legacy)
        onUpdate({ stem: { id: item.id, name: item.stemType || item.id, stemType: item.stemType } });
      }
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const dropRef = React.useCallback((node: HTMLDivElement | null) => {
    drop(node);
  }, [drop]);

  return (
    <PortalModal title={`${overlay.type.charAt(0).toUpperCase() + overlay.type.slice(1)} Settings`} isOpen={true} onClose={onClose}>
      <div className="space-y-6">
        <div>
          <div className="font-bold text-xs mb-2 text-white/80">Audio Source</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white/80 text-xs font-mono">Audio Stem</label>
              {/* Custom Drop Zone */}
                             <div
                 ref={dropRef}
                className={`
                  relative flex items-center justify-center w-8 h-6 rounded-full cursor-pointer
                  transition-all duration-200 ease-out
                  ${overlay.stem?.id 
                    ? 'bg-emerald-600/20 border-2 border-emerald-500/50 shadow-lg' 
                    : 'bg-stone-700/50 border-2 border-stone-600/50 shadow-inner'
                  }
                  ${isOver && canDrop 
                    ? 'scale-110 bg-emerald-500/30 border-emerald-400 shadow-lg ring-2 ring-emerald-400/50' 
                    : ''
                  }
                  ${!overlay.stem?.id && !isOver 
                    ? 'hover:bg-stone-600/60 hover:border-stone-500/60' 
                    : ''
                  }
                `}
                style={{
                  boxShadow: overlay.stem?.id 
                    ? `
                      inset 0 1px 0 rgba(255, 255, 255, 0.1),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
                      0 2px 4px rgba(0, 0, 0, 0.3),
                      0 0 8px rgba(16, 185, 129, 0.3)
                    `
                    : `
                      inset 0 1px 0 rgba(255, 255, 255, 0.05),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                      0 1px 2px rgba(0, 0, 0, 0.2)
                    `,
                  background: overlay.stem?.id
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(68, 64, 60, 0.5) 0%, rgba(41, 37, 36, 0.5) 100%)'
                }}
              >
                {!overlay.stem?.id && (
                  <div className={`
                    w-2 h-2 rounded-full transition-all duration-200
                    ${isOver && canDrop 
                      ? 'bg-emerald-400 scale-125' 
                      : 'bg-stone-400/50'
                    }
                  `} />
                )}
                {overlay.stem?.id && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
            </div>
            <div className="relative">
              <div className="text-xs text-white/80">Drop a stem here to drive this overlay</div>
              {/* Mapped Stem Badge */}
              {overlay.stem?.id && overlay.stem?.name && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge 
                    className="bg-emerald-600/90 text-emerald-100 text-xs px-2 py-1 border border-emerald-500/50 shadow-lg"
                    style={{
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <span className="mr-1">{overlay.stem.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate({ stem: null });
                      }}
                      className="ml-1 hover:bg-emerald-500/50 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}
            </div>
            {/* Drop hint */}
            {isOver && canDrop && !overlay.stem?.id && (
              <div className="text-xs text-emerald-400/80 font-mono animate-pulse">
                Drop to assign stem
              </div>
            )}
          </div>
        </div>
        {settingsConfig.length > 0 && (
          <div>
            <div className="font-bold text-xs mb-2 text-white/80">Overlay Settings</div>
            <div className="space-y-3">
              {settingsConfig.map(setting => (
                <div key={setting.key} className="flex items-center gap-2">
                  <label className="text-xs text-white/70 w-32">{setting.label}</label>
                  {setting.type === 'color' && (
                    <input 
                      type="color" 
                      value={settings[setting.key] ?? (
                        setting.key === 'gridColor' ? '#333333' : 
                        setting.key === 'shadowColor' ? '#000000' :
                        setting.key === 'outlineColor' ? '#ffffff' :
                        '#00ffff'
                      )} 
                      onChange={e => handleSettingChange(setting.key, e.target.value)} 
                    />
                  )}
                  {setting.type === 'number' && (setting.key === 'cornerRadius' || setting.key === 'shadowBlur' || setting.key === 'outlineWidth') && (
                    <div className="flex-1">
                      <Slider
                        value={[settings[setting.key] ?? (setting.key === 'cornerRadius' ? 8 : setting.key === 'shadowBlur' ? 8 : 1)]}
                        onValueChange={([value]) => handleSettingChange(setting.key, value)}
                        min={setting.min || 0}
                        max={setting.max || 50}
                        step={setting.step || 1}
                        className="w-full"
                      />
                      <div className="text-xs text-white/60 mt-1">
                        {settings[setting.key] ?? (setting.key === 'cornerRadius' ? 8 : setting.key === 'shadowBlur' ? 8 : 1)}
                      </div>
                    </div>
                  )}
                  {setting.type === 'number' && !(setting.key === 'cornerRadius' || setting.key === 'shadowBlur' || setting.key === 'outlineWidth') && (
                    <input 
                      type="number" 
                      value={settings[setting.key] ?? ''} 
                      onChange={e => handleSettingChange(setting.key, Number(e.target.value))} 
                      className="w-20 px-1 rounded" 
                    />
                  )}
                  {setting.type === 'slider' && (
                    <div className="flex-1">
                      <Slider
                        value={[settings[setting.key] ?? (setting.key === 'glowIntensity' ? 0 : setting.key === 'amplitude' ? 1 : setting.key === 'traceWidth' ? 2 : 0)]}
                        onValueChange={([value]) => handleSettingChange(setting.key, value)}
                        min={setting.key === 'amplitude' ? 0.1 : setting.key === 'traceWidth' ? 0.5 : 0}
                        max={setting.key === 'amplitude' ? 2 : setting.key === 'traceWidth' ? 2 : 5}
                        step={setting.key === 'amplitude' ? 0.01 : setting.key === 'traceWidth' ? 0.1 : 0.1}
                        className="w-full"
                      />
                      <div className="text-xs text-white/60 mt-1">
                        {settings[setting.key] ?? (setting.key === 'glowIntensity' ? 0 : setting.key === 'amplitude' ? 1 : setting.key === 'traceWidth' ? 2 : 0)}
                      </div>
                    </div>
                  )}
                  {setting.type === 'checkbox' && (
                    <input 
                      type="checkbox" 
                      checked={settings[setting.key] ?? (setting.key === 'showGrid' ? false : false)} 
                      onChange={e => handleSettingChange(setting.key, e.target.checked)} 
                    />
                  )}
                  {setting.type === 'select' && (
                    <select value={settings[setting.key] || setting.options?.[0]} onChange={e => handleSettingChange(setting.key, e.target.value)} className="px-1 rounded">
                      {setting.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PortalModal>
  );
}
</file>

<file path="src/lib/visualizer/core/AudioTextureManager.ts">
import * as THREE from 'three';

export interface AudioFeatureData {
  features: Record<string, number[]>;
  duration: number;
  sampleRate: number;
  stemTypes: string[];
}

export interface AudioFeatureMapping {
  featureIndex: number;
  stemType: string;
  featureName: string;
  minValue: number;
  maxValue: number;
}

export class AudioTextureManager {
  private audioTexture: THREE.DataTexture;
  private featureTexture: THREE.DataTexture;
  private timeTexture: THREE.DataTexture;
  
  // Texture layout: X = time, Y = feature index, RGBA = feature values
  private audioData: Float32Array;
  private featureData: Float32Array;
  private timeData: Float32Array;
  
  // Configuration
  private readonly textureWidth = 256;  // Time samples
  private readonly textureHeight = 64;  // Feature rows (16 features per row)
  private readonly maxFeatures = 256;   // 64 rows × 4 channels
  
  // Feature mapping
  private featureMappings: AudioFeatureMapping[] = [];
  private featureIndexMap: Map<string, number> = new Map();
  
  constructor() {
    // Initialize audio data array (256×64×4 = 65,536 values)
    this.audioData = new Float32Array(this.textureWidth * this.textureHeight * 4);
    
    // Initialize feature metadata (64×4 = 256 values)
    this.featureData = new Float32Array(this.textureHeight * 4);
    
    // Initialize time synchronization (4 values: currentTime, duration, normalizedTime, padding)
    this.timeData = new Float32Array(4);
    
    // Create GPU textures
    this.audioTexture = new THREE.DataTexture(
      this.audioData,
      this.textureWidth,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.audioTexture.needsUpdate = true;
    this.audioTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.audioTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.audioTexture.magFilter = THREE.LinearFilter;
    this.audioTexture.minFilter = THREE.LinearFilter;
    
    this.featureTexture = new THREE.DataTexture(
      this.featureData,
      4,
      this.textureHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.featureTexture.needsUpdate = true;
    this.featureTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.featureTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.featureTexture.magFilter = THREE.NearestFilter;
    this.featureTexture.minFilter = THREE.NearestFilter;
    
    this.timeTexture = new THREE.DataTexture(
      this.timeData,
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.timeTexture.needsUpdate = true;
    this.timeTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.timeTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.timeTexture.magFilter = THREE.NearestFilter;
    this.timeTexture.minFilter = THREE.NearestFilter;
  }
  
  /**
   * Load cached audio analysis into GPU textures
   */
  public loadAudioAnalysis(analysisData: AudioFeatureData): void {
    this.buildFeatureMapping(analysisData);
    this.packFeaturesIntoTexture(analysisData);
  }
  
  /**
   * Build feature mapping from analysis data
   */
  private buildFeatureMapping(analysisData: AudioFeatureData): void {
    this.featureMappings = [];
    this.featureIndexMap.clear();
    
    let featureIndex = 0;
    
    // Map features by stem type and feature name
    for (const stemType of analysisData.stemTypes) {
      const stemFeatures = analysisData.features[stemType];
      if (!stemFeatures) continue;
      
      // Common audio features
      const featureNames = ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr'];
      
      for (const featureName of featureNames) {
        if (featureIndex >= this.maxFeatures) break;
        
        const mapping: AudioFeatureMapping = {
          featureIndex,
          stemType,
          featureName,
          minValue: 0,
          maxValue: 1
        };
        
        this.featureMappings.push(mapping);
        this.featureIndexMap.set(`${stemType}-${featureName}`, featureIndex);
        featureIndex++;
      }
    }
    
    // Pack feature metadata into texture
    this.packFeatureMetadata();
  }
  
  /**
   * Pack feature metadata into feature texture
   */
  private packFeatureMetadata(): void {
    for (let i = 0; i < this.featureMappings.length; i++) {
      const mapping = this.featureMappings[i];
      const row = Math.floor(i / 4);
      const col = i % 4;
      const index = row * 4 + col;
      
      // Store feature index, stem type hash, feature name hash, and value range
      this.featureData[index * 4 + 0] = mapping.featureIndex;
      this.featureData[index * 4 + 1] = this.hashString(mapping.stemType);
      this.featureData[index * 4 + 2] = this.hashString(mapping.featureName);
      this.featureData[index * 4 + 3] = mapping.maxValue - mapping.minValue;
    }
    
    this.featureTexture.needsUpdate = true;
  }
  
  /**
   * Pack audio features into main texture
   */
  private packFeaturesIntoTexture(analysisData: AudioFeatureData): void {
    // Clear texture data
    this.audioData.fill(0);
    
    // Pack features by time and feature index
    for (const mapping of this.featureMappings) {
      const stemFeatures = analysisData.features[mapping.stemType];
      if (!stemFeatures) continue;
      
      const featureData = this.extractFeatureData(stemFeatures, mapping.featureName);
      if (!featureData) continue;
      
      // Pack into texture: X = time, Y = feature row, RGBA = feature values
      const row = Math.floor(mapping.featureIndex / 4);
      const channel = mapping.featureIndex % 4;
      
      for (let timeIndex = 0; timeIndex < Math.min(this.textureWidth, featureData.length); timeIndex++) {
        const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
        const normalizedValue = this.normalizeValue(featureData[timeIndex], mapping.minValue, mapping.maxValue);
        this.audioData[textureIndex] = normalizedValue;
      }
    }
    
    this.audioTexture.needsUpdate = true;
  }
  
  /**
   * Extract specific feature data from stem features
   */
  private extractFeatureData(stemFeatures: number[], featureName: string): number[] | null {
    // This is a simplified extraction - in practice, you'd parse the actual feature data structure
    // For now, we'll use the stem features directly as if they're the requested feature
    return stemFeatures;
  }
  
  /**
   * Update time synchronization (called once per frame)
   */
  public updateTime(currentTime: number, duration: number): void {
    this.timeData[0] = currentTime;
    this.timeData[1] = duration;
    this.timeData[2] = currentTime / duration; // Normalized progress
    this.timeData[3] = 0; // Padding
    
    this.timeTexture.needsUpdate = true;
  }
  
  /**
   * Get shader uniforms for audio texture access
   */
  public getShaderUniforms(): Record<string, THREE.Uniform> {
    return {
      uAudioTexture: new THREE.Uniform(this.audioTexture),
      uFeatureTexture: new THREE.Uniform(this.featureTexture),
      uTimeTexture: new THREE.Uniform(this.timeTexture),
      uAudioTextureSize: new THREE.Uniform(new THREE.Vector2(this.textureWidth, this.textureHeight)),
      uFeatureTextureSize: new THREE.Uniform(new THREE.Vector2(4, this.textureHeight))
    };
  }
  
  /**
   * Generate shader code for audio feature access
   */
  public generateShaderCode(): string {
    return `
      uniform sampler2D uAudioTexture;
      uniform sampler2D uFeatureTexture;
      uniform sampler2D uTimeTexture;
      uniform vec2 uAudioTextureSize;
      uniform vec2 uFeatureTextureSize;
      
      float sampleAudioFeature(float featureIndex) {
        vec4 timeData = texture2D(uTimeTexture, vec2(0.5));
        float normalizedTime = timeData.z;
        
        float rowIndex = floor(featureIndex / 4.0);
        vec2 uv = vec2(normalizedTime, rowIndex / uAudioTextureSize.y);
        vec4 featureData = texture2D(uAudioTexture, uv);
        
        // Extract correct channel based on feature index
        float channelIndex = mod(featureIndex, 4.0);
        if (channelIndex < 0.5) return featureData.r;
        else if (channelIndex < 1.5) return featureData.g;
        else if (channelIndex < 2.5) return featureData.b;
        else return featureData.a;
      }
      
      float sampleAudioFeatureByName(float stemTypeHash, float featureNameHash) {
        // Find feature index by name (simplified - in practice you'd use a lookup table)
        for (float i = 0.0; i < uFeatureTextureSize.y; i++) {
          vec2 featureUv = vec2(0.5, (i + 0.5) / uFeatureTextureSize.y);
          vec4 featureInfo = texture2D(uFeatureTexture, featureUv);
          
          if (featureInfo.y == stemTypeHash && featureInfo.z == featureNameHash) {
            return sampleAudioFeature(featureInfo.x);
          }
        }
        return 0.0;
      }
    `;
  }
  
  /**
   * Get feature value by name (for debugging/testing)
   */
  public getFeatureValue(stemType: string, featureName: string): number {
    const key = `${stemType}-${featureName}`;
    const featureIndex = this.featureIndexMap.get(key);
    if (featureIndex === undefined) return 0;
    
    const row = Math.floor(featureIndex / 4);
    const channel = featureIndex % 4;
    const timeIndex = Math.floor(this.timeData[2] * this.textureWidth);
    const textureIndex = (timeIndex + row * this.textureWidth) * 4 + channel;
    
    return this.audioData[textureIndex] || 0;
  }
  
  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
  
  /**
   * Normalize value to 0-1 range
   */
  private normalizeValue(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }
  
  /**
   * Dispose of textures
   */
  public dispose(): void {
    this.audioTexture.dispose();
    this.featureTexture.dispose();
    this.timeTexture.dispose();
  }
}
</file>

<file path="src/lib/visualizer/core/MediaLayerManager.ts">
import * as THREE from 'three';

export interface MediaLayerConfig {
  id: string;
  type: 'canvas' | 'video' | 'image';
  source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  
  // Audio-reactive bindings
  audioBindings?: {
    feature: string;                    // 'drums-rms', 'bass-spectralCentroid'
    property: 'opacity' | 'scale' | 'rotation' | 'position';
    inputRange: [number, number];       // Audio feature range
    outputRange: [number, number];      // Visual property range
    blendMode: 'multiply' | 'add' | 'replace';
  }[];
  
  // Transform properties
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
}

export interface AudioFeatures {
  [key: string]: number;
}

export class MediaLayerManager {
  private mediaLayers: Map<string, MediaLayerConfig> = new Map();
  private layerMaterials: Map<string, THREE.ShaderMaterial> = new Map();
  private layerTextures: Map<string, THREE.Texture> = new Map();
  private layerMeshes: Map<string, THREE.Mesh> = new Map();
  
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera as THREE.OrthographicCamera;
    this.renderer = renderer;
  }
  
  /**
   * Add a media layer
   */
  public addMediaLayer(config: MediaLayerConfig): void {
    this.mediaLayers.set(config.id, config);
    
    // Create texture from media source
    const texture = this.createTextureFromSource(config.source, config.type);
    this.layerTextures.set(config.id, texture);
    
    // Create material with audio-reactive uniforms
    const material = this.createMaterial(config, texture);
    this.layerMaterials.set(config.id, material);
    
    // Create mesh
    const mesh = this.createMesh(config, material);
    this.layerMeshes.set(config.id, mesh);
    
    // Add to scene
    this.scene.add(mesh);
  }
  
  /**
   * Remove a media layer
   */
  public removeMediaLayer(id: string): void {
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.layerMeshes.delete(id);
    }
    
    const material = this.layerMaterials.get(id);
    if (material) {
      material.dispose();
      this.layerMaterials.delete(id);
    }
    
    const texture = this.layerTextures.get(id);
    if (texture) {
      texture.dispose();
      this.layerTextures.delete(id);
    }
    
    this.mediaLayers.delete(id);
  }
  
  /**
   * Update media layer with audio features
   * @deprecated Legacy method - effects now receive modulated parameters through the mapping system
   */
  public updateWithAudioFeatures(audioFeatures: AudioFeatures): void {
    for (const [id, config] of this.mediaLayers) {
      if (!config.audioBindings) continue;
      
      const material = this.layerMaterials.get(id);
      if (!material) continue;
      
      for (const binding of config.audioBindings) {
        const featureValue = audioFeatures[binding.feature];
        if (featureValue === undefined) continue;
        
        const mappedValue = this.mapRange(
          featureValue,
          binding.inputRange[0], binding.inputRange[1],
          binding.outputRange[0], binding.outputRange[1]
        );
        
        // Apply to shader uniforms
        switch (binding.property) {
          case 'opacity':
            material.uniforms.uOpacity.value = mappedValue;
            break;
          case 'scale':
            material.uniforms.uScale.value.set(mappedValue, mappedValue);
            break;
          case 'rotation':
            material.uniforms.uRotation.value = mappedValue;
            break;
          case 'position':
            material.uniforms.uPosition.value.set(
              config.position.x + mappedValue,
              config.position.y + mappedValue
            );
            break;
        }
      }
    }
  }
  
  /**
   * Update textures (for video elements)
   */
  public updateTextures(): void {
    for (const [id, texture] of this.layerTextures) {
      if (texture instanceof THREE.VideoTexture) {
        texture.needsUpdate = true;
      }
    }
  }
  
  /**
   * Create texture from media source
   */
  private createTextureFromSource(
    source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | string,
    type: string
  ): THREE.Texture {
    switch (type) {
      case 'video':
        if (typeof source === 'string') {
          const video = document.createElement('video');
          video.src = source;
          video.loop = true;
          video.muted = true;
          video.play();
          return new THREE.VideoTexture(video);
        } else if (source instanceof HTMLVideoElement) {
          return new THREE.VideoTexture(source);
        }
        break;
        
      case 'image':
        if (typeof source === 'string') {
          return new THREE.TextureLoader().load(source);
        } else if (source instanceof HTMLImageElement) {
          return new THREE.Texture(source);
        }
        break;
        
      case 'canvas':
        if (source instanceof HTMLCanvasElement) {
          return new THREE.CanvasTexture(source);
        }
        break;
    }
    
    // Fallback to a default texture
    return new THREE.Texture();
  }
  
  /**
   * Create material with audio-reactive uniforms
   */
  private createMaterial(config: MediaLayerConfig, texture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform vec2 uPosition;
        uniform vec2 uScale;
        uniform float uRotation;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // Apply scale
          pos.xy *= uScale;
          
          // Apply rotation
          float c = cos(uRotation);
          float s = sin(uRotation);
          mat2 rotationMatrix = mat2(c, -s, s, c);
          pos.xy = rotationMatrix * pos.xy;
          
          // Apply position
          pos.xy += uPosition;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uOpacity;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(texel.rgb, texel.a * uOpacity);
        }
      `,
      uniforms: {
        tDiffuse: new THREE.Uniform(texture),
        uOpacity: new THREE.Uniform(config.opacity),
        uPosition: new THREE.Uniform(new THREE.Vector2(config.position.x, config.position.y)),
        uScale: new THREE.Uniform(new THREE.Vector2(config.scale.x, config.scale.y)),
        uRotation: new THREE.Uniform(config.rotation)
      },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }
  
  /**
   * Create mesh for media layer
   */
  private createMesh(config: MediaLayerConfig, material: THREE.ShaderMaterial): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set initial transform
    mesh.position.set(config.position.x, config.position.y, -config.zIndex);
    mesh.scale.set(config.scale.x, config.scale.y, 1);
    mesh.rotation.z = config.rotation;
    
    return mesh;
  }
  
  /**
   * Map value from one range to another
   */
  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }
  
  /**
   * Get media layer by ID
   */
  public getMediaLayer(id: string): MediaLayerConfig | undefined {
    return this.mediaLayers.get(id);
  }
  
  /**
   * Get all media layer IDs
   */
  public getMediaLayerIds(): string[] {
    return [...this.mediaLayers.keys()];
  }
  
  /**
   * Update layer configuration
   */
  public updateLayerConfig(id: string, updates: Partial<MediaLayerConfig>): void {
    const config = this.mediaLayers.get(id);
    if (!config) return;
    
    Object.assign(config, updates);
    
    // Update material uniforms
    const material = this.layerMaterials.get(id);
    if (material) {
      if (updates.opacity !== undefined) {
        material.uniforms.uOpacity.value = updates.opacity;
      }
      if (updates.position !== undefined) {
        material.uniforms.uPosition.value.set(updates.position.x, updates.position.y);
      }
      if (updates.scale !== undefined) {
        material.uniforms.uScale.value.set(updates.scale.x, updates.scale.y);
      }
      if (updates.rotation !== undefined) {
        material.uniforms.uRotation.value = updates.rotation;
      }
    }
    
    // Update mesh transform
    const mesh = this.layerMeshes.get(id);
    if (mesh) {
      if (updates.position !== undefined) {
        mesh.position.set(updates.position.x, updates.position.y, -config.zIndex);
      }
      if (updates.scale !== undefined) {
        mesh.scale.set(updates.scale.x, updates.scale.y, 1);
      }
      if (updates.rotation !== undefined) {
        mesh.rotation.z = updates.rotation;
      }
      if (updates.zIndex !== undefined) {
        mesh.position.z = -updates.zIndex;
      }
    }
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    for (const [id] of this.mediaLayers) {
      this.removeMediaLayer(id);
    }
    
    this.mediaLayers.clear();
    this.layerMaterials.clear();
    this.layerTextures.clear();
    this.layerMeshes.clear();
  }
}
</file>

<file path="src/lib/visualizer/core/MultiLayerCompositor.ts">
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';

export interface LayerRenderTarget {
  id: string;
  renderTarget: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  camera: THREE.Camera;
  enabled: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add' | 'subtract';
  opacity: number;
  zIndex: number;
  material?: THREE.ShaderMaterial;
}

export interface CompositorConfig {
  width: number;
  height: number;
  enableAntialiasing?: boolean;
  pixelRatio?: number;
}

export class MultiLayerCompositor {
  private renderer: THREE.WebGLRenderer;
  private config: CompositorConfig;
  
  // Layer management
  private layers: Map<string, LayerRenderTarget> = new Map();
  private layerOrder: string[] = [];
  
  // Render targets
  private mainRenderTarget: THREE.WebGLRenderTarget;
  private tempRenderTarget: THREE.WebGLRenderTarget;
  private accumulationTargets: Map<string, THREE.WebGLRenderTarget> = new Map();
  
  // Shared geometry for full-screen rendering
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  
  // Blend mode shaders
  private blendShaders: Map<string, string> = new Map();

  // Post-processing
  private postProcessingComposer!: EffectComposer;
  private texturePass!: TexturePass;
  private fxaaPass?: ShaderPass;
  
  constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
    this.renderer = renderer;
    this.config = {
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...config
    };
    
    // Ensure transparent clearing for all off-screen targets
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    this.mainRenderTarget = this.createRenderTarget();
    this.tempRenderTarget = this.createRenderTarget();
    
    // Create shared geometry and camera
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Initialize blend mode shaders
    this.initializeBlendShaders();

    // Initialize post-processing (bloom, etc.)
    this.initializePostProcessing();
  }
  
  /**
   * Create a new layer
   */
  public createLayer(
    id: string,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: Partial<Omit<LayerRenderTarget, 'id' | 'scene' | 'camera'>> = {}
  ): LayerRenderTarget {
    const renderTarget = this.createRenderTarget();
    
    const layer: LayerRenderTarget = {
      id,
      renderTarget,
      scene,
      camera,
      enabled: true,
      blendMode: 'normal',
      opacity: 1.0,
      zIndex: 0,
      ...options
    };
    
    this.layers.set(id, layer);
    this.layerOrder.push(id);
    this.sortLayers();
    
    return layer;
  }

  /**
   * Create a render target with standard configuration
   */
  private createRenderTarget(): THREE.WebGLRenderTarget {
    const RTClass: any = THREE.WebGLRenderTarget;
    return new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        samples: 4
      }
    );
  }
  
  /**
   * Remove a layer
   */
  public removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.renderTarget.dispose();
      this.layers.delete(id);
      this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
    }
    
    const accTarget = this.accumulationTargets.get(id);
    if (accTarget) {
      accTarget.dispose();
      this.accumulationTargets.delete(id);
    }
  }
  
  /**
   * Update layer properties
   */
  public updateLayer(id: string, updates: Partial<LayerRenderTarget>): void {
    const layer = this.layers.get(id);
    if (layer) {
      Object.assign(layer, updates);
      if (updates.zIndex !== undefined) {
        this.sortLayers();
      }
    }
  }
  
  /**
   * Sort layers by z-index
   */
  private sortLayers(): void {
    this.layerOrder.sort((a, b) => {
      const layerA = this.layers.get(a);
      const layerB = this.layers.get(b);
      return (layerA?.zIndex || 0) - (layerB?.zIndex || 0);
    });
  }
  
  /**
   * Main render method
   */
  public render(): void {
    // Step 1: Render each layer to its render target
    let renderedLayers = 0;
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      // Debug: Check if scene has objects
      const objectCount = layer.scene.children.length;
      if (renderedLayers < 10) { // Show more layers
        console.log(`🎨 [MultiLayerCompositor] Rendering layer ${layerId}:`, {
          enabled: layer.enabled,
          objectCount,
          children: layer.scene.children.map(c => c.type),
          zIndex: layer.zIndex
        });
      }
      
      this.renderer.setRenderTarget(layer.renderTarget);
      // Clear color/depth/stencil with transparent background
      this.renderer.clear(true, true, true);
      this.renderer.render(layer.scene, layer.camera);
      renderedLayers++;
    }
    
    if (renderedLayers === 0) {
      console.warn('⚠️ [MultiLayerCompositor] No layers rendered!');
    }
    
    // Step 2: Composite layers using GPU shaders
    this.compositeLayersToMain();
    
    // Step 3: Post-processing chain and final output
    // Update the texture pass input to the composited target
    this.texturePass.map = this.mainRenderTarget.texture;
    
    // Save autoClear state and disable it temporarily
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    
    this.renderer.setRenderTarget(null);
    
    // CRITICAL: Clear canvas with transparency before post-processing renders
    this.renderer.clear(true, true, true);
    
    this.postProcessingComposer.render();
    
    // Restore autoClear state
    this.renderer.autoClear = autoClear;
  }
  
  /**
   * Composite all layers to main render target
   */
  private compositeLayersToMain(): void {
    // 1. Save the renderer's current autoClear state
    const autoClear = this.renderer.autoClear;
    // 2. CRITICAL: Disable auto clearing for the compositing process
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(this.mainRenderTarget);
    
    // 3. Perform a single, manual clear at the very beginning
    this.renderer.clear(true, true, true);
    
    // 4. Composite layers in order. Now, each render will draw ON TOP of the previous one.
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      this.renderLayerWithBlending(layer);
    }

    // 5. Restore the original autoClear state for other rendering operations
    this.renderer.autoClear = autoClear;
  }
  
  /**
   * Render a single layer with blending
   */
  private renderLayerWithBlending(layer: LayerRenderTarget): void {
    const blendShader = this.getBlendModeShader(layer.blendMode);
    
    // Determine THREE.js blending mode based on layer blend mode
    let blendMode: THREE.Blending = THREE.NormalBlending;
    if (layer.blendMode === 'add') {
      blendMode = THREE.AdditiveBlending as THREE.Blending;
    } else if (layer.blendMode === 'multiply') {
      blendMode = THREE.MultiplyBlending as THREE.Blending;
    } else if (layer.blendMode === 'screen') {
      blendMode = THREE.CustomBlending as THREE.Blending;
    }
    
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: blendShader,
      uniforms: {
        tDiffuse: new THREE.Uniform(layer.renderTarget.texture),
        opacity: new THREE.Uniform(layer.opacity)
      },
      transparent: true,
      blending: blendMode,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true // CRITICAL FIX: Changed from false to true for proper alpha blending
    });
    
    const mesh = new THREE.Mesh(this.quadGeometry, material);
    const scene = new THREE.Scene();
    scene.background = null; // Ensure transparent background
    scene.add(mesh);
    
    this.renderer.render(scene, this.quadCamera);
    
    // Cleanup
    material.dispose();
    mesh.geometry.dispose();
  }
  
  // Initialize post-processing chain
  private initializePostProcessing(): void {
    // Create EffectComposer with alpha support
    const renderTarget = new THREE.WebGLRenderTarget(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false,
        stencilBuffer: false,
        depthBuffer: false
      }
    );
    
    this.postProcessingComposer = new EffectComposer(this.renderer, renderTarget);
    
    // CRITICAL: Prevent EffectComposer from clearing our transparent background
    this.postProcessingComposer.renderToScreen = true;
    
    // Feed the composited texture into the composer
    this.texturePass = new TexturePass(this.mainRenderTarget.texture);
    
    // Configure TexturePass material for alpha transparency
    if (this.texturePass.material) {
      this.texturePass.material.transparent = true;
      this.texturePass.material.blending = THREE.NormalBlending;
      this.texturePass.material.depthTest = false;
      this.texturePass.material.depthWrite = false;
    }
    
    this.postProcessingComposer.addPass(this.texturePass);

    // FXAA to reduce aliasing on lines and sprite edges
    // CRITICAL FIX: Create alpha-preserving version of FXAAShader
    const AlphaPreservingFXAAShader = {
      uniforms: THREE.UniformsUtils.clone(FXAAShader.uniforms), // Properly clone uniforms as THREE.Uniform objects
      vertexShader: FXAAShader.vertexShader,
      fragmentShader: FXAAShader.fragmentShader.replace(
        // The original shader discards alpha. Find this line:
        'gl_FragColor = vec4( rgb, luma );',
        // And replace it with a version that preserves the original alpha:
        'gl_FragColor = vec4( rgb, texture2D( tDiffuse, vUv ).a );'
      )
    };
    
    // Use the alpha-preserving shader
    this.fxaaPass = new ShaderPass(AlphaPreservingFXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.uniforms['resolution'].value.set(1 / (this.config.width * pixelRatio), 1 / (this.config.height * pixelRatio));
    
    // Critical: Configure FXAA pass material to preserve alpha
    if (this.fxaaPass.material) {
      this.fxaaPass.material.transparent = true;
      this.fxaaPass.material.blending = THREE.NormalBlending;
      this.fxaaPass.material.depthTest = false;
      this.fxaaPass.material.depthWrite = false;
    }
    
    this.postProcessingComposer.addPass(this.fxaaPass);
  }
  
  /**
   * Initialize blend mode shaders
   */
  private initializeBlendShaders(): void {
    this.blendShaders.set('normal', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('multiply', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb * texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('screen', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(1.0 - (1.0 - texel.rgb) * (1.0 - texel.rgb), texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('overlay', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 base = vec3(0.5);
        vec3 overlay = mix(
          2.0 * base * texel.rgb, 
          1.0 - 2.0 * (1.0 - base) * (1.0 - texel.rgb), 
          step(0.5, base)
        );
        gl_FragColor = vec4(overlay, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('add', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(texel.rgb + texel.rgb, texel.a * opacity);
      }
    `);
    
    this.blendShaders.set('subtract', `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      varying vec2 vUv;
      
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(max(texel.rgb - texel.rgb, 0.0), texel.a * opacity);
      }
    `);
  }
  
  /**
   * Get blend mode shader
   */
  private getBlendModeShader(blendMode: string): string {
    return this.blendShaders.get(blendMode) || this.blendShaders.get('normal')!;
  }
  
  /**
   * Get layer by ID
   */
  public getLayer(id: string): LayerRenderTarget | undefined {
    return this.layers.get(id);
  }
  
  /**
   * Get all layer IDs
   */
  public getLayerIds(): string[] {
    return [...this.layerOrder];
  }

  /**
   * Get the accumulated texture from all layers before a specific layer
   * This composites all layers up to (but not including) the target layer
   * 
   * FIXED: Uses a unique render target for each requesting layer ID.
   * This prevents feedback loops where multiple layers sharing 'tempRenderTarget'
   * overwrite each other's input textures within the same frame.
   */
  public getAccumulatedTextureBeforeLayer(layerId: string): THREE.Texture | null {
    const targetIndex = this.layerOrder.indexOf(layerId);
    if (targetIndex === -1 || targetIndex === 0) {
      // Layer not found or it's the first layer, return null (no previous layers)
      return null;
    }

    let accumulationTarget = this.accumulationTargets.get(layerId);
    if (!accumulationTarget) {
      accumulationTarget = this.createRenderTarget();
      this.accumulationTargets.set(layerId, accumulationTarget);
    }

    const previousRenderTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(accumulationTarget);
    this.renderer.clear(true, true, true);

    for (let i = 0; i < targetIndex; i++) {
      const prevLayerId = this.layerOrder[i];
      const layer = this.layers.get(prevLayerId);
      if (!layer || !layer.enabled) continue;
      this.renderLayerWithBlending(layer);
    }

    this.renderer.setRenderTarget(previousRenderTarget);
    this.renderer.autoClear = autoClear;

    return accumulationTarget.texture;
  }
  
  /**
   * Resize render targets
   */
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    // Resize all render targets
    this.mainRenderTarget.setSize(width, height);
    this.tempRenderTarget.setSize(width, height);
    for (const target of this.accumulationTargets.values()) {
      target.setSize(width, height);
    }
    
    // Resize layer render targets
    for (const layer of this.layers.values()) {
      layer.renderTarget.setSize(width, height);
    }

    // Resize post-processing
    if (this.postProcessingComposer) {
      this.postProcessingComposer.setSize(width, height);
    }
    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      (this.fxaaPass.uniforms as any).resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
    }
  }
  
  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.mainRenderTarget.dispose();
    this.tempRenderTarget.dispose();
    
    for (const layer of this.layers.values()) {
      layer.renderTarget.dispose();
    }
    
    for (const target of this.accumulationTargets.values()) {
      target.dispose();
    }
    this.accumulationTargets.clear();
    
    this.quadGeometry.dispose();
    this.layers.clear();
    this.layerOrder = [];
  }
}
</file>

<file path="src/lib/visualizer/core/VisualizerManager.ts">
import * as THREE from 'three';
import { getRemotionEnvironment } from 'remotion';
import { VisualEffect, VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualizerControls } from '@/types/visualizer';
import { MultiLayerCompositor } from './MultiLayerCompositor';
import { VisualizationPreset } from '@/types/stem-visualization';
import { debugLog } from '@/lib/utils';
import { AudioTextureManager, AudioFeatureData } from './AudioTextureManager';
import { MediaLayerManager } from './MediaLayerManager';

export class VisualizerManager {
  private static instanceCounter = 0;
  private instanceId: number;
  
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  
  private effects: Map<string, VisualEffect> = new Map();
  private isPlaying = false;
  private lastTime = 0;
  
  // FIX: Add state to hold timeline data
  private timelineLayers: any[] = [];
  private timelineCurrentTime: number = 0;
  
  // Deterministic rendering state
  private currentFrame: number = 0;
  private currentFPS: number = 60;
  private deterministicTime: number = 0;
  
  // Audio analysis
  private audioContext: AudioContext | null = null;
  private audioSources: AudioBufferSourceNode[] = [];
  private currentAudioBuffer: AudioBuffer | null = null;
  
  // Layered compositor
  private multiLayerCompositor!: MultiLayerCompositor;
  
  // Background color layer
  private backgroundMaterial!: THREE.MeshBasicMaterial;
  private backgroundMesh!: THREE.Mesh;
  
  // GPU compositing system
  private audioTextureManager: AudioTextureManager | null = null;
  private mediaLayerManager: MediaLayerManager | null = null;
  
  // Performance monitoring
  private frameCount = 0;
  private debugFrameCount = 0; // Separate counter for debug logging
  private fps = 60;
  private lastFPSUpdate = 0;
  private consecutiveSlowFrames = 0;
  private maxSlowFrames = 10; // Emergency pause after 10 consecutive slow frames
  
  // Visualization parameters
  private visualParams = {
    globalScale: 1.0,
    rotationSpeed: 0.0,
    colorIntensity: 1.0,
    emissionIntensity: 1.0,
    positionOffset: 0.0,
    heightScale: 1.0,
    hueRotation: 0.0,
    brightness: 1.0,
    complexity: 0.5,
    particleSize: 1.0,
    opacity: 1.0,
    animationSpeed: 1.0,
    particleCount: 5000
  };
  
  constructor(canvas: HTMLCanvasElement, config: VisualizerConfig) {
    debugLog.log('🎭 VisualizerManager constructor called');
    this.instanceId = ++VisualizerManager.instanceCounter;
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    
    this.initScene(config);
    this.setupEventListeners();
    this.initCompositor(config);
    this.initAudioTextureManager();
    this.initMediaLayerManager();
    debugLog.log('🎭 VisualizerManager constructor complete');
  }
  
  private initScene(config: VisualizerConfig) {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background for proper layer compositing
    this.scene.fog = new THREE.Fog(0x000000, 10, 50);
    
      // Camera setup - use aspect ratio from config if available, otherwise use 1:1
  const initialAspectRatio = config.aspectRatio 
    ? config.aspectRatio.width / config.aspectRatio.height 
    : 1; // Default to square aspect ratio
  
  this.camera = new THREE.PerspectiveCamera(
    75,
    initialAspectRatio,
    0.1,
    1000
  );
    this.camera.position.set(0, 0, 5);
    
    // Renderer setup with error handling and fallbacks
    // Detect if we are currently rendering a video or still
    const isRendering = getRemotionEnvironment().isRendering;
    
    try {
      // First, check if canvas already has a context to avoid conflicts
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !isRendering, // Disable AA during software render for speed
        alpha: true,
        // CRITICAL: Only true during Remotion rendering
        preserveDrawingBuffer: isRendering,
        powerPreference: isRendering ? 'high-performance' : 'default',
        failIfMajorPerformanceCaveat: false // Allow software rendering
      });
      
      // Verify WebGL context was created successfully
      const gl = this.renderer.getContext();
      if (!gl) {
        throw new Error('Failed to create WebGL context. WebGL may not be supported in this environment.');
      }
      
      // Log context version for debugging
      const isWebGL2 = gl instanceof WebGL2RenderingContext;
      debugLog.log('✅ WebGL Renderer created successfully');
      debugLog.log('🔧 WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      debugLog.log('🎬 Remotion rendering mode:', isRendering);
    } catch (error) {
      debugLog.error('❌ Primary WebGL renderer failed:', error);
      
      // Try minimal fallback settings
      try {
        debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: !isRendering,
          alpha: true,
          preserveDrawingBuffer: isRendering,
          powerPreference: isRendering ? 'high-performance' : 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        
        // Verify fallback context was created
        const fallbackGl = this.renderer.getContext();
        if (!fallbackGl) {
          throw new Error('Fallback renderer failed to create WebGL context');
        }
        
        const isWebGL2 = fallbackGl instanceof WebGL2RenderingContext;
        debugLog.log('✅ Fallback renderer created successfully');
        debugLog.log('🔧 Fallback WebGL Context:', isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      } catch (fallbackError) {
        debugLog.error('❌ Fallback renderer also failed:', fallbackError);
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`WebGL initialization failed: ${errorMessage}. This may indicate a headless rendering environment issue. Check remotion.config.ts for GL backend settings.`);
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    // Fix: Handle headless/server environments where window.devicePixelRatio doesn't exist
    const devicePixelRatio = typeof window !== 'undefined' && window.devicePixelRatio 
      ? window.devicePixelRatio 
      : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, config.canvas.pixelRatio || 1));
    // Fix: Use opaque background for Remotion rendering
    // Transparent backgrounds can appear black in video output if not composited properly
    // Use a dark background that will show content properly
    this.renderer.setClearColor(0x000000, 1); // Opaque black background for video rendering
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    debugLog.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
    debugLog.log('🎮 Renderer configured with size:', config.canvas.width, 'x', config.canvas.height);
    
    // Performance optimizations for 30fps
    this.renderer.setAnimationLoop(null); // Use manual RAF control
    this.renderer.info.autoReset = false; // Manual reset for performance monitoring
    
    // Enable tone mapping for better color reproduction
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Disable shadows for better performance
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initCompositor(config: VisualizerConfig) {
    this.multiLayerCompositor = new MultiLayerCompositor(this.renderer, {
      width: config.canvas.width,
      height: config.canvas.height,
      enableAntialiasing: true,
      pixelRatio: Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2)
    });
    
    // --- START: BACKGROUND COLOR LAYER IMPLEMENTATION ---
    // Create a dedicated scene for the background color
    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Create a material we can control. Start with black.
    this.backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    // Create a full-screen quad
    this.backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backgroundMaterial);
    backgroundScene.add(this.backgroundMesh);
    
    // Add it to the compositor with a very low zIndex (-100) so it renders first
    this.multiLayerCompositor.createLayer('backgroundColor', backgroundScene, backgroundCamera, {
      zIndex: -100,
      enabled: true
    });
    // --- END: BACKGROUND COLOR LAYER IMPLEMENTATION ---
    
    // Add base scene as background layer (change zIndex to be above the color layer)
    this.multiLayerCompositor.createLayer('base', this.scene, this.camera, { zIndex: -1, enabled: true });
  }

  private initAudioTextureManager() {
    this.audioTextureManager = new AudioTextureManager();
    debugLog.log('🎵 AudioTextureManager initialized');
  }

  private initMediaLayerManager() {
    this.mediaLayerManager = new MediaLayerManager(this.scene, this.camera, this.renderer);
    debugLog.log('🎬 MediaLayerManager initialized');
  }
  
  private async initAudioAnalyzer() {
    if (!this.audioContext) {
      debugLog.log('🎵 Creating AudioContext after user interaction...');
      this.audioContext = new AudioContext();
      // Resume the context to ensure it's active
      await this.audioContext.resume();
    }
    
    try {
      // This method is no longer used as AudioAnalyzer is removed.
      // Keeping it for now to avoid breaking existing calls, but it will be removed.
      debugLog.log('🎵 Audio analyzer initialization (placeholder)');
    } catch (error) {
      debugLog.error('❌ Failed to initialize audio analyzer:', error);
    }
  }
  
  private setupEventListeners() {
    // Handle window resize
    const handleResize = () => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;
      
      // Use the new responsive resize method
      this.handleViewportResize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Handle visibility change (pause when not visible)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        this.pause();
      }
    });
    
    // Handle WebGL context lost/restored
    this.canvas.addEventListener('webglcontextlost', (event) => {
      debugLog.warn('⚠️ WebGL context lost!');
      event.preventDefault();
      this.pause(); // Stop rendering
    });
    
    this.canvas.addEventListener('webglcontextrestored', () => {
      debugLog.log('✅ WebGL context restored, reinitializing...');
      // Context restoration would require reinitializing all GPU resources
      // For now, we'll just log and suggest a page refresh
      debugLog.log('🔄 Please refresh the page to restore full functionality');
    });
  }
  
  // Effect management
  public addEffect(layerId: string, effect: VisualEffect) {
    debugLog.log(`➕ [VisualizerManager] Adding effect: ${layerId}, type: ${effect.constructor.name}`);
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (for layer ${layerId})`);
      effect.init(this.renderer);
      
      // If this is an ASCII filter effect, set the compositor reference
      // Check by class name or if setCompositor method exists
      if ('setCompositor' in effect && typeof (effect as any).setCompositor === 'function') {
        debugLog.log(`🔗 [VisualizerManager] Setting compositor for effect: ${effect.name} (${effect.id})`);
        (effect as any).setCompositor(this.multiLayerCompositor, layerId);
      }
      
      this.effects.set(layerId, effect);
      // Register a layer for this effect using the unique layerId
      this.multiLayerCompositor.createLayer(layerId, effect.getScene(), effect.getCamera(), {
        zIndex: this.effects.size,
        enabled: effect.enabled
      });
      
      debugLog.log(`✅ Added effect: ${effect.name}. Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name}:`, error);
    }
  }
  
  public addEffectWithId(effect: VisualEffect, customId: string) {
    try {
      debugLog.log(`🎨 Adding effect with custom ID: ${effect.name} (${customId})`);
      // Don't call init again - effect is already initialized by addEffect()
      // Just add the reference with the custom ID
      this.effects.set(customId, effect);
      
      debugLog.log(`✅ Added effect reference with custom ID: ${effect.name} (${customId}). Total effects: ${this.effects.size}`);
    } catch (error) {
      debugLog.error(`❌ Failed to add effect ${effect.name} with custom ID ${customId}:`, error);
    }
  }
  
  public removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.destroy();
      this.effects.delete(effectId);
      this.multiLayerCompositor.removeLayer(effectId);
      debugLog.log(`✅ Removed effect and compositor layer: ${effect.name}. Remaining effects: ${this.effects.size}`);
    }
  }
  
  getEffect(effectId: string): VisualEffect | undefined {
    return this.effects.get(effectId);
  }
  
  getAllEffects(): VisualEffect[] {
    return Array.from(this.effects.values());
  }

  // Get all layer IDs that have a specific effect type
  getLayerIdsByEffectType(effectType: string): string[] {
    const layerIds: string[] = [];
    this.effects.forEach((effect, layerId) => {
      if (effect.id === effectType) {
        layerIds.push(layerId);
      }
    });
    return layerIds;
  }

  // Get the first effect instance of a specific type (for parameter inspection)
  getEffectByType(effectType: string): VisualEffect | undefined {
    for (const [_, effect] of this.effects) {
      if (effect.id === effectType) {
        return effect;
      }
    }
    return undefined;
  }
  
  enableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = true;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: true });
      debugLog.log(`✅ Enabled effect: ${effect.name} (${effectId})`);
    } else {
      debugLog.warn(`⚠️ Effect not found: ${effectId}`);
    }
  }
  
  disableEffect(effectId: string): void {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.enabled = false;
      this.multiLayerCompositor.updateLayer(effectId, { enabled: false });
      debugLog.log(`❌ Disabled effect: ${effect.name} (${effectId})`);
    }
  }
  
  // Legacy show/hide helpers removed; layers are toggled via compositor
  
  // Playback control
  play(): void {
    // Don't start animation loop if we're in Remotion rendering mode
    // Remotion handles frame-by-frame rendering, we don't need RAF loop
    const isRendering = getRemotionEnvironment().isRendering;
    if (isRendering) {
      debugLog.log(`🎬 Play() called during Remotion rendering - animation loop disabled`);
      return;
    }
    
    debugLog.log(`🎬 Play() called. Current state: isPlaying=${this.isPlaying}, effects=${this.effects.size}`);
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.clock.start();
      this.animate();
      debugLog.log(`🎬 Animation started`);
      
      // Start audio playback
      this.audioSources.forEach((source, index) => {
        try {
          source.start(0);
          debugLog.log(`🎵 Started audio source ${index}`);
        } catch (error) {
          debugLog.warn(`⚠️ Audio source ${index} already playing or ended`);
        }
      });
    }
  }
  
  pause(): void {
    this.isPlaying = false;
    this.clock.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Stop audio playback
    this.audioSources.forEach((source, index) => {
      try {
        source.stop();
        debugLog.log(`🎵 Stopped audio source ${index}`);
      } catch (error) {
        debugLog.warn(`⚠️ Audio source ${index} already stopped`);
      }
    });
  }
  
  stop(): void {
    this.pause();
    this.clock.elapsedTime = 0;
  }
  
  /**
   * Frame-based update method for Remotion compatibility.
   * This is the "Single Source of Truth" for time and seeds.
   * Calculates deterministic time from frame number and FPS.
   * @param frame - Current frame number from Remotion
   * @param fps - Frames per second from Remotion
   */
  public update(frame: number, fps: number): void {
    this.currentFrame = frame;
    this.currentFPS = fps;
    
    // Calculate deterministic time: frame / fps
    // This ensures the same frame always produces the same time, regardless of environment
    const timeInSeconds = frame / fps;
    this.deterministicTime = timeInSeconds;
    
    // Update timeline current time to match
    this.timelineCurrentTime = timeInSeconds;
    
    // 1. Sync all shaders to the EXACT frame-time
    this.effects.forEach((effect, layerId) => {
      // Set uTime directly (not incrementing) for deterministic behavior
      // Check if effect has uniforms property (BaseShaderEffect and custom effects)
      if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
        (effect as any).uniforms.uTime.value = timeInSeconds;
      }
      
      // Use the frame number as a seed for any CPU-side randomness
      if ('setSeed' in effect && typeof (effect as any).setSeed === 'function') {
        (effect as any).setSeed(frame);
      }
      
      // Update effect with deterministic time
      // Pass absolute time instead of deltaTime for deterministic updates
      if (typeof (effect as any).updateWithTime === 'function') {
        (effect as any).updateWithTime(timeInSeconds);
      } else {
        // Fallback: use deltaTime of 1/fps for effects that haven't been updated yet
        effect.update(1 / fps);
      }
    });
    
    // 2. Handle stateful/ping-pong effects that need warm-up
    if (getRemotionEnvironment().isRendering && frame > 0) {
      // For effects that depend on previous frames (like water ripples simulation),
      // we may need to warm up the simulation by running previous frames
      // This is only needed for effects that maintain state between frames
      // Most shader effects are stateless and don't need this
    }
  }

  /**
   * Frame-based rendering method for Remotion compatibility.
   * This method can be called explicitly with a specific time and deltaTime,
   * decoupling rendering from the browser clock.
   * @param time - Current time in milliseconds (replaces performance.now())
   * @param deltaTime - Time delta in seconds (replaces clock.getDelta())
   * @deprecated Use update(frame, fps) for deterministic rendering. This method is kept for backward compatibility.
   */
  public renderFrame(time: number, deltaTime: number): void {
    // Note: timelineCurrentTime is managed by updateTimelineState() called from
    // ThreeVisualizer.tsx (Live Mode) and RayboxComposition.tsx (Remotion).
    // We should NOT override it here with system time, as that causes layers to
    // disappear when the page has been open longer than the layer's duration.

    // In live editor mode, use the provided time/deltaTime
    // In Remotion mode, use the deterministic time from update()
    const isRendering = getRemotionEnvironment().isRendering;
    const effectiveTime = isRendering ? this.deterministicTime : time / 1000;
    
    // Update all enabled effects
    let activeEffectCount = 0;
    
    // Debug: Log effect and timeline state
    if (this.effects.size === 0) {
      debugLog.warn('⚠️ [VisualizerManager] No effects registered. Effects count:', this.effects.size);
    }
    
    if (this.timelineLayers.length === 0) {
      debugLog.warn('⚠️ [VisualizerManager] No timeline layers. Timeline layers count:', this.timelineLayers.length);
    }
    
    this.effects.forEach((effect, layerId) => {
      // Find the corresponding layer from the timeline state using the correct key
      const effectLayer = this.timelineLayers.find(l => l.id === layerId);

      // Determine if the layer should be active.
      const isLayerActive = effect.enabled && effectLayer 
        ? (this.timelineCurrentTime >= effectLayer.startTime && this.timelineCurrentTime <= effectLayer.endTime)
        : false;

      // Debug logging for first few frames
      if (this.debugFrameCount < 5 && effectLayer) {
        debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Layer ${layerId}:`, {
          enabled: effect.enabled,
          currentTime: this.timelineCurrentTime,
          startTime: effectLayer.startTime,
          endTime: effectLayer.endTime,
          isActive: isLayerActive
        });
      }

      // Update the compositor's render state for this layer
      this.multiLayerCompositor.updateLayer(layerId, { enabled: isLayerActive });

      // Run the effect's update logic if it's active
      if (isLayerActive) {
          activeEffectCount++;
          
          try {
            // In Remotion mode, use deterministic time
            // In live editor mode, use deltaTime for smooth animation
            if (isRendering && this.deterministicTime !== undefined) {
              // Set uTime directly for deterministic behavior
              // Check if effect has uniforms property
              if ('uniforms' in effect && effect.uniforms && (effect as any).uniforms.uTime) {
                (effect as any).uniforms.uTime.value = this.deterministicTime;
              }
              // Use updateWithTime if available, otherwise fallback to update
              if (typeof (effect as any).updateWithTime === 'function') {
                (effect as any).updateWithTime(this.deterministicTime);
              } else {
                effect.update(deltaTime);
              }
            } else {
              // Live editor: use deltaTime for smooth animation
              effect.update(deltaTime);
            }
          } catch (error) {
            debugLog.error(`❌ Effect ${layerId} update failed:`, error);
          }
      }
    });
    
    if (this.debugFrameCount < 5) {
      debugLog.log(`🎬 [Frame ${this.debugFrameCount}] Active effects: ${activeEffectCount}, Total effects: ${this.effects.size}, Timeline time: ${this.timelineCurrentTime.toFixed(3)}s`);
    }
    
    this.debugFrameCount++;
    
    // Update GPU audio texture system
    if (this.audioTextureManager && this.currentAudioData) {
      // Convert audio analysis to GPU texture format using existing structure
      const audioFeatureData: AudioFeatureData = {
        features: {
          'main': [this.currentAudioData.volume, this.currentAudioData.bass, this.currentAudioData.mid, this.currentAudioData.treble]
        },
        duration: 0, // Will be set when real audio is loaded
        sampleRate: 44100,
        stemTypes: ['main']
      };
      
      // Update audio texture with timeline position (not system time)
      // This ensures audio sampling matches the track position, not page uptime
      this.audioTextureManager.updateTime(this.timelineCurrentTime, 0); // Note: duration is 0 here, fine for now or pass actual duration if available
    }
    
    // Update media layer textures (for video elements)
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateTextures();
    }
    
    // Render all layers via compositor
    this.multiLayerCompositor.render();
  }

  private animate = () => {
    if (!this.isPlaying) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    // IMPLEMENT 30FPS CAP - Much more reasonable for audio-visual sync
    const now = performance.now();
    const elapsed = now - this.lastTime;
    const targetFrameTime = 1000 / 30; // 33.33ms for 30fps
    
    if (elapsed < targetFrameTime) {
      return; // Skip this frame to maintain 30fps cap
    }
    
    // Only skip frames if we're severely behind (emergency performance protection)
    const frameTime = elapsed;
    if (frameTime > 100) { // If frame takes more than 100ms (10fps), skip next frame
      this.consecutiveSlowFrames++;
      
      // Emergency pause if too many consecutive slow frames
      if (this.consecutiveSlowFrames >= this.maxSlowFrames) {
        debugLog.error(`🚨 Emergency pause: ${this.maxSlowFrames} consecutive slow frames detected. Pausing to prevent browser freeze.`);
        this.pause();
        // Suggest recovery action
        setTimeout(() => {
          debugLog.log('💡 Tip: Try refreshing the page or closing other browser tabs to improve performance.');
        }, 1000);
        return;
      }
      
      this.lastTime = now;
      return;
    } else {
      this.consecutiveSlowFrames = 0; // Reset counter on good frame
    }
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time to prevent large jumps
    const currentTime = now;
    
    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.lastFPSUpdate > 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
      this.frameCount = 0;
      this.lastFPSUpdate = currentTime;
    }
    
    // Performance monitoring - check memory usage
    if (this.frameCount % 300 === 0) { // Every 10 seconds at 30fps
      const memInfo = this.getMemoryUsage();
      if (memInfo.geometries > 100 || memInfo.textures > 50) {
        debugLog.warn(`⚠️ High memory usage detected: ${memInfo.geometries} geometries, ${memInfo.textures} textures`);
      }
    }
    
    // Call renderFrame with calculated time and deltaTime
    this.renderFrame(currentTime, deltaTime);
    
    this.lastTime = currentTime;
  };
  
  /**
   * FIX: Public method to synchronize the visualizer with the timeline's state.
   * This should be called from a useEffect hook in the UI.
   */
  public updateTimelineState(layers: any[], currentTime: number): void {
    this.timelineLayers = layers;
    this.timelineCurrentTime = currentTime;

    // Sync layer z-indices from timeline to compositor
    if (this.multiLayerCompositor) {
      layers.forEach(layer => {
        if (typeof layer.zIndex === 'number') {
          // The compositor handles re-sorting internally when zIndex is updated
          this.multiLayerCompositor.updateLayer(layer.id, { zIndex: layer.zIndex });
        }
      });
    }
  }
  
  // Update methods for real data
  updateMIDIData(midiData: LiveMIDIData): void {
    // Store MIDI data to be used in next animation frame
    this.currentMidiData = midiData;
    debugLog.log('🎵 MIDI data received:', midiData);
  }

  updateAudioData(audioData: AudioAnalysisData): void {
    // Store audio data to be used in next animation frame
    this.currentAudioData = audioData;
    debugLog.log('🎵 Audio data received:', audioData);
  }

  /**
   * Public method to manually set audio data (for Remotion frame-based rendering)
   * @param data - AudioAnalysisData to set
   */
  public setAudioData(data: AudioAnalysisData): void {
    this.currentAudioData = data;
  }
  
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    // Try to get effect by layer ID first
    let effect = this.effects.get(effectId);
    
    // Debug logging for metaballs specifically
    const isMetaballs = effectId === 'layer-1765752490965';
    
    // If not found, assume effectId is an effect type (like 'metaballs')
    // and update ALL instances of that effect type
    if (!effect) {
      const layerIds = this.getLayerIdsByEffectType(effectId);
      if (layerIds.length > 0) {
        // Update all instances of this effect type
        layerIds.forEach(layerId => {
          const effectInstance = this.effects.get(layerId);
          if (effectInstance && effectInstance.parameters.hasOwnProperty(paramName)) {
            const oldValue = (effectInstance.parameters as any)[paramName];
            (effectInstance.parameters as any)[paramName] = value;
            if (isMetaballs) {
              debugLog.log('🔧 [VisualizerManager] Updated effect parameter (by type):', {
                effectId,
                layerId,
                paramName,
                oldValue,
                newValue: value,
                hasUpdateMethod: typeof (effectInstance as any).updateParameter === 'function',
              });
            }
            if (typeof (effectInstance as any).updateParameter === 'function') {
              (effectInstance as any).updateParameter(paramName, value);
            }
          } else if (isMetaballs) {
            debugLog.warn('🔧 [VisualizerManager] Parameter not found (by type):', {
              effectId,
              layerId,
              paramName,
              availableParams: effectInstance ? Object.keys(effectInstance.parameters) : [],
            });
          }
        });
        return;
      }
      if (isMetaballs) {
        debugLog.warn(`🔧 [VisualizerManager] Effect ${effectId} not found (neither as layer ID nor effect type)`);
      }
      debugLog.warn(`⚠️ Effect ${effectId} not found (neither as layer ID nor effect type)`);
      return;
    }
    
    // Handle direct layer ID lookup
    if (effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      
      if (isMetaballs) {
        debugLog.log('🔧 [VisualizerManager] Updated effect parameter (direct):', {
          effectId,
          paramName,
          oldValue,
          newValue: value,
          hasUpdateMethod: typeof (effect as any).updateParameter === 'function',
          currentParams: Object.keys(effect.parameters),
        });
      }
      
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
        if (isMetaballs) {
          debugLog.log('🔧 [VisualizerManager] Called updateParameter method');
        }
      }
    } else {
      if (isMetaballs) {
        debugLog.warn('🔧 [VisualizerManager] Parameter not found (direct):', {
          effectId,
          paramName,
          availableParams: Object.keys(effect.parameters),
        });
      }
      debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
    }
  }
  
  private currentMidiData?: LiveMIDIData;
  private currentAudioData?: AudioAnalysisData;
  
  // Performance monitoring
  getFPS(): number {
    return this.fps;
  }
  
  getMemoryUsage(): { geometries: number; textures: number; programs: number } {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0
    };
  }
  
  // Cleanup
  dispose(): void {
    debugLog.log(`🗑️ VisualizerManager.dispose() called. Effects: ${this.effects.size}`);
    this.stop();
    
    // Dispose compositor
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.dispose();
    }
    
    // Dispose all effects
    debugLog.log(`🗑️ Disposing ${this.effects.size} effects`);
    this.effects.forEach(effect => effect.destroy());
    this.effects.clear();
    debugLog.log(`🗑️ Effects cleared. Remaining: ${this.effects.size}`);
    
    // Dispose Three.js resources
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof Array) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
  }

  public async loadAudioBuffer(buffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }
    try {
      // Log buffer info for debugging
      debugLog.log('Audio buffer length:', buffer.byteLength);
      debugLog.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))));
      this.currentAudioBuffer = await this.audioContext.decodeAudioData(buffer);
      // Create audio source for playback
      const audioSource = this.audioContext.createBufferSource();
      audioSource.buffer = this.currentAudioBuffer;
      audioSource.connect(this.audioContext.destination);
      // Store the source for control
      if (!this.audioSources) {
        this.audioSources = [];
      }
      this.audioSources.push(audioSource);
      // Remove any call to audioAnalyzer/analyzeStem
    } catch (error) {
      debugLog.error('❌ Failed to load audio buffer:', error);
      throw error;
    }
  }

  // Parameter setters
  public setGlobalScale(value: number) {
    this.visualParams.globalScale = value;
    this.effects.forEach(effect => {
      if ('setScale' in effect) {
        (effect as any).setScale(value);
      }
    });
  }

  public setRotationSpeed(value: number) {
    this.visualParams.rotationSpeed = value;
    this.effects.forEach(effect => {
      if ('setRotationSpeed' in effect) {
        (effect as any).setRotationSpeed(value);
      }
    });
  }

  public setColorIntensity(value: number) {
    this.visualParams.colorIntensity = value;
    this.effects.forEach(effect => {
      if ('setColorIntensity' in effect) {
        (effect as any).setColorIntensity(value);
      }
    });
  }

  public setEmissionIntensity(value: number) {
    this.visualParams.emissionIntensity = value;
    this.effects.forEach(effect => {
      if ('setEmissionIntensity' in effect) {
        (effect as any).setEmissionIntensity(value);
      }
    });
  }

  public setPositionOffset(value: number) {
    this.visualParams.positionOffset = value;
    this.effects.forEach(effect => {
      if ('setPositionOffset' in effect) {
        (effect as any).setPositionOffset(value);
      }
    });
  }

  public setHeightScale(value: number) {
    this.visualParams.heightScale = value;
    this.effects.forEach(effect => {
      if ('setHeightScale' in effect) {
        (effect as any).setHeightScale(value);
      }
    });
  }

  public setHueRotation(value: number) {
    this.visualParams.hueRotation = value;
    this.effects.forEach(effect => {
      if ('setHueRotation' in effect) {
        (effect as any).setHueRotation(value);
      }
    });
  }

  public setBrightness(value: number) {
    this.visualParams.brightness = value;
    this.effects.forEach(effect => {
      if ('setBrightness' in effect) {
        (effect as any).setBrightness(value);
      }
    });
  }

  public setComplexity(value: number) {
    this.visualParams.complexity = value;
    this.effects.forEach(effect => {
      if ('setComplexity' in effect) {
        (effect as any).setComplexity(value);
      }
    });
  }

  public setParticleSize(value: number) {
    this.visualParams.particleSize = value;
    this.effects.forEach(effect => {
      if ('setParticleSize' in effect) {
        (effect as any).setParticleSize(value);
      }
    });
  }

  public setOpacity(value: number) {
    this.visualParams.opacity = value;
    this.effects.forEach(effect => {
      if ('setOpacity' in effect) {
        (effect as any).setOpacity(value);
      }
    });
  }

  public setAnimationSpeed(value: number) {
    this.visualParams.animationSpeed = value;
    this.effects.forEach(effect => {
      if ('setAnimationSpeed' in effect) {
        (effect as any).setAnimationSpeed(value);
      }
    });
  }

  public setParticleCount(value: number) {
    this.visualParams.particleCount = value;
    this.effects.forEach(effect => {
      if ('setParticleCount' in effect) {
        (effect as any).setParticleCount(value);
      }
    });
  }

  public updateSettings(settings: Record<string, number>) {
    Object.entries(settings).forEach(([key, value]) => {
      switch (key) {
        case 'globalIntensity':
          this.setColorIntensity(value);
          this.setEmissionIntensity(value);
          break;
        case 'smoothingFactor':
          // Apply to all effects that support smoothing
          this.effects.forEach(effect => {
            if ('setSmoothingFactor' in effect) {
              (effect as any).setSmoothingFactor(value);
            }
          });
          break;
        case 'responsiveness':
          // Apply to all effects that support responsiveness
          this.effects.forEach(effect => {
            if ('setResponsiveness' in effect) {
              (effect as any).setResponsiveness(value);
            }
          });
          break;
      }
    });
  }

  // Method to handle responsive resizing (no letterboxing, always fill canvas)
  public handleViewportResize(canvasWidth: number, canvasHeight: number) {
    this.renderer.setSize(canvasWidth, canvasHeight);
    this.camera.aspect = canvasWidth / canvasHeight;
    this.camera.updateProjectionMatrix();
    
    // Update resolution uniforms and resize handlers for all effects
    this.effects.forEach(effect => {
      // Update resolution uniforms
      if ('uniforms' in effect && (effect as any).uniforms?.uResolution) {
        (effect as any).uniforms.uResolution.value.set(canvasWidth, canvasHeight);
      }
      
      // Call resize method if effect has one (for updating internal cameras)
      if ('resize' in effect && typeof (effect as any).resize === 'function') {
        (effect as any).resize(canvasWidth, canvasHeight);
      }
    });
    
    // Resize compositor targets
    if (this.multiLayerCompositor) {
      this.multiLayerCompositor.resize(canvasWidth, canvasHeight);
    }
    debugLog.log('🎨 Responsive resize:', canvasWidth, canvasHeight, 'aspect:', this.camera.aspect);
  }

  // 2D Composition Layer for future video/image integration
  public createCompositionLayer() {
    // Create an orthographic camera for 2D composition
    const aspectRatio = this.camera.aspect;
    const frustumSize = 2;
    const orthographicCamera = new THREE.OrthographicCamera(
      frustumSize * aspectRatio / -2,
      frustumSize * aspectRatio / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    orthographicCamera.position.set(0, 0, 1);
    orthographicCamera.lookAt(0, 0, 0);

    // Create a composition scene for 2D elements
    const compositionScene = new THREE.Scene();
    
    return {
      scene: compositionScene,
      camera: orthographicCamera,
      addVideoLayer: (video: HTMLVideoElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        const texture = new THREE.VideoTexture(video);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      },
      addImageLayer: (image: HTMLImageElement, position: {x: number, y: number}, scale: {x: number, y: number}) => {
        // [CHANGE 4] Enable CORS for textures
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous'); 
        
        const texture = loader.load(image.src, undefined, undefined, (err) => {
            console.error("Error loading texture:", image.src, err);
        });
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true }); // Ensure transparent is true
        const mesh = new THREE.Mesh(plane, material);
        
        // Position in 2D space (orthographic camera)
        mesh.position.set(position.x, position.y, 0);
        mesh.scale.set(scale.x, scale.y, 1);
        
        compositionScene.add(mesh);
        return mesh;
      }
    };
  }

  // GPU Compositing System Access Methods
  
  public getAudioTextureManager(): AudioTextureManager | null {
    return this.audioTextureManager;
  }

  public getMediaLayerManager(): MediaLayerManager | null {
    return this.mediaLayerManager;
  }

  /**
   * Get the multi-layer compositor for direct rendering access
   * Used by Remotion to render after deterministic update
   */
  public getCompositor(): MultiLayerCompositor {
    return this.multiLayerCompositor;
  }

  // GPU compositing always on via MultiLayerCompositor

  public loadAudioAnalysisForGPU(analysisData: AudioFeatureData): void {
    if (this.audioTextureManager) {
      this.audioTextureManager.loadAudioAnalysis(analysisData);
      debugLog.log('🎵 Audio analysis loaded into GPU textures');
    }
  }

  // Background Color Control Methods
  
  /**
   * Set the background color of the visualizer
   * @param color - THREE.js compatible color (hex, string, or Color object)
   */
  public setBackgroundColor(color: THREE.ColorRepresentation): void {
    if (this.backgroundMaterial) {
      this.backgroundMaterial.color.set(color);
      debugLog.log('🎨 Background color set to:', color);
    }
  }

  /**
   * Control the visibility of the background color layer
   * @param visible - true to show background, false for full transparency
   */
  public setBackgroundVisibility(visible: boolean): void {
    if (this.backgroundMesh) {
      this.backgroundMesh.visible = visible;
      debugLog.log('🎨 Background visibility set to:', visible);
    }
  }
}
</file>

<file path="src/remotion/Debug.tsx">
import React from 'react';
import { Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { RayboxCompositionProps } from './Root';

// Debug payload - loaded dynamically so the JSON file is optional and never required on main.
// Exported so the Remotion root can optionally wire a Debug composition when available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
export let TEST_PAYLOAD: any = null;
try {
  // This file is meant for local debugging only – it's fine if it doesn't exist in CI/main
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TEST_PAYLOAD = require('./debug-payload.json');
} catch {
  TEST_PAYLOAD = null;
}

// Log the payload to verify it's loaded correctly
if (TEST_PAYLOAD) {
  console.log('🔍 [Debug.tsx] TEST_PAYLOAD loaded:', {
    hasLayers: !!TEST_PAYLOAD.layers,
    layersCount: TEST_PAYLOAD.layers?.length || 0,
    hasAudioAnalysis: !!TEST_PAYLOAD.audioAnalysisData,
    audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD.masterAudioUrl,
    keys: Object.keys(TEST_PAYLOAD),
    payloadSize: JSON.stringify(TEST_PAYLOAD).length,
  });
} else {
  console.warn(
    '🔍 [Debug.tsx] TEST_PAYLOAD not available. debug-payload.json is optional and intended for local debugging only.',
  );
}

// Create a wrapper component that injects the payload
// This component receives props from Remotion but ignores them and uses TEST_PAYLOAD directly
const DebugComposition: React.FC<RayboxCompositionProps> = (remotionProps) => {
  console.log('🔍 [DebugComposition] Component rendering');
  console.log('🔍 [DebugComposition] Remotion props received:', {
    layersCount: remotionProps?.layers?.length || 0,
    audioAnalysisCount: remotionProps?.audioAnalysisData?.length || 0
  });
  console.log('🔍 [DebugComposition] TEST_PAYLOAD available:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD?.masterAudioUrl,
  });
  
  // Use TEST_PAYLOAD directly instead of remotionProps (which might be empty due to serialization issues)
  if (!TEST_PAYLOAD) {
    console.warn(
      '🔍 [DebugComposition] TEST_PAYLOAD is not set – debug-payload.json is missing. Rendering fallback empty composition.',
    );
    return <RayboxComposition layers={[]} audioAnalysisData={[]} visualizationSettings={{} as any} masterAudioUrl="" />;
  }

  const props = TEST_PAYLOAD as RayboxCompositionProps;
  console.log('🔍 [DebugComposition] Spreading TEST_PAYLOAD as props:', {
    layersCount: props.layers?.length || 0,
    audioAnalysisCount: props.audioAnalysisData?.length || 0,
    hasMappings: !!props.mappings,
    mappingsCount: props.mappings ? Object.keys(props.mappings).length : 0,
    hasBaseParameterValues: !!props.baseParameterValues,
    baseParamLayerCount: props.baseParameterValues ? Object.keys(props.baseParameterValues).length : 0,
  });
  
  return <RayboxComposition {...props} />;
};

export const DebugRoot = () => {
  console.log('🔍 [DebugRoot] Rendering composition');
  console.log('🔍 [DebugRoot] TEST_PAYLOAD at render time:', {
    hasPayload: !!TEST_PAYLOAD,
    layersCount: TEST_PAYLOAD?.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD?.audioAnalysisData?.length || 0,
    payloadSize: TEST_PAYLOAD ? JSON.stringify(TEST_PAYLOAD).length : 0,
    firstLayerId: TEST_PAYLOAD?.layers?.[0]?.id,
  });

  // Try using defaultProps again, but with more logging
  const propsToPass = (TEST_PAYLOAD || {
    layers: [],
    audioAnalysisData: [],
    visualizationSettings: {} as any,
    masterAudioUrl: '',
  }) as unknown as RayboxCompositionProps;
  console.log('🔍 [DebugRoot] Props to pass:', {
    layersCount: propsToPass.layers?.length || 0,
    audioAnalysisCount: propsToPass.audioAnalysisData?.length || 0
  });

  return (
    <Composition
      id="Debug"
      component={DebugComposition}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={propsToPass}
    />
  );
};
</file>

<file path="src/remotion/index.ts">
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
</file>

<file path="src/remotion/RayboxComposition.tsx">
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  Audio,
  delayRender,
  continueRender,
} from 'remotion';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
// Import EffectDefinitions to ensure effects are registered
import '@/lib/visualizer/effects/EffectDefinitions';
import type { RayboxCompositionProps } from './Root';
import type { AudioAnalysisData as SimpleAudioAnalysisData } from '@/types/visualizer';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { parseParamKey } from '@/lib/visualizer/paramKeys';
import { debugLog } from '@/lib/utils';
import { RemotionOverlayRenderer } from './RemotionOverlayRenderer';

const VALID_STEMS = new Set(['master', 'drums', 'bass', 'vocals', 'other']);

/**
 * Helper function to extract audio feature values at a specific time from cached analysis data.
 * Adapted from use-audio-analysis.ts getFeatureValue logic.
 */
function getFeatureValueFromCached(
  cachedAnalysis: CachedAudioAnalysisData[],
  fileId: string,
  feature: string,
  time: number,
  stemType?: string,
): number {
  let parsedStem = stemType ?? 'master';
  let featureName = feature;

  if (feature.includes('-')) {
    const parts = feature.split('-');
    const potentialStem = parts[0];

    if (VALID_STEMS.has(potentialStem.toLowerCase())) {
      parsedStem = potentialStem;
      featureName = parts.slice(1).join('-');
    }
  }

  let analysis = cachedAnalysis.find(
    (a) => a.fileMetadataId === fileId && a.stemType === parsedStem,
  );

  if (!analysis) {
    analysis = cachedAnalysis.find((a) => a.stemType === parsedStem);
  }

  if (!analysis?.analysisData) return 0;
  const { analysisData } = analysis;

  const getTimeSeriesValue = (arr: any) => {
    if (!arr || arr.length === 0) return 0;
    const times = analysisData.frameTimes as number[];
    if (!times || times.length === 0) return 0;

    let lo = 0,
      hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid - 1;
    }
    return arr[lo] ?? 0;
  };

  const normalizedFeature = featureName.toLowerCase().replace(/-/g, '');

  switch (normalizedFeature) {
    case 'rms':
      return getTimeSeriesValue(analysisData.rms);
    case 'volume':
      return getTimeSeriesValue(analysisData.rms ?? analysisData.volume);
    case 'loudness':
      return getTimeSeriesValue(analysisData.loudness);
    case 'spectralcentroid':
      return getTimeSeriesValue(analysisData.spectralCentroid);
    case 'spectralrolloff':
      return getTimeSeriesValue(analysisData.spectralRolloff);
    case 'spectralflux':
      return getTimeSeriesValue((analysisData as any).spectralFlux);
    case 'bass':
      return getTimeSeriesValue(analysisData.bass);
    case 'mid':
      return getTimeSeriesValue(analysisData.mid);
    case 'treble':
      return getTimeSeriesValue(analysisData.treble);
    default:
      return 0;
  }
}

/**
 * Convert cached audio analysis data to simple AudioAnalysisData format at a specific time.
 * Exported so Remotion-specific overlay renderer can reuse audio sampling logic.
 */
export function extractAudioDataAtTime(
  cachedAnalysis: CachedAudioAnalysisData[] | undefined,
  fileId: string | undefined,
  time: number,
  stemType?: string
): SimpleAudioAnalysisData | null {
  if (!cachedAnalysis || !fileId || cachedAnalysis.length === 0) {
    return null;
  }

  // Extract feature values at the current time
  const volume = getFeatureValueFromCached(cachedAnalysis, fileId, 'volume', time, stemType);
  const bass = getFeatureValueFromCached(cachedAnalysis, fileId, 'bass', time, stemType);
  const mid = getFeatureValueFromCached(cachedAnalysis, fileId, 'mid', time, stemType);
  const treble = getFeatureValueFromCached(cachedAnalysis, fileId, 'treble', time, stemType);
  const spectralCentroid = getFeatureValueFromCached(cachedAnalysis, fileId, 'spectral-centroid', time, stemType);

  // Get frequencies and timeData from the analysis
  let analysis = cachedAnalysis.find(
    a => a.fileMetadataId === fileId && a.stemType === (stemType ?? 'master')
  );

  // FALLBACK: If strict ID match fails, try matching by stemType only
  if (!analysis) {
    analysis = cachedAnalysis.find(a => a.stemType === (stemType ?? 'master'));
  }

  if (!analysis) {
    return null;
  }

  // Extract frequency data (FFT) at the current time
  const fft = analysis.analysisData.fft;
  const frameTimes = analysis.analysisData.frameTimes;
  let frequencies: number[] = [];
  let timeData: number[] = [];

  if (fft && frameTimes && Array.isArray(fft) && Array.isArray(frameTimes) && frameTimes.length > 0) {
    // Find the frame index closest to the current time
    let frameIndex = 0;
    for (let i = 0; i < frameTimes.length; i++) {
      if (frameTimes[i] <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }

    // [CHANGE 2] Dynamically calculate bin size instead of hardcoding 256
    // This prevents index out of bounds or misalignment if analysis uses 512/1024 bins
    const binsPerFrame = Math.floor(fft.length / frameTimes.length);

    if (binsPerFrame > 0) {
      const startIdx = frameIndex * binsPerFrame;
      const endIdx = Math.min(startIdx + binsPerFrame, fft.length);

      if (startIdx < fft.length) {
        frequencies = Array.from(fft.slice(startIdx, endIdx));
        // Map FFT to Time Data approximation if TimeData is missing (common in compressed payloads)
        timeData = frequencies.map((_, i) => fft[startIdx + i] || 0);
      }
    }
  }

  return {
    frequencies: frequencies.length > 0 ? frequencies : new Array(256).fill(0),
    timeData: timeData.length > 0 ? timeData : new Array(256).fill(0),
    volume,
    bass,
    mid,
    treble,
  };
}

export const RayboxComposition: React.FC<RayboxCompositionProps> = ({
  layers,
  audioAnalysisData,
  visualizationSettings,
  masterAudioUrl,
  mappings,
  baseParameterValues,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerManagerRef = useRef<VisualizerManager | null>(null);
  const effectInstancesRef = useRef<Map<string, any>>(new Map());
  const [handle] = useState(() => delayRender('Initializing Visualizer'));
  const isInitializedRef = useRef(false);

  const actualLayers = layers || [];
  const actualAudioAnalysisData = audioAnalysisData || [];

  // 1. Initialize Visualizer (useLayoutEffect) - runs once on mount
  useLayoutEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    
    let isNewManager = false;

    if (!visualizerManagerRef.current) {
      try {
        visualizerManagerRef.current = new VisualizerManager(canvasRef.current, {
          canvas: { width, height, pixelRatio: 1 },
          performance: { targetFPS: fps, enableShadows: false },
          midi: { velocitySensitivity: 1.0, noteTrailDuration: 2.0, trackColorMapping: {} },
        });
        isNewManager = true;
        // If a new manager is created, any cached effect refs are stale.
        effectInstancesRef.current.clear();
      } catch (e) {
        console.error('Failed to initialize VisualizerManager:', e);
        // Log error but continue - let the render attempt to proceed
        // The canvas will just be black if WebGL fails, but won't crash the render
        continueRender(handle);
        return;
      }
    }

    const manager = visualizerManagerRef.current;
    if (manager) {
      // Ensure renderer matches latest dimensions to avoid aspect ratio glitches.
      manager.handleViewportResize(width, height);

      if (visualizationSettings) {
        manager.updateSettings(visualizationSettings as unknown as Record<string, number>);
      }

      const effectLayers = actualLayers.filter((l) => l.type === 'effect' && l.effectType);
      for (const layer of effectLayers) {
        const hasRef = effectInstancesRef.current.has(layer.id);
        const managerHasEffect =
          typeof manager.getEffect === 'function' ? !!manager.getEffect(layer.id) : false;

        if (!hasRef || !managerHasEffect || isNewManager) {
          const baseValues = baseParameterValues?.[layer.id] || {};
          const mergedSettings = { ...layer.settings, ...baseValues };
          const effectType = layer.effectType as string;
          const effect = EffectRegistry.createEffect(effectType, mergedSettings);
          if (effect) {
            effectInstancesRef.current.set(layer.id, effect);
            manager.addEffect(layer.id, effect);
          }
        }
      }
    }

    // Wait for assets to load before continuing
    const waitForAssets = async () => {
      try {
        const asyncEffects = Array.from(effectInstancesRef.current.values()).filter(
          (effect) => typeof (effect as any).waitForImages === 'function',
        );

        if (asyncEffects.length > 0) {
          // 10s timeout safety to prevent hanging forever on bad URLs
          await Promise.race([
            Promise.all(asyncEffects.map((effect) => (effect as any).waitForImages())),
            new Promise((r) => setTimeout(r, 10000)),
          ]);
        }
      } catch (e) {
        console.warn('⚠️ Asset waiting warning:', e);
      } finally {
        isInitializedRef.current = true;
        continueRender(handle);
      }
    };

    waitForAssets();
  }, [width, height, fps, actualLayers]); // Include actualLayers to update effects on change

  // 2. Render Loop (useLayoutEffect) - runs on every frame
  useLayoutEffect(() => {
    if (!visualizerManagerRef.current || !isInitializedRef.current) return;
    
    const time = frame / fps;
    const deltaTime = 1 / fps;
    const shouldLogMapping = frame < 3 || frame % Math.max(1, Math.round(fps)) === 0;
    const mappingLogEntries: Array<{
      paramKey: string;
      layerId: string;
      paramName: string;
      baseValue: number;
      rawValue: number;
      knob: number;
      delta: number;
      finalValue: number;
    }> = [];

    // 1. Map StemTypes to IDs for lookup
    const stemMap = new Map(actualAudioAnalysisData.map(a => [a.stemType, a.fileMetadataId]));
    
    const fileId = actualAudioAnalysisData.find((a) => a.stemType === 'master')?.fileMetadataId;
    const audioData = extractAudioDataAtTime(
      actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
      fileId || 'unknown',
      time,
      'master',
    );

    if (mappings && Object.keys(mappings).length > 0) {
      const getSliderMax = (p: string) =>
        ['opacity', 'scale', 'baseRadius'].includes(p) ? 1.0 : 100;

      Object.entries(mappings).forEach(([paramKey, mapping]) => {
        if (!mapping?.featureId) return;
        const parsed = parseParamKey(paramKey);
        if (!parsed) return;
        const { effectInstanceId: layerId, paramName } = parsed;

        let baseValue = baseParameterValues?.[layerId]?.[paramName];
        if (baseValue === undefined)
          baseValue = actualLayers.find((l) => l.id === layerId)?.settings?.[paramName];
        if (baseValue === undefined)
          baseValue = effectInstancesRef.current.get(layerId)?.parameters?.[paramName];
        if (baseValue === undefined) baseValue = 0;

        // FIX: Find the correct fileId based on the feature prefix (e.g. "bass-rms")
        const featureStemType = mapping.featureId.split('-')[0] || 'master';
        const targetFileId = stemMap.get(featureStemType) || fileId || 'unknown';

        const rawValue = getFeatureValueFromCached(
          actualAudioAnalysisData as unknown as CachedAudioAnalysisData[],
          targetFileId, // Pass real ID!
          mapping.featureId,
          time,
        );

        const maxValue = getSliderMax(paramName);
        const knob = Math.max(-0.5, Math.min(0.5, (mapping.modulationAmount ?? 0.5) * 2 - 1));
        const delta = rawValue * knob * maxValue;
        const finalValue = Math.max(0, Math.min(maxValue, baseValue + delta));

        if (!Number.isNaN(finalValue)) {
          visualizerManagerRef.current?.updateEffectParameter(layerId, paramName, finalValue);
          if (shouldLogMapping) {
            mappingLogEntries.push({
              paramKey,
              layerId,
              paramName,
              baseValue,
              rawValue,
              knob,
              delta,
              finalValue,
            });
          }
        }
      });
    }

    if (shouldLogMapping && mappingLogEntries.length > 0) {
      debugLog.log('🎚️ Audio mapping frame snapshot', {
        frame,
        time: Number(time.toFixed(3)),
        entries: mappingLogEntries,
      });
    }

    visualizerManagerRef.current.updateTimelineState(actualLayers, time);
    if (audioData) visualizerManagerRef.current.setAudioData(audioData);
    
    // 2. Deterministic Update - sets uTime and all effect states based on frame/fps
    // This ensures frame 100 looks identical whether rendered on laptop, AWS Lambda in Virginia, or Oregon
    visualizerManagerRef.current.update(frame, fps);
    
    // 3. Final Draw - render all layers via compositor (don't use deprecated renderFrame)
    visualizerManagerRef.current.getCompositor().render();
    
    // 4. Flush WebGL - ensure canvas is ready for Remotion capture
    if (canvasRef.current) {
      const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl');
      if (gl) {
        gl.flush(); // Flush all pending commands to the GPU
        gl.finish(); // Force all WebGL commands to complete before returning
      }
    }
  }, [frame, fps, actualLayers, actualAudioAnalysisData, mappings, baseParameterValues, visualizationSettings]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      {masterAudioUrl && <Audio src={masterAudioUrl} />}
      <RemotionOverlayRenderer
        layers={actualLayers}
        audioAnalysisData={actualAudioAnalysisData as unknown as CachedAudioAnalysisData[]}
      />
    </div>
  );
};
</file>

<file path="src/remotion/RemotionOverlayRenderer.tsx">
import React, { useMemo, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { HudOverlay } from '@/components/hud/HudOverlay';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData as CachedAudioAnalysisData } from '@/types/audio-analysis-data';
import { extractAudioDataAtTime } from './RayboxComposition';

type RemotionOverlayRendererProps = {
  layers: Layer[];
  audioAnalysisData: CachedAudioAnalysisData[];
};

// Helper: get feature keys for overlay type (copied from HudOverlayManager)
function getFeatureKeyForOverlay(type: string): string[] {
  switch (type) {
    case 'waveform':
    case 'oscilloscope':
      return ['rms', 'loudness'];
    case 'spectrogram':
    case 'spectrumAnalyzer':
      return ['fft', 'spectralCentroid', 'rms', 'loudness'];
    case 'peakMeter':
      return ['rms', 'loudness'];
    case 'stereometer':
      return ['spectralCentroid', 'rms'];
    case 'vuMeter':
      return ['rms', 'loudness'];
    case 'chromaWheel':
      return ['chroma', 'rms'];
    default:
      return ['rms'];
  }
}

export const RemotionOverlayRenderer: React.FC<RemotionOverlayRendererProps> = ({
  layers,
  audioAnalysisData,
}) => {
  // Use Remotion's hook directly - this gets the frame value during render
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = fps > 0 ? frame / fps : 0;
  const cachedAnalysis = audioAnalysisData as CachedAudioAnalysisData[];

  const overlayLayers = useMemo(
    () => layers.filter((layer) => layer.type === 'overlay'),
    [layers],
  );

  const activeOverlays = useMemo(
    () =>
      overlayLayers.filter(
        (layer) =>
          currentTime >= (layer.startTime ?? 0) &&
          currentTime <= (layer.endTime ?? Number.POSITIVE_INFINITY),
      ),
    [overlayLayers, currentTime],
  );

  // Compute feature data for an overlay layer – adapted from HudOverlayManager,
  // but using cached audio analysis + extractAudioDataAtTime instead of audioController hooks.
  const getFeatureDataForOverlay = useCallback(
    (layer: Layer) => {
      const settings = (layer as any).settings || {};
      const stemId = settings.stemId || settings.stem?.id;

      if (!stemId || cachedAnalysis.length === 0) {
        return null;
      }

      // Find the analysis for this stem
      let analysis = cachedAnalysis.find((a) => a.fileMetadataId === stemId);

      // FALLBACK: If strict ID match fails, try matching by stemType
      if (!analysis) {
        const requestedStemType = settings.stemType || 'master';
        analysis = cachedAnalysis.find(a => a.stemType === requestedStemType);
      }
      if (!analysis || !analysis.analysisData) {
        return null;
      }

      const overlayType = layer.effectType as string;
      const featureKeys = getFeatureKeyForOverlay(overlayType);

      const frameTimes = analysis.analysisData.frameTimes as
        | Float32Array
        | number[]
        | undefined;
      const derivedDurationFromFrames =
        frameTimes && frameTimes.length > 0
          ? (frameTimes as any)[frameTimes.length - 1]
          : undefined;
      const metadataDuration = (analysis as any).metadata?.duration as
        | number
        | undefined;
      const analysisDurationField = (analysis.analysisData as any)
        .analysisDuration as number | undefined;

      const analysisDuration =
        metadataDuration ?? derivedDurationFromFrames ?? analysisDurationField ?? 1;
      const progress = Math.max(0, Math.min(currentTime / analysisDuration, 1));

      // For spectrum overlays
      if (overlayType === 'spectrogram' || overlayType === 'spectrumAnalyzer') {
        // Use the shared extractor to get the FFT data for the current time
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.frequencies?.length) {
          // For spectrogram, we might want a buffer, but for now let's return the current frame
          // If the overlay needs a buffer, it should manage it or we need to reconstruct it here
          // properly. However, the issue described is "static" rendering, which usually means
          // the data isn't updating. Returning the correct frame data fixes that.

          // If the component expects a buffer (history), we can try to generate a small one
          // by sampling previous frames, but for a single frame render, just the current
          // FFT is the most critical part.

          // Let's look at how HudOverlay uses this. It likely expects 'fft' to be the current frame.
          // The previous code was generating a fake buffer.

          // Let's reconstruct a small buffer by sampling backwards if needed, 
          // but primarily ensure 'fft' is correct.

          const buffer: Array<Float32Array> = [];
          // Sample a few frames back to give some history if needed
          const numHistoryFrames = 5;
          for (let i = numHistoryFrames; i >= 0; i--) {
            const t = currentTime - (i * 0.05); // 50ms steps
            const histExtracted = extractAudioDataAtTime(
              cachedAnalysis,
              analysis.fileMetadataId,
              Math.max(0, t),
              analysis.stemType
            );
            if (histExtracted?.frequencies) {
              buffer.push(new Float32Array(histExtracted.frequencies));
            } else {
              buffer.push(new Float32Array(extracted.frequencies.length).fill(0));
            }
          }

          return {
            fft: new Float32Array(extracted.frequencies),
            fftBuffer: buffer,
          };
        }

        return null;
      }

      // For stereometer: Approximate stereo window using cached time-domain data
      if (overlayType === 'stereometer') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          const half = Math.floor(extracted.timeData.length / 2);
          const left = extracted.timeData.slice(0, half);
          const right = extracted.timeData.slice(half) || extracted.timeData.slice(0, half);

          return {
            stereoWindow: {
              left,
              right,
            },
          };
        }

        return null;
      }

      // For consoleFeed: Use time-domain window as raw audio buffer
      if (overlayType === 'consoleFeed') {
        const extracted = extractAudioDataAtTime(
          cachedAnalysis,
          analysis.fileMetadataId,
          currentTime,
          analysis.stemType,
        );

        if (extracted?.timeData?.length) {
          return { audioBuffer: extracted.timeData };
        }

        return null;
      }

      // For chroma wheel – use cached chroma data directly
      if (overlayType === 'chromaWheel') {
        if (analysis.analysisData.chroma && Array.isArray(analysis.analysisData.chroma)) {
          return { chroma: analysis.analysisData.chroma };
        }
        return null;
      }

      // For VU meter – derive RMS / peak from cached arrays
      if (overlayType === 'vuMeter') {
        let rmsValue = 0;
        let peakValue = 0;

        if (analysis.analysisData.rms && Array.isArray(analysis.analysisData.rms)) {
          const idx = Math.floor(progress * (analysis.analysisData.rms.length - 1));
          rmsValue = analysis.analysisData.rms[idx] || 0;
        }
        if (analysis.analysisData.loudness && Array.isArray(analysis.analysisData.loudness)) {
          const idx = Math.floor(progress * (analysis.analysisData.loudness.length - 1));
          peakValue = analysis.analysisData.loudness[idx] || 0;
        }

        return { rms: rmsValue, peak: peakValue };
      }

      // Generic array-based features (waveform, peakMeter, etc.)
      let featureArr: number[] | null = null;
      for (const key of featureKeys) {
        const arr = (analysis.analysisData as any)[key];
        if (arr && Array.isArray(arr) && arr.length > 0) {
          featureArr = arr;
          break;
        }
      }

      if (!featureArr) {
        // Fallback: try any available array feature
        // Note: analysis is already validated above (line 81), so it's guaranteed to be defined here
        const availableFeatures = Object.keys(analysis!.analysisData).filter(
          (key) =>
            Array.isArray((analysis!.analysisData as any)[key]) &&
            (analysis!.analysisData as any)[key].length > 0,
        );
        if (availableFeatures.length > 0) {
          featureArr = (analysis!.analysisData as any)[availableFeatures[0]];
        }
      }

      if (!featureArr) return null;

      const idx = Math.floor(progress * (featureArr.length - 1));

      // For waveform and oscilloscope, return a window of values
      if (overlayType === 'waveform' || overlayType === 'oscilloscope') {
        const windowSize = 100;
        const endIdx = idx + 1;
        const startIdx = Math.max(0, endIdx - windowSize);
        return featureArr.slice(startIdx, endIdx);
      }

      // For peak meter, return single value
      if (overlayType === 'peakMeter') {
        return featureArr[idx] || 0;
      }

      // Default: single scalar
      return featureArr[idx];
    },
    [cachedAnalysis, currentTime],
  );

  if (activeOverlays.length === 0) {
    return null;
  }

  return (
    <div
      id="remotion-hud-overlays-container"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {activeOverlays.map((layer) => {
        const featureData = getFeatureDataForOverlay(layer);
        return (
          <HudOverlay
            key={layer.id}
            layer={layer}
            featureData={featureData}
            // No-op callbacks: overlays are not editable in Remotion render
            onOpenModal={() => { }}
            onUpdate={() => { }}
            isSelected={false}
            onSelect={() => { }}
          />
        );
      })}
    </div>
  );
};
</file>

<file path="src/remotion/Root.tsx">
import { type CalculateMetadataFunction, Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { AudioAnalysisData } from '@/types/audio-analysis-data'; // Use the cached type
import type { Layer } from '@/types/video-composition';
import type { VisualizationSettings } from 'phonoglyph-types';

type VisualizationSettingsWithAspect = VisualizationSettings & { aspectRatio?: string };
type AspectRatioKey =
  | 'mobile'
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'landscape'
  | '16:9'
  | '9:16'
  | '1:1';

const ASPECT_RATIO_DIMENSIONS: Record<AspectRatioKey, { width: number; height: number }> = {
  mobile: { width: 1080, height: 1920 },
  tiktok: { width: 1080, height: 1920 },
  youtube: { width: 1920, height: 1080 },
  instagram: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1200 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};

// Robust payload loading: prefer the JSON, fall back to Debug module
// eslint-disable-next-line @typescript-eslint/no-require-imports
let TEST_PAYLOAD: RayboxCompositionProps | null = null;
try {
  const payload = require('./debug-payload.json') as unknown;
  TEST_PAYLOAD = payload as RayboxCompositionProps;
} catch (e) {
  console.warn('⚠️ Could not load debug-payload.json:', e);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const debugModule = require('./Debug') as { TEST_PAYLOAD?: unknown };
    TEST_PAYLOAD = debugModule.TEST_PAYLOAD as RayboxCompositionProps;
  } catch (e2) {
    console.warn('⚠️ Could not load Debug module:', e2);
  }
}

export interface RayboxCompositionProps extends Record<string, unknown> {
  layers: Layer[];
  // This contains the full timeline analysis for Master + all Stems
  audioAnalysisData: AudioAnalysisData[];
  visualizationSettings: VisualizationSettingsWithAspect;
  // The only audio track to be rendered in the output
  masterAudioUrl: string;
  // Audio feature mappings for effect parameters
  mappings?: Record<string, { featureId: string | null; modulationAmount: number }>;
  // Base parameter values before modulation
  baseParameterValues?: Record<string, Record<string, any>>;
  // URL to fetch analysis data from R2 (used when payload is too large for Lambda)
  analysisUrl?: string;
}

const defaultProps: RayboxCompositionProps = {
  layers: [],
  audioAnalysisData: [],
  visualizationSettings: {
    colorScheme: 'mixed',
    pixelsPerSecond: 50,
    showTrackLabels: true,
    showVelocity: true,
    minKey: 21,
    maxKey: 108,
  },
  masterAudioUrl: '',
};

const resolveAspectRatioDimensions = (
  rawAspectRatio: string | undefined,
): { width: number; height: number } => {
  if (!rawAspectRatio) {
    return ASPECT_RATIO_DIMENSIONS['9:16'];
  }

  const normalized = rawAspectRatio.toLowerCase();

  if (normalized in ASPECT_RATIO_DIMENSIONS) {
    return ASPECT_RATIO_DIMENSIONS[normalized as AspectRatioKey];
  }

  if (normalized.includes(':')) {
    const [widthPart, heightPart] = normalized.split(':');
    const widthRatio = Number(widthPart);
    const heightRatio = Number(heightPart);

    if (
      Number.isFinite(widthRatio) &&
      Number.isFinite(heightRatio) &&
      widthRatio > 0 &&
      heightRatio > 0
    ) {
      if (widthRatio >= heightRatio) {
        const width = 1920;
        return { width, height: Math.round((heightRatio / widthRatio) * width) };
      }
      const height = 1920;
      return { width: Math.round((widthRatio / heightRatio) * height), height };
    }
  }

  return ASPECT_RATIO_DIMENSIONS['9:16'];
};

const calculateMetadata: CalculateMetadataFunction<RayboxCompositionProps> = async ({
  props,
}) => {
  // FPS is set on the Composition component (30), so we use that value here
  const safeFps = 30;

  let finalAudioData = props.audioAnalysisData;

  // If the API gave us a URL because the data was too big for the trigger payload:
  if (props.analysisUrl) {
    console.log('☁️ Fetching heavy analysis from R2...');
    try {
      const res = await fetch(props.analysisUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch analysis data: ${res.status} ${res.statusText}`);
      }
      finalAudioData = await res.json();
      console.log(`✅ Fetched ${finalAudioData.length} analysis entries from R2`);
    } catch (error) {
      console.error('❌ Failed to fetch analysis data from R2:', error);
      // Fall back to empty array if fetch fails
      finalAudioData = [];
    }
  }

  // Debug logging for payload visibility in the terminal
  if (!props.layers || props.layers.length === 0) {
    console.log(
      '⚠️ calculateMetadata received EMPTY layers. Check debug-payload.json!',
    );
  } else {
    console.log(
      `✅ calculateMetadata: ${props.layers.length} layers, Aspect: ${props.visualizationSettings?.aspectRatio}`,
    );
  }

  const layers = props?.layers ?? [];
  const { width, height } = resolveAspectRatioDimensions(
    props.visualizationSettings?.aspectRatio,
  );

  // Prefer explicit duration on the payload if provided
  const durationFromProps = (props as Partial<{ duration?: number }>).duration;
  let duration =
    typeof durationFromProps === 'number' && !Number.isNaN(durationFromProps)
      ? durationFromProps
      : undefined;

  // If no explicit duration, derive from the end of the last layer
  if (duration == null || Number.isNaN(duration)) {
    if (layers.length > 0) {
      const layerEndTimes = layers
        .map((l) => l.endTime)
        .filter((t) => typeof t === 'number' && !Number.isNaN(t));

      if (layerEndTimes.length > 0) {
        duration = Math.max(...layerEndTimes);
      }
    }
  }

  // Calculate duration based on the actual data we just fetched
  if ((duration == null || !Number.isFinite(duration) || duration <= 0) && finalAudioData.length > 0) {
    duration = finalAudioData[0]?.metadata?.duration || 30;
  }

  // Default to 30 seconds if we couldn't determine duration
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    duration = 30;
  }

  return {
    durationInFrames: Math.ceil(duration * safeFps),
    width,
    height,
    props: {
      ...props,
      audioAnalysisData: finalAudioData, // Inject the data into the component props
    },
  };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RayboxMain"
        component={RayboxComposition}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Debug"
        component={RayboxComposition}
        width={1080}
        height={1920}
        fps={30}
        defaultProps={TEST_PAYLOAD ?? defaultProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
</file>

</files>
