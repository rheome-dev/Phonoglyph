'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GlobalControlsProps {
  intensity: number;
  smoothing: number;
  visualStyle: 'particles' | 'geometry' | 'shader';
  onChange: (settings: {
    masterIntensity: number;
    smoothing: number;
    visualStyle: 'particles' | 'geometry' | 'shader';
  }) => void;
}

export function GlobalControls({ intensity, smoothing, visualStyle, onChange }: GlobalControlsProps) {
  const updateSettings = (updates: Partial<Parameters<typeof onChange>[0]>) => {
    onChange({
      masterIntensity: intensity,
      smoothing,
      visualStyle,
      ...updates,
    });
  };

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-600">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Global Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-white">
              Master Intensity: {intensity.toFixed(2)}
            </Label>
            <Slider
              value={[intensity]}
              onValueChange={([masterIntensity]) =>
                updateSettings({ masterIntensity })
              }
              min={0}
              max={2}
              step={0.01}
              className="w-full"
            />
            <div className="text-xs text-slate-400">
              Global multiplier for all visual effects
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">
              Smoothing: {smoothing.toFixed(2)}
            </Label>
            <Slider
              value={[smoothing]}
              onValueChange={([smoothing]) =>
                updateSettings({ smoothing })
              }
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <div className="text-xs text-slate-400">
              Temporal smoothing for smoother transitions
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Visual Style</Label>
            <Select
              value={visualStyle}
              onValueChange={(visualStyle: 'particles' | 'geometry' | 'shader') =>
                updateSettings({ visualStyle })
              }
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="particles">🌟 Particles</SelectItem>
                <SelectItem value="geometry">📐 Geometry</SelectItem>
                <SelectItem value="shader">✨ Shader</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-slate-400">
              Base visualization rendering style
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            Changes apply to all stems in real-time
          </div>
          <div className="text-xs text-slate-500">
            Master: {Math.round(intensity * 100)}% | Smooth: {Math.round(smoothing * 100)}%
          </div>
        </div>
      </div>
    </Card>
  );
}