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
  const scheme = colorSchemes[settings.colorScheme] || colorSchemes.Classic;
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

export function HudOverlay({ type, position, size, stem, settings, featureData, onOpenModal, onUpdate }: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null); // anchor key
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Rolling buffer for spectrogram
  const spectrogramBufferRef = useRef<Array<Float32Array>>([]);

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
      case 'spectrogram': {
        // Maintain rolling buffer of FFT frames
        if (featureData && featureData.fft && Array.isArray(featureData.fft)) {
          // Push new FFT frame
          const buffer = spectrogramBufferRef.current;
          buffer.push(Float32Array.from(featureData.fft));
          if (buffer.length > SPECTROGRAM_BUFFER_SIZE) buffer.shift();
          // Draw spectrogram
          const width = size.width;
          const height = size.height;
          const frameCount = buffer.length;
          const binCount = buffer[0]?.length || 0;
          for (let x = 0; x < frameCount; x++) {
            const fftFrame = buffer[x];
            if (!fftFrame) continue;
            for (let y = 0; y < binCount; y++) {
              // Map y: 0=low freq (bottom), binCount-1=high freq (top)
              const magnitude = fftFrame[y];
              // Normalize and color map
              const norm = Math.log10(magnitude + 1e-10) / Math.log10(1.1);
              const clamped = Math.max(0, Math.min(1, norm));
              const hue = 240 - (y / binCount) * 240;
              ctx.fillStyle = `hsl(${hue}, 90%, ${30 + clamped * 70}%)`;
              const px = Math.floor(x * width / SPECTROGRAM_BUFFER_SIZE);
              const py = height - Math.floor(y * height / binCount) - 1;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        } else {
          drawSpectrogram(ctx, size.width, size.height);
        }
        break;
      }
      case 'spectrumAnalyzer': {
        if (featureData && featureData.fft && Array.isArray(featureData.fft)) {
          // Improved high-resolution FFT-based spectrum analyzer with log frequency scaling
          const fftData = featureData.fft;
          const fftSize = settings.fftSize || fftData.length;
          const barColor = settings.barColor || '#00ffff';
          const barCount = Math.min(128, Math.floor(size.width / 4)); // Up to 128 bars, 4px min width
          const minFreq = 20; // Hz
          const maxFreq = 20000; // Hz
          const sampleRate = 44100; // Or get from settings/featureData if available
          const binCount = fftData.length;

          // Precompute frequency for each bin
          const binFreq = (i) => (i * sampleRate) / (2 * binCount);

          // Map bars to log-spaced frequency bins
          for (let bar = 0; bar < barCount; bar++) {
            // Logarithmic frequency scaling
            const freqStart = minFreq * Math.pow(maxFreq / minFreq, bar / barCount);
            const freqEnd = minFreq * Math.pow(maxFreq / minFreq, (bar + 1) / barCount);
            // Find bins in this frequency range
            let binStart = Math.floor((freqStart / (sampleRate / 2)) * binCount);
            let binEnd = Math.ceil((freqEnd / (sampleRate / 2)) * binCount);
            binStart = Math.max(0, binStart);
            binEnd = Math.min(binCount, binEnd);
            // Average magnitude in this range
            let sum = 0, count = 0;
            for (let i = binStart; i < binEnd; i++) {
              sum += fftData[i];
              count++;
            }
            const avg = count > 0 ? sum / count : 0;
            // Logarithmic magnitude scaling (dB-like)
            const mag = Math.log10(avg + 1e-8) * 10 + 40; // dB scale, offset for visibility
            const normMag = Math.max(0, Math.min(1, mag / 50));
            // Draw bar
            const barWidth = size.width / barCount;
            const barHeight = normMag * size.height * 0.95;
            ctx.fillStyle = barColor;
            ctx.fillRect(bar * barWidth, size.height - barHeight, barWidth - 1, barHeight);
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
        if (featureData && featureData.stereoWindow && featureData.stereoWindow.left && featureData.stereoWindow.right) {
          const left = featureData.stereoWindow.left;
          const right = featureData.stereoWindow.right;
          const N = Math.min(left.length, right.length, 1024);
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = '#00ffff';
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
          // Optionally, draw fading trail/cloud
          ctx.globalAlpha = 0.2;
          for (let i = 0; i < N; i += 4) {
            const lx = left[i];
            const ry = right[i];
            const x = ((lx + 1) / 2) * size.width;
            const y = ((ry + 1) / 2) * size.height;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#00ffff';
            ctx.fill();
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
      case 'waveform': {
        // ... existing waveform code ...
        // Transient detector
        if (settings.showTransients && Array.isArray(featureData.transients)) {
          ctx.save();
          ctx.strokeStyle = settings.transientColor || '#ff0';
          ctx.lineWidth = 1.5;
          for (const t of featureData.transients) {
            const x = Math.floor(t * size.width);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size.height);
            ctx.stroke();
          }
          ctx.restore();
        }
        break;
      }
      case 'oscilloscope': {
        if (settings.lissajous && featureData && featureData.stereoWindow && featureData.stereoWindow.left && featureData.stereoWindow.right) {
          // Lissajous mode
          const left = featureData.stereoWindow.left;
          const right = featureData.stereoWindow.right;
          const N = Math.min(left.length, right.length, 1024);
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = settings.color || '#00ffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < N; i++) {
            const lx = left[i];
            const ry = right[i];
            const x = ((lx + 1) / 2) * size.width;
            const y = ((ry + 1) / 2) * size.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        } else {
          drawOscilloscope(ctx, size.width, size.height, settings);
        }
        break;
      }
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
        boxShadow: '0 0 16px #00ffff44',
        borderRadius: 8,
        background: settings.glass || settings.glassmorphism
          ? 'rgba(20, 40, 60, 0.25)'
          : 'rgba(0,0,0,0.2)',
        userSelect: dragging || resizing ? 'none' : 'auto',
        cursor: dragging ? 'grabbing' : 'grab',
        backdropFilter: settings.glass || settings.glassmorphism ? 'blur(12px)' : undefined,
        WebkitBackdropFilter: settings.glass || settings.glassmorphism ? 'blur(12px)' : undefined,
        border: settings.glass || settings.glassmorphism ? '1.5px solid rgba(255,255,255,0.18)' : undefined,
        transition: 'background 0.2s, border 0.2s',
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