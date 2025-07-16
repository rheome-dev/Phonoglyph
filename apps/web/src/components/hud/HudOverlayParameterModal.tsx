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
  midiMeter: [
    { label: 'Show Note Names', key: 'showNoteNames', type: 'checkbox' },
    { label: 'Color', key: 'color', type: 'color' },
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