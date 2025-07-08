'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { FeatureMappingControls } from './feature-mapping-controls';
import { PresetSelector } from './preset-selector';
import { RealTimePreview } from './real-time-preview';
import { GlobalControls } from './global-controls';
import { Tooltip } from '@/components/ui/tooltip';

export type StemType = 'drums' | 'bass' | 'vocals' | 'other';

export interface AudioFeatures {
  rhythm: number;
  pitch: number;
  timbre: number;
  timestamp: number;
}

export interface FeatureMappings {
  rhythm: {
    target: 'scale' | 'rotation' | 'color' | 'emission' | 'position';
    intensity: number;
    smoothing: number;
    enabled: boolean;
  };
  pitch: {
    target: 'height' | 'color' | 'size' | 'shape';
    intensity: number;
    range: [number, number];
    enabled: boolean;
  };
  timbre: {
    target: 'texture' | 'complexity' | 'distortion';
    intensity: number;
    enabled: boolean;
  };
}

export interface StemControl {
  featureMappings: FeatureMappings;
  presets: VisualizationPreset[];
  preview: {
    currentFeatures: AudioFeatures;
    visualPreview: THREE.Object3D | null;
  };
}

export interface VisualizationPreset {
  name: string;
  thumbnail: string;
  description: string;
  mappings: FeatureMappings;
}

export interface StemControlPanelData {
  stems: {
    drums: StemControl;
    bass: StemControl;
    vocals: StemControl;
    other: StemControl;
  };
  globalControls: {
    masterIntensity: number;
    smoothing: number;
    visualStyle: 'particles' | 'geometry' | 'shader';
  };
}

interface StemControlPanelProps {
  data?: StemControlPanelData;
  onUpdate?: (data: StemControlPanelData) => void;
}

const DEFAULT_FEATURE_MAPPINGS: FeatureMappings = {
  rhythm: {
    target: 'scale',
    intensity: 0.5,
    smoothing: 0.3,
    enabled: true,
  },
  pitch: {
    target: 'height',
    intensity: 0.7,
    range: [0, 1],
    enabled: true,
  },
  timbre: {
    target: 'texture',
    intensity: 0.5,
    enabled: true,
  },
};

const DEFAULT_STEM_CONTROL: StemControl = {
  featureMappings: DEFAULT_FEATURE_MAPPINGS,
  presets: [],
  preview: {
    currentFeatures: {
      rhythm: 0,
      pitch: 0,
      timbre: 0,
      timestamp: Date.now(),
    },
    visualPreview: null,
  },
};

const DEFAULT_DATA: StemControlPanelData = {
  stems: {
    drums: DEFAULT_STEM_CONTROL,
    bass: DEFAULT_STEM_CONTROL,
    vocals: DEFAULT_STEM_CONTROL,
    other: DEFAULT_STEM_CONTROL,
  },
  globalControls: {
    masterIntensity: 1.0,
    smoothing: 0.5,
    visualStyle: 'particles',
  },
};

export function StemControlPanel({ data = DEFAULT_DATA, onUpdate }: StemControlPanelProps) {
  const [currentData, setCurrentData] = useState<StemControlPanelData>(data);
  const [activeTab, setActiveTab] = useState<StemType>('drums');
  const updateThrottleRef = useRef<NodeJS.Timeout>();

  // Performance optimization: Throttle updates to prevent excessive re-renders
  const throttledUpdate = useCallback((updatedData: StemControlPanelData) => {
    if (updateThrottleRef.current) {
      clearTimeout(updateThrottleRef.current);
    }
    updateThrottleRef.current = setTimeout(() => {
      onUpdate?.(updatedData);
    }, 16); // ~60fps throttling
  }, [onUpdate]);

  const updateStemMapping = useCallback((stem: StemType, mappings: FeatureMappings) => {
    const updatedData = {
      ...currentData,
      stems: {
        ...currentData.stems,
        [stem]: {
          ...currentData.stems[stem],
          featureMappings: mappings,
        },
      },
    };
    setCurrentData(updatedData);
    throttledUpdate(updatedData);
  }, [currentData, throttledUpdate]);

  const applyPreset = useCallback((stem: StemType, preset: VisualizationPreset) => {
    updateStemMapping(stem, preset.mappings);
  }, [updateStemMapping]);

  const updateGlobalSettings = useCallback((settings: typeof currentData.globalControls) => {
    const updatedData = {
      ...currentData,
      globalControls: settings,
    };
    setCurrentData(updatedData);
    throttledUpdate(updatedData);
  }, [currentData, throttledUpdate]);

  // Performance optimization: Memoize static data
  const visualTargets = useMemo(() => ({
    rhythm: ['scale', 'rotation', 'color', 'emission', 'position'] as const,
    pitch: ['height', 'color', 'size', 'shape'] as const,
    timbre: ['texture', 'complexity', 'distortion'] as const,
  }), []);

  // Performance optimization: Memoize active stems count
  const activeStemsCount = useMemo(() => {
    return Object.keys(currentData.stems).filter(stem => {
      const stemData = currentData.stems[stem as StemType];
      return stemData.featureMappings.rhythm.enabled ||
             stemData.featureMappings.pitch.enabled ||
             stemData.featureMappings.timbre.enabled;
    }).length;
  }, [currentData.stems]);

  // Performance optimization: Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
      }
    };
  }, []);

  return (
    <Card className="stem-control-panel p-6 bg-gradient-to-br from-slate-900/95 to-slate-800/95 border-slate-700 backdrop-blur-sm">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Tooltip content="Control how audio stem features map to visual parameters for each instrument">
            <h2 className="text-2xl font-bold text-white cursor-help">
              Stem Visualization Controls
            </h2>
          </Tooltip>
          <Tooltip content="Number of stems with at least one enabled feature mapping">
            <div className="text-sm text-slate-400 cursor-help">
              {activeStemsCount} stems active
            </div>
          </Tooltip>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StemType)}>
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <Tooltip content="Percussion and rhythm instruments - typically drives scale, rotation, and position effects">
              <TabsTrigger value="drums" className="data-[state=active]:bg-blue-600">
                🥁 Drums
              </TabsTrigger>
            </Tooltip>
            <Tooltip content="Low-frequency instruments - often mapped to size, height, and foundational visual elements">
              <TabsTrigger value="bass" className="data-[state=active]:bg-green-600">
                🎸 Bass
              </TabsTrigger>
            </Tooltip>
            <Tooltip content="Human voice and lead melodies - commonly linked to color, shape, and complex movements">
              <TabsTrigger value="vocals" className="data-[state=active]:bg-purple-600">
                🎤 Vocals
              </TabsTrigger>
            </Tooltip>
            <Tooltip content="Harmonies, instruments, and ambient sounds - versatile mapping for texture and complexity">
              <TabsTrigger value="other" className="data-[state=active]:bg-orange-600">
                🎵 Other
              </TabsTrigger>
            </Tooltip>
          </TabsList>

          {(['drums', 'bass', 'vocals', 'other'] as const).map((stemType) => (
            <TabsContent key={stemType} value={stemType} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FeatureMappingControls
                    stem={stemType}
                    features={['rhythm', 'pitch', 'timbre']}
                    visualTargets={visualTargets}
                    mappings={currentData.stems[stemType].featureMappings}
                    onChange={(mappings) => updateStemMapping(stemType, mappings)}
                  />
                  
                  <PresetSelector
                    stemType={stemType}
                    presets={currentData.stems[stemType].presets}
                    onSelect={(preset) => applyPreset(stemType, preset)}
                  />
                </div>

                <RealTimePreview
                  stemType={stemType}
                  features={currentData.stems[stemType].preview.currentFeatures}
                  mapping={currentData.stems[stemType].featureMappings}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <GlobalControls
          intensity={currentData.globalControls.masterIntensity}
          smoothing={currentData.globalControls.smoothing}
          visualStyle={currentData.globalControls.visualStyle}
          onChange={updateGlobalSettings}
        />
      </div>
    </Card>
  );
}