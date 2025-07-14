import React, { useState } from 'react';
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

export function HudOverlayManager() {
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

  return (
    <div id="hud-overlays" style={{ position: 'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 20 }}>
      <button style={{ position: 'absolute', top: 10, left: 10, zIndex: 30 }} onClick={() => addOverlay('waveform')}>+ Add Waveform Overlay</button>
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