'use client';

import React, { useState } from 'react';
import { MappingEditor } from '@/components/stem-visualization/mapping-editor';
import { PresetBrowser } from '@/components/stem-visualization/preset-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VisualizationPreset } from '@/types/stem-visualization';

export default function MappingTestPage() {
  const [currentPreset, setCurrentPreset] = useState<VisualizationPreset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePresetChange = (preset: VisualizationPreset) => {
    setCurrentPreset(preset);
    console.log('🎛️ Preset changed:', preset.name);
  };

  const handleMappingUpdate = (stemType: string, mapping: any) => {
    console.log('🎚️ Mapping updated for', stemType, ':', mapping);
  };

  const handleStemMute = (stemType: string, muted: boolean) => {
    console.log('🔇 Stem muted:', stemType, muted);
  };

  const handleStemSolo = (stemType: string, solo: boolean) => {
    console.log('🎤 Stem solo:', stemType, solo);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Stem Visualization Testing</h1>
          <p className="text-stone-400">Test the mapping editor and preset browser for Story 5.3</p>
        </div>

        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => setIsPlaying(!isPlaying)}
            variant={isPlaying ? "destructive" : "default"}
          >
            {isPlaying ? "Stop" : "Start"} Simulation
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <span className={`px-2 py-1 rounded text-xs ${isPlaying ? 'bg-green-600' : 'bg-stone-600'}`}>
              {isPlaying ? 'Playing' : 'Stopped'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-stone-800 border-stone-700">
            <CardHeader>
              <CardTitle>Stem-to-Visual Mapping Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <MappingEditor
                currentPreset={currentPreset || undefined}
                onPresetChange={handlePresetChange}
                onMappingUpdate={handleMappingUpdate}
                onStemMute={handleStemMute}
                onStemSolo={handleStemSolo}
                isPlaying={isPlaying}
              />
            </CardContent>
          </Card>
          
          <Card className="bg-stone-800 border-stone-700">
            <CardHeader>
              <CardTitle>Visualization Preset Browser</CardTitle>
            </CardHeader>
            <CardContent>
              <PresetBrowser
                onPresetSelect={handlePresetChange}
                selectedPresetId={currentPreset?.id}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-stone-800 rounded-lg">
          <h3 className="font-semibold mb-2">Console Output</h3>
          <p className="text-sm text-stone-400">
            Open your browser's developer console (F12) to see real-time updates from the mapping editor and preset browser.
          </p>
        </div>
      </div>
    </div>
  );
} 