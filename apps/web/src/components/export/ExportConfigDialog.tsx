'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Video, AudioWaveform, Palette } from 'lucide-react';

interface ExportConfig {
  name: string;
  format: {
    container: 'mp4' | 'webm' | 'mov' | 'gif';
    videoCodec: 'h264' | 'h265' | 'vp9' | 'av1';
    audioCodec: 'aac' | 'mp3' | 'opus';
    preset: string;
  };
  quality: {
    resolution: { width: number; height: number };
    framerate: 24 | 30 | 60;
    bitrate: number;
    crf?: number;
    profile?: 'baseline' | 'main' | 'high';
  };
  audio: {
    enabled: boolean;
    bitrate: number;
    sampleRate: 44100 | 48000;
    channels: 1 | 2;
    normalization: boolean;
    fadeIn?: number;
    fadeOut?: number;
  };
  branding?: {
    watermark?: {
      imageUrl: string;
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      opacity: number;
      scale: number;
    };
  };
}

interface ExportConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  presets?: {
    presets: any[];
    categories: Record<string, string[]>;
  };
}

const RESOLUTION_PRESETS = [
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: '720p (1280×720)', width: 1280, height: 720 },
  { label: 'Instagram Square (1080×1080)', width: 1080, height: 1080 },
  { label: 'TikTok Vertical (1080×1920)', width: 1080, height: 1920 },
  { label: 'Instagram Story (1080×1920)', width: 1080, height: 1920 },
  { label: 'Twitter (1920×1080)', width: 1920, height: 1080 },
];

const BITRATE_PRESETS = {
  '4K': 35000,
  '1080p': 8000,
  '720p': 5000,
  'Social': 3500,
};

export const ExportConfigDialog: React.FC<ExportConfigDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  presets
}) => {
  const [config, setConfig] = useState<ExportConfig>({
    name: 'Custom Export',
    format: {
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      preset: 'custom'
    },
    quality: {
      resolution: { width: 1920, height: 1080 },
      framerate: 30,
      bitrate: 8000,
      crf: 18,
      profile: 'high'
    },
    audio: {
      enabled: true,
      bitrate: 192,
      sampleRate: 48000,
      channels: 2,
      normalization: true
    }
  });

  const handlePresetSelect = (presetId: string) => {
    const preset = presets?.presets.find(p => p.id === presetId);
    if (preset) {
      setConfig(preset);
    }
  };

  const handleResolutionChange = (resolution: { width: number; height: number }) => {
    setConfig(prev => ({
      ...prev,
      quality: {
        ...prev.quality,
        resolution,
        bitrate: getBitrateForResolution(resolution.height)
      }
    }));
  };

  const getBitrateForResolution = (height: number): number => {
    if (height >= 2160) return BITRATE_PRESETS['4K'];
    if (height >= 1080) return BITRATE_PRESETS['1080p'];
    if (height >= 720) return BITRATE_PRESETS['720p'];
    return BITRATE_PRESETS['Social'];
  };

  const handleExport = () => {
    onExport(config);
  };

  const getEstimatedFileSize = () => {
    // Rough estimation: bitrate (kbps) * duration (60s) / 8 / 1024 = MB
    const durationMinutes = 1; // Assuming 1 minute for estimation
    const sizeMB = (config.quality.bitrate * 60 * durationMinutes) / 8 / 1024;
    return `~${sizeMB.toFixed(1)} MB/min`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Custom Export Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preset" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preset">Preset</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-4">
            <div>
              <Label htmlFor="export-name">Export Name</Label>
              <Input
                id="export-name"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Custom Export"
              />
            </div>

            {presets && (
              <div className="space-y-3">
                <Label>Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(presets.categories).map(([platform, presetIds]) => (
                    <div key={platform} className="space-y-1">
                      <h4 className="text-sm font-medium capitalize">{platform}</h4>
                      {presetIds.map(presetId => {
                        const preset = presets.presets.find(p => p.id === presetId);
                        return preset ? (
                          <Button
                            key={presetId}
                            variant="outline"
                            size="sm"
                            onClick={() => handlePresetSelect(presetId)}
                            className="w-full text-left justify-start"
                          >
                            {preset.name}
                          </Button>
                        ) : null;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="video" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Resolution</Label>
                <Select
                  value={`${config.quality.resolution.width}x${config.quality.resolution.height}`}
                  onValueChange={(value) => {
                    const [width, height] = value.split('x').map(Number);
                    handleResolutionChange({ width, height });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_PRESETS.map(preset => (
                      <SelectItem
                        key={`${preset.width}x${preset.height}`}
                        value={`${preset.width}x${preset.height}`}
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Frame Rate</Label>
                <Select
                  value={config.quality.framerate.toString()}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    quality: { ...prev.quality, framerate: Number(value) as 24 | 30 | 60 }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                    <SelectItem value="30">30 fps (Standard)</SelectItem>
                    <SelectItem value="60">60 fps (Smooth)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Bitrate: {config.quality.bitrate} kbps</Label>
                <Slider
                  value={[config.quality.bitrate]}
                  onValueChange={([value]) => setConfig(prev => ({
                    ...prev,
                    quality: { ...prev.quality, bitrate: value }
                  }))}
                  min={1000}
                  max={50000}
                  step={500}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 Mbps</span>
                  <span>50 Mbps</span>
                </div>
              </div>

              <div>
                <Label>Video Codec</Label>
                <Select
                  value={config.format.videoCodec}
                  onValueChange={(value) => setConfig(prev => ({
                    ...prev,
                    format: { ...prev.format, videoCodec: value as any }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h264">H.264 (Recommended)</SelectItem>
                    <SelectItem value="h265">H.265 (Smaller files)</SelectItem>
                    <SelectItem value="vp9">VP9 (Web optimized)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>Estimated file size:</span>
                  <Badge variant="secondary">{getEstimatedFileSize()}</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="audio-enabled"
                checked={config.audio.enabled}
                onCheckedChange={(enabled) => setConfig(prev => ({
                  ...prev,
                  audio: { ...prev.audio, enabled }
                }))}
              />
              <Label htmlFor="audio-enabled">Enable Audio</Label>
            </div>

            {config.audio.enabled && (
              <div className="space-y-3">
                <div>
                  <Label>Audio Bitrate: {config.audio.bitrate} kbps</Label>
                  <Slider
                    value={[config.audio.bitrate]}
                    onValueChange={([value]) => setConfig(prev => ({
                      ...prev,
                      audio: { ...prev.audio, bitrate: value }
                    }))}
                    min={64}
                    max={320}
                    step={32}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Sample Rate</Label>
                  <Select
                    value={config.audio.sampleRate.toString()}
                    onValueChange={(value) => setConfig(prev => ({
                      ...prev,
                      audio: { ...prev.audio, sampleRate: Number(value) as 44100 | 48000 }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="44100">44.1 kHz (CD Quality)</SelectItem>
                      <SelectItem value="48000">48 kHz (Professional)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="audio-normalization"
                    checked={config.audio.normalization}
                    onCheckedChange={(normalization) => setConfig(prev => ({
                      ...prev,
                      audio: { ...prev.audio, normalization }
                    }))}
                  />
                  <Label htmlFor="audio-normalization">Audio Normalization</Label>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <div className="text-center py-8">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Branding options coming soon</p>
              <p className="text-xs text-gray-500">
                Watermarks, end cards, and custom branding
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
            <Video className="w-4 h-4 mr-2" />
            Start Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};