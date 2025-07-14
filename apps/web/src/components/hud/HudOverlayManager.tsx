import React, { useState, useEffect } from 'react';
import { HudOverlay } from './HudOverlay';
import { HudOverlayParameterModal } from './HudOverlayParameterModal';

export interface HudOverlayConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  stem: any;
  settings: Record<string, any>;
}

const OVERLAY_TYPES = [
  { value: 'waveform', label: 'Waveform' },
  { value: 'spectrogram', label: 'Spectrogram' },
  { value: 'peakMeter', label: 'Peak/LUFS Meter' },
  { value: 'stereometer', label: 'Stereometer' },
  { value: 'oscilloscope', label: 'Oscilloscope' },
  { value: 'spectrumAnalyzer', label: 'Spectrum Analyzer' },
  { value: 'midiMeter', label: 'MIDI Activity Meter' },
];

export function HudOverlayManager() {
  const [overlays, setOverlays] = useState<HudOverlayConfig[]>([]);
  const [modalOverlayId, setModalOverlayId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('waveform');

  function addOverlay(type: string) {
    setOverlays(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type,
        position: { x: 100 + prev.length * 40, y: 100 + prev.length * 40 },
        size: { width: 400, height: 120 },
        stem: null,
        settings: {},
      },
    ]);
  }

  function updateOverlay(id: string, update: Partial<HudOverlayConfig>) {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...update } : o));
  }

  // Expose global function for sidebar integration
  useEffect(() => {
    window.addHudOverlay = (type: string) => {
      addOverlay(type);
    };
    return () => {
      delete window.addHudOverlay;
    };
  }, []);

  return (
    <div id="hud-overlays" style={{ position: 'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 20 }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 30, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 }}>
        <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ fontSize: 16, padding: 4, borderRadius: 4 }}>
          {OVERLAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={() => addOverlay(selectedType)} style={{ fontSize: 16, padding: '4px 12px', borderRadius: 4, background: '#00ffff', color: '#222', fontWeight: 600 }}>+ Add Overlay</button>
      </div>
      {overlays.map(overlay => (
        <HudOverlay
          key={overlay.id}
          {...overlay}
          onOpenModal={() => setModalOverlayId(overlay.id)}
          onUpdate={update => updateOverlay(overlay.id, update)}
        />
      ))}
      {modalOverlayId && (
        <HudOverlayParameterModal
          overlay={overlays.find(o => o.id === modalOverlayId)!}
          onClose={() => setModalOverlayId(null)}
          onUpdate={update => updateOverlay(modalOverlayId, update)}
        />
      )}
    </div>
  );
}