'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Music, 
  Settings, 
  Play,
  Pause,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileAudio
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/utils';

interface StemSeparationUploadProps {
  onStemsReady?: (stems: Record<string, string>) => void;
  className?: string;
}

interface StemConfig {
  model: 'spleeter';
  modelVariant: '2stems' | '4stems' | '5stems';
  stems: {
    drums?: boolean;
    bass?: boolean;
    vocals: boolean;
    other: boolean;
    piano?: boolean;
  };
  quality: {
    sampleRate: '44100' | '48000';
    outputFormat: 'wav' | 'mp3';
    bitrate?: number;
  };
}

export function StemSeparationUpload({ onStemsReady, className }: StemSeparationUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState<StemConfig>({
    model: 'spleeter',
    modelVariant: '4stems',
    stems: {
      drums: true,
      bass: true,
      vocals: true,
      other: true,
    },
    quality: {
      sampleRate: '44100',
      outputFormat: 'wav',
    },
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();

  // tRPC mutations and queries
  const createJobMutation = trpc.stem.createSeparationJob.useMutation({
    onSuccess: (data) => {
      setJobId(data.jobId);
      toast({
        title: 'Stem separation started',
        description: 'Your audio is being processed. This may take a few minutes.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const { data: jobStatus, isLoading: isLoadingStatus } = trpc.stem.getJobStatus.useQuery(
    { jobId: jobId! },
    { 
      enabled: !!jobId,
      refetchInterval: (data) => {
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        return 2000; // Poll every 2 seconds
      },
    }
  );

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an audio file (MP3, WAV, etc.)',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 50MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  }, [toast]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // First upload the file using the existing file upload system
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const { fileId } = await response.json();

      // Create stem separation job
      await createJobMutation.mutateAsync({
        fileId,
        config,
      });

    } catch (error) {
      debugLog.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, config, createJobMutation, toast]);

  const handleConfigChange = useCallback((key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleStemToggle = useCallback((stem: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      stems: {
        ...prev.stems,
        [stem]: enabled,
      },
    }));
  }, []);

  // Update model variant based on selected stems
  const updateModelVariant = useCallback(() => {
    const { stems } = config;
    const stemCount = Object.values(stems).filter(Boolean).length;
    
    let variant: '2stems' | '4stems' | '5stems' = '4stems';
    if (stemCount <= 2) variant = '2stems';
    else if (stemCount >= 5) variant = '5stems';
    
    setConfig(prev => ({
      ...prev,
      modelVariant: variant,
    }));
  }, [config.stems]);

  React.useEffect(() => {
    updateModelVariant();
  }, [config.stems, updateModelVariant]);

  // Handle job completion
  React.useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus.results?.stems) {
      toast({
        title: 'Stem separation complete!',
        description: 'Your audio has been separated into stems.',
      });
      onStemsReady?.(jobStatus.results.stems);
    } else if (jobStatus?.status === 'failed') {
      toast({
        title: 'Stem separation failed',
        description: jobStatus.error || 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [jobStatus, onStemsReady, toast]);

  const getStatusIcon = () => {
    if (!jobStatus) return null;
    
    switch (jobStatus.status) {
      case 'queued':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    if (!jobStatus) return '';
    
    switch (jobStatus.status) {
      case 'queued':
        return 'Queued for processing';
      case 'processing':
        return `Processing... ${jobStatus.progress}%`;
      case 'completed':
        return 'Separation complete';
      case 'failed':
        return 'Separation failed';
      default:
        return '';
    }
  };

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Stem Separation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="audio-upload">Audio File</Label>
            {selectedFile && (
              <Badge variant="secondary" className="text-xs">
                {selectedFile.name}
              </Badge>
            )}
          </div>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById('audio-upload')?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {selectedFile ? selectedFile.name : 'Click to select audio file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports MP3, WAV, M4A (max 50MB)
            </p>
          </div>
          
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <Label>Separation Settings</Label>
          </div>

          {/* Model Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model-variant">Model</Label>
              <Select
                value={config.modelVariant}
                onValueChange={(value: '2stems' | '4stems' | '5stems') => 
                  handleConfigChange('modelVariant', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2stems">2 Stems (Vocals + Other)</SelectItem>
                  <SelectItem value="4stems">4 Stems (Vocals, Drums, Bass, Other)</SelectItem>
                  <SelectItem value="5stems">5 Stems (Vocals, Drums, Bass, Piano, Other)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="output-format">Output Format</Label>
              <Select
                value={config.quality.outputFormat}
                onValueChange={(value: 'wav' | 'mp3') => 
                  handleConfigChange('quality', { ...config.quality, outputFormat: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wav">WAV (Lossless)</SelectItem>
                  <SelectItem value="mp3">MP3 (Compressed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stem Selection */}
          <div>
            <Label>Stems to Extract</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {Object.entries(config.stems).map(([stem, enabled]) => (
                <div key={stem} className="flex items-center space-x-2">
                  <Switch
                    id={`stem-${stem}`}
                    checked={enabled}
                    onCheckedChange={(checked) => handleStemToggle(stem, checked)}
                  />
                  <Label htmlFor={`stem-${stem}`} className="capitalize">
                    {stem}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || createJobMutation.isLoading}
          className="w-full"
        >
          {isUploading || createJobMutation.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Start Stem Separation
            </>
          )}
        </Button>

        {/* Job Status */}
        {jobStatus && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            
            {jobStatus.status === 'processing' && (
              <Progress value={jobStatus.progress || 0} className="w-full" />
            )}
            
            {jobStatus.status === 'completed' && jobStatus.results?.stems && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600">Available Stems:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(jobStatus.results.stems).map((stem) => (
                    <div key={stem} className="flex items-center gap-2 text-sm">
                      <FileAudio className="h-3 w-3" />
                      <span className="capitalize">{stem}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {jobStatus.status === 'failed' && (
              <p className="text-sm text-red-600">
                Error: {jobStatus.error || 'Unknown error'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 