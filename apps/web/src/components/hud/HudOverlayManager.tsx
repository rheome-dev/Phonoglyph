import React, { useState, useEffect, createContext, useContext } from 'react';
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

interface HudOverlayContextType {
  overlays: HudOverlayConfig[];
  addOverlay: (type: string) => void;
  updateOverlay: (id: string, update: Partial<HudOverlayConfig>) => void;
  removeOverlay: (id: string) => void;
  moveOverlay: (from: number, to: number) => void;
  openOverlayModal: (id: string) => void;
  modalOverlayId: string | null;
  closeOverlayModal: () => void;
}

export const HudOverlayContext = createContext<HudOverlayContextType | undefined>(undefined);
export function useHudOverlayContext() {
  const ctx = useContext(HudOverlayContext);
  if (!ctx) throw new Error('useHudOverlayContext must be used within HudOverlayProvider');
  return ctx;
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

export const HudOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overlays, setOverlays] = useState<HudOverlayConfig[]>([]);
  const [modalOverlayId, setModalOverlayId] = useState<string | null>(null);

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
  function removeOverlay(id: string) {
    setOverlays(prev => prev.filter(o => o.id !== id));
  }
  function moveOverlay(from: number, to: number) {
    setOverlays(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }
  function openOverlayModal(id: string) {
    setModalOverlayId(id);
  }
  function closeOverlayModal() {
    setModalOverlayId(null);
  }

  return (
    <HudOverlayContext.Provider value={{ overlays, addOverlay, updateOverlay, removeOverlay, moveOverlay, openOverlayModal, modalOverlayId, closeOverlayModal }}>
      {children}
      {/* Render overlays and modal here for global access */}
      <div id="hud-overlays" style={{ position: 'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 20 }}>
        {overlays.map(overlay => (
          <HudOverlay
            key={overlay.id}
            {...overlay}
            onOpenModal={() => openOverlayModal(overlay.id)}
            onUpdate={update => updateOverlay(overlay.id, update)}
          />
        ))}
        {modalOverlayId && (
          <HudOverlayParameterModal
            overlay={overlays.find(o => o.id === modalOverlayId)!}
            onClose={closeOverlayModal}
            onUpdate={update => updateOverlay(modalOverlayId, update)}
          />
        )}
      </div>
    </HudOverlayContext.Provider>
  );
};