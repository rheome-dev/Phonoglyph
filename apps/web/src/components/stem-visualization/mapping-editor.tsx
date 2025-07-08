// Mapping Editor UI for Story 5.3: Stem-based Visualization Control
// Interactive editor for customizing stem-to-visual parameter mappings

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  StemVisualizationMapping,
  VisualizationPreset,
  RhythmConfig,
  PitchConfig,
  IntensityConfig,
  TimbreConfig,
  VisualParameter,
  StemType,
  DEFAULT_MAPPING_CONFIG
} from '@/types/stem-visualization';
import { 
  DEFAULT_PRESETS, 
  ELECTRONIC_PRESET,
  getPresetById 
} from '@/lib/default-visualization-mappings';

// Props for the mapping editor
interface MappingEditorProps {
  currentPreset?: VisualizationPreset;
  onPresetChange?: (preset: VisualizationPreset) => void;
  onMappingUpdate?: (stemType: string, mapping: StemVisualizationMapping) => void;
  onStemMute?: (stemType: string, muted: boolean) => void;
  onStemSolo?: (stemType: string, solo: boolean) => void;
  isPlaying?: boolean;
  className?: string;
}

// Individual parameter control component
interface ParameterControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  description?: string;
}

const ParameterControl: React.FC<ParameterControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  description
}) => {
  const [localValue, setLocalValue] = useState([value]);

  useEffect(() => {
    setLocalValue([value]);
  }, [value]);

  const handleValueChange = useCallback((newValues: number[]) => {
    const newValue = newValues[0];
    setLocalValue([newValue]);
    onChange(newValue);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm text-muted-foreground">
          {localValue[0].toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <Slider
        value={localValue}
        min={min}
        max={max}
        step={step}
        onValueChange={handleValueChange}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

// Feature configuration component
interface FeatureConfigProps {
  featureType: 'rhythm' | 'pitch' | 'intensity' | 'timbre';
  config: RhythmConfig | PitchConfig | IntensityConfig | TimbreConfig | undefined;
  onChange: (config: RhythmConfig | PitchConfig | IntensityConfig | TimbreConfig) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const FeatureConfig: React.FC<FeatureConfigProps> = ({
  featureType,
  config,
  onChange,
  enabled,
  onToggle
}) => {
  const getTargetOptions = (): VisualParameter[] => {
    switch (featureType) {
      case 'rhythm':
        return ['scale', 'rotation', 'color', 'emission', 'position', 'opacity'];
      case 'pitch':
        return ['height', 'hue', 'brightness', 'complexity', 'color'];
      case 'intensity':
        return ['size', 'opacity', 'speed', 'count', 'brightness', 'emission', 'warmth', 'scale', 'rotation'];
      case 'timbre':
        return ['texture', 'warmth', 'spread', 'complexity'];
      default:
        return [];
    }
  };

  const createDefaultConfig = (): RhythmConfig | PitchConfig | IntensityConfig | TimbreConfig => {
    const targetOptions = getTargetOptions();
    const defaultTarget = targetOptions[0];

    switch (featureType) {
      case 'rhythm':
        return {
          target: defaultTarget as RhythmConfig['target'],
          intensity: 0.8,
          smoothing: 0.1,
          threshold: 0.15,
          multiplier: 1.0
        };
      case 'pitch':
        return {
          target: defaultTarget as PitchConfig['target'],
          range: [0.0, 1.0],
          response: 'linear',
          sensitivity: 0.8,
          offset: 0.0
        };
      case 'intensity':
        return {
          target: defaultTarget as IntensityConfig['target'],
          threshold: 0.1,
          decay: 0.2,
          attack: 0.5,
          ceiling: 1.0,
          curve: 'linear'
        };
      case 'timbre':
        return {
          target: defaultTarget as TimbreConfig['target'],
          sensitivity: 0.5,
          range: [0.0, 1.0],
          smoothing: 0.2,
          bias: 0.0
        };
    }
  };

  const currentConfig = config || createDefaultConfig();

  const handleConfigChange = (updates: Partial<typeof currentConfig>) => {
    onChange({ ...currentConfig, ...updates });
  };

  const targetOptions = getTargetOptions();

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium capitalize">{featureType}</h4>
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Active" : "Disabled"}
          </Badge>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Target Selection */}
          <div className="space-y-2">
            <Label>Visual Target</Label>
            <Select
              value={currentConfig.target}
              onValueChange={(value) => handleConfigChange({ target: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feature-specific controls */}
          {featureType === 'rhythm' && (
            <>
              <ParameterControl
                label="Intensity"
                value={(currentConfig as RhythmConfig).intensity}
                min={0}
                max={2}
                step={0.1}
                onChange={(value) => handleConfigChange({ intensity: value })}
                description="How strongly rhythm affects the visual parameter"
              />
              <ParameterControl
                label="Smoothing"
                value={(currentConfig as RhythmConfig).smoothing}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => handleConfigChange({ smoothing: value })}
                description="Amount of smoothing applied to reduce jitter"
              />
              <ParameterControl
                label="Threshold"
                value={(currentConfig as RhythmConfig).threshold}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => handleConfigChange({ threshold: value })}
                description="Minimum value required to trigger effect"
              />
              <ParameterControl
                label="Multiplier"
                value={(currentConfig as RhythmConfig).multiplier}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(value) => handleConfigChange({ multiplier: value })}
                description="Scaling factor for the effect strength"
              />
            </>
          )}

          {featureType === 'pitch' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ParameterControl
                  label="Range Min"
                  value={(currentConfig as PitchConfig).range[0]}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(value) => handleConfigChange({ 
                    range: [value, (currentConfig as PitchConfig).range[1]] 
                  })}
                />
                <ParameterControl
                  label="Range Max"
                  value={(currentConfig as PitchConfig).range[1]}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(value) => handleConfigChange({ 
                    range: [(currentConfig as PitchConfig).range[0], value] 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Response Curve</Label>
                <Select
                  value={(currentConfig as PitchConfig).response}
                  onValueChange={(value) => handleConfigChange({ response: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                    <SelectItem value="logarithmic">Logarithmic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ParameterControl
                label="Sensitivity"
                value={(currentConfig as PitchConfig).sensitivity}
                min={0}
                max={2}
                step={0.1}
                onChange={(value) => handleConfigChange({ sensitivity: value })}
                description="Responsiveness to pitch changes"
              />
              <ParameterControl
                label="Offset"
                value={(currentConfig as PitchConfig).offset}
                min={-1}
                max={1}
                step={0.1}
                onChange={(value) => handleConfigChange({ offset: value })}
                description="Base offset for the parameter"
              />
            </>
          )}

          {featureType === 'intensity' && (
            <>
              <ParameterControl
                label="Threshold"
                value={(currentConfig as IntensityConfig).threshold}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => handleConfigChange({ threshold: value })}
                description="Minimum intensity to trigger effect"
              />
              <div className="grid grid-cols-2 gap-4">
                <ParameterControl
                  label="Attack"
                  value={(currentConfig as IntensityConfig).attack}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => handleConfigChange({ attack: value })}
                  description="How quickly effect builds up"
                />
                <ParameterControl
                  label="Decay"
                  value={(currentConfig as IntensityConfig).decay}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => handleConfigChange({ decay: value })}
                  description="How quickly effect fades"
                />
              </div>
              <ParameterControl
                label="Ceiling"
                value={(currentConfig as IntensityConfig).ceiling}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(value) => handleConfigChange({ ceiling: value })}
                description="Maximum effect strength"
              />
              <div className="space-y-2">
                <Label>Response Curve</Label>
                <Select
                  value={(currentConfig as IntensityConfig).curve}
                  onValueChange={(value) => handleConfigChange({ curve: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                    <SelectItem value="curve">Curve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {featureType === 'timbre' && (
            <>
              <ParameterControl
                label="Sensitivity"
                value={(currentConfig as TimbreConfig).sensitivity}
                min={0}
                max={2}
                step={0.1}
                onChange={(value) => handleConfigChange({ sensitivity: value })}
                description="Response sensitivity to timbre changes"
              />
              <div className="grid grid-cols-2 gap-4">
                <ParameterControl
                  label="Range Min"
                  value={(currentConfig as TimbreConfig).range[0]}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => handleConfigChange({ 
                    range: [value, (currentConfig as TimbreConfig).range[1]] 
                  })}
                />
                <ParameterControl
                  label="Range Max"
                  value={(currentConfig as TimbreConfig).range[1]}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(value) => handleConfigChange({ 
                    range: [(currentConfig as TimbreConfig).range[0], value] 
                  })}
                />
              </div>
              <ParameterControl
                label="Smoothing"
                value={(currentConfig as TimbreConfig).smoothing}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => handleConfigChange({ smoothing: value })}
                description="Temporal smoothing factor"
              />
              <ParameterControl
                label="Bias"
                value={(currentConfig as TimbreConfig).bias}
                min={-1}
                max={1}
                step={0.1}
                onChange={(value) => handleConfigChange({ bias: value })}
                description="Base value bias"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Main mapping editor component
export const MappingEditor: React.FC<MappingEditorProps> = ({
  currentPreset = ELECTRONIC_PRESET,
  onPresetChange,
  onMappingUpdate,
  onStemMute,
  onStemSolo,
  isPlaying = false,
  className
}) => {
  const [activePreset, setActivePreset] = useState<VisualizationPreset>(currentPreset);
  const [selectedStem, setSelectedStem] = useState<StemType>('drums');
  const [showPreview, setShowPreview] = useState(true);

  // Update local state when prop changes
  useEffect(() => {
    setActivePreset(currentPreset);
  }, [currentPreset]);

  // Handle preset change
  const handlePresetChange = useCallback((presetId: string) => {
    const preset = getPresetById(presetId) || DEFAULT_PRESETS[0];
    setActivePreset(preset);
    onPresetChange?.(preset);
  }, [onPresetChange]);

  // Handle mapping updates
  const handleMappingUpdate = useCallback((
    stemType: StemType,
    updates: Partial<StemVisualizationMapping>
  ) => {
    const currentMapping = activePreset.mappings[stemType];
    const newMapping = { ...currentMapping, ...updates };
    
    // Update local state
    setActivePreset(prev => ({
      ...prev,
      mappings: {
        ...prev.mappings,
        [stemType]: newMapping
      }
    }));

    // Notify parent
    onMappingUpdate?.(stemType, newMapping);
  }, [activePreset, onMappingUpdate]);

  // Handle feature configuration changes
  const handleFeatureChange = useCallback((
    stemType: StemType,
    featureType: 'rhythm' | 'pitch' | 'intensity' | 'timbre',
    config: RhythmConfig | PitchConfig | IntensityConfig | TimbreConfig
  ) => {
    const currentMapping = activePreset.mappings[stemType];
    const newMapping = {
      ...currentMapping,
      features: {
        ...currentMapping.features,
        [featureType]: config
      }
    };

    handleMappingUpdate(stemType, newMapping);
  }, [activePreset, handleMappingUpdate]);

  // Handle feature toggle
  const handleFeatureToggle = useCallback((
    stemType: StemType,
    featureType: 'rhythm' | 'pitch' | 'intensity' | 'timbre',
    enabled: boolean
  ) => {
    const currentMapping = activePreset.mappings[stemType];
    const newFeatures = { ...currentMapping.features };
    
    if (enabled) {
      // Create default config if enabling
      if (!newFeatures[featureType]) {
        // This would need proper default creation logic
        newFeatures[featureType] = {} as any;
      }
    } else {
      // Remove config if disabling
      delete newFeatures[featureType];
    }

    const newMapping = {
      ...currentMapping,
      features: newFeatures
    };

    handleMappingUpdate(stemType, newMapping);
  }, [activePreset, handleMappingUpdate]);

  const currentMapping = activePreset.mappings[selectedStem];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
                         <div>
               <CardTitle className="flex items-center gap-2">
                 ⚙️ Stem Mapping Editor
               </CardTitle>
               <CardDescription>
                 Customize how audio stems control visual parameters
               </CardDescription>
             </div>
             <div className="flex items-center gap-2">
               <Button
                 variant={showPreview ? "default" : "outline"}
                 size="sm"
                 onClick={() => setShowPreview(!showPreview)}
               >
                 {showPreview ? "👁️" : "🚫"} Preview
               </Button>
               <Badge variant={isPlaying ? "default" : "secondary"}>
                 {isPlaying ? "▶️ Playing" : "⏸️ Paused"}
               </Badge>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Preset Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select value={activePreset.id} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name} - {preset.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stem Selection Tabs */}
            <Tabs value={selectedStem} onValueChange={(value) => setSelectedStem(value as StemType)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="drums">🥁 Drums</TabsTrigger>
                <TabsTrigger value="bass">🎸 Bass</TabsTrigger>
                <TabsTrigger value="vocals">🎤 Vocals</TabsTrigger>
                <TabsTrigger value="piano">🎹 Piano</TabsTrigger>
                <TabsTrigger value="other">🎵 Other</TabsTrigger>
              </TabsList>

              {/* Stem Controls */}
              {Object.keys(activePreset.mappings).map((stemType) => (
                <TabsContent key={stemType} value={stemType} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="capitalize">{stemType} Configuration</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={currentMapping.mute ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => {
                              handleMappingUpdate(stemType as StemType, { mute: !currentMapping.mute });
                              onStemMute?.(stemType, !currentMapping.mute);
                            }}
                          >
                            {currentMapping.mute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            {currentMapping.mute ? "Unmute" : "Mute"}
                          </Button>
                          <Button
                            variant={currentMapping.solo ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              handleMappingUpdate(stemType as StemType, { solo: !currentMapping.solo });
                              onStemSolo?.(stemType, !currentMapping.solo);
                            }}
                          >
                            <Headphones className="h-4 w-4" />
                            Solo
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Global Controls */}
                      <div className="grid grid-cols-2 gap-4">
                        <ParameterControl
                          label="Global Multiplier"
                          value={currentMapping.globalMultiplier}
                          min={0}
                          max={3}
                          step={0.1}
                          onChange={(value) => handleMappingUpdate(stemType as StemType, { globalMultiplier: value })}
                          description="Overall effect strength for this stem"
                        />
                        <ParameterControl
                          label="Priority"
                          value={currentMapping.priority}
                          min={1}
                          max={5}
                          step={1}
                          onChange={(value) => handleMappingUpdate(stemType as StemType, { priority: value })}
                          description="Higher priority stems override lower ones"
                        />
                      </div>

                      <Separator />

                      {/* Feature Configurations */}
                      <div className="space-y-6">
                        <h4 className="font-medium">Audio Feature Mappings</h4>
                        
                        <FeatureConfig
                          featureType="rhythm"
                          config={currentMapping.features.rhythm}
                          onChange={(config) => handleFeatureChange(stemType as StemType, 'rhythm', config as RhythmConfig)}
                          enabled={!!currentMapping.features.rhythm}
                          onToggle={(enabled) => handleFeatureToggle(stemType as StemType, 'rhythm', enabled)}
                        />

                        <FeatureConfig
                          featureType="pitch"
                          config={currentMapping.features.pitch}
                          onChange={(config) => handleFeatureChange(stemType as StemType, 'pitch', config as PitchConfig)}
                          enabled={!!currentMapping.features.pitch}
                          onToggle={(enabled) => handleFeatureToggle(stemType as StemType, 'pitch', enabled)}
                        />

                        <FeatureConfig
                          featureType="intensity"
                          config={currentMapping.features.intensity}
                          onChange={(config) => handleFeatureChange(stemType as StemType, 'intensity', config as IntensityConfig)}
                          enabled={!!currentMapping.features.intensity}
                          onToggle={(enabled) => handleFeatureToggle(stemType as StemType, 'intensity', enabled)}
                        />

                        <FeatureConfig
                          featureType="timbre"
                          config={currentMapping.features.timbre}
                          onChange={(config) => handleFeatureChange(stemType as StemType, 'timbre', config as TimbreConfig)}
                          enabled={!!currentMapping.features.timbre}
                          onToggle={(enabled) => handleFeatureToggle(stemType as StemType, 'timbre', enabled)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Panel */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              Real-time visualization of current mapping settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <p className="text-white font-medium">Visualization Preview Area</p>
              <span className="ml-2 text-white/70">(Integration with visualization engine)</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MappingEditor;