'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import * as React from 'react';
import { type StemType, type VisualizationPreset } from './stem-control-panel';

interface PresetSelectorProps {
  stemType: StemType;
  presets: VisualizationPreset[];
  currentMappings?: any; // Current feature mappings to save as preset
  onSelect: (preset: VisualizationPreset) => void;
  onSave?: (preset: VisualizationPreset) => void;
  onDelete?: (presetName: string) => void;
}

export function PresetSelector({ 
  stemType, 
  presets, 
  currentMappings, 
  onSelect, 
  onSave, 
  onDelete 
}: PresetSelectorProps) {
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [newPresetName, setNewPresetName] = React.useState('');
  const [newPresetDescription, setNewPresetDescription] = React.useState('');
  // Default presets for each stem type
  const defaultPresets: VisualizationPreset[] = [
    {
      name: 'Classic',
      thumbnail: '',
      description: 'Traditional visualization mapping',
      mappings: {
        rhythm: { target: 'scale', intensity: 0.7, smoothing: 0.3, enabled: true },
        pitch: { target: 'height', intensity: 0.8, range: [0, 1], enabled: true },
        timbre: { target: 'texture', intensity: 0.5, enabled: true },
      },
    },
    {
      name: 'Ambient',
      thumbnail: '',
      description: 'Smooth, flowing visualization',
      mappings: {
        rhythm: { target: 'emission', intensity: 0.4, smoothing: 0.8, enabled: true },
        pitch: { target: 'color', intensity: 0.6, range: [0.2, 0.8], enabled: true },
        timbre: { target: 'complexity', intensity: 0.3, enabled: true },
      },
    },
    {
      name: 'Dynamic',
      thumbnail: '',
      description: 'High-energy, reactive visualization',
      mappings: {
        rhythm: { target: 'rotation', intensity: 0.9, smoothing: 0.1, enabled: true },
        pitch: { target: 'size', intensity: 0.9, range: [0, 1], enabled: true },
        timbre: { target: 'distortion', intensity: 0.7, enabled: true },
      },
    },
  ];

  const allPresets = [...defaultPresets, ...presets];
  
  const categorizePresets = (presets: VisualizationPreset[]) => {
    const categories: { [key: string]: VisualizationPreset[] } = {
      'Built-in': defaultPresets,
      'Custom': presets.filter(p => !defaultPresets.some(dp => dp.name === p.name))
    };
    return categories;
  };

  const handleSavePreset = () => {
    if (newPresetName.trim() && currentMappings && onSave) {
      const newPreset: VisualizationPreset = {
        name: newPresetName.trim(),
        description: newPresetDescription.trim() || `Custom ${stemType} preset`,
        thumbnail: '',
        mappings: currentMappings
      };
      onSave(newPreset);
      setNewPresetName('');
      setNewPresetDescription('');
      setShowSaveDialog(false);
    }
  };

  const exportPresets = () => {
    const dataStr = JSON.stringify(allPresets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stemType}-presets.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categories = categorizePresets(allPresets);

  return (
    <Card className="p-4 bg-slate-800/50 border-slate-600">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Presets</h4>
          <Badge variant="secondary" className="text-xs">
            {allPresets.length} total
          </Badge>
        </div>

        {Object.entries(categories).map(([category, categoryPresets]) => 
          categoryPresets.length > 0 && (
            <div key={category} className="space-y-2">
              <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {category}
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {categoryPresets.map((preset, index) => (
                  <div key={`${preset.name}-${index}`} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-start bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600"
                      onClick={() => onSelect(preset)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-slate-400">{preset.description}</div>
                      </div>
                    </Button>
                    {category === 'Custom' && onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => onDelete(preset.name)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {showSaveDialog ? (
          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg">
            <Label className="text-white text-sm">Save Current Settings</Label>
            <Input
              placeholder="Preset name"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Input
              placeholder="Description (optional)"
              value={newPresetDescription}
              onChange={(e) => setNewPresetDescription(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="flex-1"
              >
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSaveDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 text-slate-400 hover:text-white"
              onClick={() => setShowSaveDialog(true)}
              disabled={!currentMappings}
            >
              💾 Save Current
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white"
              onClick={exportPresets}
            >
              📁
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}