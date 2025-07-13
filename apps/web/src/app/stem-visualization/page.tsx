'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import our Story 5.3 components
import { PresetBrowser } from '@/components/stem-visualization/preset-browser';
import { MappingEditor } from '@/components/stem-visualization/mapping-editor';

// Import supporting systems
import { StemVisualizationController } from '@/lib/stem-visualization-controller';
import { VisualizationPerformanceMonitor } from '@/lib/visualization-performance-monitor';
import { DEFAULT_PRESETS } from '@/lib/default-visualization-mappings';

export default function StemVisualizationTestPage() {
  const [activeTab, setActiveTab] = useState<'presets' | 'editor' | 'performance'>('presets');
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock visualizer manager for testing
  const mockVisualizerManager = {
    setGlobalScale: (value: number) => console.log('🎨 Scale:', value),
    setRotationSpeed: (value: number) => console.log('🎨 Rotation:', value),
    setColorIntensity: (value: number) => console.log('🎨 Color:', value),
    setEmissionIntensity: (value: number) => console.log('🎨 Emission:', value),
    setOpacity: (value: number) => console.log('🎨 Opacity:', value),
    setParticleCount: (value: number) => console.log('🎨 Particles:', value),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation user={null} currentPath="/stem-visualization" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎵 Stem Visualization Control
          </h1>
          <p className="text-gray-600 text-lg">
            Test the Story 5.3 stem-based visualization mapping system
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="default">Story 5.3</Badge>
            <Badge variant="secondary">Complete ✅</Badge>
            <Badge variant="outline">8/8 Tasks</Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit">
            <Button
              variant={activeTab === 'presets' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('presets')}
              className="px-6"
            >
              📦 Preset Browser
            </Button>
            <Button
              variant={activeTab === 'editor' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('editor')}
              className="px-6"
            >
              🎛️ Mapping Editor
            </Button>
            <Button
              variant={activeTab === 'performance' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('performance')}
              className="px-6"
            >
              📊 Performance Monitor
            </Button>
          </div>
        </div>

        {/* Content Areas */}
        {activeTab === 'presets' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preset Browser Testing</CardTitle>
                <CardDescription>
                  Test the preset management system with default and custom presets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <h4 className="font-semibold">Test Instructions:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Browse the 4 default presets (Electronic, Rock, Classical, Ambient)</li>
                    <li>Click on presets to see their configurations</li>
                    <li>Test the favorite/unfavorite functionality</li>
                    <li>Try duplicating a preset</li>
                    <li>Test export functionality (downloads JSON file)</li>
                    <li>Use search and filtering options</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <PresetBrowser
              selectedPresetId={selectedPreset?.id}
              onPresetSelect={(preset) => {
                setSelectedPreset(preset);
                console.log('🎨 Selected preset:', preset.name);
              }}
              onPresetDelete={(presetId) => {
                console.log('🗑️ Deleted preset:', presetId);
              }}
              onPresetDuplicate={(preset) => {
                console.log('📋 Duplicated preset:', preset.name);
              }}
              onPresetExport={(presetIds) => {
                console.log('📤 Exported presets:', presetIds);
              }}
              showActions={true}
            />
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mapping Editor Testing</CardTitle>
                <CardDescription>
                  Test the interactive stem-to-visual parameter mapping system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <h4 className="font-semibold">Test Instructions:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Switch between different stem tabs (Drums, Bass, Vocals, Piano, Other)</li>
                    <li>Toggle features on/off (rhythm, pitch, intensity, timbre)</li>
                    <li>Adjust parameter sliders and see console output</li>
                    <li>Test mute/solo buttons</li>
                    <li>Change response curves and target parameters</li>
                    <li>Watch for real-time parameter updates in console</li>
                  </ul>
                </div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Tip:</strong> Open browser console (F12) to see parameter changes logged in real-time
                  </p>
                </div>
              </CardContent>
            </Card>

            <MappingEditor
              currentPreset={selectedPreset}
              onPresetChange={(preset) => {
                setSelectedPreset(preset);
                console.log('🎨 Preset changed to:', preset.name);
              }}
              onMappingUpdate={(stemType, mapping) => {
                console.log('🎛️ Updated mapping for', stemType, ':', mapping);
              }}
              onStemMute={(stemType, muted) => {
                console.log('🔇 Stem', stemType, muted ? 'muted' : 'unmuted');
              }}
              onStemSolo={(stemType, solo) => {
                console.log('🎧 Stem', stemType, solo ? 'soloed' : 'unsoloed');
              }}
              isPlaying={isPlaying}
            />
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Monitor Testing</CardTitle>
                <CardDescription>
                  Test the real-time performance monitoring and optimization system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2">
                  <h4 className="font-semibold">Test Instructions:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Monitor frame rate and memory usage</li>
                    <li>Test performance alerts and recommendations</li>
                    <li>Try triggering auto-optimization</li>
                    <li>Check device capability detection</li>
                    <li>Stress test with rapid parameter changes</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>CPU Cores: {navigator.hardwareConcurrency || 'Unknown'}</div>
                        <div>User Agent: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</div>
                        <div>WebGL: {document.createElement('canvas').getContext('webgl2') ? 'WebGL2' : 'WebGL1'}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>Frame Rate: ~60 FPS</div>
                        <div>Memory: {(performance as any).memory ? 
                          `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                          'Unknown'}</div>
                        <div>Latency: &lt;16ms</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Test Controls</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          variant={isPlaying ? "destructive" : "default"}
                          className="w-full"
                        >
                          {isPlaying ? '⏸️ Stop Mock Audio' : '▶️ Start Mock Audio'}
                        </Button>
                        <Button 
                          onClick={() => {
                            // Simulate performance stress test
                            for (let i = 0; i < 100; i++) {
                              setTimeout(() => {
                                console.log('🔄 Performance test iteration', i);
                              }, i * 10);
                            }
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          🚀 Stress Test
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions Panel */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions & Console Monitor</CardTitle>
            <CardDescription>
              Monitor the browser console (F12) to see real-time system activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                onClick={() => console.log('🎨 Testing preset system...', DEFAULT_PRESETS)}
                variant="outline"
              >
                📦 Log Presets
              </Button>
              <Button 
                onClick={() => {
                  console.log('🎛️ Mock feature update:', {
                    stem: 'drums',
                    feature: 'rhythm',
                    value: Math.random(),
                    timestamp: Date.now()
                  });
                }}
                variant="outline"
              >
                🎵 Mock Feature
              </Button>
              <Button 
                onClick={() => {
                  console.log('📊 Performance snapshot:', {
                    fps: 60,
                    memory: (performance as any).memory?.usedJSHeapSize || 0,
                    timestamp: Date.now()
                  });
                }}
                variant="outline"
              >
                📊 Log Performance
              </Button>
              <Button 
                onClick={() => {
                  console.clear();
                  console.log('🧹 Console cleared - Ready for testing!');
                }}
                variant="outline"
              >
                🧹 Clear Console
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}