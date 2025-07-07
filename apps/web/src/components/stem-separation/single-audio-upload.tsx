'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Music, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileAudio,
  Clock,
  DollarSign
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SingleAudioUploadProps {
  onStemsReady?: (stems: Record<string, string>) => void;
  onComplete?: (fileId: string) => void;
  className?: string;
}

export function SingleAudioUpload({ onStemsReady, onComplete, className }: SingleAudioUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

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
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Create stem separation job with default config
      await createJobMutation.mutateAsync({
        fileId,
        config: {
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
        },
      });

      onComplete?.(fileId);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, createJobMutation, toast, onComplete]);

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
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Single Audio Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Audio File</span>
            {selectedFile && (
              <Badge variant="secondary" className="text-xs">
                {selectedFile.name}
              </Badge>
            )}
          </div>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById('single-audio-upload')?.click()}
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
            id="single-audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading file...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

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
              Upload & Separate Stems
            </>
          )}
        </Button>

        {/* Info Section */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your audio file will be uploaded to our secure servers</li>
                <li>• AI will automatically separate it into 4 stems (vocals, drums, bass, other)</li>
                <li>• Processing typically takes 2-5 minutes for a 3-minute song</li>
                <li>• You'll be notified when separation is complete</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cost Warning */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Credit Usage</h4>
              <p className="text-sm text-yellow-800">
                This operation will use 1 credit from your account. Credits are used for AI-powered stem separation.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 