'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Play, 
  Pause, 
  X, 
  Settings, 
  Film, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useVideoExport, useExportProgress, useExportPresets } from '@/hooks/use-video-export';
import { ExportConfiguration } from '@/lib/remotion/RemotionExportManager';
import { MIDIData } from '@/types/midi';
import { Layer } from '@/types/video-composition';

/**
 * VideoExportPanel - UI component for video export functionality
 * 
 * This component provides a user-friendly interface for configuring
 * and managing video exports using the Remotion pipeline.
 */

interface VideoExportPanelProps {
  projectId: string;
  midiData: MIDIData | null;
  cachedAnalysis: any[];
  layers: {
    video: Layer[];
    image: Layer[];
    effect: Layer[];
  };
  className?: string;
}

export const VideoExportPanel: React.FC<VideoExportPanelProps> = ({
  projectId,
  midiData,
  cachedAnalysis,
  layers,
  className
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('youtube-1080p');
  const [customConfig, setCustomConfig] = useState<Partial<ExportConfiguration>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const {
    startExport,
    cancelExport,
    activeJobs,
    isExporting,
    lastExportId,
    createExportRequest
  } = useVideoExport(projectId);
  
  const { presets, applyPreset, presetNames } = useExportPresets();
  const exportProgress = useExportProgress(lastExportId);
  
  // Handle export start
  const handleStartExport = async () => {
    if (!midiData) {
      alert('No MIDI data available for export');
      return;
    }
    
    if (cachedAnalysis.length === 0) {
      alert('No audio analysis data available. Please analyze your audio files first.');
      return;
    }
    
    try {
      // Apply preset configuration
      const config = applyPreset(selectedPreset, {
        duration: midiData.file.duration,
        audioFile: '/path/to/audio.mp3', // This would come from your audio system
        audioOffset: 0,
        ...customConfig
      });
      
      // Create export request
      const request = createExportRequest(midiData, cachedAnalysis, layers, config);
      
      // Start export
      await startExport(request);
      
    } catch (error) {
      console.error('Failed to start export:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Handle export cancellation
  const handleCancelExport = (jobId: string) => {
    if (confirm('Are you sure you want to cancel this export?')) {
      cancelExport(jobId);
    }
  };
  
  // Get status icon for job
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
      case 'preparing':
      case 'analyzing':
      case 'rendering':
      case 'encoding':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  // Get status color for badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500/20 text-green-300 border-green-500';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500';
      case 'rendering':
        return 'bg-blue-500/20 text-blue-300 border-blue-500';
      default:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500';
    }
  };
  
  const canExport = midiData && cachedAnalysis.length > 0 && !isExporting;
  
  return (
    <Card className={`bg-stone-900/50 border-stone-700 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-stone-100">
          <Film className="h-5 w-5" />
          Video Export
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Configuration */}
        <div className="space-y-4">
          <div>
            <Label className="text-stone-300">Export Preset</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger className="bg-stone-800 border-stone-600 text-stone-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-stone-800 border-stone-600">
                {presetNames.map(preset => (
                  <SelectItem key={preset} value={preset} className="text-stone-100">
                    {preset.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Preset Details */}
          {selectedPreset && presets[selectedPreset] && (
            <div className="p-3 bg-stone-800/50 rounded-lg border border-stone-600">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-stone-400">Resolution:</div>
                <div className="text-stone-200">
                  {presets[selectedPreset].width}×{presets[selectedPreset].height}
                </div>
                <div className="text-stone-400">Frame Rate:</div>
                <div className="text-stone-200">{presets[selectedPreset].fps} fps</div>
                <div className="text-stone-400">Format:</div>
                <div className="text-stone-200">{presets[selectedPreset].format?.toUpperCase()}</div>
                <div className="text-stone-400">Quality:</div>
                <div className="text-stone-200">
                  {presets[selectedPreset].quality?.replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            </div>
          )}
          
          {/* Advanced Settings Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-stone-400 hover:text-stone-200"
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </Button>
          
          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-3 p-4 bg-stone-800/30 rounded-lg border border-stone-600">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-stone-300">Width</Label>
                  <Input
                    type="number"
                    value={customConfig.width || presets[selectedPreset]?.width || 1920}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                    className="bg-stone-800 border-stone-600 text-stone-100"
                  />
                </div>
                <div>
                  <Label className="text-stone-300">Height</Label>
                  <Input
                    type="number"
                    value={customConfig.height || presets[selectedPreset]?.height || 1080}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                    className="bg-stone-800 border-stone-600 text-stone-100"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-stone-300">Frame Rate</Label>
                <Select
                  value={String(customConfig.fps || presets[selectedPreset]?.fps || 30)}
                  onValueChange={(value) => setCustomConfig(prev => ({ ...prev, fps: parseInt(value) }))}
                >
                  <SelectTrigger className="bg-stone-800 border-stone-600 text-stone-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-800 border-stone-600">
                    <SelectItem value="24">24 fps</SelectItem>
                    <SelectItem value="30">30 fps</SelectItem>
                    <SelectItem value="60">60 fps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        <Separator className="bg-stone-600" />
        
        {/* Export Button */}
        <div className="space-y-3">
          <Button
            onClick={handleStartExport}
            disabled={!canExport}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </>
            )}
          </Button>
          
          {!canExport && (
            <div className="text-sm text-stone-400 text-center">
              {!midiData && 'No MIDI data available'}
              {midiData && cachedAnalysis.length === 0 && 'No audio analysis data available'}
              {isExporting && 'Export in progress...'}
            </div>
          )}
        </div>
        
        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <>
            <Separator className="bg-stone-600" />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-stone-300">Export Jobs</h4>
              
              {activeJobs.map(job => (
                <div key={job.id} className="p-3 bg-stone-800/50 rounded-lg border border-stone-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="text-sm font-medium text-stone-200">
                        Export {job.id.slice(-8)}
                      </span>
                      <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                        {job.status.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    </div>
                    
                    {['queued', 'preparing', 'analyzing', 'rendering', 'encoding'].includes(job.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelExport(job.id)}
                        className="h-6 w-6 p-0 text-stone-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {job.progress && job.progress.progress > 0 && (
                    <div className="space-y-1">
                      <Progress 
                        value={job.progress.progress * 100} 
                        className="h-2 bg-stone-700"
                      />
                      <div className="flex justify-between text-xs text-stone-400">
                        <span>{job.progress.message}</span>
                        <span>{Math.round(job.progress.progress * 100)}%</span>
                      </div>
                      {job.progress.estimatedTimeRemaining > 0 && (
                        <div className="text-xs text-stone-500">
                          ~{Math.round(job.progress.estimatedTimeRemaining)}s remaining
                        </div>
                      )}
                    </div>
                  )}
                  
                  {job.status === 'complete' && job.outputPath && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-400 border-emerald-600 hover:bg-emerald-600/20"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                  
                  {job.status === 'failed' && job.error && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                      Error: {job.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
