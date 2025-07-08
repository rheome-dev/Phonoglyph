'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { type StemType, type FeatureMappings } from './stem-control-panel';

interface FeatureMappingControlsProps {
  stem: StemType;
  features: ('rhythm' | 'pitch' | 'timbre')[];
  visualTargets: {
    rhythm: readonly ('scale' | 'rotation' | 'color' | 'emission' | 'position')[];
    pitch: readonly ('height' | 'color' | 'size' | 'shape')[];
    timbre: readonly ('texture' | 'complexity' | 'distortion')[];
  };
  mappings: FeatureMappings;
  onChange: (mappings: FeatureMappings) => void;
}

export function FeatureMappingControls({
  stem,
  features,
  visualTargets,
  mappings,
  onChange
}: FeatureMappingControlsProps) {
  const updateFeatureMapping = (
    feature: keyof FeatureMappings,
    updates: Partial<FeatureMappings[keyof FeatureMappings]>
  ) => {
    const updatedMappings = {
      ...mappings,
      [feature]: {
        ...mappings[feature],
        ...updates,
      },
    };
    onChange(updatedMappings);
  };

  const getStemColor = (stemType: StemType) => {
    const colors = {
      drums: 'blue',
      bass: 'green',
      vocals: 'purple',
      other: 'orange',
    };
    return colors[stemType];
  };

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-600">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white capitalize">
            {stem} Feature Mapping
          </h3>
          <div className={`w-3 h-3 rounded-full bg-${getStemColor(stem)}-500`} />
        </div>

        {features.map((feature) => {
          const featureData = mappings[feature];
          return (
            <div key={feature} className="space-y-3 p-3 rounded-lg bg-slate-700/30">
              <div className="flex items-center justify-between">
                <Label className="text-white font-medium capitalize">
                  {feature}
                </Label>
                <Switch
                  checked={featureData.enabled}
                  onCheckedChange={(enabled) =>
                    updateFeatureMapping(feature, { enabled })
                  }
                />
              </div>

              {featureData.enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Visual Target</Label>
                    <Select
                      value={featureData.target}
                      onValueChange={(target) =>
                        updateFeatureMapping(feature, { target } as any)
                      }
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visualTargets[feature].map((target) => (
                          <SelectItem key={target} value={target}>
                            {target}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">
                      Intensity: {featureData.intensity.toFixed(2)}
                    </Label>
                    <Slider
                      value={[featureData.intensity]}
                      onValueChange={([intensity]) =>
                        updateFeatureMapping(feature, { intensity })
                      }
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                  </div>

                  {feature === 'rhythm' && 'smoothing' in featureData && (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">
                        Smoothing: {featureData.smoothing.toFixed(2)}
                      </Label>
                      <Slider
                        value={[featureData.smoothing]}
                        onValueChange={([smoothing]) =>
                          updateFeatureMapping(feature, { smoothing })
                        }
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  )}

                  {feature === 'pitch' && 'range' in featureData && (
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">
                        Range: [{featureData.range[0].toFixed(2)}, {featureData.range[1].toFixed(2)}]
                      </Label>
                      <Slider
                        value={featureData.range}
                        onValueChange={(range) =>
                          updateFeatureMapping(feature, { range: range as [number, number] })
                        }
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}