import React from 'react';
import { PortalModal } from '../ui/portal-modal';
import { DroppableParameter } from '../ui/droppable-parameter';

const OVERLAY_SETTINGS: Record<string, { label: string; key: string; type: string; options?: any[] }[]> = {
  waveform: [
    { label: 'Color', key: 'color', type: 'color' },
    { label: 'Line Width', key: 'lineWidth', type: 'number' },
  ],
  spectrogram: [
    { label: 'Color Scheme', key: 'colorScheme', type: 'select', options: ['rainbow', 'fire', 'ice'] },
    { label: 'FFT Size', key: 'fftSize', type: 'number' },
  ],
  peakMeter: [
    { label: 'Peak Color', key: 'peakColor', type: 'color' },
    { label: 'Hold Time (ms)', key: 'holdTime', type: 'number' },
  ],
  stereometer: [
    { label: 'Mode', key: 'mode', type: 'select', options: ['scaled', 'linear', 'lissajous'] },
    { label: 'Color', key: 'color', type: 'color' },
  ],
  oscilloscope: [
    { label: 'Follow Pitch', key: 'followPitch', type: 'checkbox' },
    { label: 'Color', key: 'color', type: 'color' },
  ],
  spectrumAnalyzer: [
    { label: 'Bar Color', key: 'barColor', type: 'color' },
    { label: 'FFT Size', key: 'fftSize', type: 'number' },
  ],
  midiMeter: [
    { label: 'Show Note Names', key: 'showNoteNames', type: 'checkbox' },
    { label: 'Color', key: 'color', type: 'color' },
  ],
};

export function HudOverlayParameterModal({ overlay, onClose, onUpdate }: any) {
  const settings = overlay.settings || {};
  const settingsConfig = OVERLAY_SETTINGS[overlay.type] || [];

  function handleSettingChange(key: string, value: any) {
    onUpdate({ settings: { ...settings, [key]: value } });
  }

  return (
    <PortalModal title={`${overlay.type.charAt(0).toUpperCase() + overlay.type.slice(1)} Settings`} isOpen={true} onClose={onClose}>
      <div className="space-y-6">
        <div>
          <div className="font-bold text-xs mb-2 text-white/80">Audio Source</div>
          <DroppableParameter
            parameterId={overlay.id}
            label="Audio Stem"
            mappedFeatureId={overlay.stem?.id}
            mappedFeatureName={overlay.stem?.name}
            onFeatureDrop={(_id, featureId, stemType) => {
              onUpdate({ stem: { id: featureId, name: stemType || featureId, stemType } });
            }}
            onFeatureUnmap={(_id) => onUpdate({ stem: null })}
          >
            <div className="text-xs text-white/80">Drop a stem here to drive this overlay</div>
          </DroppableParameter>
        </div>
        {settingsConfig.length > 0 && (
          <div>
            <div className="font-bold text-xs mb-2 text-white/80">Overlay Settings</div>
            <div className="space-y-3">
              {settingsConfig.map(setting => (
                <div key={setting.key} className="flex items-center gap-2">
                  <label className="text-xs text-white/70 w-32">{setting.label}</label>
                  {setting.type === 'color' && (
                    <input type="color" value={settings[setting.key] || '#00ffff'} onChange={e => handleSettingChange(setting.key, e.target.value)} />
                  )}
                  {setting.type === 'number' && (
                    <input type="number" value={settings[setting.key] || ''} onChange={e => handleSettingChange(setting.key, Number(e.target.value))} className="w-20 px-1 rounded" />
                  )}
                  {setting.type === 'checkbox' && (
                    <input type="checkbox" checked={!!settings[setting.key]} onChange={e => handleSettingChange(setting.key, e.target.checked)} />
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