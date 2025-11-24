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
- Only files matching these patterns are included: apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts, apps/web/src/lib/visualizer/core/VisualizerManager.ts, apps/web/src/lib/visualizer/core/MediaLayerManager.ts, apps/web/src/lib/visualizer/core/AudioTextureManager.ts, apps/web/src/lib/visualizer/effects/MetaballsEffect.ts, apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts, apps/web/src/lib/visualizer/effects/EffectDefinitions.ts, apps/web/src/lib/visualizer/effects/EffectRegistry.ts, apps/web/src/components/midi/three-visualizer.tsx, apps/web/src/components/midi/midi-timeline.tsx, apps/web/src/components/midi/midi-controls.tsx, apps/web/src/components/video-composition/UnifiedTimeline.tsx, apps/web/src/components/video-composition/VideoCompositionTimeline.tsx, apps/web/src/components/video-composition/LayerContainer.tsx, apps/web/src/components/video-composition/VideoLayer.tsx, apps/web/src/components/video-composition/ImageLayer.tsx, apps/web/src/components/video-composition/EffectLayer.tsx, apps/web/src/components/video-composition/DraggableFile.tsx, apps/web/src/components/ui/MappingSourcesPanel.tsx, apps/web/src/components/ui/droppable-parameter.tsx, apps/web/src/components/ui/DroppableSlider.tsx, apps/web/src/components/hud/HudOverlayParameterModal.tsx, apps/web/src/lib/video-composition/parameter-calculator.ts, apps/web/src/types/visualizer.ts, apps/web/src/types/video-composition.ts, apps/web/src/types/audio-analysis.ts, apps/web/src/types/midi.ts, apps/web/src/types/stem-visualization.ts, apps/web/src/app/creative-visualizer/page.tsx, apps/web/src/components/auto-save/creative-visualizer-with-auto-save.tsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
apps/
  web/
    src/
      app/
        creative-visualizer/
          page.tsx
      components/
        auto-save/
          creative-visualizer-with-auto-save.tsx
        hud/
          HudOverlayParameterModal.tsx
        midi/
          midi-controls.tsx
          midi-timeline.tsx
          three-visualizer.tsx
        ui/
          droppable-parameter.tsx
          DroppableSlider.tsx
          MappingSourcesPanel.tsx
        video-composition/
          DraggableFile.tsx
          EffectLayer.tsx
          ImageLayer.tsx
          LayerContainer.tsx
          UnifiedTimeline.tsx
          VideoCompositionTimeline.tsx
          VideoLayer.tsx
      lib/
        video-composition/
          parameter-calculator.ts
        visualizer/
          core/
            AudioTextureManager.ts
            MediaLayerManager.ts
            MultiLayerCompositor.ts
            VisualizerManager.ts
          effects/
            EffectDefinitions.ts
            EffectRegistry.ts
            MetaballsEffect.ts
            ParticleNetworkEffect.ts
      types/
        audio-analysis.ts
        midi.ts
        stem-visualization.ts
        video-composition.ts
        visualizer.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="apps/web/src/components/auto-save/creative-visualizer-with-auto-save.tsx">
"use client"

import React from 'react'
import { AutoSaveProvider } from './auto-save-provider'

interface CreativeVisualizerWithAutoSaveProps {
  projectId: string
  children: React.ReactNode
}

export function CreativeVisualizerWithAutoSave({ 
  projectId, 
  children 
}: CreativeVisualizerWithAutoSaveProps) {
  return (
    <AutoSaveProvider projectId={projectId}>
      {children}
    </AutoSaveProvider>
  )
}
</file>

<file path="apps/web/src/components/hud/HudOverlayParameterModal.tsx">
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
</file>

<file path="apps/web/src/components/midi/midi-controls.tsx">
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, SkipBack, SkipForward, Settings, ZoomIn, ZoomOut } from 'lucide-react';

interface VisualizationSettings {
  colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
  pixelsPerSecond: number;
  showTrackLabels: boolean;
  showVelocity: boolean;
  minKey: number;
  maxKey: number;
}

interface MidiControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  settings: VisualizationSettings;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
}

export function MidiControls({
  isPlaying,
  currentTime,
  duration,
  zoom,
  settings,
  onPlayPause,
  onTimeChange,
  onZoomChange,
  onSettingsChange
}: MidiControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleStop = () => {
    onTimeChange(0);
  };

  const handleSkipBack = () => {
    onTimeChange(Math.max(0, currentTime - 10));
  };

  const handleSkipForward = () => {
    onTimeChange(Math.min(duration, currentTime + 10));
  };

  const handleZoomIn = () => {
    onZoomChange(zoom * 1.2);
  };

  const handleZoomOut = () => {
    onZoomChange(zoom / 1.2);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="midi-controls flex items-center justify-between p-4 h-full">
      {/* Transport Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipBack}
          className="h-8 w-8 p-0"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkipForward}
          className="h-8 w-8 p-0"
        >
          <SkipForward className="h-4 w-4" />
        </Button>

        {/* Time Display */}
        <div className="ml-4 font-mono text-sm text-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Badge variant="secondary" className="font-mono text-xs min-w-[60px] text-center">
          {(zoom * 100).toFixed(0)}%
        </Badge>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 p-0 ml-2"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg z-50">
          <h4 className="font-semibold text-gray-900 mb-3">Visualization Settings</h4>
          
          {/* Color Scheme */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Scheme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['sage', 'slate', 'dusty-rose', 'mixed'] as const).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => onSettingsChange({ ...settings, colorScheme: scheme })}
                  className={`p-2 text-sm rounded border text-left capitalize ${
                    settings.colorScheme === scheme
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {scheme}
                </button>
              ))}
            </div>
          </div>

          {/* Pixels Per Second */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Scale: {settings.pixelsPerSecond}px/s
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={settings.pixelsPerSecond}
              onChange={(e) => onSettingsChange({ 
                ...settings, 
                pixelsPerSecond: parseInt(e.target.value) 
              })}
              className="w-full"
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showTrackLabels}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  showTrackLabels: e.target.checked 
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Show Track Labels</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showVelocity}
                onChange={(e) => onSettingsChange({ 
                  ...settings, 
                  showVelocity: e.target.checked 
                })}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Show Velocity</span>
            </label>
          </div>

          {/* Key Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Range: {settings.minKey} - {settings.maxKey}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Min Key</label>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.minKey}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    minKey: Math.min(parseInt(e.target.value), settings.maxKey)
                  })}
                  className="w-full p-1 text-sm border border-gray-200 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Key</label>
                <input
                  type="number"
                  min={0}
                  max={127}
                  value={settings.maxKey}
                  onChange={(e) => onSettingsChange({ 
                    ...settings, 
                    maxKey: Math.max(parseInt(e.target.value), settings.minKey)
                  })}
                  className="w-full p-1 text-sm border border-gray-200 rounded"
                />
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
</file>

<file path="apps/web/src/components/midi/midi-timeline.tsx">
'use client';

import React, { useRef, useCallback } from 'react';

interface TempoChange {
  tick: number;
  bpm: number;
  microsecondsPerQuarter: number;
}

interface MidiTimelineProps {
  duration: number;
  currentTime: number;
  pixelsPerSecond: number;
  zoom: number;
  tempoChanges: TempoChange[];
  onTimeChange: (time: number) => void;
}

export function MidiTimeline({
  duration,
  currentTime,
  pixelsPerSecond,
  zoom,
  tempoChanges,
  onTimeChange
}: MidiTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const width = Math.max(1200, duration * pixelsPerSecond * zoom);

  // Convert time to X position
  const timeToX = useCallback((time: number) => {
    return time * pixelsPerSecond * zoom;
  }, [pixelsPerSecond, zoom]);

  // Convert X position to time
  const xToTime = useCallback((x: number) => {
    return x / (pixelsPerSecond * zoom);
  }, [pixelsPerSecond, zoom]);

  // Handle timeline click
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = xToTime(x);
    
    onTimeChange(Math.max(0, Math.min(duration, time)));
  }, [xToTime, onTimeChange, duration]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Generate time markers
  const generateTimeMarkers = useCallback(() => {
    const markers = [];
    const interval = zoom > 2 ? 1 : zoom > 1 ? 5 : 10; // Adjust interval based on zoom
    
    for (let time = 0; time <= duration; time += interval) {
      const x = timeToX(time);
      const isMinute = time % 60 === 0;
      
      markers.push({
        time,
        x,
        label: formatTime(time),
        isMajor: isMinute || interval <= 1
      });
    }
    
    return markers;
  }, [duration, zoom, timeToX, formatTime]);

  const timeMarkers = generateTimeMarkers();

  return (
    <div 
      ref={timelineRef}
      className="midi-timeline relative w-full h-full bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer"
      style={{ width: `${width}px` }}
      onClick={handleTimelineClick}
    >
      {/* Time markers */}
      <div className="absolute inset-0">
        {timeMarkers.map((marker, index) => (
          <div
            key={index}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${marker.x}px` }}
          >
            {/* Tick mark */}
            <div
              className={`bg-gray-400 ${
                marker.isMajor ? 'w-0.5 h-4' : 'w-px h-2'
              }`}
            />
            
            {/* Time label */}
            {marker.isMajor && (
              <span className="text-xs text-gray-600 font-mono mt-1 select-none">
                {marker.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tempo changes */}
      <div className="absolute top-0 w-full h-full">
        {tempoChanges.map((tempoChange, index) => {
          // Convert tick to time (simplified - would need actual conversion)
          const time = (tempoChange.tick / 480) * (60 / 120); // Assuming 480 PPQ and 120 BPM base
          const x = timeToX(time);
          
          return (
            <div
              key={index}
              className="absolute top-0 flex flex-col items-center group"
              style={{ left: `${x}px` }}
            >
              {/* Tempo marker */}
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-1" />
              
              {/* Tempo tooltip */}
              <div className="absolute top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {tempoChange.bpm} BPM
              </div>
            </div>
          );
        })}
      </div>

      {/* Current time indicator */}
      <div
        className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
        style={{ left: `${timeToX(currentTime)}px` }}
      >
        {/* Playhead triangle */}
        <div className="absolute -top-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-red-500" />
        
        {/* Current time label */}
        <div className="absolute top-5 -left-8 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Background grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        {timeMarkers
          .filter(marker => marker.isMajor)
          .map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 w-px h-full bg-gray-200"
              style={{ left: `${marker.x}px` }}
            />
          ))}
      </div>

      {/* Hover time indicator */}
      <div className="absolute inset-0 group">
        <div className="absolute top-0 w-px h-full bg-blue-400 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
      </div>
    </div>
  );
}
</file>

<file path="apps/web/src/components/video-composition/DraggableFile.tsx">
import React from 'react';
import { useDrag } from 'react-dnd';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableFileProps {
  file: {
    id: string;
    name: string;
    file_type: string;
    file_size?: number;
    uploading?: boolean;
  };
  onClick?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  className?: string;
}

export const DraggableFile: React.FC<DraggableFileProps> = ({
  file,
  onClick,
  onDelete,
  isSelected = false,
  className
}) => {
  const getFileType = () => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext || "")) return "video";
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext || "")) return "image";
    if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext || "")) return "audio";
    if (["mid", "midi"].includes(ext || "")) return "midi";
    return "unknown";
  };

  const getIcon = () => {
    const type = getFileType();
    switch (type) {
      case "video": return <span className="text-xs">🎬</span>;
      case "image": return <span className="text-xs">🖼️</span>;
      case "audio": return <span className="text-xs">🎵</span>;
      case "midi": return <span className="text-xs">🎹</span>;
      default: return <span className="text-xs">📄</span>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const dragResult = useDrag({
    type: getFileType().toUpperCase() + '_FILE',
    item: {
      type: getFileType().toUpperCase() + '_FILE',
      id: file.id,
      name: file.name,
      fileType: getFileType(),
      src: `/api/files/${file.id}/download`,
      size: file.file_size,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const { isDragging } = dragResult[0];
  const drag = dragResult[1];
  const dragRef = React.useCallback((node: HTMLDivElement | null) => { drag(node); }, [drag]);

  return (
    <div
      ref={dragRef}
      className={cn(
        "flex items-center border border-stone-400 bg-stone-300 text-black font-mono text-xs h-8 px-2 gap-2 select-none transition-colors duration-100",
        "hover:bg-stone-900 hover:text-stone-100 hover:border-stone-500 cursor-grab active:cursor-grabbing",
        isSelected && "bg-stone-900 text-stone-100 border-stone-500",
        isDragging && "relative z-20 bg-white/30 backdrop-blur-md border border-white/40 shadow-2xl text-black",
        className
      )}
      style={{ borderRadius: 2, minHeight: 32, maxHeight: 32 }}
      onClick={onClick}
      tabIndex={0}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{getIcon()}</div>
      {/* Name */}
      <div className="truncate flex-1 font-medium" title={file.name} style={{ maxWidth: 140 }}>{file.name}</div>
      {/* Delete */}
      <button
        className="ml-1 p-0.5 text-black hover:text-red-600 border-none bg-transparent focus:outline-none"
        style={{ lineHeight: 1, borderRadius: 1 }}
        tabIndex={-1}
        onClick={e => { e.stopPropagation(); onDelete && onDelete(); }}
        aria-label="Delete file"
      >
        <Trash2 size={12} strokeWidth={2} />
      </button>
      {/* Loading bar if uploading */}
      {file.uploading && (
        <div className="absolute left-0 bottom-0 w-full h-0.5 bg-gradient-to-r from-black to-gray-400 animate-pulse" />
      )}
    </div>
  );
};
</file>

<file path="apps/web/src/components/video-composition/EffectLayer.tsx">
'use client';

import React from 'react';
import type { AudioBinding, MIDIBinding, EffectType } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { 
  calculateOpacity, 
  calculateScale, 
  calculatePosition 
} from '@/lib/video-composition/parameter-calculator';

interface EffectLayerProps {
  effectType: EffectType;
  settings: any; // Effect-specific settings
  position: { x: number; y: number };
  scale: { x: number; y: number };
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime?: number;
  endTime?: number;
  currentTime?: number;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
  onEffectUpdate?: (effectId: string, settings: any) => void;
}

export const EffectLayer: React.FC<EffectLayerProps> = ({
  effectType,
  settings,
  position,
  scale,
  opacity,
  audioBindings,
  midiBindings,
  zIndex,
  blendMode,
  startTime = 0,
  endTime,
  currentTime = 0,
  audioFeatures,
  midiData,
  onEffectUpdate
}) => {
  // Check if this layer should be visible based on timeline
  const isVisible = !endTime || (currentTime >= startTime && currentTime <= endTime);
  
  // Real-time parameter calculation
  const currentOpacity = calculateOpacity(opacity, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentScale = calculateScale(scale, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentPosition = calculatePosition(position, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  
  // Get the appropriate Three.js effect component
  const getEffectComponent = (type: EffectType) => {
    // This would integrate with the existing Three.js effects
    // For now, return a placeholder div
    return () => (
      <div className="effect-placeholder bg-gradient-to-r from-purple-500 to-pink-500 w-full h-full rounded-lg flex items-center justify-center">
        <span className="text-white text-xs font-mono">{type}</span>
      </div>
    );
  };
  
  const EffectComponent = getEffectComponent(effectType);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className="effect-layer absolute"
      style={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        transform: `translate(-50%, -50%) scale(${currentScale.x}, ${currentScale.y})`,
        opacity: currentOpacity,
        zIndex,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        width: '200px', // Default size, can be made configurable
        height: '150px'
      }}
    >
      <EffectComponent />
    </div>
  );
};
</file>

<file path="apps/web/src/components/video-composition/ImageLayer.tsx">
'use client';

import React from 'react';
import type { AudioBinding, MIDIBinding } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { 
  calculateOpacity, 
  calculateScale, 
  calculateRotation, 
  calculatePosition 
} from '@/lib/video-composition/parameter-calculator';

interface ImageLayerProps {
  src: string;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime?: number;
  endTime?: number;
  currentTime?: number;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
}

export const ImageLayer: React.FC<ImageLayerProps> = ({
  src,
  position,
  scale,
  rotation,
  opacity,
  audioBindings,
  midiBindings,
  zIndex,
  blendMode,
  startTime = 0,
  endTime,
  currentTime = 0,
  audioFeatures,
  midiData
}) => {
  // Check if this layer should be visible based on timeline
  const isVisible = !endTime || (currentTime >= startTime && currentTime <= endTime);
  
  // Real-time parameter calculation
  const currentOpacity = calculateOpacity(opacity, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentScale = calculateScale(scale, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentRotation = calculateRotation(rotation, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentPosition = calculatePosition(position, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className="image-layer absolute"
      style={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        transform: `translate(-50%, -50%) scale(${currentScale.x}, ${currentScale.y}) rotate(${currentRotation}deg)`,
        opacity: currentOpacity,
        zIndex,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        width: '200px', // Default size, can be made configurable
        height: '150px'
      }}
    >
      <img 
        src={src} 
        alt="Layer"
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};
</file>

<file path="apps/web/src/components/video-composition/LayerContainer.tsx">
'use client';

import React from 'react';
import { VideoLayer } from './VideoLayer';
import { ImageLayer } from './ImageLayer';
import { EffectLayer } from './EffectLayer';
import type { Layer } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';

interface LayerContainerProps {
  layers: Layer[];
  width: number;
  height: number;
  currentTime: number;
  isPlaying: boolean;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
  onLayerDelete?: (layerId: string) => void;
}

export const LayerContainer: React.FC<LayerContainerProps> = ({
  layers,
  width,
  height,
  currentTime,
  isPlaying,
  audioFeatures,
  midiData,
  onLayerUpdate,
  onLayerDelete
}) => {
  // Sort layers by z-index for proper stacking
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  
  return (
    <div 
      className="layer-container relative overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: 'transparent'
      }}
    >
      {sortedLayers.map((layer) => {
        const commonProps = {
          key: layer.id,
          startTime: layer.startTime,
          endTime: layer.endTime,
          currentTime,
          isPlaying,
          audioFeatures,
          midiData,
          position: layer.position,
          scale: layer.scale,
          rotation: layer.rotation,
          opacity: layer.opacity,
          audioBindings: layer.audioBindings,
          midiBindings: layer.midiBindings,
          zIndex: layer.zIndex,
          blendMode: layer.blendMode
        };
        
        switch (layer.type) {
          case 'video':
            return (
              <VideoLayer
                {...commonProps}
                src={layer.src!}
              />
            );
          case 'image':
            return (
              <ImageLayer
                {...commonProps}
                src={layer.src!}
              />
            );
          case 'effect':
            return (
              <EffectLayer
                {...commonProps}
                effectType={layer.effectType!}
                settings={layer.settings}
                onEffectUpdate={(effectId, settings) => {
                  onLayerUpdate?.(layer.id, { settings });
                }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
};
</file>

<file path="apps/web/src/lib/visualizer/core/AudioTextureManager.ts">
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

<file path="apps/web/src/types/midi.ts">
// Re-export from centralized types package
export * from 'phonoglyph-types'
</file>

<file path="apps/web/src/types/stem-visualization.ts">
// Simple types for the current stem visualization implementation
// These are the only types actually being used in the working system

export interface StemVisualizationMapping {
  stemType: 'drums' | 'bass' | 'vocals' | 'piano' | 'other' | 'master';
  enabled: boolean;
  priority: number;
  globalMultiplier: number;
  crossfade: number;
  solo: boolean;
  mute: boolean;
}

export interface VisualizationPreset {
  id: string;
  name: string;
  description: string;
  category: 'electronic' | 'rock' | 'classical' | 'ambient' | 'custom';
  tags: string[];
  mappings: Record<string, StemVisualizationMapping>;
  defaultSettings: {
    masterIntensity: number;
    transitionSpeed: number;
    backgroundAlpha: number;
    particleCount: number;
    qualityLevel: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
  userId?: string;
  isDefault: boolean;
  usageCount: number;
}

// Simple default preset for the current implementation
export const DEFAULT_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom' as const,
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium' as const
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  }
];
</file>

<file path="apps/web/src/components/ui/DroppableSlider.tsx">
'use client';

import React from 'react';
import { useDrop } from 'react-dnd';
import { Slider } from './slider';
import { Label } from './label';
import { Button } from './button';
import { X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/utils';

interface DroppableSliderProps {
  parameterId: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  mappedFeatureName?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function DroppableSlider({
  parameterId,
  label,
  value,
  onValueChange,
  onMapFeature,
  onUnmapFeature,
  mappedFeatureName,
  className,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
}: DroppableSliderProps) {
  // Wrap useDrop in try-catch to handle context errors
  let dropState = { isOver: false, canDrop: false };
  let dropRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dropResult = useDrop({
      accept: 'FEATURE_NODE',
      drop: (item: { id: string; name: string }) => {
        onMapFeature(parameterId, item.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });
    
    dropState = dropResult[0];
    const drop = dropResult[1];
    
    const dropFunction = drop;
    dropRef = React.useCallback((node: HTMLDivElement | null) => {
      dropFunction(node);
    }, [dropFunction]);
  } catch (error) {
    // If drop context is not available, just use a no-op
    debugLog.warn('Drop context not available for DroppableSlider:', error);
  }

  const isMapped = !!mappedFeatureName;
  const isDragOver = dropState.isOver && dropState.canDrop;

  return (
    <div
      ref={dropRef}
      className={cn(
        "space-y-2 p-3 rounded-lg border transition-all duration-200",
        isMapped 
          ? "bg-blue-500/10 border-blue-500/30" 
          : "bg-stone-800/50 border-stone-700",
        isDragOver && "bg-blue-500/20 border-blue-500/50 scale-105",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-stone-300">
          {label}
        </Label>
        {isMapped && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300">
              <Zap className="h-3 w-3" />
              {mappedFeatureName}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnmapFeature(parameterId)}
              className="h-6 w-6 p-0 text-stone-400 hover:text-stone-200"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onValueChange(newValue)}
        min={min}
        max={max}
        step={step}
        disabled={disabled || isMapped}
        className={cn(
          isMapped && "opacity-60",
          isDragOver && "ring-2 ring-blue-500/50"
        )}
      />
      
      {isDragOver && !isMapped && (
        <div className="text-xs text-blue-300 text-center py-1">
          Drop to map feature
        </div>
      )}
    </div>
  );
}
</file>

<file path="apps/web/src/components/video-composition/VideoCompositionTimeline.tsx">
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Video, Image, Zap, Trash2, Settings } from 'lucide-react';
import { useDrop } from 'react-dnd';
import type { Layer, LayerType } from '@/types/video-composition';

interface VideoCompositionTimelineProps {
  layers: Layer[];
  currentTime: number;
  duration: number;
  onLayerAdd: (layer: Layer) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerSelect: (layerId: string) => void;
  selectedLayerId?: string;
  className?: string;
}

export const VideoCompositionTimeline: React.FC<VideoCompositionTimelineProps> = ({
  layers,
  currentTime,
  duration,
  onLayerAdd,
  onLayerUpdate,
  onLayerDelete,
  onLayerSelect,
  selectedLayerId,
  className
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Drop zone for dragging assets from file browser
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['VIDEO_FILE', 'IMAGE_FILE', 'EFFECT_CARD'],
    drop: (item: any) => {
      handleAssetDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const handleAssetDrop = (item: any) => {
    let newLayer: Layer;
    
    switch (item.type) {
      case 'VIDEO_FILE':
        newLayer = createVideoLayer(item);
        break;
      case 'IMAGE_FILE':
        newLayer = createImageLayer(item);
        break;
      case 'EFFECT_CARD':
        newLayer = createEffectLayer(item);
        break;
      default:
        return;
    }
    
    onLayerAdd(newLayer);
  };

  const createVideoLayer = (item: any): Layer => ({
    id: `video-${Date.now()}`,
    type: 'video',
    src: item.src,
    position: { x: 50, y: 50 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    audioBindings: [],
    midiBindings: [],
    zIndex: layers.length,
    blendMode: 'normal',
    startTime: 0,
    endTime: duration,
    duration: duration
  });

  const createImageLayer = (item: any): Layer => ({
    id: `image-${Date.now()}`,
    type: 'image',
    src: item.src,
    position: { x: 50, y: 50 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    audioBindings: [],
    midiBindings: [],
    zIndex: layers.length,
    blendMode: 'normal',
    startTime: 0,
    endTime: duration,
    duration: duration
  });

  const createEffectLayer = (item: any): Layer => ({
    id: `effect-${Date.now()}`,
    type: 'effect',
    effectType: item.effectId,
    settings: item.settings || {},
    position: { x: 50, y: 50 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    opacity: 1,
    audioBindings: [],
    midiBindings: [],
    zIndex: layers.length,
    blendMode: 'normal',
    startTime: 0,
    endTime: duration,
    duration: duration
  });

  const timeToX = (time: number) => {
    return (time / duration) * 100;
  };

  const xToTime = (x: number) => {
    return (x / 100) * duration;
  };

  const getLayerIcon = (type: LayerType) => {
    switch (type) {
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'image':
        return <Image className="h-3 w-3" />;
      case 'effect':
        return <Zap className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getLayerColor = (type: LayerType) => {
    switch (type) {
      case 'video':
        return 'bg-blue-500';
      case 'image':
        return 'bg-green-500';
      case 'effect':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className={`bg-stone-900/70 border border-stone-700 rounded-lg overflow-hidden backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Composition Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-stone-400">
              {layers.length} layers
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 space-y-2">
        {/* Drop zone */}
        <div
          ref={drop as unknown as React.Ref<HTMLDivElement>}
          className={`relative h-16 border-2 border-dashed rounded-lg transition-all ${
            isOver && canDrop 
              ? "border-emerald-400 bg-emerald-900/20" 
              : "border-stone-600 hover:border-stone-500"
          }`}
        >
          {isOver && canDrop && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-emerald-400 text-sm font-medium">
                Drop asset here
              </div>
            </div>
          )}
          
          {layers.length === 0 && !isOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-stone-500">
                <Plus className="h-6 w-6 mx-auto mb-2" />
                <div className="text-xs">Drag video/image assets here</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Layer tracks */}
        {layers.map((layer) => {
          const startX = timeToX(layer.startTime);
          const width = timeToX(layer.endTime - layer.startTime);
          const isActive = currentTime >= layer.startTime && currentTime <= layer.endTime;
          const isSelected = selectedLayerId === layer.id;
          
          return (
            <div
              key={layer.id}
              className={`relative h-12 rounded border-2 cursor-pointer transition-all group ${
                isSelected 
                  ? "bg-emerald-500/80 border-emerald-400 shadow-emerald-400/50" 
                  : isActive
                  ? "bg-stone-700/80 border-stone-600"
                  : "bg-stone-800/80 border-stone-700 hover:border-stone-500"
              }`}
              style={{
                left: `${startX}%`,
                width: `${width}%`,
                minWidth: '60px'
              }}
              onClick={() => onLayerSelect(layer.id)}
            >
              <div className="flex items-center justify-between h-full px-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`p-1 rounded ${getLayerColor(layer.type)}`}>
                    {getLayerIcon(layer.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {layer.type === 'video' || layer.type === 'image' 
                        ? layer.src?.split('/').pop()?.split('.')[0] || 'Untitled'
                        : layer.effectType || 'Effect'
                      }
                    </div>
                    <div className="text-xs text-stone-400">
                      {layer.startTime.toFixed(1)}s - {layer.endTime.toFixed(1)}s
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-stone-400 hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Note: Layer settings functionality pending implementation
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-stone-400 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerDelete(layer.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Current time indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none z-10"
          style={{ left: `${timeToX(currentTime)}%` }}
        />
      </CardContent>
    </Card>
  );
};
</file>

<file path="apps/web/src/components/video-composition/VideoLayer.tsx">
'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { AudioBinding, MIDIBinding } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { 
  calculateOpacity, 
  calculateScale, 
  calculateRotation, 
  calculatePosition 
} from '@/lib/video-composition/parameter-calculator';
import { debugLog } from '@/lib/utils';

interface VideoLayerProps {
  src: string;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime?: number;
  endTime?: number;
  currentTime?: number;
  isPlaying?: boolean;
  audioFeatures?: AudioAnalysisData;
  midiData?: LiveMIDIData;
}

export const VideoLayer: React.FC<VideoLayerProps> = ({
  src,
  position,
  scale,
  rotation,
  opacity,
  audioBindings,
  midiBindings,
  zIndex,
  blendMode,
  startTime = 0,
  endTime,
  currentTime = 0,
  isPlaying = false,
  audioFeatures,
  midiData
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Check if this layer should be visible based on timeline
  const isVisible = !endTime || (currentTime >= startTime && currentTime <= endTime);
  
  // Real-time parameter calculation
  const currentOpacity = calculateOpacity(opacity, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentScale = calculateScale(scale, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentRotation = calculateRotation(rotation, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  const currentPosition = calculatePosition(position, audioBindings, audioFeatures || { frequencies: [], timeData: [], volume: 0, bass: 0, mid: 0, treble: 0 }, midiBindings, midiData || { activeNotes: [], currentTime: 0, tempo: 120, totalNotes: 0, trackActivity: {} });
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => setVideoCurrentTime(video.currentTime);
    const handleLoadedData = () => setIsLoaded(true);
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);
  
  // Sync video playback with timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;
    
    if (isPlaying) {
      video.play().catch(debugLog.error);
    } else {
      video.pause();
    }
  }, [isPlaying, isLoaded]);
  
  // Sync video time with timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;
    
    const targetTime = currentTime - startTime;
    if (Math.abs(video.currentTime - targetTime) > 0.1) {
      video.currentTime = Math.max(0, targetTime);
    }
  }, [currentTime, startTime, isLoaded]);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div 
      className="video-layer absolute"
      style={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        transform: `translate(-50%, -50%) scale(${currentScale.x}, ${currentScale.y}) rotate(${currentRotation}deg)`,
        opacity: currentOpacity,
        zIndex,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        width: '200px', // Default size, can be made configurable
        height: '150px'
      }}
    >
      <video 
        ref={videoRef}
        src={src} 
        autoPlay={false}
        loop 
        muted 
        playsInline
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'cover',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};
</file>

<file path="apps/web/src/lib/video-composition/parameter-calculator.ts">
import type { AudioBinding, MIDIBinding } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';

export function mapRange(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  return ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
}

export function applyBlendMode(
  baseValue: number,
  newValue: number,
  blendMode: 'add' | 'multiply' | 'replace'
): number {
  switch (blendMode) {
    case 'add':
      return baseValue + newValue;
    case 'multiply':
      return baseValue * newValue;
    case 'replace':
      return newValue;
    default:
      return newValue;
  }
}

export function getMIDIValue(midiData: LiveMIDIData, source: string): number | undefined {
  switch (source) {
    case 'velocity':
      return midiData.activeNotes.length > 0 
        ? midiData.activeNotes.reduce((sum, note) => sum + note.velocity, 0) / midiData.activeNotes.length
        : 0;
    case 'cc':
      // For now, return a mock CC value - would come from actual MIDI CC data
      return Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
    case 'pitchBend':
      // Mock pitch bend value
      return Math.sin(Date.now() * 0.002) * 0.5 + 0.5;
    case 'channelPressure':
      // Mock channel pressure value
      return Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
    default:
      return undefined;
  }
}

export function calculateOpacity(
  baseOpacity: number,
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): number {
  let opacity = baseOpacity;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      // Apply modulation amount (default to 1.0 if not specified)
      const modulationAmount = binding.modulationAmount ?? 1.0;
      const modulatedValue = mappedValue * modulationAmount;
      opacity = applyBlendMode(opacity, modulatedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      opacity = applyBlendMode(opacity, mappedValue, binding.blendMode);
    }
  });
  
  return Math.max(0, Math.min(1, opacity));
}

export function calculateScale(
  baseScale: { x: number; y: number },
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): { x: number; y: number } {
  let scaleX = baseScale.x;
  let scaleY = baseScale.y;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      // Apply modulation amount (default to 1.0 if not specified)
      const modulationAmount = binding.modulationAmount ?? 1.0;
      const modulatedValue = mappedValue * modulationAmount;
      scaleX = applyBlendMode(scaleX, modulatedValue, binding.blendMode);
      scaleY = applyBlendMode(scaleY, modulatedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      scaleX = applyBlendMode(scaleX, mappedValue, binding.blendMode);
      scaleY = applyBlendMode(scaleY, mappedValue, binding.blendMode);
    }
  });
  
  return {
    x: Math.max(0.1, Math.min(5, scaleX)),
    y: Math.max(0.1, Math.min(5, scaleY))
  };
}

export function calculateRotation(
  baseRotation: number,
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): number {
  let rotation = baseRotation;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      // Apply modulation amount (default to 1.0 if not specified)
      const modulationAmount = binding.modulationAmount ?? 1.0;
      const modulatedValue = mappedValue * modulationAmount;
      rotation = applyBlendMode(rotation, modulatedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      rotation = applyBlendMode(rotation, mappedValue, binding.blendMode);
    }
  });
  
  return rotation % 360;
}

export function calculatePosition(
  basePosition: { x: number; y: number },
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): { x: number; y: number } {
  let x = basePosition.x;
  let y = basePosition.y;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      // Apply modulation amount (default to 1.0 if not specified)
      const modulationAmount = binding.modulationAmount ?? 1.0;
      const modulatedValue = mappedValue * modulationAmount;
      x = applyBlendMode(x, modulatedValue, binding.blendMode);
      y = applyBlendMode(y, modulatedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      x = applyBlendMode(x, mappedValue, binding.blendMode);
      y = applyBlendMode(y, mappedValue, binding.blendMode);
    }
  });
  
  return { x, y };
}
</file>

<file path="apps/web/src/lib/visualizer/core/MediaLayerManager.ts">
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

<file path="apps/web/src/lib/visualizer/effects/EffectRegistry.ts">
import { debugLog } from '@/lib/utils';
import type { VisualEffect } from '@/types/visualizer';

export interface EffectConstructor {
  new (config?: any): VisualEffect;
}

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  version?: string;
  author?: string;
  constructor: EffectConstructor;
  defaultConfig?: any;
}

export class EffectRegistry {
  private static effects = new Map<string, EffectDefinition>();

  static register(effectDef: EffectDefinition): void {
    if (!effectDef?.id || !effectDef?.constructor) {
      debugLog.warn('Attempted to register invalid effect definition', effectDef);
      return;
    }
    this.effects.set(effectDef.id, effectDef);
    debugLog.log(`[EffectRegistry] Registered effect: ${effectDef.id}`);
  }

  static createEffect(effectId: string, config?: any): VisualEffect | null {
    const effectDef = this.effects.get(effectId);
    if (!effectDef) {
      debugLog.warn(`[EffectRegistry] Effect not found: ${effectId}`);
      return null;
    }
    try {
      return new effectDef.constructor(config ?? effectDef.defaultConfig);
    } catch (error) {
      debugLog.error(`[EffectRegistry] Failed to create effect ${effectId}:`, error);
      return null;
    }
  }

  static getAvailableEffects(): EffectDefinition[] {
    return Array.from(this.effects.values());
  }

  static getEffectById(id: string): EffectDefinition | null {
    return this.effects.get(id) ?? null;
  }

  static getRegisteredEffectIds(): string[] {
    return Array.from(this.effects.keys());
  }
}
</file>

<file path="apps/web/src/types/audio-analysis.ts">
export interface AnalysisParams {
  transientThreshold: number;
  onsetThreshold: number;
  chromaSmoothing: number;
  rmsWindowSize: number;
  pitchConfidence: number;
  minNoteDuration: number;
}

export interface TransientData {
  time: number;
  intensity: number;
  frequency: number;
}

export interface ChromaData {
  time: number;
  pitch: number;
  confidence: number;
  note: string;
}

export interface RMSData {
  time: number;
  value: number;
}

export type AnalysisMethod = 'original' | 'enhanced' | 'both';
</file>

<file path="apps/web/src/types/visualizer.ts">
import * as THREE from 'three';

export interface VisualEffect {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
  // Effects are now self-contained and manage their own scene and camera
  init(renderer: THREE.WebGLRenderer): void;
  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void;
  destroy(): void;

  // Expose internal scene and camera for the compositor
  getScene(): THREE.Scene;
  getCamera(): THREE.Camera;
}

export interface AudioAnalysisData {
  frequencies: number[];
  timeData: number[];
  volume: number;
  bass: number;
  mid: number;
  treble: number;
}

export interface LiveMIDIData {
  activeNotes: Array<{
    note: number;
    velocity: number;
    startTime: number;
    track: string;
  }>;
  currentTime: number;
  tempo: number;
  totalNotes: number;
  trackActivity: Record<string, boolean>;
}

export interface MetaballConfig {
  trailLength: number;
  baseRadius: number;
  smoothingFactor: number;
  colorPalette: string[];
  animationSpeed: number;
  noiseIntensity: number;
  highlightColor: [number, number, number];
}

export interface AspectRatioConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  maxWidth?: string;
  maxHeight?: string;
  className?: string;
}

export interface VisualizerConfig {
  canvas: {
    width: number;
    height: number;
    pixelRatio?: number;
  };
  aspectRatio?: AspectRatioConfig;
  effects?: VisualEffect[];
  performance?: {
    targetFPS?: number;
    enableBloom?: boolean;
    enableShadows?: boolean;
  };
  midi: {
    velocitySensitivity: number;
    noteTrailDuration: number;
    trackColorMapping: Record<string, string>;
  };
}

export interface VisualizerControls {
  global: {
    intensity: number;
    colorShift: number;
    timeScale: number;
    resolution: number;
  };
  metaballs: MetaballConfig;
  particles: {
    count: number;
    size: number;
    speed: number;
    physics: boolean;
  };
  postProcessing: {
    bloom: number;
    contrast: number;
    saturation: number;
    noise: number;
  };
}

export type EffectType = 'metaballs' | 'particles' | 'waveforms' | 'geometry' | 'shaders' | 'postfx';

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  type: EffectType;
  config: Partial<VisualizerControls>;
  tags: string[];
}
</file>

<file path="apps/web/src/lib/visualizer/effects/EffectDefinitions.ts">
import { EffectRegistry } from './EffectRegistry';
import { MetaballsEffect } from './MetaballsEffect';
import { ParticleNetworkEffect } from './ParticleNetworkEffect';

// Register built-in effects at module import time
EffectRegistry.register({
  id: 'metaballs',
  name: 'MIDI Metaballs',
  description: 'Fluid droplet-like spheres that respond to MIDI notes',
  category: 'organic',
  version: '1.0.0',
  constructor: MetaballsEffect,
  defaultConfig: {}
});

EffectRegistry.register({
  id: 'particleNetwork',
  name: 'Particle Network',
  description: 'Glowing particle network that responds to MIDI and audio',
  category: 'particles',
  version: '1.0.0',
  constructor: ParticleNetworkEffect,
  defaultConfig: {}
});

// Bloom post-processing is now handled by the compositor; remove as an effect
</file>

<file path="apps/web/src/types/video-composition.ts">
import type { AudioAnalysisData, LiveMIDIData } from './visualizer';

export interface AudioBinding {
  feature: keyof AudioAnalysisData;
  inputRange: [number, number];
  outputRange: [number, number];
  blendMode: 'add' | 'multiply' | 'replace';
  modulationAmount?: number; // 0-1, default 1.0 (100%)
}

export interface MIDIBinding {
  source: 'velocity' | 'cc' | 'pitchBend' | 'channelPressure';
  inputRange: [number, number];
  outputRange: [number, number];
  blendMode: 'add' | 'multiply' | 'replace';
}

export interface Layer {
  id: string;
  type: 'video' | 'image' | 'effect';
  src?: string;
  effectType?: EffectType;
  settings?: any;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  opacity: number;
  audioBindings: AudioBinding[];
  midiBindings: MIDIBinding[];
  zIndex: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  startTime: number;
  endTime: number;
  duration: number;
}

export type EffectType = 'metaballs' | 'particles' | 'particleNetwork' | 'midihud' | 'bloom';
export type LayerType = 'video' | 'image' | 'effect';

export interface VideoComposition {
  id: string;
  projectId: string;
  name: string;
  layers: Layer[];
  width: number;
  height: number;
  duration: number;
  fps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerClip {
  id: string;
  layerId: string;
  startTime: number;
  endTime: number;
  parameters: Record<string, any>;
}

export interface CompositionTimeline {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  layers: Layer[];
  clips: LayerClip[];
}
</file>

<file path="apps/web/src/components/ui/MappingSourcesPanel.tsx">
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Zap, Music, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioFeatures, AudioFeature } from '@/hooks/use-audio-features';
import { debugLog } from '@/lib/utils';

// Enhanced FeatureNode with live meter
const FeatureNode = ({ 
  feature, 
  category, 
  currentTime, 
  cachedAnalysis,
  isPlaying 
}: { 
  feature: AudioFeature; 
  category: string;
  currentTime: number;
  cachedAnalysis: any[];
  isPlaying: boolean;
}) => {
  const [liveValue, setLiveValue] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  // Calculate live feature value from cached analysis
  useEffect(() => {
    if (!cachedAnalysis || cachedAnalysis.length === 0 || !feature.stemType) {
      setLiveValue(0);
      setIsActive(false);
      return;
    }

    // Find the analysis data for this feature's stem type
    const analysis = cachedAnalysis.find(a => a.stemType === feature.stemType);
    if (!analysis || !analysis.analysisData) {
      setLiveValue(0);
      setIsActive(false);
      return;
    }

    // Map feature ID to enhanced analysis data (aligned with consolidated hook shape)
    const getEnhancedFeatureValue = (featureId: string, time: number): number => {
      const parts = featureId.split('-');
      if (parts.length >= 2) {
        const featureName = parts.slice(1).join('-');

        const times = (analysis.analysisData as any).frameTimes as Float32Array | number[] | undefined;
        const getTimeSeriesValue = (arr: Float32Array | undefined): number => {
          if (!arr || arr.length === 0 || !times || times.length === 0) return 0;
          // Binary search on times
          let lo = 0;
          let hi = Math.min(times.length - 1, arr.length - 1);
          while (lo < hi) {
            const mid = (lo + hi + 1) >>> 1;
            const tmid = (times as any)[mid];
            if (tmid <= time) lo = mid; else hi = mid - 1;
          }
          const index = Math.max(0, Math.min(arr.length - 1, lo));
          return arr[index] ?? 0;
        };

        switch (featureName) {
          case 'impact': {
            const transient = analysis.analysisData.transients?.find((t: any) => Math.abs(t.time - time) < 0.1);
            return transient?.intensity ?? 0;
          }
          case 'pitch-height': {
            const chromaHit = analysis.analysisData.chroma?.find((c: any) => Math.abs(c.time - time) < 0.1);
            return chromaHit?.pitch ?? 0;
          }
          case 'brightness': {
            const chromaHit = analysis.analysisData.chroma?.find((c: any) => Math.abs(c.time - time) < 0.1);
            return chromaHit?.confidence ?? 0;
          }
          case 'rms':
            return getTimeSeriesValue(analysis.analysisData.rms);
          case 'volume':
            return getTimeSeriesValue(analysis.analysisData.volume ?? analysis.analysisData.rms);
          case 'loudness':
            return getTimeSeriesValue(analysis.analysisData.loudness);
          default:
            return 0;
        }
      }
      return 0;
    };

    const featureValue = getEnhancedFeatureValue(feature.id, currentTime);
    
    // Normalize value to 0-1 range for display
    const normalizedValue = Math.max(0, Math.min(1, featureValue));
    
    setLiveValue(normalizedValue);
    setIsActive(isPlaying && normalizedValue > 0.1); // Active if playing and has significant value
  }, [feature, currentTime, cachedAnalysis, isPlaying]);

  // Wrap useDrag in try-catch to handle context errors
  let dragState = { isDragging: false };
  let dragRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dragResult = useDrag({
      type: 'feature',
      item: { 
        id: feature.id, 
        name: feature.name, 
        stemType: feature.stemType 
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });
    
    dragState = dragResult[0];
    const drag = dragResult[1];
    
    dragRef = React.useCallback((node: HTMLDivElement | null) => {
      drag(node);
    }, [drag]);
  } catch (error) {
    // If drag context is not available, just use a no-op
    debugLog.warn('Drag context not available for FeatureNode:', error);
  }
  
  return (
    <div 
      ref={dragRef}
      className={`cursor-grab transition-all duration-200 hover:bg-gray-800 ${dragState.isDragging ? 'opacity-50' : ''}`} 
      title={feature.description}
    >
      <div className={cn(
        "w-full px-2 py-1.5 text-xs font-medium border border-gray-700 transition-all duration-200",
        "bg-black hover:bg-gray-900",
        dragState.isDragging && "shadow-lg",
        isActive && "ring-1 ring-opacity-50",
        isActive && category === 'rhythm' && "ring-red-400",
        isActive && category === 'pitch' && "ring-blue-400", 
        isActive && category === 'intensity' && "ring-yellow-400",
        isActive && category === 'timbre' && "ring-purple-400"
      )}>
        <div className="flex items-center justify-between w-full mb-1">
          <span className="truncate font-medium text-gray-300">{feature.name}</span>
          {feature.stemType && (
            <span className="text-xs opacity-60 ml-1 text-gray-400">
              {getStemTypeDisplayName(feature.stemType)}
            </span>
          )}
        </div>
        
        {/* Live Meter */}
        <div className="w-full bg-gray-800 rounded-sm h-1 mb-1 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-sm transition-all duration-150 ease-out",
              category === 'rhythm' && "bg-red-500",
              category === 'pitch' && "bg-blue-500", 
              category === 'intensity' && "bg-yellow-500",
              category === 'timbre' && "bg-purple-500"
            )}
            style={{ 
              width: `${liveValue * 100}%`,
              transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)',
              transition: 'width 150ms ease-out, transform 150ms ease-out'
            }}
          />
        </div>
        
        {/* Value indicator */}
        <div className="flex items-center justify-between text-xs opacity-70 text-gray-400">
          <span>{(liveValue * 100).toFixed(0)}%</span>
          {isActive && (
            <span className={cn(
              "w-1 h-1 rounded-full animate-pulse",
              category === 'rhythm' && "bg-red-400",
              category === 'pitch' && "bg-blue-400",
              category === 'intensity' && "bg-yellow-400", 
              category === 'timbre' && "bg-purple-400"
            )} />
          )}
        </div>
      </div>
    </div>
  );
};

interface MappingSourcesPanelProps {
  activeTrackId?: string;
  className?: string;
  selectedStemType?: string;
  currentTime?: number;
  cachedAnalysis?: any[];
  isPlaying?: boolean;
}

const categoryIcons = {
  rhythm: Activity,
  pitch: Music,
  intensity: Zap,
  timbre: Music, // Using Music as fallback for timbre
};



// Map technical category names to intuitive display names
const categoryDisplayNames = {
  rhythm: 'Rhythm & Groove',
  pitch: 'Pitch & Tone',
  intensity: 'Energy & Impact',
  timbre: 'Texture & Character',
};

// Map stem types to intuitive display names
const getStemTypeDisplayName = (stemType: string): string => {
  const displayNames: Record<string, string> = {
    'drums': '🥁 Drums',
    'bass': '🎸 Bass',
    'vocals': '🎤 Vocals',
    'melody': '🎹 Melody',
    'other': '🎼 Other',
  };
  return displayNames[stemType] || stemType;
};

export function MappingSourcesPanel({ 
  activeTrackId, 
  className, 
  selectedStemType,
  currentTime = 0,
  cachedAnalysis = [],
  isPlaying = false
}: MappingSourcesPanelProps) {
  const features = useAudioFeatures(activeTrackId, selectedStemType);
  
  const featuresByCategory = useMemo(() => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, AudioFeature[]>);
  }, [features]);

  if (!activeTrackId) {
    return (
      <div className={cn("bg-black border border-gray-800", className)}>
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-100">Audio Features</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-gray-500 text-center py-2">
            Select a track to see available features
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-black border border-gray-800 flex flex-col", className)}>
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gray-300" />
          <span className="text-sm font-semibold text-gray-100">Audio Features</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Drag features to map to effect parameters
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          
          return (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {categoryDisplayNames[category as keyof typeof categoryDisplayNames] || category}
                </span>
                <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                  {categoryFeatures.length}
                </span>
              </div>
              <div className="space-y-1">
                {(categoryFeatures as AudioFeature[]).map((feature) => (
                  <FeatureNode
                    key={feature.id}
                    feature={feature}
                    category={feature.category}
                    currentTime={currentTime}
                    cachedAnalysis={cachedAnalysis}
                    isPlaying={isPlaying}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
</file>

<file path="apps/web/src/components/video-composition/UnifiedTimeline.tsx">
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { ChevronDown, ChevronUp, Plus, Video, Image, Zap, Music, FileAudio, FileMusic, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Layer } from '@/types/video-composition';
import { useTimelineStore } from '@/stores/timelineStore';
import { StemWaveform, WaveformData } from '@/components/stem-visualization/stem-waveform';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HudOverlayProvider, HudOverlayConfig, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { debugLog } from '@/lib/utils';

interface EffectClip {
  id: string;
  effectId: string;
  name: string;
  startTime: number;
  endTime: number;
  parameters: Record<string, any>;
}

interface Stem {
  id: string;
  file_name: string;
  is_master?: boolean;
  stem_type?: string;
  analysis_status?: string;
}

interface UnifiedTimelineProps {
  // Audio/MIDI stems (external to timeline state)
  stems?: Stem[];
  masterStemId?: string | null;
  onStemSelect?: (stemId: string) => void;
  activeTrackId?: string | null;
  soloedStems?: Set<string>;
  onToggleSolo?: (stemId: string) => void;
  analysisProgress?: Record<string, { progress: number; message: string } | null>;
  cachedAnalysis?: any[]; // Using any for now to avoid complex type imports
  stemLoadingState?: boolean;
  stemError?: string | null;

  // Optional external seek override (store used by default)
  onSeek?: (time: number) => void;
  
  // Collapsible sections
  className?: string;
}

// Header for composition layers in the fixed left column
const CompositionLayerHeader: React.FC<{ layer: Layer }> = ({ layer }) => {
  const { selectLayer, deleteLayer, selectedLayerId } = useTimelineStore();
  const isEffect = layer.type === 'effect';
  const isEmpty = !isEffect && !layer.src;
  const isSelected = selectedLayerId === layer.id;

  return (
    <div
      className={cn(
        'flex items-center h-8 px-2 border-b border-stone-700/50',
        isSelected ? 'bg-stone-700/50' : 'bg-transparent'
      )}
      onClick={() => selectLayer(layer.id)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEmpty ? (
          <Plus className="h-4 w-4 text-stone-500" />
        ) : layer.type === 'video' ? (
          <Video className="h-4 w-4 text-emerald-400" />
        ) : layer.type === 'image' ? (
          <Image className="h-4 w-4 text-blue-400" />
        ) : (
          <Zap className="h-4 w-4 text-purple-400" />
        )}
        <span className="text-sm font-medium text-stone-300 truncate">
          {isEmpty ? 'Empty Layer' : layer.src || layer.effectType || 'Layer'}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-stone-400 hover:text-red-400"
        onClick={(e) => {
          e.stopPropagation();
          deleteLayer(layer.id);
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// Simple header row for stems in the fixed left column
const StemTrackHeader: React.FC<{
  id: string;
  name: string;
  isActive: boolean;
  isSoloed: boolean;
  onClick: () => void;
  onToggleSolo?: () => void;
  isMaster: boolean;
}> = ({ id, name, isActive, isSoloed, onClick, onToggleSolo, isMaster }) => {
  return (
    <div
      className={cn(
        'flex items-center h-8 px-2 border-b border-stone-700/50',
        isActive ? 'bg-stone-700/50' : 'bg-transparent'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Music className="h-4 w-4 text-stone-400" />
        <span className="text-sm font-medium text-stone-300 truncate">
          {name} {isMaster ? '(Master)' : ''}
        </span>
      </div>
      {onToggleSolo && (
        <button
          className={cn(
            'text-[10px] px-2 py-0.5 rounded border',
            isSoloed
              ? 'text-yellow-300 border-yellow-400'
              : 'text-stone-400 border-stone-600'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSolo();
          }}
        >
          SOLO
        </button>
      )}
    </div>
  );
};

interface TimelineSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  itemCount: number;
  itemType: string;
}

interface StemTrackProps {
  id: string;
  name: string;
  waveformData: any | null; // Can be from cachedAnalysis or real-time
  isLoading: boolean;
  isActive: boolean;
  onClick: () => void;
  isSoloed: boolean;
  onToggleSolo: () => void;
  isMaster: boolean;
  onSeek?: (time: number) => void;
  currentTime: number;
  stemType: string;
  isPlaying: boolean;
  analysisStatus?: string;
  analysisProgress?: { progress: number; message: string } | null;
}

const TimelineSection: React.FC<TimelineSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  itemCount,
  itemType
}) => {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-1 px-2 bg-black border-b border-stone-700 text-xs font-mono font-bold text-white uppercase tracking-widest hover:bg-stone-900 transition-colors"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-2">{icon}<span>{title}</span></div>
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-normal">{itemCount} {itemType}</span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-stone-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-stone-400" />
          )}
        </div>
      </button>
      {isExpanded && <div className="pl-2">{children}</div>}
    </div>
  );
};

// Droppable Lane Component
const DroppableLane: React.FC<{
  layer: Layer;
  index: number;
  startX: number;
  width: number;
  isActive: boolean;
  isSelected: boolean;
  isEmptyLane: boolean;
  onLayerSelect: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onAssetDrop: (item: any, targetLayerId: string) => void;
  currentTime: number;
  duration: number;
}> = ({
  layer,
  index,
  startX,
  width,
  isActive,
  isSelected,
  isEmptyLane,
  onLayerSelect,
  onLayerDelete,
  onAssetDrop,
  currentTime,
  duration
}) => {
  const isEffect = layer.type === 'effect';
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['VIDEO_FILE', 'IMAGE_FILE', 'EFFECT_CARD'],
    drop: (item: any) => {
      if (isEmptyLane) {
        onAssetDrop(item, layer.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const dropRef = useCallback((node: HTMLDivElement | null) => {
    if (isEmptyLane) {
      drop(node);
    }
  }, [drop, isEmptyLane]);

  return (
    <div
      ref={dropRef}
      className={cn(
        "absolute border border-stone-700 cursor-pointer flex items-center px-2 transition-all rounded-md",
        isEmptyLane
          ? isOver && canDrop
            ? "bg-emerald-950 border-emerald-400 text-emerald-400"
            : "bg-stone-800/50 border-dashed border-stone-600 text-stone-400 hover:bg-stone-700/50 hover:border-stone-500"
          : isSelected
            ? "bg-white text-black border-white"
            : isActive
              ? isEffect 
                ? "bg-purple-400 text-black border-purple-500"
                : "bg-emerald-500 text-black border-emerald-400"
              : "bg-stone-700 text-stone-100 border-stone-700 hover:bg-stone-600 hover:text-white hover:border-white"
      )}
      style={{ 
        left: `${startX}px`, 
        width: `${width}px`, 
        minWidth: '60px',
        top: `${index * 32 + 8}px`,
        height: '24px'
      }}
      onClick={e => { 
        e.stopPropagation(); 
        onLayerSelect(layer.id);
      }}
      onDoubleClick={e => { 
        e.stopPropagation(); 
        onLayerSelect(layer.id);
      }}
    >
      <div className="flex items-center gap-1">
        {isEmptyLane ? (
          <>
            <Plus className="h-3 w-3" />
            <span className="truncate font-medium">
              {isOver && canDrop ? "Drop here" : "Empty Lane"}
            </span>
          </>
        ) : (
          <>
            {layer.type === 'video' ? <Video className="h-3 w-3" /> : 
             layer.type === 'image' ? <Image className="h-3 w-3" /> : 
             <Zap className="h-3 w-3" />}
            <span className="truncate font-medium">
              {layer.type === 'video' ? 'Video' : 
               layer.type === 'image' ? 'Image' : 
               layer.src || 'Effect'}
            </span>
          </>
        )}
      </div>
      {!isEmptyLane && (
        <span className="ml-2 text-[10px] text-stone-400">
          {(layer.startTime || 0).toFixed(1)}s - {(layer.endTime || duration).toFixed(1)}s
        </span>
      )}
      <button
        className="ml-auto px-1 text-stone-400 hover:text-red-500 border-none bg-transparent focus:outline-none text-xs rounded"
        onClick={e => { 
          e.stopPropagation(); 
          onLayerDelete(layer.id);
        }}
        aria-label="Delete layer"
      >×</button>
    </div>
  );
};

const StemTrack: React.FC<StemTrackProps> = ({
  id,
  name,
  waveformData,
  isLoading,
  isActive,
  onClick,
  isSoloed,
  onToggleSolo,
  isMaster,
  onSeek,
  currentTime,
  stemType,
  isPlaying,
  analysisStatus,
  analysisProgress,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'AUDIO_STEM',
    item: { id, name, stemType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getStatusText = () => {
    if (waveformData) return null; // Has data, no text needed
    if (isLoading) return 'Loading...';
    if (analysisStatus === 'pending' || analysisStatus === 'processing') return 'Analyzing...';
    return 'No analysis data.';
  };

  const statusText = getStatusText();

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={cn(
        "flex items-center group bg-stone-900/50 cursor-pointer transition-all border-l-4",
        isActive ? "border-emerald-400 bg-emerald-900/30" : "border-transparent hover:bg-stone-800/40"
      )}
      style={{ opacity: isDragging ? 0.5 : 1, height: '32px', minHeight: '32px' }}
      onClick={onClick}
    >
      <div className="w-56 px-3 py-2 flex items-center justify-between gap-2 border-r border-stone-700/50 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate group-hover:text-emerald-400" title={name}>{name}</p>
          {waveformData && <p className="text-xs text-stone-400">{waveformData.duration.toFixed(2)}s</p>}
          {isLoading && !waveformData && <Badge variant="secondary" className="mt-1 text-xs">Loading...</Badge>}
        </div>
        
        {isMaster ? (
          <Badge variant="outline" className="border-amber-400 text-amber-400">MASTER</Badge>
        ) : (
          <Button
            variant={isSoloed ? "secondary" : "ghost"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            className={cn(
              "transition-all px-3 font-semibold",
              isSoloed ? "bg-yellow-400/80 text-black hover:bg-yellow-400" : "text-stone-400 hover:text-white hover:bg-stone-700"
            )}
          >
            Solo
          </Button>
        )}
      </div>

      <div className="flex-1 min-w-0 px-2 overflow-hidden">
        {analysisProgress ? (
          <div className="w-full bg-stone-700 rounded-full h-2.5 my-auto">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${analysisProgress.progress * 100}%` }}></div>
            <p className="text-xs text-stone-400 truncate">{analysisProgress.message}</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <StemWaveform
              waveformData={waveformData}
              duration={waveformData?.duration || 1}
              currentTime={currentTime}
              onSeek={onSeek}
              isPlaying={isPlaying}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};
StemTrack.displayName = 'StemTrack';

// Overlay Lane Card
const OverlayCard: React.FC<{
  overlay: any;
  index: number;
  moveOverlay: (from: number, to: number) => void;
  onOpenModal: () => void;
  onDelete: () => void;
}> = ({ overlay, index, moveOverlay, onOpenModal, onDelete }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: 'HUD_OVERLAY_CARD',
    item: { index },
    collect: monitor => ({ isDragging: monitor.isDragging() })
  });
  const [, drop] = useDrop({
    accept: 'HUD_OVERLAY_CARD',
    hover: (item: any) => {
      if (item.index !== index) {
        moveOverlay(item.index, index);
        item.index = index;
      }
    }
  });
  drag(drop(ref));
  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        width: 56,
        height: 56,
        margin: 4,
        background: '#111',
        border: '2px solid #00ffff',
        borderRadius: 8,
        boxShadow: '0 0 8px #00ffff88',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        position: 'relative',
      }}
      onDoubleClick={onOpenModal}
      title={overlay.type}
    >
      <span style={{ color: '#00ffff', fontWeight: 700, fontSize: 12, textShadow: '0 0 4px #00ffff' }}>{overlay.type}</span>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', color: '#00ffff', fontWeight: 900, fontSize: 14, cursor: 'pointer', padding: 0 }}
        title="Remove overlay"
      >×</button>
    </div>
  );
};

// Overlay Lane
const OverlayLane: React.FC = () => {
  const { overlays, moveOverlay, openOverlayModal, removeOverlay, addOverlay } = useHudOverlayContext();
  const [, drop] = useDrop({
    accept: ['EFFECT_CARD'],
    drop: (item: any) => {
      if (item.type === 'EFFECT_CARD' && item.category === 'Overlays') {
        addOverlay(item.id); // id should match overlay type
      }
    },
  });
  return (
    <div ref={drop as unknown as React.Ref<HTMLDivElement>} style={{
      display: 'flex',
      alignItems: 'center',
      minHeight: 72,
      background: 'linear-gradient(90deg, #0ff2, #222 60%)',
      borderBottom: '2px solid #00ffff',
      position: 'relative',
      padding: '0 8px',
      marginBottom: 8,
    }}>
      <div style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#00ffff', fontWeight: 700, fontSize: 13 }}>HUD Overlays</span>
        <span title="Overlays are always visible. Drag up/down to reorder stacking. Drag from sidebar to add.">
          <svg width="16" height="16" style={{ verticalAlign: 'middle' }}><rect x="2" y="2" width="12" height="12" rx="3" fill="#00ffff33" stroke="#00ffff" strokeWidth="2" /></svg>
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
        {overlays.map((overlay, i) => (
          <OverlayCard
            key={overlay.id}
            overlay={overlay}
            index={i}
            moveOverlay={moveOverlay}
            onOpenModal={() => openOverlayModal(overlay.id)}
            onDelete={() => removeOverlay(overlay.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  stems = [],
  masterStemId = null,
  onStemSelect,
  activeTrackId = null,
  soloedStems = new Set(),
  onToggleSolo,
  analysisProgress = {},
  cachedAnalysis = [],
  stemLoadingState = false,
  stemError = null,
  onSeek,
  className
}) => {
  const {
    layers,
    currentTime,
    duration,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
  } = useTimelineStore();
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    composition: true, // Combined visual and effects layers
    audio: true // Changed from false to true to ensure audio section is visible by default
  });

  // Create a default empty lane if no layers exist
  useEffect(() => {
    if (layers.length === 0) {
      const defaultEmptyLane: Layer = {
        id: `layer-${Date.now()}`,
        type: 'image', // Placeholder type, will be replaced when content is dropped
        src: '', // Empty src indicates this is an empty lane
        position: { x: 50, y: 50 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        opacity: 1,
        audioBindings: [],
        midiBindings: [],
        zIndex: 0,
        blendMode: 'normal',
        startTime: 0,
        endTime: duration,
        duration: duration
      };
      addLayer(defaultEmptyLane);
    }
  }, []); // Only run once on mount

  const handleAssetDrop = (item: any, targetLayerId?: string) => {
    debugLog.log('Asset dropped on timeline:', item, 'target layer:', targetLayerId);
    
    if (targetLayerId) {
      // Dropped on a specific layer
      const targetLayer = layers.find(layer => layer.id === targetLayerId);
      if (targetLayer && !targetLayer.src) {
        // Fill the empty lane with the dropped content
        switch (item.type) {
          case 'VIDEO_FILE':
            updateLayer(targetLayerId, {
              type: 'video',
              src: item.src
            });
            break;
          case 'IMAGE_FILE':
            updateLayer(targetLayerId, {
              type: 'image',
              src: item.src
            });
            break;
          case 'EFFECT_CARD':
            // Convert effect to a layer
            updateLayer(targetLayerId, {
              type: 'effect',
              src: item.name || item.id,
              effectType: item.id,
              settings: item.parameters || {}
            });
            break;
          default:
            debugLog.warn('Unknown asset type:', item.type);
            return;
        }
        return;
      }
    }
    
    // Fallback: check if there's an empty lane to fill
    const emptyLane = layers.find(layer => !layer.src && layer.type !== 'effect');
    
    if (emptyLane) {
      // Fill the empty lane with the dropped content
      switch (item.type) {
        case 'VIDEO_FILE':
          updateLayer(emptyLane.id, {
            type: 'video',
            src: item.src
          });
          break;
        case 'IMAGE_FILE':
          updateLayer(emptyLane.id, {
            type: 'image',
            src: item.src
          });
          break;
        case 'EFFECT_CARD':
          // Convert effect to a layer
          updateLayer(emptyLane.id, {
            type: 'effect',
            src: item.name || item.id,
            effectType: item.id,
            settings: item.parameters || {}
          });
          break;
        default:
          debugLog.warn('Unknown asset type:', item.type);
          return;
      }
    } else {
      // No empty lane, create a new layer
      switch (item.type) {
        case 'VIDEO_FILE':
          const videoLayer: Layer = {
            id: `video-${Date.now()}`,
            type: 'video',
            src: item.src,
            position: { x: 50, y: 50 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            opacity: 1,
            audioBindings: [],
            midiBindings: [],
            zIndex: layers.length,
            blendMode: 'normal',
            startTime: 0,
            endTime: duration,
            duration: duration
          };
          addLayer(videoLayer);
          break;
        case 'IMAGE_FILE':
          const imageLayer: Layer = {
            id: `image-${Date.now()}`,
            type: 'image',
            src: item.src,
            position: { x: 50, y: 50 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            opacity: 1,
            audioBindings: [],
            midiBindings: [],
            zIndex: layers.length,
            blendMode: 'normal',
            startTime: 0,
            endTime: duration,
            duration: duration
          };
          addLayer(imageLayer);
          break;
        case 'EFFECT_CARD':
          // Create a new effect layer
          const effectLayer: Layer = {
            id: `effect-${Date.now()}`,
            type: 'effect',
            src: item.name || item.id,
            effectType: item.id,
            settings: item.parameters || {},
            position: { x: 50, y: 50 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            opacity: 1,
            audioBindings: [],
            midiBindings: [],
            zIndex: layers.length,
            blendMode: 'normal',
            startTime: 0,
            endTime: duration,
            duration: duration
          };
          addLayer(effectLayer);
          break;
        default:
          debugLog.warn('Unknown asset type:', item.type);
          return;
      }
    }
  };

  const timeToX = (time: number) => {
    return time * 100; // 100px per second
  };

  const xToTime = (x: number) => {
    return x / 100;
  };

  // Calculate timeline width based on duration to match audio stems
  const timelineWidth = Math.max(duration * 100, 800); // Minimum 800px width

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    const nextTime = Math.max(0, Math.min(duration, time));
    if (onSeek) {
      onSeek(nextTime);
    } else {
      setCurrentTime(nextTime);
    }
  };

  return (
    <div className={cn("bg-stone-800 border border-stone-700 rounded-xl overflow-hidden", className)}>
      <div className="flex">
        {/* Left column: Headers */}
        <div className="w-56 flex-shrink-0 border-r border-stone-700">
          {/* Composition header */}
          <div className="flex items-center justify-between p-2 border-b border-stone-700">
            <span className="text-xs font-bold uppercase tracking-wider">Composition</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => {
                const newLayer: Layer = {
                  id: `layer-${Date.now()}`,
                  type: 'image',
                  src: '',
                  position: { x: 50, y: 50 },
                  scale: { x: 1, y: 1 },
                  rotation: 0,
                  opacity: 1,
                  audioBindings: [],
                  midiBindings: [],
                  zIndex: layers.length,
                  blendMode: 'normal',
                  startTime: 0,
                  endTime: duration,
                  duration: duration
                };
                addLayer(newLayer);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {/* Composition layer headers */}
          {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => (
            <CompositionLayerHeader key={layer.id} layer={layer} />
          ))}

          {/* Audio/MIDI header */}
          <div className="flex items-center p-2 border-t border-b border-stone-700 mt-2">
            <span className="text-xs font-bold uppercase tracking-wider">Audio & MIDI</span>
          </div>

          {/* Stem headers */}
          {stems.map((stem) => (
            <StemTrackHeader
              key={stem.id}
              id={stem.id}
              name={stem.file_name}
              isActive={stem.id === activeTrackId}
              isSoloed={soloedStems.has(stem.id)}
              onClick={() => onStemSelect?.(stem.id)}
              onToggleSolo={onToggleSolo ? () => onToggleSolo(stem.id) : undefined}
              isMaster={stem.id === masterStemId}
            />
          ))}
        </div>

        {/* Right column: Timeline lanes */}
        <div className="flex-1 overflow-x-auto" ref={timelineContainerRef}>
          <div
            className="relative"
            style={{ width: `${timelineWidth}px`, height: `${(layers.length + stems.length) * 32 + 16}px` }}
            onClick={handleTimelineClick}
          >
            {/* Composition clips */}
            {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer, index) => {
              const startX = timeToX(layer.startTime || 0);
              const width = timeToX((layer.endTime || duration) - (layer.startTime || 0));
              const isActive = currentTime >= (layer.startTime || 0) && currentTime <= (layer.endTime || duration);
              const isSelected = selectedLayerId === layer.id;
              const isEffect = layer.type === 'effect';
              const isEmptyLane = !isEffect && !layer.src;

              return (
                <DroppableLane
                  key={layer.id}
                  layer={layer}
                  index={index}
                  startX={startX}
                  width={width}
                  isActive={isActive}
                  isSelected={isSelected}
                  isEmptyLane={isEmptyLane}
                  onLayerSelect={selectLayer}
                  onLayerDelete={deleteLayer}
                  onAssetDrop={handleAssetDrop}
                  currentTime={currentTime}
                  duration={duration}
                />
              );
            })}

            {/* Audio waveforms */}
            {stems.map((stem, sIndex) => {
              const analysis: any = cachedAnalysis?.find((a: any) => a.fileMetadataId === stem.id);
              return (
                <div
                  key={`waveform-${stem.id}`}
                  className="absolute w-full h-8"
                  style={{ top: `${(layers.length + sIndex) * 32}px` }}
                >
                  <StemWaveform
                    waveformData={analysis?.waveformData ?? null}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    isLoading={stemLoadingState}
                  />
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 w-0.5 h-full bg-emerald-400 z-50 pointer-events-none"
              style={{ left: `${timeToX(currentTime)}px` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
</file>

<file path="apps/web/src/lib/visualizer/effects/MetaballsEffect.ts">
import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData, MetaballConfig } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';


export class MetaballsEffect implements VisualEffect {
  id = 'metaballs';
  name = 'MIDI Metaballs';
  description = 'Fluid droplet-like spheres that respond to MIDI notes';
  enabled = true;
  parameters: MetaballConfig;

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private uniforms!: Record<string, THREE.IUniform>;

  // Camera animation state
  private baseCameraDistance = 3.0;
  private cameraOrbitRadius = 2.0;
  private cameraHeight = 1.0;
  private cameraSmoothing = 0.02;

  constructor(config: Partial<MetaballConfig> = {}) {
    this.parameters = {
      trailLength: 15,
      baseRadius: 0.25,
      smoothingFactor: 0.3,
      colorPalette: ['#CC66FF', '#33CCFF', '#FF9933'],
      animationSpeed: 0.8,
      noiseIntensity: 1.5,
      highlightColor: [0.8, 0.5, 1.0], // default purple
      ...config
    };
    
    this.setupUniforms();
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1024, 1024) },
      uCameraPos: { value: new THREE.Vector3(0.0, 0.0, 3.0) },
      uCameraTarget: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      uBaseRadius: { value: this.parameters.baseRadius },
      uSmoothingFactor: { value: this.parameters.smoothingFactor },
      uNoiseIntensity: { value: this.parameters.noiseIntensity },
      uAnimationSpeed: { value: this.parameters.animationSpeed },
      uHighlightColor: { value: new THREE.Color(...this.parameters.highlightColor) },
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    // Create internal scene and camera for full-screen quad
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('🎨 MetaballsEffect: Scene created, background =', this.internalScene.background);
    this.internalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // Set resolution uniform based on renderer size
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.uResolution.value.set(size.x, size.y);
    this.createMaterial();
    this.createMesh();
  }

  private createMaterial() {
    const vertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform float uTime;
      uniform float uIntensity;
      uniform vec2 uResolution;
      uniform vec3 uCameraPos;
      uniform vec3 uCameraTarget;
      uniform float uBaseRadius;
      uniform float uSmoothingFactor;
      uniform float uNoiseIntensity;
      uniform float uAnimationSpeed;
      uniform vec3 uHighlightColor;
      varying vec2 vUv;

      const int MAX_STEPS = 32;
      const float MIN_DIST = 0.0;
      const float MAX_DIST = 50.0;
      const float EPSILON = 0.002;

      // Gooey neon palette
      vec3 neon1 = vec3(0.7, 0.2, 1.0); // purple
      vec3 neon2 = vec3(0.2, 0.7, 1.0); // blue
      vec3 neon3 = vec3(0.9, 0.3, 0.8); // pink

      // 3D noise for organic movement
      vec3 random3(vec3 c) {
        float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
        vec3 r;
        r.z = fract(512.0 * j);
        j *= 0.125;
        r.x = fract(512.0 * j);
        j *= 0.125;
        r.y = fract(512.0 * j);
        return r - 0.5;
      }
      float noise(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = p - pi;
        vec3 u = pf * pf * (3.0 - 2.0 * pf);
        return mix(mix(mix(dot(random3(pi + vec3(0, 0, 0)), pf - vec3(0, 0, 0)),
                          dot(random3(pi + vec3(1, 0, 0)), pf - vec3(1, 0, 0)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 0)), pf - vec3(0, 1, 0)),
                          dot(random3(pi + vec3(1, 1, 0)), pf - vec3(1, 1, 0)), u.x), u.y),
                  mix(mix(dot(random3(pi + vec3(0, 0, 1)), pf - vec3(0, 0, 1)),
                          dot(random3(pi + vec3(1, 0, 1)), pf - vec3(1, 0, 1)), u.x),
                      mix(dot(random3(pi + vec3(0, 1, 1)), pf - vec3(0, 1, 1)),
                          dot(random3(pi + vec3(1, 1, 1)), pf - vec3(1, 1, 1)), u.x), u.y), u.z);
      }
      float smin(float a, float b, float k) {
        float h = max(k - abs(a - b), 0.0) / k;
        return min(a, b) - h * h * h * k * (1.0 / 6.0);
      }
      float sphere(vec3 p, float s) {
        return length(p) - s;
      }
      float map(vec3 pos) {
        float t = uTime * uAnimationSpeed * 0.5;
        float intensity = 0.5 + uIntensity * 0.5;
        float noiseAmt = uNoiseIntensity * 0.05;
        vec3 sphere1Pos = vec3(sin(t) * 0.8, cos(t * 1.3) * 0.6, sin(t * 0.7) * 0.4);
        vec3 sphere2Pos = vec3(cos(t * 1.1) * 0.6, sin(t * 0.9) * 0.8, cos(t * 1.4) * 0.5);
        vec3 sphere3Pos = vec3(sin(t * 1.7) * 0.4, cos(t * 0.6) * 0.3, sin(t * 1.2) * 0.6);
        vec3 sphere4Pos = vec3(cos(t * 0.8) * 0.7, sin(t * 1.5) * 0.4, cos(t) * 0.3);
        sphere1Pos += vec3(sin(t * 2.3), cos(t * 1.9), sin(t * 2.7)) * noiseAmt;
        sphere2Pos += vec3(cos(t * 1.7), sin(t * 2.1), cos(t * 1.3)) * noiseAmt;
        sphere3Pos += vec3(sin(t * 3.1), cos(t * 2.5), sin(t * 1.8)) * noiseAmt;
        sphere4Pos += vec3(cos(t * 2.9), sin(t * 1.6), cos(t * 2.2)) * noiseAmt;
        float radius1 = uBaseRadius * 1.2 + intensity * 0.2;
        float radius2 = uBaseRadius * 1.0 + intensity * 0.15;
        float radius3 = uBaseRadius * 0.8 + intensity * 0.1;
        float radius4 = uBaseRadius * 0.6 + intensity * 0.1;
        float d1 = sphere(pos - sphere1Pos, radius1);
        float d2 = sphere(pos - sphere2Pos, radius2);
        float d3 = sphere(pos - sphere3Pos, radius3);
        float d4 = sphere(pos - sphere4Pos, radius4);
        float smoothness = uSmoothingFactor;
        float result = smin(d1, d2, smoothness);
        result = smin(result, d3, smoothness);
        result = smin(result, d4, smoothness);
        return result;
      }
      vec3 calcNormal(vec3 pos) {
        vec2 e = vec2(EPSILON, 0.0);
        return normalize(vec3(
          map(pos + e.xyy) - map(pos - e.xyy),
          map(pos + e.yxy) - map(pos - e.yxy),
          map(pos + e.yyx) - map(pos - e.yyx)
        ));
      }
      float rayMarch(vec3 ro, vec3 rd) {
        float dO = MIN_DIST;
        for (int i = 0; i < MAX_STEPS; i++) {
          vec3 p = ro + rd * dO;
          float dS = map(p);
          dO += dS;
          if (dO > MAX_DIST || abs(dS) < EPSILON) break;
        }
        return dO;
      }
      vec3 getNeonColor(vec3 pos, float fresnel, float edge, float core) {
        float mix1 = 0.5 + 0.5 * sin(pos.x * 2.0 + uTime * 0.7);
        float mix2 = 0.5 + 0.5 * cos(pos.y * 2.0 + uTime * 1.1);
        vec3 color = mix(neon1, neon2, mix1);
        color = mix(color, neon3, mix2 * fresnel);
        color += vec3(1.0, 0.7, 1.0) * pow(edge, 2.5) * 1.2;
        color += uHighlightColor * pow(core, 2.0) * 0.7;
        return color;
      }

      // Thickness approximation for more liquid look
      float getThickness(vec3 pos, vec3 normal) {
        // Sample SDF in both directions to estimate thickness
        float stepSize = 0.08;
        float t1 = abs(map(pos + normal * stepSize));
        float t2 = abs(map(pos - normal * stepSize));
        return 1.0 - clamp((t1 + t2) * 2.5, 0.0, 1.0); // 0 = thin, 1 = thick
      }

      // 3D value noise with trilinear interpolation
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float valueNoise3D(vec3 p) {
        vec3 pi = floor(p);
        vec3 pf = fract(p);
        // 8 corners of the cube
        float a000 = hash(pi + vec3(0,0,0));
        float a100 = hash(pi + vec3(1,0,0));
        float a010 = hash(pi + vec3(0,1,0));
        float a110 = hash(pi + vec3(1,1,0));
        float a001 = hash(pi + vec3(0,0,1));
        float a101 = hash(pi + vec3(1,0,1));
        float a011 = hash(pi + vec3(0,1,1));
        float a111 = hash(pi + vec3(1,1,1));
        // Trilinear interpolation
        float k0 = a000;
        float k1 = a100 - a000;
        float k2 = a010 - a000;
        float k3 = a001 - a000;
        float k4 = a000 - a100 - a010 + a110;
        float k5 = a000 - a010 - a001 + a011;
        float k6 = a000 - a100 - a001 + a101;
        float k7 = -a000 + a100 + a010 - a110 + a001 - a101 - a011 + a111;
        vec3 u = pf;
        return k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
      }

      void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        
        // Apply aspect ratio correction to prevent stretching
        float aspectRatio = uResolution.x / uResolution.y;
        uv.x *= aspectRatio;
        
        vec3 cameraPos = uCameraPos;
        vec3 cameraTarget = uCameraTarget;
        vec3 cameraDir = normalize(cameraTarget - cameraPos);
        vec3 cameraRight = normalize(cross(cameraDir, vec3(0.0, 1.0, 0.0)));
        vec3 cameraUp = cross(cameraRight, cameraDir);
        vec3 rayDir = normalize(cameraDir + uv.x * cameraRight + uv.y * cameraUp);
        float dist = rayMarch(cameraPos, rayDir);
        if (dist >= MAX_DIST) {
          discard; // ensure no background writes
        }
        vec4 finalColor = vec4(0.0);
        {
          vec3 pos = cameraPos + rayDir * dist;
          vec3 normal = calcNormal(pos);
          float fresnel = pow(1.0 - max(0.0, dot(normal, -rayDir)), 2.5);
          float edge = smoothstep(0.0, 0.08, abs(map(pos)));
          float core = 1.0 - edge;
          float thickness = getThickness(pos, normal);
          // Water droplet color using value noise and reflection vector
          vec3 reflectDir = reflect(rayDir, normal);
          // Define unique offsets for each metaball
          vec3 offsets[4];
          offsets[0] = vec3(1.3, 2.1, 0.7);
          offsets[1] = vec3(-2.2, 0.5, 1.8);
          offsets[2] = vec3(0.9, -1.4, 2.3);
          offsets[3] = vec3(-1.7, 1.2, -2.5);
          vec3 colorSum = vec3(0.0);
          for (int i = 0; i < 4; i++) {
            vec3 metaballReflect = reflectDir + offsets[i];
            float noiseVal = valueNoise3D(metaballReflect * 2.0 + uTime * (1.0 + float(i) * 0.3));
            float modFactor = 0.8 + 0.2 * float(i); // unique per metaball
            colorSum += uHighlightColor * modFactor * noiseVal;
          }
          vec3 color = colorSum / 4.0;
          color = pow(color, vec3(7.0));
          // Add a subtle neon rim from before
          color = mix(color, getNeonColor(pos, fresnel, edge, core), 0.25 * fresnel);
          // Translucency and emission
          float alpha = 0.10 + 0.12 * thickness;
          alpha += 0.25 * fresnel;
          alpha += 0.10 * pow(core, 2.0);
          alpha = clamp(alpha, 0.0, 0.70);
          // Boost brightness significantly to simulate bloom effect
          color *= 3.5;
          // Add extra glow to mimic bloom
          color += vec3(0.15) * fresnel * fresnel;
          // Premultiplied alpha for correct additive blending over transparent background
          finalColor = vec4(color * alpha, alpha);
        }
        gl_FragColor = finalColor;
      }
    `;

    // Add shader compilation error checking
    try {
          this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true
    });
    } catch (error) {
      debugLog.error('❌ Shader compilation error:', error);
      // Fallback to basic material
      this.material = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.8
      }) as any;
    }
  }

  private createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    // Let compositor handle layering; avoid depth artifacts across transparent areas
    this.material.depthWrite = false;
    this.material.depthTest = false;
    this.internalScene.add(this.mesh);
    this.mesh.position.set(0, 0, 0);
    this.mesh.scale.set(2, 2, 1); // Fill viewport
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  updateParameter(paramName: string, value: any): void {
    // Immediately update uniforms when parameters change
    if (!this.uniforms) return;
    
    switch (paramName) {
      case 'animationSpeed':
        this.uniforms.uAnimationSpeed.value = value;
        break;
      case 'baseRadius':
        this.uniforms.uBaseRadius.value = value;
        break;
      case 'smoothingFactor':
        this.uniforms.uSmoothingFactor.value = value;
        break;
      case 'noiseIntensity':
        this.uniforms.uNoiseIntensity.value = value;
        break;
      case 'highlightColor':
        this.uniforms.uHighlightColor.value.set(...value);
        break;
    }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) return;

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof MetaballConfig];
      }
    }

    // Update time
    this.uniforms.uTime.value += deltaTime * this.parameters.animationSpeed;

    // Calculate intensity based on both audio and MIDI activity
    const midiIntensity = Math.min(midiData.activeNotes.length / 3.0, 1.0);
    const audioIntensity = audioData.volume;
    // Ensure we always have a good base intensity so metaballs are visible
    this.uniforms.uIntensity.value = Math.max(0.8, (midiIntensity + audioIntensity) * 1.2);

    // Animate camera based on MIDI notes
    this.updateCameraAnimation(midiData, audioData);

    // Debug log to see if we're getting MIDI data
    if (midiData.activeNotes.length > 0) {
      // Removed console.log to reduce console noise
    }

    // Update shader resolution to match actual canvas size (not bounding box)
    if (this.uniforms.uResolution && this.renderer) {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.uniforms.uResolution.value.set(size.x, size.y);
    }

    // No conditional visibility logic here
  }

  private updateCameraAnimation(midiData: LiveMIDIData, audioData: AudioAnalysisData): void {
    const time = this.uniforms.uTime.value;
    
    // Base camera orbit animation
    let cameraAngle = time * 0.3;
    let cameraElevation = Math.sin(time * 0.2) * 0.3;
    let cameraDistance = this.baseCameraDistance;

    // MIDI-based camera effects
    if (midiData.activeNotes.length > 0) {
      // Use note pitches to influence camera position
      const avgPitch = midiData.activeNotes.reduce((sum, note) => sum + note.note, 0) / midiData.activeNotes.length;
      const normalizedPitch = (avgPitch - 60) / 48; // Normalize around middle C
      
      // Use note velocities for camera movement intensity
      const avgVelocity = midiData.activeNotes.reduce((sum, note) => sum + note.velocity, 0) / midiData.activeNotes.length / 127;
      
      // Pitch affects camera angle and height
      cameraAngle += normalizedPitch * 2.0; // Higher notes move camera clockwise
      cameraElevation += normalizedPitch * 0.8; // Higher notes raise camera
      
      // Velocity affects camera distance and orbit speed
      cameraDistance += avgVelocity * 1.5; // Louder notes move camera back
      cameraAngle += avgVelocity * Math.sin(time * 4.0) * 0.5; // Add velocity-based wobble
      
      // Multiple notes create more dynamic movement
      const noteCount = Math.min(midiData.activeNotes.length, 5);
      const complexity = noteCount / 5.0;
      cameraElevation += Math.sin(time * 3.0 + complexity * 2.0) * complexity * 0.3;
      
      // Add chord-based camera effects
      if (midiData.activeNotes.length >= 3) {
        // For chords, add orbital variation
        cameraAngle += Math.sin(time * 2.0) * 0.4;
        cameraDistance += Math.cos(time * 1.5) * 0.3;
      }
    }

    // Audio-based subtle effects
    const audioInfluence = audioData.volume * 0.3;
    cameraDistance += audioInfluence;
    cameraElevation += Math.sin(time * 5.0) * audioInfluence * 0.2;

    // Calculate new camera position
    const newCameraPos = new THREE.Vector3(
      Math.cos(cameraAngle) * cameraDistance,
      cameraElevation + this.cameraHeight,
      Math.sin(cameraAngle) * cameraDistance
    );

    // Smooth camera movement
    const currentPos = this.uniforms.uCameraPos.value;
    currentPos.lerp(newCameraPos, this.cameraSmoothing);

    // Keep camera target at the center (where metaballs are)
    const target = new THREE.Vector3(0, 0, 0);

    // Add subtle target movement based on intense MIDI activity
    if (midiData.activeNotes.length > 2) {
      const intensity = Math.min(midiData.activeNotes.length / 5.0, 1.0);
      target.x = Math.sin(time * 2.0) * intensity * 0.2;
      target.y = Math.cos(time * 1.5) * intensity * 0.1;
    }

    this.uniforms.uCameraTarget.value.copy(target);
  }

  destroy(): void {
    if (this.mesh) {
      this.internalScene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
  }
}
</file>

<file path="apps/web/src/components/midi/three-visualizer.tsx">
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Settings, Maximize, Download } from 'lucide-react';
import { cn, debugLog } from '@/lib/utils';
import { VisualizerManager } from '@/lib/visualizer/core/VisualizerManager';
import { EffectRegistry } from '@/lib/visualizer/effects/EffectRegistry';
import '@/lib/visualizer/effects/EffectDefinitions';
import { MIDIData, VisualizationSettings } from '@/types/midi';
import { VisualizerConfig, LiveMIDIData, AudioAnalysisData, VisualEffect, AspectRatioConfig } from '@/types/visualizer';
import { PortalModal } from '@/components/ui/portal-modal';
import { EffectCarousel } from '@/components/ui/effect-carousel';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { getAspectRatioConfig, calculateCanvasSize } from '@/lib/visualizer/aspect-ratios';
import { Layer } from '@/types/video-composition';

interface ThreeVisualizerProps {
  midiData: MIDIData;
  settings: VisualizationSettings;
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
  selectedEffects: Record<string, boolean>;
  onSelectedEffectsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  aspectRatio?: string; // Changed from 'mobile' | 'youtube' to string for modularity
  // Modal and mapping props
  openEffectModals: Record<string, boolean>;
  onCloseEffectModal: (effectId: string) => void;
  mappings: Record<string, { featureId: string | null; modulationAmount: number }>;
  featureNames: Record<string, string>;
  onMapFeature: (parameterId: string, featureId: string) => void;
  onUnmapFeature: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  activeSliderValues: Record<string, number>;
  setActiveSliderValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  visualizerRef?: React.RefObject<VisualizerManager> | ((instance: VisualizerManager | null) => void);
  layers: Layer[];
  selectedLayerId?: string | null;
  onLayerSelect?: (layerId: string) => void;
  onLayerUpdate?: (layerId: string, updates: Partial<Layer>) => void;
}

export function ThreeVisualizer({
  midiData,
  settings,
  currentTime,
  isPlaying,
  onPlayPause,
  onSettingsChange,
  onFpsUpdate,
  className,
  selectedEffects,
  onSelectedEffectsChange,
  aspectRatio = 'mobile',
  openEffectModals,
  onCloseEffectModal,
  mappings,
  featureNames,
  onMapFeature,
  onUnmapFeature,
  onModulationAmountChange,
  activeSliderValues,
  setActiveSliderValues,
  visualizerRef: externalVisualizerRef,
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate
}: ThreeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVisualizerRef = useRef<VisualizerManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 711 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const effectInstancesRef = useRef<{ [id: string]: VisualEffect }>({});
  
  // Get aspect ratio configuration
  const aspectRatioConfig = getAspectRatioConfig(aspectRatio);
  
  // Resize observer for container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Calculate canvas size when container size or aspect ratio changes
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const newCanvasSize = calculateCanvasSize(
        containerSize.width,
        containerSize.height,
        aspectRatioConfig
      );
      setCanvasSize(newCanvasSize);
    }
  }, [containerSize, aspectRatioConfig]);
  
  // Update visualizer when canvas size changes
  useEffect(() => {
    if (internalVisualizerRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const visualizer = internalVisualizerRef.current;
      visualizer.handleViewportResize(canvasSize.width, canvasSize.height);
      debugLog.log('🎨 Canvas resized to:', canvasSize.width, 'x', canvasSize.height, 'aspect:', canvasSize.width / canvasSize.height);
    }
  }, [canvasSize]);

  // Initialize visualizer
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    try {
      debugLog.log('🎭 Initializing ThreeVisualizer with aspect ratio:', aspectRatio);
    
    const config: VisualizerConfig = {
      canvas: {
          width: canvasSize.width,
          height: canvasSize.height,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
      },
        aspectRatio: aspectRatioConfig,
      performance: {
          targetFPS: 60,
          enableBloom: true,
          enableShadows: false
      },
      midi: {
        velocitySensitivity: 1.0,
        noteTrailDuration: 2.0,
        trackColorMapping: {}
      }
    };

      internalVisualizerRef.current = new VisualizerManager(canvasRef.current, config);
      

      
      // Enable selected effects
      Object.entries(selectedEffects).forEach(([effectId, enabled]) => {
        if (enabled) {
          internalVisualizerRef.current?.enableEffect(effectId);
        } else {
          internalVisualizerRef.current?.disableEffect(effectId);
        }
      });

      setIsInitialized(true);
      debugLog.log('✅ ThreeVisualizer initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      debugLog.error('❌ Failed to initialize ThreeVisualizer:', err);
    }
  }, [canvasSize, aspectRatioConfig]);

  // Dynamic scene synchronization
  useEffect(() => {
    if (!internalVisualizerRef.current) return;
    const manager = internalVisualizerRef.current;
    debugLog.log('[ThreeVisualizer] layers prop:', layers, layers.map(l => l.type));
    const effectLayers = layers.filter(l => l.type === 'effect');
    debugLog.log('[ThreeVisualizer] effectLayers:', effectLayers);
    const currentIds = Object.keys(effectInstancesRef.current);
    const newIds = effectLayers.map(l => l.id);

    // Remove effects not in layers
    for (const id of currentIds) {
      if (!newIds.includes(id)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance: ${id}`);
      }
    }

    // Add new effects from layers using registry system
    for (const layer of effectLayers) {
      if (!effectInstancesRef.current[layer.id]) {
        debugLog.log('[ThreeVisualizer] Creating effect for layer:', layer);
        const effect = EffectRegistry.createEffect(layer.effectType || 'metaballs', layer.settings);
        if (effect) {
          effectInstancesRef.current[layer.id] = effect;
          // Add effect with its internal ID (e.g., 'particleNetwork', 'metaballs')
          manager.addEffect(effect);
          debugLog.log(`[ThreeVisualizer] Added effect instance: ${layer.id} (${layer.effectType}) with effect ID: ${effect.id}`);
        } else {
          debugLog.warn(`[ThreeVisualizer] Failed to create effect: ${layer.effectType} for layer: ${layer.id}`);
        }
      }
    }

    // If no effect layers, remove all effects
    if (effectLayers.length === 0) {
      for (const id of Object.keys(effectInstancesRef.current)) {
        manager.removeEffect(id);
        delete effectInstancesRef.current[id];
        debugLog.log(`[ThreeVisualizer] Removed effect instance (all cleared): ${id}`);
      }
    }
  }, [layers, internalVisualizerRef.current]);

  // Expose visualizer ref to parent
  useEffect(() => {
    if (externalVisualizerRef && internalVisualizerRef.current) {
      if (typeof externalVisualizerRef === 'function') {
        externalVisualizerRef(internalVisualizerRef.current);
      } else if (externalVisualizerRef && 'current' in externalVisualizerRef) {
        (externalVisualizerRef as any).current = internalVisualizerRef.current;
      }
    }
  }, [externalVisualizerRef, isInitialized]);

  // Handle play/pause
  useEffect(() => {
    if (!internalVisualizerRef.current) return;

    if (isPlaying) {
      internalVisualizerRef.current.play();
    } else {
      internalVisualizerRef.current.pause();
    }
  }, [isPlaying]);

  // Update MIDI data
  useEffect(() => {
    if (!internalVisualizerRef.current || !midiData) return;
    
         const liveMidiData: LiveMIDIData = {
       currentTime,
       activeNotes: midiData.tracks.flatMap(track => 
         track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).map(note => ({
           note: note.pitch,
           velocity: note.velocity,
           track: track.id,
           startTime: note.start
         }))
       ),
       tempo: 120, // Default tempo
       totalNotes: midiData.tracks.reduce((sum, track) => sum + track.notes.length, 0),
       trackActivity: midiData.tracks.reduce((acc, track) => {
         acc[track.id] = track.notes.filter(note => 
           note.start <= currentTime && note.start + note.duration >= currentTime
         ).length > 0;
         return acc;
       }, {} as Record<string, boolean>)
     };
    
    internalVisualizerRef.current.updateMIDIData(liveMidiData);
  }, [midiData, currentTime]);

  // Update FPS
  useEffect(() => {
    if (!internalVisualizerRef.current || !onFpsUpdate) return;

    const interval = setInterval(() => {
      const fps = internalVisualizerRef.current?.getFPS() || 60;
      onFpsUpdate(fps);
    }, 1000);

    return () => clearInterval(interval);
  }, [onFpsUpdate]);

 

  // Handle effect parameter changes
  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    if (!internalVisualizerRef.current) return;
    
    internalVisualizerRef.current.updateEffectParameter(effectId, paramName, value);
    
    // Update active slider values
      const paramKey = `${effectId}-${paramName}`;
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (internalVisualizerRef.current) {
        internalVisualizerRef.current.dispose();
      }
    };
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // Helper: is the project truly empty (all layers are empty image lanes)?
  const allLayersEmpty = layers.length === 0 || layers.every(l => l.type === 'image' && !l.src);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        className
      )}
      style={{
        minHeight: '200px',
        aspectRatio: `${aspectRatioConfig.width}/${aspectRatioConfig.height}`
      }}
    >
      {/* Canvas container with proper sizing */}
      <div 
        className="relative bg-stone-900 rounded-lg overflow-hidden shadow-lg"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
          pointerEvents: 'auto', // Ensure overlays receive pointer events
          zIndex: 10 // Ensure overlays are above the canvas
        }}
        >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            pointerEvents: 'none', // Only the canvas ignores pointer events
            zIndex: 1
          }}
        />
        {/* Show prompt if all layers are empty */}
        {allLayersEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <span className="text-white/60 text-sm font-mono text-center select-none">
              Add your first layer
            </span>
          </div>
        )}
        {/* Modals are now rendered within the full-width edit canvas */}
        {Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
          if (!isOpen) return null;
          const effectInstance = internalVisualizerRef.current?.getAllEffects().find((e: any) => e.id === effectId);
          if (!effectInstance) return null;
          const sortedParams = Object.entries(effectInstance.parameters).sort(([, a], [, b]) => {
            if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
            if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
            return 0;
          });
          const initialPos = {
            x: 100 + (index * 50),
            y: 100 + (index * 50)
          };
          return (
            <PortalModal
              key={effectId}
              title={effectInstance.name.replace(' Effect', '')}
              isOpen={isOpen}
              onClose={() => onCloseEffectModal(effectId)}
              initialPosition={initialPos}
              bounds="#editor-bounds"
            >
              <div className="space-y-4">
                <div className="text-sm text-white/80 mb-4">{effectInstance.description}</div>
                {sortedParams.length === 0 ? (
                  <div className="text-white/60 text-xs font-mono text-center py-4">No configurable parameters.</div>
                ) : (
                  sortedParams.map(([paramName, value]) => {
                    if (typeof value === 'boolean') {
                      return (
                        <div key={paramName} className="flex items-center justify-between">
                          <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                          />
                        </div>
                      );
                    }
                    if (typeof value === 'number') {
                      const paramKey = `${effectId}-${paramName}`;
                      const mapping = mappings[paramKey];
                      const mappedFeatureId = mapping?.featureId || null;
                      const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
                      const modulationAmount = mapping?.modulationAmount || 1.0;
                      return (
                        <DroppableParameter
                          key={paramKey}
                          parameterId={paramKey}
                          label={paramName}
                          mappedFeatureId={mappedFeatureId}
                          mappedFeatureName={mappedFeatureName}
                          modulationAmount={modulationAmount}
                          onFeatureDrop={onMapFeature}
                          onFeatureUnmap={onUnmapFeature}
                          onModulationAmountChange={onModulationAmountChange}
                          className="mb-2"
                          dropZoneStyle="inlayed"
                          showTagOnHover
                        >
                          <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                          />
                        </DroppableParameter>
                      );
                    }
                    if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
                      const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
                      return (
                        <div key={paramName} className="space-y-2">
                          <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                            {displayName}
                            <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                          </Label>
                          <input
                            type="color"
                            value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                            onChange={e => {
                              const hex = e.target.value;
                              const rgb = [
                                parseInt(hex.slice(1, 3), 16) / 255,
                                parseInt(hex.slice(3, 5), 16) / 255,
                                parseInt(hex.slice(5, 7), 16) / 255
                              ];
                              handleParameterChange(effectId, paramName, rgb);
                            }}
                            className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                          />
                        </div>
                      );
                    }
                    return null;
                  })
                )}
                <div className="pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
                    <Switch 
                      checked={selectedEffects[effectId]}
                      onCheckedChange={(checked) => {
                        onSelectedEffectsChange(prev => ({
                          ...prev,
                          [effectId]: checked
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </PortalModal>
          );
        })}
      </div>
    </div>
  );
}

// Custom hook to force re-render
const useForceUpdate = () => {
  const [, setValue] = useState(0);
  return () => setValue(value => value + 1); 
};

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-50">
      <Card className="bg-red-800/80 text-white p-4 max-w-md">
      <h3 className="text-lg font-semibold">An Error Occurred</h3>
      <p className="text-sm">{message}</p>
      <Button onClick={() => window.location.reload()} variant="secondary" className="mt-4">
        Refresh Page
      </Button>
      </Card>
    </div>
  );
}

function MainContent({ children, onMouseEnter, onMouseLeave }: { children: React.ReactNode, onMouseEnter: () => void, onMouseLeave: () => void }) {
  return (
    <div 
      className="relative aspect-[9/16] max-w-sm mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-2xl" // removed border
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function Canvas({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement> }) {
  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
}

// Utility: getSliderMax for effect parameter sliders
function getSliderMax(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 5.0;
    case 'noiseIntensity': return 2.0;
    case 'glowIntensity': return 2.0;
    case 'strength': return 2.0;
    case 'radius': return 2.0;
    case 'threshold': return 1.0;
    case 'particleLifetime': return 10;
    case 'particleSize': return 50;
    case 'glowSoftness': return 5;
    case 'particleSpawning': return 1.0;
    case 'spawnThreshold': return 1.0;
    case 'audioSpawnThreshold': return 1.0;
    case 'audioSpawnRate': return 1.0;
    case 'audioSpawnCooldown': return 1.0;
    case 'audioParticleSize': return 50;
    case 'audioSpawnIntensity': return 2.0;
    case 'connectionDistance': return 5.0;
    case 'maxParticles': return 200;
    case 'connectionOpacity': return 1.0;
    default: return 1;
  }
}

// Utility: getSliderStep for effect parameter sliders
function getSliderStep(paramName: string) {
  switch (paramName) {
    case 'animationSpeed': return 0.05;
    case 'noiseIntensity': return 0.1;
    case 'glowIntensity': return 0.1;
    case 'strength': return 0.1;
    case 'radius': return 0.05;
    case 'threshold': return 0.01;
    case 'glowSoftness': return 0.1;
    case 'particleSpawning': return 0.01;
    case 'spawnThreshold': return 0.01;
    case 'audioSpawnThreshold': return 0.01;
    case 'audioSpawnRate': return 0.01;
    case 'audioSpawnCooldown': return 0.01;
    case 'audioParticleSize': return 0.1;
    case 'audioSpawnIntensity': return 0.01;
    default: return 0.01;
  }
}
</file>

<file path="apps/web/src/components/ui/droppable-parameter.tsx">
'use client';

import React from 'react';
import { useDrop } from 'react-dnd';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { ModulationAttenuator } from '@/components/ui/modulation-attenuator';
import { debugLog } from '@/lib/utils';

export interface DraggableFeatureItem {
  id: string;
  name: string;
  stemType?: string;
}

export interface DroppableParameterProps {
  parameterId: string;
  label: string;
  children: React.ReactNode;
  mappedFeatureId?: string | null;
  mappedFeatureName?: string;
  modulationAmount?: number;
  // For visualization of modulation along the slider
  baseValue?: number;
  modulatedValue?: number;
  sliderMax?: number;
  onFeatureDrop: (parameterId: string, featureId: string, stemType?: string) => void;
  onFeatureUnmap: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  className?: string;
  dropZoneStyle?: string;
  showTagOnHover?: boolean;
}

export const DroppableParameter: React.FC<DroppableParameterProps> = ({
  parameterId,
  label,
  children,
  mappedFeatureId,
  mappedFeatureName,
  modulationAmount = 1.0,
  baseValue,
  modulatedValue,
  sliderMax,
  onFeatureDrop,
  onFeatureUnmap,
  onModulationAmountChange,
  className = '',
  dropZoneStyle = '',
  showTagOnHover = false
}) => {
  // Wrap useDrop in try-catch to handle context errors
  let dropState = { isOver: false, canDrop: false };
  let dropRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dropResult = useDrop({
      accept: 'feature',
      drop: (item: DraggableFeatureItem) => {
        onFeatureDrop(parameterId, item.id, item.stemType);
      },
      canDrop: () => true,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });
    
    dropState = dropResult[0];
    const drop = dropResult[1];
    
    dropRef = React.useCallback((node: HTMLDivElement | null) => {
      drop(node);
    }, [drop]);
  } catch (error) {
    // If drop context is not available, just use a no-op
    debugLog.warn('Drop context not available for DroppableParameter:', error);
  }

  // For hover badge
  const [hovered, setHovered] = React.useState(false);
  const hideTimeoutRef = React.useRef<number | null>(null);

  const keepBadgeVisible = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHovered(true);
  };

  const scheduleHideBadge = () => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setHovered(false);
      hideTimeoutRef.current = null;
    }, 400);
  };

  React.useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) window.clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-white/80 text-xs font-mono">{label}</label>
        <div className="flex items-center gap-2">
          {/* Modulation Attenuator - only show when feature is mapped, positioned to the left */}
          {mappedFeatureId && onModulationAmountChange && (
            <div 
              className="pointer-events-auto"
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseLeave={(e) => e.stopPropagation()}
            >
              <ModulationAttenuator
                value={modulationAmount}
                onChange={(amount) => onModulationAmountChange(parameterId, amount)}
                size="sm"
              />
            </div>
          )}
          
          {/* Drop Zone - Embossed Pill */}
          <div
            ref={dropRef}
            className={`
              relative flex items-center justify-center w-8 h-6 rounded-full cursor-pointer
              transition-all duration-200 ease-out
              ${mappedFeatureId 
                ? 'bg-emerald-600/20 border-2 border-emerald-500/50 shadow-lg' 
                : 'bg-stone-700/50 border-2 border-stone-600/50 shadow-inner'
              }
              ${dropState.isOver && dropState.canDrop 
                ? 'scale-110 bg-emerald-500/30 border-emerald-400 shadow-lg ring-2 ring-emerald-400/50' 
                : ''
              }
              ${!mappedFeatureId && !dropState.isOver 
                ? 'hover:bg-stone-600/60 hover:border-stone-500/60' 
                : ''
              }
              ${dropZoneStyle === 'inlayed' ? 'ring-2 ring-stone-900/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7),0_2px_8px_rgba(16,185,129,0.15)]' : ''}
            `}
            style={{
              // Embossed effect with multiple shadows
              boxShadow: mappedFeatureId 
                ? `
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.2),
                  0 2px 4px rgba(0, 0, 0, 0.3),
                  0 0 8px rgba(16, 185, 129, 0.3),
                  ${dropZoneStyle === 'inlayed' ? 'inset 0 4px 12px rgba(0,0,0,0.7)' : ''}
                `
                : `
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 1px 2px rgba(0, 0, 0, 0.2),
                  ${dropZoneStyle === 'inlayed' ? 'inset 0 4px 12px rgba(0,0,0,0.7)' : ''}
                `,
              // Subtle gradient for depth
              background: mappedFeatureId
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(68, 64, 60, 0.5) 0%, rgba(41, 37, 36, 0.5) 100%)'
            }}
            onMouseEnter={keepBadgeVisible}
            onMouseLeave={scheduleHideBadge}
          >
            {/* Drop indicator */}
            {!mappedFeatureId && (
              <div className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${dropState.isOver && dropState.canDrop 
                  ? 'bg-emerald-400 scale-125' 
                  : 'bg-stone-400/50'
                }
              `} />
            )}
            {/* Mapped feature indicator */}
            {mappedFeatureId && (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>
      {/* Parameter Control */}
      <div className="relative">
        <div className="relative">
          {children}
          {/* Modulation overlay bar (lay over slider track/value) - positioned after children for proper z-index */}
          {typeof baseValue === 'number' && typeof modulatedValue === 'number' && typeof sliderMax === 'number' && sliderMax > 0 && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {(() => {
                const baseN = Math.max(0, Math.min(1, baseValue / sliderMax));
                const modN = Math.max(0, Math.min(1, modulatedValue / sliderMax));
                const left = Math.min(baseN, modN) * 100;
                const width = Math.abs(modN - baseN) * 100;
                return (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[6px] bg-emerald-400/60 rounded-sm shadow-lg"
                    style={{ 
                      left: `${left}%`, 
                      width: `${width}%`,
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                      border: '1px solid rgba(16, 185, 129, 0.4)'
                    }}
                  />
                );
              })()}
            </div>
          )}
        </div>
        {/* Mapped Feature Badge */}
        {mappedFeatureId && mappedFeatureName && (!showTagOnHover || hovered) && (
          <div className="absolute -top-2 -right-2 z-10" onMouseEnter={keepBadgeVisible} onMouseLeave={scheduleHideBadge}>
            <Badge 
              className="bg-emerald-600/90 text-emerald-100 text-xs px-2 py-1 border border-emerald-500/50 shadow-lg"
              style={{
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(16, 185, 129, 0.2)'
              }}
            >
              <span className="mr-1">{mappedFeatureName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFeatureUnmap(parameterId);
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
      {dropState.isOver && dropState.canDrop && !mappedFeatureId && (
        <div className="text-xs text-emerald-400/80 font-mono animate-pulse">
          Drop to map feature
        </div>
      )}
    </div>
  );
};
</file>

<file path="apps/web/src/lib/visualizer/core/VisualizerManager.ts">
import * as THREE from 'three';
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
    try {
      // First, check if canvas already has a context to avoid conflicts
      const existingContext = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (existingContext) {
        debugLog.log('🔄 Found existing WebGL context, will attempt to reuse');
      }
      
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'default', // Changed from high-performance to reduce resource usage
        failIfMajorPerformanceCaveat: false // Allow software rendering
      });
      
      debugLog.log('✅ WebGL Renderer created successfully');
      debugLog.log('🔧 WebGL Context:', this.renderer.getContext());
    } catch (error) {
      debugLog.error('❌ Primary WebGL renderer failed:', error);
      
      // Try minimal fallback settings
      try {
        debugLog.log('🔄 Attempting fallback renderer with minimal settings...');
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false
        });
        debugLog.log('✅ Fallback renderer created successfully');
      } catch (fallbackError) {
        debugLog.error('❌ Fallback renderer also failed:', fallbackError);
        throw new Error('WebGL is not available. Please refresh the page and try again. If the problem persists, try closing other browser tabs or restarting your browser.');
      }
    }
    
    this.renderer.setSize(config.canvas.width, config.canvas.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.canvas.pixelRatio || 2));
    this.renderer.setClearColor(0x000000, 0); // Transparent background for layer compositing
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    console.log('🎮 VisualizerManager: Renderer clear color =', clearColor.getHex().toString(16), 'alpha =', clearAlpha);
    
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
      enableBloom: config.performance?.enableBloom ?? true,
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
  public addEffect(effect: VisualEffect) {
    try {
      debugLog.log(`🎨 Adding effect: ${effect.name} (${effect.id})`);
      effect.init(this.renderer);
      this.effects.set(effect.id, effect);
      // Register a layer for this effect
      this.multiLayerCompositor.createLayer(effect.id, effect.getScene(), effect.getCamera(), {
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
    
    // Update all enabled effects with improved performance
    let activeEffectCount = 0;
    const maxEffectsPerFrame = 3; // Reduced back to 3 for 30fps
    let updatedEffects = 0;
    
    this.effects.forEach(effect => {
      if (effect.enabled && updatedEffects < maxEffectsPerFrame) {
        activeEffectCount++;
        updatedEffects++;
        
        try {
          // Use real data if available, otherwise fallback to mock data
          const audioData: AudioAnalysisData = this.currentAudioData || this.createMockAudioData();
          const midiData: LiveMIDIData = this.currentMidiData || this.createMockMidiData();
          
          effect.update(deltaTime, audioData, midiData);
        } catch (error) {
          debugLog.error(`❌ Effect ${effect.id} update failed:`, error);
          // Disable problematic effect to prevent further issues
          effect.enabled = false;
        }
      } else if (effect.enabled) {
        activeEffectCount++; // Count but don't update this frame
      }
    });
    
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
      
      // Update audio texture with current time
      this.audioTextureManager.updateTime(currentTime / 1000, audioFeatureData.duration);
    }
    
    // Update media layer textures (for video elements)
    if (this.mediaLayerManager) {
      this.mediaLayerManager.updateTextures();
    }
    
    // Render all layers via compositor
    this.multiLayerCompositor.render();
    
    this.lastTime = currentTime;
  };
  
  // Mock data generators (will be replaced with real data)
  private createMockAudioData(): AudioAnalysisData {
    const frequencies = new Array(256);
    const timeData = new Array(256);
    
    // Generate more realistic frequency data
    for (let i = 0; i < 256; i++) {
      frequencies[i] = Math.sin(this.clock.elapsedTime * 2 + i * 0.1) * 0.5 + 0.5;
      timeData[i] = Math.cos(this.clock.elapsedTime * 3 + i * 0.05) * 0.3 + 0.3;
    }
    
    return {
      frequencies,
      timeData,
      volume: (Math.sin(this.clock.elapsedTime * 1.5) + 1) * 0.5,
      bass: (Math.sin(this.clock.elapsedTime * 0.8) + 1) * 0.5,
      mid: (Math.sin(this.clock.elapsedTime * 1.2) + 1) * 0.5,
      treble: (Math.sin(this.clock.elapsedTime * 2.0) + 1) * 0.5
    };
  }
  
  private createMockMidiData(): LiveMIDIData {
    return {
      activeNotes: [],
      currentTime: this.clock.elapsedTime,
      tempo: 120,
      totalNotes: 0,
      trackActivity: {}
    };
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
  
  
  updateEffectParameter(effectId: string, paramName: string, value: any): void {
    const effect = this.effects.get(effectId);
    if (effect && effect.parameters.hasOwnProperty(paramName)) {
      const oldValue = (effect.parameters as any)[paramName];
      (effect.parameters as any)[paramName] = value;
      
      // REMOVED VERBOSE LOGGING - Only log significant changes or errors
      // If the effect has an updateParameter method, call it for immediate updates
      if (typeof (effect as any).updateParameter === 'function') {
        (effect as any).updateParameter(paramName, value);
      }
    } else {
      // Only log errors, not every parameter update
      if (!effect) {
        debugLog.warn(`⚠️ Effect ${effectId} not found`);
      } else if (!effect.parameters.hasOwnProperty(paramName)) {
        debugLog.warn(`⚠️ Parameter ${paramName} not found in effect ${effectId}`);
      }
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
        const texture = new THREE.TextureLoader().load(image.src);
        const plane = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
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

<file path="apps/web/src/lib/visualizer/core/MultiLayerCompositor.ts">
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
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
  enableBloom?: boolean;
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
  private bloomRenderTarget: THREE.WebGLRenderTarget;
  private tempRenderTarget: THREE.WebGLRenderTarget;
  
  // Shared geometry for full-screen rendering
  private quadGeometry: THREE.PlaneGeometry;
  private quadCamera: THREE.OrthographicCamera;
  
  // Blend mode shaders
  private blendShaders: Map<string, string> = new Map();

  // Post-processing
  private postProcessingComposer!: EffectComposer;
  private texturePass!: TexturePass;
  private bloomPass?: UnrealBloomPass;
  private fxaaPass?: ShaderPass;
  
  constructor(renderer: THREE.WebGLRenderer, config: CompositorConfig) {
    this.renderer = renderer;
    this.config = {
      enableBloom: false,
      enableAntialiasing: true,
      pixelRatio: window.devicePixelRatio || 1,
      ...config
    };
    
    // Ensure transparent clearing for all off-screen targets
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    // Create render targets
    // CRITICAL FIX: Force standard WebGLRenderTarget to ensure alpha stability
    // MSAA's multisample resolve step corrupts alpha channel - use FXAA instead
    const RTClass: any = THREE.WebGLRenderTarget;

    this.mainRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in this.mainRenderTarget) {
      (this.mainRenderTarget as any).samples = 0; // Explicitly disable MSAA
    }
    
    this.bloomRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in this.bloomRenderTarget) {
      (this.bloomRenderTarget as any).samples = 0; // Explicitly disable MSAA
    }
    
    this.tempRenderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in this.tempRenderTarget) {
      (this.tempRenderTarget as any).samples = 0; // Explicitly disable MSAA
    }
    
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
    console.log(`🎬 Creating layer "${id}", scene.background =`, scene.background);
    
    // CRITICAL FIX: Force standard WebGLRenderTarget to ensure alpha stability
    // MSAA's multisample resolve step corrupts alpha channel - use FXAA instead
    const RTClass: any = THREE.WebGLRenderTarget;

    const renderTarget = new RTClass(
      this.config.width,
      this.config.height,
      {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: false
      }
    );
    if ('samples' in renderTarget) {
      (renderTarget as any).samples = 0; // Explicitly disable MSAA
    }
    
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
   * Remove a layer
   */
  public removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.renderTarget.dispose();
      this.layers.delete(id);
      this.layerOrder = this.layerOrder.filter(layerId => layerId !== id);
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
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      const clearColor = this.renderer.getClearColor(new THREE.Color());
      const clearAlpha = this.renderer.getClearAlpha();
      console.log(`🎨 Rendering layer "${layerId}", clearColor:`, clearColor.getHex().toString(16), `clearAlpha: ${clearAlpha}, scene.background:`, layer.scene.background);
      
      this.renderer.setRenderTarget(layer.renderTarget);
      // Clear color/depth/stencil with transparent background
      this.renderer.clear(true, true, true);
      this.renderer.render(layer.scene, layer.camera);
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
    console.log('🖼️  Rendering to canvas with clearAlpha:', this.renderer.getClearAlpha());
    
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
    
    const clearColor = this.renderer.getClearColor(new THREE.Color());
    const clearAlpha = this.renderer.getClearAlpha();
    console.log('🎬 Compositing to main RT, clearColor:', clearColor.getHex().toString(16), 'clearAlpha:', clearAlpha);
    
    // 3. Perform a single, manual clear at the very beginning
    this.renderer.clear(true, true, true);
    
    // 4. Composite layers in order. Now, each render will draw ON TOP of the previous one.
    for (const layerId of this.layerOrder) {
      const layer = this.layers.get(layerId);
      if (!layer || !layer.enabled) continue;
      
      console.log(`🔗 Compositing layer "${layerId}" with blend mode: ${layer.blendMode}`);
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

    if (this.config.enableBloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.config.width, this.config.height),
        0.6, // strength (tuned up for visible glow)
        0.8, // radius
        0.25 // threshold
      );

      // CRITICAL FIX FOR BLOOM ALPHA
      // The default composite material in UnrealBloomPass discards the original alpha.
      // We must replace its fragment shader with a version that preserves it by taking
      // the alpha from the original scene texture (`baseTexture`).
      const finalCompositeShader = (this.bloomPass as any).compositeMaterial.fragmentShader
        .replace(
          // Find the line that outputs the final color
          'gl_FragColor = linearToOutputTexel( composite );',
          // And replace it with a version that re-injects the original alpha
          `
          vec4 baseTex = texture2D( baseTexture, vUv );
          gl_FragColor = vec4(composite.rgb, baseTex.a);
          `
        );
      
      // Apply the modified shader to the bloom pass
      (this.bloomPass as any).compositeMaterial.fragmentShader = finalCompositeShader;
      
      this.postProcessingComposer.addPass(this.bloomPass);
    }

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
    
    console.log('🎬 EffectComposer initialized with alpha-preserving FXAA support');
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
   * Resize render targets
   */
  public resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    
    // Resize all render targets
    this.mainRenderTarget.setSize(width, height);
    this.bloomRenderTarget.setSize(width, height);
    this.tempRenderTarget.setSize(width, height);
    
    // Resize layer render targets
    for (const layer of this.layers.values()) {
      layer.renderTarget.setSize(width, height);
    }

    // Resize post-processing
    if (this.postProcessingComposer) {
      this.postProcessingComposer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.setSize(width, height);
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
    this.bloomRenderTarget.dispose();
    this.tempRenderTarget.dispose();
    
    for (const layer of this.layers.values()) {
      layer.renderTarget.dispose();
    }
    
    this.quadGeometry.dispose();
    this.layers.clear();
    this.layerOrder = [];
  }
}
</file>

<file path="apps/web/src/lib/visualizer/effects/ParticleNetworkEffect.ts">
import * as THREE from 'three';
import { VisualEffect, AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { debugLog } from '@/lib/utils';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  note: number;
  noteVelocity: number;
  track: string;
  // Add audio feature data for audio-triggered particles
  audioFeature?: string;
  audioValue?: number;
  spawnType: 'midi' | 'audio';
}

export class ParticleNetworkEffect implements VisualEffect {
  id = 'particleNetwork';
  name = 'MIDI & Audio Particle Network';
  description = 'Glowing particle network that responds to MIDI notes and audio features';
  enabled = true;
  parameters = {
    maxParticles: 50,
    connectionDistance: 1.0,
    particleLifetime: 3.0,
    glowIntensity: 0.6,
    glowSoftness: 3.0,
    particleColor: [1.0, 1.0, 1.0],
    particleSize: 15.0,
    particleSpawning: 0.0, // Modulation destination for particle spawning (0-1)
    spawnThreshold: 0.5, // Threshold for when modulation signal spawns particles
    connectionOpacity: 0.8, // Opacity multiplier for connection lines
  };

  private internalScene!: THREE.Scene;
  private internalCamera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private connectionLines!: THREE.LineSegments;
  private material!: THREE.ShaderMaterial;
  private uniforms!: Record<string, THREE.IUniform>;
  
  private particles: Particle[] = [];
  private geometry!: THREE.BufferGeometry;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private lives!: Float32Array;
  
  // Connection data
  private connectionGeometry!: THREE.BufferGeometry;
  private connectionMaterial!: THREE.LineBasicMaterial;
  private connectionPositions!: Float32Array;
  private connectionColors!: Float32Array;
  private maxConnections: number = 500; // Limit connections
  private activeConnections: number = 0;
  
  // Performance optimization: skip frames
  private frameSkipCounter = 0;
  private frameSkipInterval = 2; // Update every 3rd frame for 30fps -> 10fps updates

  private instancedMesh!: THREE.InstancedMesh;
  private instanceColors!: Float32Array;
  private instanceLives!: Float32Array;
  private instanceSizes!: Float32Array;
  private dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Audio spawning state
  private lastAudioSpawnTime: number = 0;
  private lastManualSpawnTime: number = 0;
  private currentAudioData: AudioAnalysisData | null = null;


  constructor() {
    this.setupUniforms();
  }

  

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    // Convert screen px to NDC
    if (!this.renderer || !this.internalCamera) return new THREE.Vector3();
    const size = this.renderer.getSize(new THREE.Vector2());
    const ndcX = (screenX / size.x) * 2 - 1;
    const ndcY = -((screenY / size.y) * 2 - 1);
    // Project to world at z=0
    const vector = new THREE.Vector3(ndcX, ndcY, 0.0);
    vector.unproject(this.internalCamera);
    return vector;
  }


  private setupUniforms() {
    this.uniforms = {
      uTime: { value: 0.0 },
      uIntensity: { value: 1.0 },
      uGlowIntensity: { value: 1.0 }, // Reset to a reasonable default
      uGlowSoftness: { value: this.parameters.glowSoftness },
      uSizeMultiplier: { value: 1.0 } // Size control uniform
    };
  }

  init(renderer: THREE.WebGLRenderer): void {
    debugLog.log('🌟 ParticleNetworkEffect.init() called');
    this.renderer = renderer;
    // Create internal scene and a perspective camera for 3D effect
    this.internalScene = new THREE.Scene();
    this.internalScene.background = null; // Transparent background for layer compositing
    console.log('✨ ParticleNetworkEffect: Scene created, background =', this.internalScene.background);
    const size = this.renderer.getSize(new THREE.Vector2());
    const aspect = size.x / size.y || 1;
    this.internalCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.internalCamera.position.set(0, 0, 5);
    
    this.createParticleSystem();
    this.createConnectionSystem();
    
    // Initialize size multiplier based on current particleSize parameter
    if (this.uniforms) {
      this.uniforms.uSizeMultiplier.value = this.parameters.particleSize;
    }
    
    debugLog.log('🌟 Particle Network initialized');
  }
  
  private createParticleSystem() {
    // Plane that will always face the camera (we'll orient in updateBuffers)
    const quad = new THREE.PlaneGeometry(1, 1);

    // Custom shader material for billboard
    const vertexShader = `
      attribute vec3 instanceColor;
      attribute float instanceLife;
      attribute float instanceSize;
      varying vec3 vColor;
      varying float vLife;
      varying float vSize;
      varying vec2 vUv;
      
      void main() {
        vColor = instanceColor;
        vLife  = instanceLife;
        vSize  = instanceSize;
        vUv    = uv;
        
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float uGlowIntensity;
      uniform float uGlowSoftness; // softness control, not exponent
      varying vec3 vColor;
      varying float vLife;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0; // 0.0 center → 1.0 edge
        if (dist > 1.0) discard;

        // Solid core ensures visibility
        float core = 1.0 - smoothstep(0.0, 0.2, dist);

        // Smooth glow falloff using exp
        float glow = exp(-pow(dist, uGlowSoftness));
        
        float alpha = (core + glow * uGlowIntensity) * vLife;
        vec3 finalColor = vColor * (1.0 + glow * uGlowIntensity * 0.5 + core * 0.2);

        // Premultiplied alpha for additive blending
        gl_FragColor = vec4(finalColor * alpha, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      premultipliedAlpha: true,
      vertexColors: true
    });

    const maxParticles = this.parameters.maxParticles;
    this.instancedMesh = new THREE.InstancedMesh(quad, this.material, maxParticles);

    // Per-instance dynamic attributes
    this.instanceColors = new Float32Array(maxParticles * 3);
    this.instanceLives  = new Float32Array(maxParticles);
    this.instanceSizes  = new Float32Array(maxParticles);

    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.geometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(this.instanceColors, 3, false)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceLife',
      new THREE.InstancedBufferAttribute(this.instanceLives, 1, false)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceSize',
      new THREE.InstancedBufferAttribute(this.instanceSizes, 1, false)
    );

    // Initialize with a few default particles to make the effect visible
    this.initializeDefaultParticles();

    this.internalScene.add(this.instancedMesh);
  }

  private initializeDefaultParticles() {
    // Add a few default particles to ensure the system renders
    for (let i = 0; i < 5; i++) {
      const particle = this.createParticle(60 + i, 64, 'default');
      this.particles.push(particle);
    }
    this.updateBuffers();
  }
  
  private getRandomSpawnPosition(): THREE.Vector3 {
    // Spawn across entire viewport in world coordinates
    const x = (Math.random() - 0.5) * 4; // -2 to +2 in world space
    const y = (Math.random() - 0.5) * 4; // -2 to +2 in world space
    const z = 0;
    return new THREE.Vector3(x, y, z);
  }
  
  private createParticle(note: number, velocity: number, track: string, spawnType: 'midi' | 'audio' = 'midi', audioFeature?: string, audioValue?: number): Particle {
    // Spawn inside current viewport bounds
    const position = this.getRandomSpawnPosition();
    
    // Give them a random direction to drift in
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    );
    
    // Calculate size based on spawn type
    let size: number;
    if (spawnType === 'audio' && audioValue !== undefined) {
      // Audio particles: size based on audio value
      size = this.parameters.particleSize * (0.5 + audioValue * 1.5);
    } else {
      // MIDI particles: size based on velocity
      size = 3.0 + (velocity / 127) * 5.0;
    }
    
    return {
      position,
      velocity: vel,
      life: 1.0,
      maxLife: this.parameters.particleLifetime,
      size,
      note,
      noteVelocity: velocity,
      track,
      audioFeature,
      audioValue,
      spawnType
    };
  }
  
  private getNoteColor(note: number, velocity: number, spawnType: 'midi' | 'audio' = 'midi', audioValue?: number): THREE.Color {
    const baseColor = new THREE.Color(
      this.parameters.particleColor[0],
      this.parameters.particleColor[1], 
      this.parameters.particleColor[2]
    );
    
    if (spawnType === 'audio' && audioValue !== undefined) {
      // Audio particles: vary hue based on audio value
      const hue = (audioValue * 0.3) % 1.0;
      const audioColor = new THREE.Color().setHSL(hue, 0.7, 0.6);
      return audioColor.lerp(baseColor, 0.5);
    } else {
      // MIDI particles: note-based color
      const hue = (note % 12) / 12;
      const saturation = 0.4 + (velocity / 127) * 0.3;
      const lightness = 0.5 + (velocity / 127) * 0.2;
      
      const noteColor = new THREE.Color();
      noteColor.setHSL(hue, saturation, lightness);
      return noteColor.lerp(baseColor, 0.3);
    }
  }
  
  private updateParticles(deltaTime: number, midiData: LiveMIDIData, audioData?: AudioAnalysisData) {
    // Add new particles for active MIDI notes
    midiData.activeNotes.forEach(noteData => {
      if (this.particles.length < this.parameters.maxParticles) {
        // Check if we already have a recent particle for this note
        const hasRecentParticle = this.particles.some(p => 
          p.note === noteData.note && p.life > 0.8 && p.spawnType === 'midi'
        );
        
        if (!hasRecentParticle) {
          const particle = this.createParticle(noteData.note, noteData.velocity, noteData.track, 'midi');
          this.particles.push(particle);
        }
      }
    });
    
    // Spawn particles based on particleSpawning parameter (manual or audio-modulated)
    if (this.parameters.particleSpawning >= this.parameters.spawnThreshold) {
      this.spawnManualParticles(deltaTime);
    }
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update life
      particle.life -= deltaTime / particle.maxLife;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update physics
      particle.velocity.multiplyScalar(0.98); // Damping
      
      // Apply velocity
      particle.position.add(particle.velocity);
    }
    
    this.updateBuffers();
    this.updateConnections();
  }
  
  
  private spawnManualParticles(deltaTime: number) {
    const currentTime = performance.now() / 1000;
    
    // Check cooldown for manual spawning
    if (currentTime - this.lastManualSpawnTime < 0.1) { // 100ms cooldown for manual testing
      return;
    }
    
    // Calculate spawn probability based on how much particleSpawning exceeds threshold
    const excessAmount = this.parameters.particleSpawning - this.parameters.spawnThreshold;
    const spawnProbability = Math.min(excessAmount * 2.0, 0.5); // Max 50% chance per frame
    
    if (Math.random() < spawnProbability && this.particles.length < this.parameters.maxParticles) {
      // Create manual test particle
      const particle = this.createParticle(
        60, // Default note
        Math.floor(this.parameters.particleSpawning * 127), // Use slider value as velocity
        'manual',
        'audio', // Use audio spawn type for visual distinction
        'manual',
        this.parameters.particleSpawning
      );
      
      this.particles.push(particle);
      this.lastManualSpawnTime = currentTime;
    }
  }
  
  
  private updateBuffers() {
    const cameraQuat = this.internalCamera.quaternion;

    // Update per-instance data
    let index = 0;
    this.particles.forEach((particle) => {
      if (index >= this.parameters.maxParticles) return;
      // Compose matrix facing camera
      const baseFactor = 0.02; // world units per size unit
      // Clamp scale so full visible range reached at ~60% of slider (slider max ~50)
      const scaleMult = Math.min(this.parameters.particleSize, 30); // stop growing after 60%
      const scaleValue = particle.size * baseFactor * scaleMult;
      const scale = new THREE.Vector3(scaleValue, scaleValue, 1);
      this.dummyMatrix.compose(particle.position, cameraQuat, scale);
      this.instancedMesh.setMatrixAt(index, this.dummyMatrix);

      // Color
      const color = this.getNoteColor(particle.note, particle.noteVelocity, particle.spawnType, particle.audioValue);
      this.instanceColors[index * 3] = color.r;
      this.instanceColors[index * 3 + 1] = color.g;
      this.instanceColors[index * 3 + 2] = color.b;

      // Life & size
      this.instanceLives[index] = particle.life;
      this.instanceSizes[index] = particle.size;

      index++;
    });

    this.instancedMesh.count = index;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceColor') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceLife') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.instancedMesh.geometry.getAttribute('instanceSize') as THREE.InstancedBufferAttribute).needsUpdate = true;
  }
  
  private createConnectionSystem() {
    // Create connection line system using LineSegments for multiple disconnected lines
    this.connectionGeometry = new THREE.BufferGeometry();
    this.connectionPositions = new Float32Array(this.maxConnections * 6); // 2 points per line, 3 coords each
    this.connectionColors = new Float32Array(this.maxConnections * 6); // 2 colors per line, 3 channels each
    
    this.connectionGeometry.setAttribute('position', new THREE.BufferAttribute(this.connectionPositions, 3));
    this.connectionGeometry.setAttribute('color', new THREE.BufferAttribute(this.connectionColors, 3));
    
    this.connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false
    });
    
    this.connectionLines = new THREE.LineSegments(this.connectionGeometry, this.connectionMaterial);
    this.internalScene.add(this.connectionLines);
  }

  private updateConnections() {
    let connectionIndex = 0;
    
    for (let i = 0; i < this.particles.length - 1 && connectionIndex < this.maxConnections; i++) {
      for (let j = i + 1; j < this.particles.length && connectionIndex < this.maxConnections; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const distance = p1.position.distanceTo(p2.position);
        
        if (distance < this.parameters.connectionDistance) {
          // Improved strength calculation - less aggressive falloff
          const distanceFactor = 1.0 - (distance / this.parameters.connectionDistance);
          const lifeFactor = Math.min(p1.life, p2.life);
          // Normalize velocity contribution (0.5 to 1.0 range instead of multiplying)
          const velocityFactor = 0.5 + ((p1.noteVelocity + p2.noteVelocity) / 508);
          const strength = distanceFactor * lifeFactor * velocityFactor * this.parameters.connectionOpacity;
          
          // Use white for connection lines (user preference)
          // With additive blending, strength controls brightness
          const whiteColor = 1.0;
          
          // Set positions for this line segment (2 points)
          const baseIndex = connectionIndex * 6;
          this.connectionPositions[baseIndex] = p1.position.x;
          this.connectionPositions[baseIndex + 1] = p1.position.y;
          this.connectionPositions[baseIndex + 2] = p1.position.z;
          this.connectionPositions[baseIndex + 3] = p2.position.x;
          this.connectionPositions[baseIndex + 4] = p2.position.y;
          this.connectionPositions[baseIndex + 5] = p2.position.z;
          
          // Set white colors with strength for both vertices
          this.connectionColors[baseIndex] = whiteColor * strength;
          this.connectionColors[baseIndex + 1] = whiteColor * strength;
          this.connectionColors[baseIndex + 2] = whiteColor * strength;
          this.connectionColors[baseIndex + 3] = whiteColor * strength;
          this.connectionColors[baseIndex + 4] = whiteColor * strength;
          this.connectionColors[baseIndex + 5] = whiteColor * strength;
          
          connectionIndex++;
        }
      }
    }
    
    // Set the draw range to only render active connections
    this.connectionGeometry.setDrawRange(0, connectionIndex * 2); // 2 vertices per connection
    this.connectionGeometry.attributes.position.needsUpdate = true;
    this.connectionGeometry.attributes.color.needsUpdate = true;
    this.activeConnections = connectionIndex;
  }
  
  updateParameter(paramName: string, value: any): void {
    // Immediately update parameters for real-time control
    switch (paramName) {
      case 'maxParticles':
        // This affects the next particle creation cycle
        break;
      case 'connectionDistance':
        // This affects connection calculations in updateConnections
        break;
      case 'particleLifetime':
        // This affects particle creation
        break;
      case 'glowIntensity':
        if (this.uniforms) this.uniforms.uGlowIntensity.value = value;
        break;
      case 'glowSoftness':
        this.parameters.glowSoftness = value;
        if (this.uniforms) this.uniforms.uGlowSoftness.value = value;
        break;
      case 'particleColor':
        // This affects particle color generation
        break;
      case 'particleSize':
        this.parameters.particleSize = value;
        break;
      case 'particleSpawning':
        this.parameters.particleSpawning = value;
        break;
      case 'spawnThreshold':
        this.parameters.spawnThreshold = value;
        break;
      case 'connectionOpacity':
        this.parameters.connectionOpacity = value;
        break;
    }
  }

  update(deltaTime: number, audioData: AudioAnalysisData, midiData: LiveMIDIData): void {
    if (!this.uniforms) {
      debugLog.warn('⚠️ Uniforms not initialized in ParticleNetworkEffect.update()');
      return;
    }

    // Store current audio data for particle spawning
    this.currentAudioData = audioData;

    // Generic: sync all parameters to uniforms
    for (const key in this.parameters) {
      const uniformKey = 'u' + key.charAt(0).toUpperCase() + key.slice(1);
      if (this.uniforms[uniformKey]) {
        this.uniforms[uniformKey].value = this.parameters[key as keyof typeof this.parameters];
      }
    }

    // Always update time and uniforms for smooth animation
    this.uniforms.uTime.value += deltaTime;
    this.uniforms.uIntensity.value = Math.max(0.5, Math.min(midiData.activeNotes.length / 3.0, 2.0));
    this.uniforms.uGlowIntensity.value = this.parameters.glowIntensity;
    
    // Ensure the instanced mesh is visible
    if (this.instancedMesh) {
      this.instancedMesh.visible = true;
    }
    
    // Skip heavy particle updates every few frames for performance
    this.frameSkipCounter++;
    if (this.frameSkipCounter >= this.frameSkipInterval) {
      this.frameSkipCounter = 0;
      this.updateParticles(deltaTime * this.frameSkipInterval, midiData, audioData);
    }
  }

  public getScene(): THREE.Scene {
    return this.internalScene;
  }

  public getCamera(): THREE.Camera {
    return this.internalCamera;
  }

  /**
   * Handle resize events to maintain correct aspect ratio
   */
  public resize(width: number, height: number): void {
    if (this.internalCamera) {
      this.internalCamera.aspect = width / height;
      this.internalCamera.updateProjectionMatrix();
      debugLog.log('🎨 ParticleNetworkEffect camera aspect updated:', this.internalCamera.aspect);
    }
  }

  destroy(): void {
    if (this.instancedMesh) {
      this.internalScene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.material.dispose();
    }
    
    if (this.connectionLines) {
      this.internalScene.remove(this.connectionLines);
      this.connectionGeometry.dispose();
      this.connectionMaterial.dispose();
    }
  }
}
</file>

<file path="apps/web/src/app/creative-visualizer/page.tsx">
'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Zap, Palette, Settings2, Eye, EyeOff, Info, Map } from 'lucide-react';
import { ThreeVisualizer } from '@/components/midi/three-visualizer';
import { EffectsLibrarySidebar, EffectUIData } from '@/components/ui/EffectsLibrarySidebar';
import { CollapsibleEffectsSidebar } from '@/components/layout/collapsible-effects-sidebar';
import { FileSelector } from '@/components/midi/file-selector';
import { MIDIData, VisualizationSettings, DEFAULT_VISUALIZATION_SETTINGS } from '@/types/midi';
import { VisualizationPreset, StemVisualizationMapping } from '@/types/stem-visualization';
import { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';
import { trpc } from '@/lib/trpc';
import { CollapsibleSidebar } from '@/components/layout/collapsible-sidebar';
import { ProjectPickerModal } from '@/components/projects/project-picker-modal';
import { debugLog } from '@/lib/utils';
import { ProjectCreationModal } from '@/components/projects/project-creation-modal';
import { useStemAudioController } from '@/hooks/use-stem-audio-controller';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';
import { PortalModal } from '@/components/ui/portal-modal';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MappingSourcesPanel } from '@/components/ui/MappingSourcesPanel';
import { DroppableParameter } from '@/components/ui/droppable-parameter';
import { LayerContainer } from '@/components/video-composition/LayerContainer';
import { useTimelineStore } from '@/stores/timelineStore';
import { UnifiedTimeline } from '@/components/video-composition/UnifiedTimeline';
import { TestVideoComposition } from '@/components/video-composition/TestVideoComposition';
import type { Layer } from '@/types/video-composition';
import { useFeatureValue } from '@/hooks/use-feature-value';
import { HudOverlayProvider, useHudOverlayContext } from '@/components/hud/HudOverlayManager';
import { AspectRatioSelector } from '@/components/ui/aspect-ratio-selector';
import { getAspectRatioConfig } from '@/lib/visualizer/aspect-ratios';

// Derived boolean: are stem URLs ready?
// const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0; // This line was moved

// Wrapper component that provides HUD overlay functionality to the sidebar
const EffectsLibrarySidebarWithHud: React.FC<{
  effects: any[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void;
  isVisible: boolean;
  stemUrlsReady: boolean;
}> = ({ effects, selectedEffects, onEffectToggle, onEffectDoubleClick, isVisible, stemUrlsReady }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const hudContext = useHudOverlayContext();
  
  const handleEffectDoubleClick = (effectId: string) => {
    if (!stemUrlsReady) {
      debugLog.warn('[EffectsLibrarySidebarWithHud] Overlay creation blocked: stem URLs not ready');
      return;
    }
    const effect = effects.find(e => e.id === effectId);
    if (effect && effect.category === 'Overlays' && isClient) {
      // Map effect ID to overlay type
      const overlayTypeMap: Record<string, string> = {
        'waveform': 'waveform',
        'spectrogram': 'spectrogram',
        'peakMeter': 'peakMeter',
        'stereometer': 'stereometer',
        'oscilloscope': 'oscilloscope',
        'spectrumAnalyzer': 'spectrumAnalyzer',
        'midiMeter': 'midiMeter'
      };
      
      const overlayType = overlayTypeMap[effectId];
      if (overlayType) {
        debugLog.log('🎯 Adding HUD overlay:', overlayType);
        hudContext.addOverlay(overlayType);
      }
    }
    onEffectDoubleClick(effectId);
  };
  
  return (
    <EffectsLibrarySidebar
      effects={effects}
      selectedEffects={selectedEffects}
      onEffectToggle={onEffectToggle}
      onEffectDoubleClick={handleEffectDoubleClick}
      isVisible={isVisible}
    />
  );
};

// Sample MIDI data for demonstration
const createSampleMIDIData = (): MIDIData => {
  const notes: any[] = [];
  const melodyPattern = [60, 64, 67, 72, 69, 65, 62, 60, 67, 64, 69, 72, 74, 67, 64, 60];
  for (let i = 0; i < melodyPattern.length; i++) {
    notes.push({
      id: `melody-${i}`,
      start: i * 0.5,
      duration: 0.4,
      pitch: melodyPattern[i],
      velocity: 60 + Math.random() * 40,
      track: 'melody',
      noteName: `Note${melodyPattern[i]}`,
    });
  }
  const chordTimes = [2, 4, 6, 8];
  chordTimes.forEach((time, idx) => {
    const chordNotes = [48, 52, 55];
    chordNotes.forEach((note, noteIdx) => {
      notes.push({
        id: `chord-${idx}-${noteIdx}`,
        start: time,
        duration: 1.5,
        pitch: note,
        velocity: 40 + Math.random() * 30,
        track: 'melody',
        noteName: `Chord${note}`,
      });
    });
  });

  return {
    file: {
      name: 'Creative Demo.mid',
      size: 1024,
      duration: 10.0,
      ticksPerQuarter: 480,
      timeSignature: [4, 4],
      keySignature: 'C Major'
    },
    tracks: [
      { id: 'melody', name: 'Synth Lead', instrument: 'Synthesizer', channel: 1, color: '#84a98c', visible: true, notes: notes },
      { id: 'bass', name: 'Bass Synth', instrument: 'Bass', channel: 2, color: '#6b7c93', visible: true, notes: [
          { id: 'b1', start: 0.0, duration: 1.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
          { id: 'b2', start: 1.0, duration: 1.0, pitch: 40, velocity: 95, track: 'bass', noteName: 'E2' },
          { id: 'b3', start: 2.0, duration: 1.0, pitch: 43, velocity: 90, track: 'bass', noteName: 'G2' },
          { id: 'b4', start: 3.0, duration: 1.0, pitch: 48, velocity: 85, track: 'bass', noteName: 'C3' },
          { id: 'b5', start: 4.0, duration: 2.0, pitch: 36, velocity: 100, track: 'bass', noteName: 'C2' },
        ]
      },
      { id: 'drums', name: 'Drums', instrument: 'Drum Kit', channel: 10, color: '#b08a8a', visible: true, notes: [
          { id: 'd1', start: 0.0, duration: 0.1, pitch: 36, velocity: 120, track: 'drums', noteName: 'Kick' },
          { id: 'd2', start: 0.5, duration: 0.1, pitch: 42, velocity: 80, track: 'drums', noteName: 'HiHat' },
          { id: 'd3', start: 1.0, duration: 0.1, pitch: 38, velocity: 100, track: 'drums', noteName: 'Snare' },
          { id: 'd4', start: 1.5, duration: 0.1, pitch: 42, velocity: 70, track: 'drums', noteName: 'HiHat' },
          { id: 'd5', start: 2.0, duration: 0.1, pitch: 36, velocity: 127, track: 'drums', noteName: 'Kick' },
          { id: 'd6', start: 2.5, duration: 0.1, pitch: 42, velocity: 85, track: 'drums', noteName: 'HiHat' },
          { id: 'd7', start: 3.0, duration: 0.1, pitch: 38, velocity: 110, track: 'drums', noteName: 'Snare' },
          { id: 'd8', start: 3.5, duration: 0.1, pitch: 42, velocity: 75, track: 'drums', noteName: 'HiHat' },
        ]
      }
    ],
    tempoChanges: [
      { tick: 0, bpm: 120, microsecondsPerQuarter: 500000 }
    ]
  };
};

// Transform backend MIDI data to frontend format
const transformBackendToFrontendMidiData = (backendData: any): MIDIData => {
  return {
    file: {
      name: backendData.file.name,
      size: backendData.file.size,
      duration: backendData.file.duration,
      ticksPerQuarter: backendData.file.ticksPerQuarter,
      timeSignature: backendData.file.timeSignature,
      keySignature: backendData.file.keySignature
    },
    tracks: backendData.tracks.map((track: any) => ({
      id: String(track.id),
      name: track.name,
      instrument: track.instrument,
      channel: track.channel,
      color: track.color,
      visible: true,
      notes: track.notes.map((note: any) => ({
        id: note.id,
        start: note.startTime, // Backend: startTime -> Frontend: start
        duration: note.duration,
        pitch: note.note,      // Backend: note -> Frontend: pitch
        velocity: note.velocity,
        track: String(track.id), // Backend: track (number) -> Frontend: track (string)
        noteName: note.name,   // Backend: name -> Frontend: noteName
      }))
    })),
    tempoChanges: backendData.tempoChanges
  };
};


function CreativeVisualizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [settings, setSettings] = useState<VisualizationSettings>(DEFAULT_VISUALIZATION_SETTINGS);
  const {
    layers,
    currentTime,
    isPlaying,
    selectedLayerId,
    addLayer,
    updateLayer,
    deleteLayer,
    selectLayer,
    setCurrentTime,
    setDuration,
    togglePlay,
    setPlaying,
  } = useTimelineStore();
  const [fps, setFps] = useState(60);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset>({
    id: 'default',
    name: 'Default',
    description: 'Default visualization preset',
    category: 'custom',
    tags: ['default'],
    mappings: {},
    defaultSettings: {
      masterIntensity: 1.0,
      transitionSpeed: 1.0,
      backgroundAlpha: 0.1,
      particleCount: 100,
      qualityLevel: 'medium'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    usageCount: 0
  });

  // Effects timeline has been merged into layers via store
  const [showVideoComposition, setShowVideoComposition] = useState(false);

  // Effects carousel state (now for timeline-based effects)
  const [selectedEffects, setSelectedEffects] = useState<Record<string, boolean>>({});

  // Visualizer aspect ratio toggle state - now using modular system
  const [visualizerAspectRatio, setVisualizerAspectRatio] = useState<string>('mobile');

  // Effect parameter modal state
  const [openEffectModals, setOpenEffectModals] = useState<Record<string, boolean>>({
    'metaballs': false,
    'midiHud': false,
    'particleNetwork': false
  });

  // Feature mapping state
  interface FeatureMapping {
    featureId: string | null;
    modulationAmount: number; // 0-1, default 1.0 (100%)
  }
  const [mappings, setMappings] = useState<Record<string, FeatureMapping>>({});
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  // Base (user-set) parameter values and last modulated values for visualization
  const [baseParameterValues, setBaseParameterValues] = useState<Record<string, number>>({});
  const [modulatedParameterValues, setModulatedParameterValues] = useState<Record<string, number>>({});

  // Real-time sync calibration offset in ms
  const [syncOffsetMs, setSyncOffsetMs] = useState(0);

  // Performance monitoring for sync debugging
  const [syncMetrics, setSyncMetrics] = useState({
    audioLatency: 0,
    visualLatency: 0,
    syncDrift: 0,
    frameTime: 0,
    lastUpdate: 0
  });

  const [sampleMidiData] = useState<MIDIData>(createSampleMIDIData());
  const stemAudio = useStemAudioController();
  const audioAnalysis = useAudioAnalysis();
  
  // Sync performance monitoring
  useEffect(() => {
    if (!isPlaying) return;
    
    const updateSyncMetrics = () => {
      const now = performance.now();
      const audioTime = stemAudio.currentTime;
      const visualTime = currentTime;
      const audioLatency = stemAudio.getAudioLatency ? stemAudio.getAudioLatency() * 1000 : 0;
      const frameTime = now - syncMetrics.lastUpdate;
      
      setSyncMetrics({
        audioLatency,
        visualLatency: frameTime,
        syncDrift: Math.abs(audioTime - visualTime) * 1000, // Convert to ms
        frameTime,
        lastUpdate: now
      });
    };
    
    const interval = setInterval(updateSyncMetrics, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [isPlaying, stemAudio.currentTime, currentTime, syncMetrics.lastUpdate]);
  
  // Enhanced audio analysis data - This state is no longer needed, data comes from useCachedStemAnalysis
  // const [audioAnalysisData, setAudioAnalysisData] = useState<any>(null);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isLoadingStemsRef = useRef(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);
  
  // Ref to track current analysis state to avoid stale closures
  const currentAnalysisRef = useRef(audioAnalysis.cachedAnalysis);
  
  // Update ref when analysis changes
  useEffect(() => {
    currentAnalysisRef.current = audioAnalysis.cachedAnalysis;
  }, [audioAnalysis.cachedAnalysis]);

  // Get download URL mutation
  const getDownloadUrlMutation = trpc.file.getDownloadUrl.useMutation();

  // Fetch current project information
  const { 
    data: projectData, 
    isLoading: projectLoading, 
    error: projectError 
  } = trpc.project.get.useQuery(
    { id: currentProjectId! },
    { enabled: !!currentProjectId }
  );

  // Fetch project files to get available stems
  const { 
    data: projectFiles, 
    isLoading: projectFilesLoading 
  } = trpc.file.getUserFiles.useQuery(
    { 
      limit: 20, 
      fileType: 'all',
      projectId: currentProjectId || undefined
    },
    { enabled: !!currentProjectId }
  );

  // Fetch MIDI visualization data
  const { 
    data: fileData, 
    isLoading: fileLoading, 
    error: fileError 
  } = trpc.midi.getVisualizationData.useQuery(
    { fileId: selectedFileId! },
    { enabled: !!selectedFileId && !useDemoData }
  );

  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const projectId = searchParams.get('projectId');
    
    if (projectId) {
      setCurrentProjectId(projectId);
      setUseDemoData(false);
    }
    
    if (fileId) {
      setSelectedFileId(fileId);
      setUseDemoData(false);
    }

    // If no project or file is specified, default to demo mode
    if (!projectId && !fileId) {
      setUseDemoData(true);
    }

    const projectIdFromParams = searchParams.get('projectId');
    if (!projectIdFromParams) {
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }

    // Mark as initialized after processing URL params
    setIsInitialized(true);
  }, [searchParams]);

  // Helper to sort stems: non-master first, master last
  function sortStemsWithMasterLast(stems: any[]) {
    return [...stems].sort((a, b) => {
      if (a.is_master && !b.is_master) return 1;
      if (!a.is_master && b.is_master) return -1;
      return 0;
    });
  }

  // Load stems when project files are available
  useEffect(() => {
    // This effect now correctly handles both initial load and changes to project files
    if (projectFiles?.files && currentProjectId && isInitialized && !audioAnalysis.isLoading) {
      let cancelled = false;
      
      const loadStemsWithUrls = async () => {
        // Prevent re-loading if already in progress
        if (isLoadingStemsRef.current) return;
        isLoadingStemsRef.current = true;

        try {
          const audioFiles = projectFiles.files.filter(file => 
            file.file_type === 'audio' && file.upload_status === 'completed'
          );

          if (audioFiles.length > 0) {
            debugLog.log('Found audio files, preparing to load:', audioFiles.map(f => f.file_name));
            debugLog.log('Master stem info:', audioFiles.map(f => ({ name: f.file_name, is_master: f.is_master })));
            
            // Debug: Log file structure to see what fields are available
            debugLog.log('Audio file structure sample:', audioFiles[0]);
            
            // Sort so master is last
            const sortedAudioFiles = sortStemsWithMasterLast(audioFiles.map(f => ({
              ...f,
              stemType: f.stem_type || getStemTypeFromFileName(f.file_name)
            })));

            const stemsToLoad = await Promise.all(
              sortedAudioFiles.map(async file => {
                // Debug: Check if file.id exists
                if (!file.id) {
                  debugLog.error('File missing ID:', file);
                  throw new Error(`File missing ID: ${file.file_name}`);
                }
                
                debugLog.log('Getting download URL for file:', { id: file.id, name: file.file_name });
                const result = await getDownloadUrlMutation.mutateAsync({ fileId: file.id });
                return {
                  id: file.id,
                  url: result.downloadUrl,
                  label: file.file_name,
                  isMaster: file.is_master || false,
                  stemType: file.stemType
                };
              })
            );

            if (!cancelled) {
              // Process non-master first, then master
              const nonMasterStems = stemsToLoad.filter(s => !s.isMaster);
              const masterStems = stemsToLoad.filter(s => s.isMaster);
              await stemAudio.loadStems(nonMasterStems, (stemId, audioBuffer) => {
                const stem = nonMasterStems.find(s => s.id === stemId);
                // Use ref to get current state to avoid stale closure
                const currentAnalysis = currentAnalysisRef.current;
                const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                debugLog.log('🎵 Stem loaded callback:', { 
                  stemId, 
                  stemType: stem?.stemType, 
                  hasAnalysis,
                  cachedAnalysisCount: currentAnalysis.length,
                  cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                });
                if (stem && !hasAnalysis) {
                  debugLog.log('🎵 Triggering analysis for stem:', stemId, stem.stemType);
                  audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                } else {
                  debugLog.log('🎵 Skipping analysis for stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                }
              });
              if (masterStems.length > 0) {
                await stemAudio.loadStems(masterStems, (stemId, audioBuffer) => {
                  const stem = masterStems.find(s => s.id === stemId);
                  // Use ref to get current state to avoid stale closure
                  const currentAnalysis = currentAnalysisRef.current;
                  const hasAnalysis = currentAnalysis.some(a => a.fileMetadataId === stemId);
                  debugLog.log('🎵 Master stem loaded callback:', { 
                    stemId, 
                    stemType: stem?.stemType, 
                    hasAnalysis,
                    cachedAnalysisCount: currentAnalysis.length,
                    cachedAnalysisIds: currentAnalysis.map(a => a.fileMetadataId)
                  });
                  if (stem && !hasAnalysis) {
                    debugLog.log('🎵 Triggering analysis for master stem:', stemId, stem.stemType);
                    audioAnalysis.analyzeAudioBuffer(stemId, audioBuffer, stem.stemType);
                  } else {
                    debugLog.log('🎵 Skipping analysis for master stem:', stemId, 'reason:', !stem ? 'no stem found' : 'analysis already exists');
                  }
                });
              }
            }
          } else {
            debugLog.log('No completed audio files found in project.');
          }
        } catch (error) {
          if (!cancelled) {
            debugLog.error('Failed to load stems:', error);
          }
        } finally {
          if (!cancelled) {
            isLoadingStemsRef.current = false;
          }
        }
      };
      
      loadStemsWithUrls();
      return () => { 
        cancelled = true; 
        isLoadingStemsRef.current = false;
      };
    }
  }, [projectFiles?.files, currentProjectId, isInitialized, audioAnalysis.isLoading]); // Removed audioAnalysis.cachedAnalysis from dependencies

  

  const availableStems = projectFiles?.files?.filter(file => 
    file.file_type === 'audio' && file.upload_status === 'completed'
  ) || [];

  // Load all analyses when stems are available
  useEffect(() => {
    if (availableStems.length > 0) {
      const stemIds = availableStems.map(stem => stem.id);
      audioAnalysis.loadAnalysis(stemIds);
    }
  }, [availableStems.length]); // Only depend on stem count, not the analysis functions



  const midiData = useDemoData ? sampleMidiData : (fileData?.midiData ? transformBackendToFrontendMidiData(fileData.midiData) : undefined);
  const visualizationSettings = useDemoData ? DEFAULT_VISUALIZATION_SETTINGS : (fileData?.settings || DEFAULT_VISUALIZATION_SETTINGS);

  const handleFileSelected = (fileId: string) => {
    setSelectedFileId(fileId);
    setUseDemoData(false);
    setCurrentTime(0);
    setPlaying(false);
    
    const params = new URLSearchParams(searchParams);
    params.set('fileId', fileId);
    router.push(`/creative-visualizer?${params.toString()}`, { scroll: false });
  };

  const handleDemoModeChange = useCallback((demoMode: boolean) => {
    setUseDemoData(demoMode);
    setCurrentTime(0);
    setPlaying(false);
    
    if (demoMode) {
      const params = new URLSearchParams(searchParams);
      params.delete('fileId');
      const newUrl = params.toString() ? `/creative-visualizer?${params.toString()}` : '/creative-visualizer';
      router.push(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  const handlePlayPause = async () => {
    // Control both MIDI visualization and stem audio
    if (isPlaying) {
      stemAudio.pause();
      setPlaying(false);
    } else {
      // Only start if we have stems loaded
      if (hasStems) {
        try {
          await stemAudio.play();
          setPlaying(true);
        } catch (error) {
          debugLog.error('Failed to start audio playback:', error);
          setPlaying(false);
        }
      } else {
        setPlaying(true);
      }
    }
  };

  const handleReset = () => {
    stemAudio.stop();
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    setShowPicker(false);
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/creative-visualizer?${params.toString()}`);
  };

  const handleCreateNew = () => {
    setShowPicker(false);
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  


  

  // Check if stems are actually loaded in the audio controller, not just available in the project
  const hasStems = availableStems.length > 0 && stemAudio.stemsLoaded;
  
  // Check if we're currently loading stems
  const stemLoadingState = availableStems.length > 0 && !stemAudio.stemsLoaded;

  // Effects data for new sidebar (with categories and rarity)
  const effects: EffectUIData[] = [
    { 
      id: 'metaballs', 
      name: 'Metaballs Effect', 
      description: 'Organic, fluid-like visualizations that respond to audio intensity',
      category: 'Generative',
      rarity: 'Rare',
      image: '/effects/generative/metaballs.png',
      parameters: {} // <-- Added
    },
    { 
      id: 'midiHud', 
      name: 'HUD Effect', 
      description: 'Technical overlay displaying real-time audio analysis and MIDI data',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {} // <-- Added
    },
    { 
      id: 'particleNetwork', 
      name: 'Particle Effect', 
      description: 'Dynamic particle systems that react to rhythm and pitch',
      category: 'Generative',
      rarity: 'Mythic',
      image: '/effects/generative/particles.png',
      parameters: {} // Empty - modal is handled by ThreeVisualizer
    },
    // HUD Overlay Effects
    { 
      id: 'waveform', 
      name: 'Waveform Overlay', 
      description: 'Real-time audio waveform visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'spectrogram', 
      name: 'Spectrogram Overlay', 
      description: 'Frequency vs time visualization with color mapping',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'peakMeter', 
      name: 'Peak/LUFS Meter', 
      description: 'Professional audio level metering with peak and LUFS measurements',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'stereometer', 
      name: 'Stereometer Overlay', 
      description: 'Stereo field visualization and correlation meter',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'oscilloscope', 
      name: 'Oscilloscope Overlay', 
      description: 'Real-time waveform oscilloscope with pitch tracking',
      category: 'Overlays',
      rarity: 'Mythic',
      parameters: {}
    },
    { 
      id: 'spectrumAnalyzer', 
      name: 'Spectrum Analyzer', 
      description: 'FFT-based frequency spectrum visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'midiMeter', 
      name: 'MIDI Activity Meter', 
      description: 'Real-time MIDI note and velocity visualization',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'vuMeter', 
      name: 'VU Meter', 
      description: 'Classic VU meter with needle and bar styles',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    },
    { 
      id: 'chromaWheel', 
      name: 'Chroma Wheel', 
      description: '12-note chroma wheel for pitch class visualization',
      category: 'Overlays',
      rarity: 'Rare',
      parameters: {}
    },
    { 
      id: 'consoleFeed', 
      name: 'Data Feed', 
      description: 'Live data feed for MIDI, LUFS, FFT, and more',
      category: 'Overlays',
      rarity: 'Common',
      parameters: {}
    }
  ];

  const handleSelectEffect = (effectId: string) => {
    // Toggle the effect selection
    setSelectedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
    
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  const handleEffectDoubleClick = (effectId: string) => {
    // Open the parameter modal for this effect
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: true
    }));
  };

  // Effect clip timeline is merged into layers via store; per-effect UI remains via modals



  const handleCloseEffectModal = (effectId: string) => {
    setOpenEffectModals(prev => ({
      ...prev,
      [effectId]: false
    }));
  };

  // Video composition handlers moved into store (addLayer, updateLayer, deleteLayer, selectLayer)





  // Feature mapping handlers
  const handleMapFeature = (parameterId: string, featureId: string) => {
    debugLog.log('🎛️ Creating mapping:', {
      parameterId,
      featureId,
      parameterName: parameterId.split('-')[1],
      effectId: parameterId.split('-')[0]
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId, 
        modulationAmount: 0.5 // Default to 50% (noon)
      } 
    }));
    
    // Store feature name for display
    const featureName = featureId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    setFeatureNames(prev => ({ ...prev, [featureId]: featureName }));
    
    debugLog.log('🎛️ Mapping created successfully');
  };

  const handleUnmapFeature = (parameterId: string) => {
    debugLog.log('🎛️ Removing mapping:', {
      parameterId,
      currentMapping: mappings[parameterId]
    });
    
    setMappings(prev => ({ 
      ...prev, 
      [parameterId]: { 
        featureId: null, 
        modulationAmount: 0.5 
      } 
    }));
    
    debugLog.log('🎛️ Mapping removed successfully');
  };

  const handleModulationAmountChange = (parameterId: string, amount: number) => {
    setMappings(prev => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        modulationAmount: amount
      }
    }));
  };

  // Handler for selecting a stem/track
  const handleStemSelect = (stemId: string) => {
    debugLog.log('🎛️ Selecting stem:', {
      stemId,
      previousActiveTrack: activeTrackId,
      availableAnalyses: audioAnalysis.cachedAnalysis?.map(a => ({
        id: a.fileMetadataId,
        stemType: a.stemType,
        hasData: !!a.analysisData,
        features: a.analysisData ? Object.keys(a.analysisData) : []
      })) || []
    });
    
    setActiveTrackId(stemId);
    
    // Log the analysis data for the selected stem
    const selectedAnalysis = audioAnalysis.cachedAnalysis?.find(a => a.fileMetadataId === stemId);
    if (selectedAnalysis) {
      debugLog.log('🎛️ Selected stem analysis:', {
        stemId,
        stemType: selectedAnalysis.stemType,
        duration: selectedAnalysis.metadata.duration,
        features: selectedAnalysis.analysisData ? Object.keys(selectedAnalysis.analysisData) : [],
        sampleValues: selectedAnalysis.analysisData ? 
          Object.entries(selectedAnalysis.analysisData).reduce((acc, [feature, data]) => {
            if (Array.isArray(data) && data.length > 0) {
              acc[feature] = {
                length: data.length,
                firstValue: data[0],
                lastValue: data[data.length - 1],
                sampleValues: data.slice(0, 5) // First 5 values
              };
            }
            return acc;
          }, {} as Record<string, any>) : {}
      });
    } else {
      debugLog.warn('🎛️ No analysis found for selected stem:', stemId);
    }
  };

  const [activeSliderValues, setActiveSliderValues] = useState<Record<string, number>>({});
  const visualizerRef = useRef<any>(null);
  const animationFrameId = useRef<number>();

  // Function to convert frontend feature names to backend analysis keys
  const getAnalysisKeyFromFeatureId = (featureId: string): string => {
    // Frontend feature IDs are like "drums-rms-volume", "bass-loudness", etc.
    // Backend analysis data has keys like "rms", "loudness", etc.
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      // Remove the stem type prefix and get the feature name
      const featureName = parts.slice(1).join('-');
      
      // Map frontend feature names to backend analysis keys
      const featureMapping: Record<string, string> = {
        'rms-volume': 'rms',
        'loudness': 'loudness',
        'spectral-centroid': 'spectralCentroid',
        'spectral-rolloff': 'spectralRolloff',
        'spectral-flux': 'spectralFlux',
        'mfcc-1': 'mfcc_0', // Meyda uses 0-indexed MFCC
        'mfcc-2': 'mfcc_1',
        'mfcc-3': 'mfcc_2',
        'perceptual-spread': 'perceptualSpread',
        'energy': 'energy',
        'zcr': 'zcr',
        'beat-intensity': 'beatIntensity',
        'rhythm-pattern': 'rhythmPattern',
        'attack-time': 'attackTime',
        'chroma-vector': 'chromaVector',
        'harmonic-content': 'harmonicContent',
        'sub-bass': 'subBass',
        'warmth': 'warmth',
        'spectral-complexity': 'spectralComplexity',
        'texture': 'texture',
        'pitch-height': 'pitchHeight',
        'pitch-movement': 'pitchMovement',
        'melody-complexity': 'melodyComplexity',
        'expression': 'expression'
      };
      
      return featureMapping[featureName] || featureName;
    }
    return featureId; // Fallback to original if no prefix
  };

  // Function to get the stem type from a feature ID
  const getStemTypeFromFeatureId = (featureId: string): string | null => {
    const parts = featureId.split('-');
    if (parts.length >= 2) {
      return parts[0]; // First part is the stem type
    }
    return null;
  };

  // Track when visualizer ref becomes available
  useEffect(() => {
    if (visualizerRef.current) {
      debugLog.log('🎛️ Visualizer ref available:', {
        hasRef: !!visualizerRef.current,
        availableEffects: visualizerRef.current?.getAllEffects?.()?.map((e: any) => e.id) || [],
        selectedEffects: Object.keys(selectedEffects).filter(k => selectedEffects[k])
      });
    } else {
      debugLog.log('🎛️ Visualizer ref not available yet');
    }
  }, [visualizerRef.current, selectedEffects]);

  // Real-time feature mapping and visualizer update loop
  useEffect(() => {
    let cachedMappings: [string, string][] = [];
    let lastUpdateTime = 0;
    let frameCount = 0;

    const animationLoop = () => {
      if (!isPlaying || !visualizerRef.current) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      // 30FPS CAP
      const now = performance.now();
      const elapsed = now - lastUpdateTime;
      const targetFrameTime = 1000 / 30;
      
      if (elapsed < targetFrameTime) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }
      
      lastUpdateTime = now;
      frameCount++;
      
      // Get current audio time
      const time = stemAudio.currentTime;
      setCurrentTime(time);
      
      // Sync calculation (keep your existing code)
      const audioContextTime = stemAudio.getAudioContextTime?.() || 0;
      const scheduledStartTime = stemAudio.scheduledStartTimeRef?.current || 0;
      const measuredLatency = stemAudio.getAudioLatency?.() || 0;
      const audioPlaybackTime = Math.max(0, audioContextTime - scheduledStartTime);
      let syncTime = Math.max(0, audioPlaybackTime - measuredLatency + (syncOffsetMs / 1000));
      
      // 🔥 FIX: Handle audio looping by wrapping syncTime to analysis duration
      if (audioAnalysis.cachedAnalysis.length > 0) {
        const analysisDuration = audioAnalysis.cachedAnalysis[0]?.metadata?.duration || 1;
        if (analysisDuration > 0) {
          syncTime = syncTime % analysisDuration; // Wrap time to loop within analysis duration
        }
      }

      // Cache mappings
      if (cachedMappings.length !== Object.keys(mappings).length) {
        cachedMappings = Object.entries(mappings)
          .filter(([, mapping]) => mapping.featureId !== null)
          .map(([paramKey, mapping]) => [paramKey, mapping.featureId!]) as [string, string][];
      }

      // 🔥 THE FIX: Use enhancedAudioAnalysis instead of cachedStemAnalysis
      if (audioAnalysis.cachedAnalysis && audioAnalysis.cachedAnalysis.length > 0) {
        for (const [paramKey, featureId] of cachedMappings) {
          if (!featureId) continue;

          // Parse feature ID: "drums-rms"
          const featureStemType = getStemTypeFromFeatureId(featureId);
          if (!featureStemType) continue;

          // 🔥 CHANGED: Use audioAnalysis.getFeatureValue from consolidated hook
          // Find the analysis for this stem type to get its file ID
          const stemAnalysis = audioAnalysis.cachedAnalysis?.find(
            a => a.stemType === featureStemType
          );
          if (!stemAnalysis) continue;

          // Use the hook's getFeatureValue which properly handles both Float32Arrays and time-indexed arrays
          const rawValue = audioAnalysis.getFeatureValue(
            stemAnalysis.fileMetadataId,
            featureId,
            syncTime,
            featureStemType
          );

          if (rawValue === null || rawValue === undefined) continue;

          // Parse parameter key: "metaballs-glowIntensity"
          const [effectId, ...paramParts] = paramKey.split('-');
          const paramName = paramParts.join('-');
          
          if (!effectId || !paramName) continue;

          // Scale to parameter range with modulation amount attenuation
          const maxValue = getSliderMax(paramName);
          // Bipolar attenuverter: mapping.modulationAmount in [0..1] maps to [-1..+1] around noon
          // Range clamp to ±0.5 (±50%) so modulation isn't too extreme
          const knobFull = (mappings[paramKey]?.modulationAmount ?? 0.5) * 2 - 1; // -1..+1
          const knob = Math.max(-0.5, Math.min(0.5, knobFull));
          const baseValue = baseParameterValues[paramKey] ?? (activeSliderValues[paramKey] ?? 0);
          const delta = rawValue * knob * maxValue; // modulation contribution
          const scaledValue = Math.max(0, Math.min(maxValue, baseValue + delta));

          // Update visualizer
          visualizerRef.current.updateEffectParameter(effectId, paramName, scaledValue);
          
          // Update React state occasionally
          if (frameCount % 10 === 0) {
            setModulatedParameterValues(prev => ({ ...prev, [paramKey]: scaledValue }));
          }
        }
      }


      animationFrameId.current = requestAnimationFrame(animationLoop);
    };

    animationFrameId.current = requestAnimationFrame(animationLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    isPlaying, 
    mappings, 
    audioAnalysis.cachedAnalysis,
    stemAudio, 
    syncOffsetMs
  ]);
  
  const getSliderMax = (paramName: string) => {
    if (paramName === 'base-radius') return 1.0;
    if (paramName === 'animation-speed') return 2.0;
    if (paramName === 'glow-intensity') return 3.0;
    if (paramName === 'hud-opacity') return 1.0;
    if (paramName === 'max-particles') return 200;
    if (paramName === 'connection-distance') return 5.0;
    if (paramName === 'particle-size') return 50;
    return 100; // Default max for other numeric parameters
  };

  const getSliderStep = (paramName: string) => {
    if (paramName === 'base-radius') return 0.1;
    if (paramName === 'animation-speed') return 0.1;
    if (paramName === 'glow-intensity') return 0.1;
    if (paramName === 'hud-opacity') return 0.1;
    if (paramName === 'max-particles') return 10;
    if (paramName === 'connection-distance') return 0.1;
    if (paramName === 'particle-size') return 5;
    return 1; // Default step for other numeric parameters
  };

  const handleParameterChange = (effectId: string, paramName: string, value: any) => {
    const paramKey = `${effectId}-${paramName}`;
    // Slider sets the base value regardless of mapping
    setBaseParameterValues(prev => ({ ...prev, [paramKey]: value }));
    setActiveSliderValues(prev => ({ ...prev, [paramKey]: value }));
    // In a real application, you would update the effect's parameters here
    // For now, we'll just update the state to reflect the current value in the modal
  };

  const effectModals = Object.entries(openEffectModals).map(([effectId, isOpen], index) => {
    if (!isOpen) return null;
    const effectInstance = effects.find(e => e.id === effectId);
    if (!effectInstance) return null;
    const sortedParams = Object.entries(effectInstance.parameters || {}).sort(([, a], [, b]) => {
      if (typeof a === 'boolean' && typeof b !== 'boolean') return -1;
      if (typeof a !== 'boolean' && typeof b === 'boolean') return 1;
      return 0;
    });
    if (sortedParams.length === 0) return null;
    const initialPos = {
      x: 100 + (index * 50),
      y: 100 + (index * 50)
    };
    return (
      <PortalModal
        key={effectId}
        title={effectInstance.name.replace(' Effect', '')}
        isOpen={isOpen}
        onClose={() => handleCloseEffectModal(effectId)}
        initialPosition={initialPos}
        bounds="#editor-bounds"
      >
        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {sortedParams.map(([paramName, value]) => {
            if (typeof value === 'boolean') {
              return (
                <div key={paramName} className="flex items-center justify-between">
                  <Label className="text-white/80 text-xs font-mono">{paramName}</Label>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleParameterChange(effectId, paramName, checked)}
                  />
                </div>
              );
            }
            if (typeof value === 'number') {
              const paramKey = `${effectId}-${paramName}`;
              const mapping = mappings[paramKey];
              const mappedFeatureId = mapping?.featureId || null;
              const mappedFeatureName = mappedFeatureId ? featureNames[mappedFeatureId] : undefined;
              const modulationAmount = mapping?.modulationAmount ?? 0.5;
              const baseVal = activeSliderValues[paramKey] ?? value;
              return (
                <DroppableParameter
                  key={paramKey}
                  parameterId={paramKey}
                  label={paramName}
                  mappedFeatureId={mappedFeatureId}
                  mappedFeatureName={mappedFeatureName}
                  modulationAmount={modulationAmount}
                  baseValue={baseParameterValues[paramKey] ?? baseVal}
                  modulatedValue={modulatedParameterValues[paramKey] ?? baseVal}
                  sliderMax={getSliderMax(paramName)}
                  onFeatureDrop={handleMapFeature}
                  onFeatureUnmap={handleUnmapFeature}
                  onModulationAmountChange={handleModulationAmountChange}
                  className="mb-2"
                  dropZoneStyle="inlayed"
                  showTagOnHover
                >
                                            <Slider
                            value={[activeSliderValues[paramKey] ?? value]}
                            onValueChange={([val]) => {
                              setActiveSliderValues(prev => ({ ...prev, [paramKey]: val }));
                              handleParameterChange(effectId, paramName, val);
                            }}
                            min={0}
                            max={getSliderMax(paramName)}
                            step={getSliderStep(paramName)}
                            className="w-full"
                            disabled={!!mappedFeatureId} // Disable manual control when mapped
                          />
                </DroppableParameter>
              );
            }
            if ((paramName === 'highlightColor' || paramName === 'particleColor') && Array.isArray(value)) {
              const displayName = paramName === 'highlightColor' ? 'Highlight Color' : 'Particle Color';
              return (
                <div key={paramName} className="space-y-2">
                  <Label className="text-white/90 text-sm font-medium flex items-center justify-between">
                    {displayName}
                    <span className="ml-2 w-6 h-6 rounded-full border border-white/40 inline-block" style={{ background: `rgb(${value.map((v) => Math.round(v * 255)).join(',')})` }} />
                  </Label>
                  <input
                    type="color"
                    value={`#${value.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`}
                    onChange={e => {
                      const hex = e.target.value;
                      const rgb = [
                        parseInt(hex.slice(1, 3), 16) / 255,
                        parseInt(hex.slice(3, 5), 16) / 255,
                        parseInt(hex.slice(5, 7), 16) / 255
                      ];
                      handleParameterChange(effectId, paramName, rgb);
                    }}
                    className="w-12 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                  />
                </div>
              );
            }
            return null;
          })}
          {/* Effect Enabled Toggle - Remove border and adjust spacing */}
          <div className="pt-2 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-white/80 text-xs font-mono">Effect Enabled</Label>
              <Switch 
                checked={selectedEffects[effectId]}
                onCheckedChange={(checked) => {
                  setSelectedEffects(prev => ({
                    ...prev,
                    [effectId]: checked
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </PortalModal>
    );
  });

  // Helper to infer stem type from file name
  const getStemTypeFromFileName = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.includes('bass')) return 'bass';
    if (lower.includes('drum')) return 'drums';
    if (lower.includes('vocal')) return 'vocals';
    return 'other';
  };

  // Find the selected stem and its type
  const selectedStem = availableStems.find(stem => stem.id === activeTrackId);
  // Use the actual stem_type from the database, fallback to filename inference
  const selectedStemType = selectedStem 
    ? (selectedStem.stem_type || getStemTypeFromFileName(selectedStem.file_name))
    : undefined;

  // Helper to get the master stem (if available)
  const getMasterStem = () => availableStems.find(stem => stem.is_master);

  // Helper to get the correct duration (master audio if available, else fallback)
  const getCurrentDuration = () => {
    if (hasStems && stemAudio.duration && stemAudio.duration > 0) {
      return stemAudio.duration;
    }
    return (midiData || sampleMidiData).file.duration;
  };

  // Keep timeline store duration in sync with audio/midi duration
  useEffect(() => {
    try {
      const d = getCurrentDuration();
      if (typeof d === 'number' && isFinite(d) && d > 0) {
        setDuration(d);
      }
    } catch {}
  }, [hasStems, stemAudio.duration, midiData, sampleMidiData, setDuration]);

  // Update currentTime from stemAudio if stems are loaded
  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const update = () => {
      if (hasStems) {
        const duration = getCurrentDuration();
        let displayTime = stemAudio.currentTime;
        
        // If looping is enabled, show position within the current loop cycle
        if (stemAudio.isLooping && duration > 0) {
          displayTime = stemAudio.currentTime % duration;
        }
        
        setCurrentTime(displayTime);
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, hasStems, stemAudio]);


  // In the render, use the sorted stems
  const sortedAvailableStems = sortStemsWithMasterLast(availableStems);

  // Log projectFiles.files before building stemUrlMap
  useEffect(() => {
    debugLog.log('[CreativeVisualizerPage] projectFiles.files:', projectFiles?.files);
  }, [projectFiles?.files]);

  // State for asynchronously built stemUrlMap
  const [asyncStemUrlMap, setAsyncStemUrlMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchUrls() {
      if (!projectFiles?.files) return;
      const audioFiles = projectFiles.files.filter(f => f.file_type === 'audio' && f.upload_status === 'completed');
      
      // Debug: Log file structure
      debugLog.log('fetchUrls - projectFiles.files:', projectFiles.files);
      debugLog.log('fetchUrls - audioFiles:', audioFiles);
      
      const entries = await Promise.all(audioFiles.map(async f => {
        let url = f.downloadUrl;
        if (!url && getDownloadUrlMutation) {
          try {
            // Debug: Check if f.id exists
            if (!f.id) {
              debugLog.error('fetchUrls - File missing ID:', f);
              return [f.id, null];
            }
            
            debugLog.log('fetchUrls - Getting download URL for file:', { id: f.id, name: f.file_name });
            const result = await getDownloadUrlMutation.mutateAsync({ fileId: f.id });
            url = result.downloadUrl;
          } catch (err) {
            debugLog.error('[CreativeVisualizerPage] Failed to fetch downloadUrl for', f.id, err);
          }
        }
        return [f.id, url];
      }));
      const map = Object.fromEntries(entries.filter(([id, url]) => !!url));
      setAsyncStemUrlMap(map);
      if (Object.keys(map).length > 0) {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap populated:', map);
      } else {
        debugLog.log('[CreativeVisualizerPage] asyncStemUrlMap is empty');
      }
    }
    fetchUrls();
  }, [projectFiles?.files]);

  const stemUrlsReady = Object.keys(asyncStemUrlMap).length > 0;

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-sm text-stone-300">Loading...</div>
        </div>
      </div>
    );
  }

  // If no project is selected, show the picker
  if (!currentProjectId && !useDemoData) {
    return (
      <>
        {showPicker && (
          <ProjectPickerModal
            isOpen={showPicker}
            onClose={() => router.push('/dashboard')}
            onSelect={handleProjectSelect}
            onCreateNew={handleCreateNew}
          />
        )}
        {showCreateModal && (
          <ProjectCreationModal
            isOpen={showCreateModal}
            onClose={handleCloseCreateModal}
          />
        )}
        <div className="flex h-screen bg-stone-800 text-white items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-sm text-stone-300">Please create or select a project.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <HudOverlayProvider 
      cachedAnalysis={audioAnalysis.cachedAnalysis}
      stemAudio={stemAudio}
      stemUrlMap={asyncStemUrlMap}
    >
      {showPicker && (
        <ProjectPickerModal
          isOpen={showPicker}
          onClose={() => router.push('/dashboard')}
          onSelect={handleProjectSelect}
          onCreateNew={handleCreateNew}
        />
      )}
      {showCreateModal && (
        <ProjectCreationModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
        />
      )}
      <DndProvider backend={HTML5Backend}>
        {/* Main visualizer UI */}
        <div className="flex h-screen bg-stone-800 text-white min-w-0 creative-visualizer-text">
          <CollapsibleSidebar>
            <div className="space-y-4">
              <MappingSourcesPanel 
                activeTrackId={activeTrackId || undefined}
                className="mb-4"
                selectedStemType={selectedStemType}
                currentTime={currentTime}
                cachedAnalysis={audioAnalysis.cachedAnalysis}
                isPlaying={isPlaying}
              />
              <FileSelector 
                onFileSelected={handleFileSelected}
                selectedFileId={selectedFileId || undefined}
                useDemoData={useDemoData}
                onDemoModeChange={handleDemoModeChange}
                projectId={currentProjectId || undefined}
                projectName={projectData?.name}
              />
            </div>
          </CollapsibleSidebar>
          <main className="flex-1 flex overflow-hidden min-w-0">
            {/* Editor bounds container with proper positioning context */}
            <div 
              id="editor-bounds" 
              className="relative flex-1 flex flex-col overflow-hidden min-w-0"
              style={{ 
                height: '100vh',
                position: 'relative',
                contain: 'layout'
              }}
            >
          {/* Top Control Bar */}
          <div className="p-2 bg-stone-900/50 border-b border-white/10">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <Button 
                  onClick={handlePlayPause} 
                  size="sm" 
                    disabled={stemLoadingState}
                  className={`font-mono text-xs uppercase tracking-wider px-4 py-2 transition-all duration-300 ${
                      stemLoadingState 
                      ? 'bg-stone-600 text-stone-400 cursor-not-allowed' 
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                    {stemLoadingState ? (
                    <>
                      <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
                      LOADING
                    </>
                  ) : (
                    <>
                      {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {isPlaying ? 'PAUSE' : 'PLAY'}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                    disabled={stemLoadingState}
                  onClick={() => stemAudio.setLooping(!stemAudio.isLooping)}
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-3 py-1 ${
                      stemLoadingState 
                      ? 'opacity-50 cursor-not-allowed' 
                      : stemAudio.isLooping ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  🔄 {stemAudio.isLooping ? 'LOOP' : 'LOOP'}
                </Button>
                <Button 
                  variant="outline" 
                    disabled={stemLoadingState}
                  onClick={handleReset} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 px-3 py-1 ${
                      stemLoadingState ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  RESET
                </Button>
                  
                  {/* Stats Section - Compact layout */}
                  <div className="flex items-center gap-1 overflow-hidden">
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span className="font-creative-mono">{currentTime.toFixed(1)}</span><span className="font-creative-mono">S</span> / <span className="font-creative-mono">{getCurrentDuration().toFixed(1)}</span><span className="font-creative-mono">S</span>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  FPS: <span className="font-creative-mono">{fps}</span>
                </div>
                <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  NOTES: <span className="font-creative-mono">{(midiData || sampleMidiData).tracks.reduce((sum, track) => sum + track.notes.length, 0)}</span>
                </div>
                {hasStems && (
                  <div className="text-xs font-mono uppercase tracking-wider px-2 py-1 rounded text-stone-300" style={{ background: 'rgba(30, 30, 30, 0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    STEMS: <span className="font-creative-mono">{availableStems.length}</span>
                  </div>
                )}
                
              </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <AspectRatioSelector
                  currentAspectRatio={visualizerAspectRatio}
                  onAspectRatioChange={setVisualizerAspectRatio}
                  disabled={stemLoadingState}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVideoComposition(!showVideoComposition)} 
                  className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${
                    showVideoComposition ? 'bg-emerald-900/20 border-emerald-600 text-emerald-300' : ''
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                    🎬 {showVideoComposition ? 'COMP' : 'VIDEO'}
                </Button>
                
                {/* Test Video Composition Controls */}
                {showVideoComposition && (
                  <TestVideoComposition
                    onAddLayer={addLayer}
                    className="ml-2"
                  />
                )}
                  
                </div>
              </div>
            </div>
            
            {/* Visualizer Area - Scrollable Layout */}
            <div className="flex-1 flex flex-col overflow-hidden bg-stone-900 relative">
              <div className="flex-1 flex flex-col min-h-0 px-4 overflow-y-auto">
                {/* Visualizer Container - Responsive with aspect ratio */}
                <div className="flex-shrink-0 mb-4">
                  <div 
                    className="relative mx-auto bg-stone-900 rounded-lg overflow-hidden shadow-lg flex items-center justify-center"
                    style={{ 
                      height: 'min(calc(100vh - 400px), 60vh)', // Reduced height to make room for stem panel
                      minHeight: '200px',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                  <ThreeVisualizer
                      midiData={midiData || sampleMidiData}
                      settings={settings}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onLayerSelect={selectLayer}
                      onPlayPause={handlePlayPause}
                      onSettingsChange={setSettings}
                      onFpsUpdate={setFps}
                      selectedEffects={selectedEffects}
                      aspectRatio={visualizerAspectRatio}
                          // Modal and mapping props
                          openEffectModals={openEffectModals}
                          onCloseEffectModal={handleCloseEffectModal}
                          mappings={mappings}
                          featureNames={featureNames}
                          onMapFeature={handleMapFeature}
                          onUnmapFeature={handleUnmapFeature}
                          onModulationAmountChange={handleModulationAmountChange}
                          activeSliderValues={activeSliderValues}
                          setActiveSliderValues={setActiveSliderValues}
                      onSelectedEffectsChange={() => {}} // <-- Added no-op
                      visualizerRef={visualizerRef}
                  />

                  {/* Video Composition Layer Container */}
                  {showVideoComposition && (
                    <LayerContainer
                      layers={layers}
                      width={visualizerAspectRatio === 'mobile' ? 400 : 1280}
                      height={visualizerAspectRatio === 'mobile' ? 711 : 720}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      audioFeatures={{
                        frequencies: new Array(256).fill(0.5),
                        timeData: new Array(256).fill(0.5),
                        volume: 0.5,
                        bass: 0.5,
                        mid: 0.5,
                        treble: 0.5
                      }}
                      midiData={{
                        activeNotes: [],
                        currentTime: currentTime,
                        tempo: 120,
                        totalNotes: 0,
                        trackActivity: {}
                      }}
                      onLayerUpdate={updateLayer}
                      onLayerDelete={deleteLayer}
                    />
                  )}

                  {/* HUD Overlays positioned relative to visualizer */}
                  <div id="hud-overlays" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
                    {/* Overlays will be rendered here by the HudOverlayProvider */}
                  </div>

                      {/* Visualizer content only - no modals here */}
                </div>
                </div>
                
                {/* Unified Timeline */}
                <div className="flex-shrink-0 mb-4">
                  <UnifiedTimeline
                    stems={sortedAvailableStems}
                    masterStemId={projectFiles?.files?.find(f => f.is_master)?.id ?? null}
                    onStemSelect={handleStemSelect}
                    activeTrackId={activeTrackId}
                    soloedStems={stemAudio.soloedStems}
                    onToggleSolo={stemAudio.toggleStemSolo}
                    analysisProgress={audioAnalysis.analysisProgress}
                    cachedAnalysis={audioAnalysis.cachedAnalysis || []}
                    stemLoadingState={audioAnalysis.isLoading}
                    stemError={audioAnalysis.error}
                    onSeek={useTimelineStore.getState().setCurrentTime}
                    className="bg-stone-800 border border-gray-700"
                  />
                </div>
            </div>
          </div>

              {/* Effect parameter modals - positioned relative to editor-bounds */}
              {effectModals}
            </div>

            {/* Right Effects Sidebar */}
            <CollapsibleEffectsSidebar>
              <EffectsLibrarySidebarWithHud
                effects={effects}
                selectedEffects={selectedEffects}
                onEffectToggle={handleSelectEffect}
                onEffectDoubleClick={handleEffectDoubleClick}
                isVisible={true}
                stemUrlsReady={stemUrlsReady}
              />
            </CollapsibleEffectsSidebar>



        </main>
      </div>
      </DndProvider>
    </HudOverlayProvider>
  );
}

export default function CreativeVisualizerPageWithSuspense() {
  return (
    <Suspense>
      <CreativeVisualizerPage />
    </Suspense>
  );
}
</file>

</files>
