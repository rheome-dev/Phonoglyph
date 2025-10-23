'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileAudio, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music,
  X,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { debugLog } from '@/lib/utils';

interface AudioStemsUploadProps {
  onStemsReady?: (stems: Record<string, File>) => void;
  onComplete?: (fileIds: string[]) => void;
  className?: string;
}

interface StemFile {
  type: 'vocals' | 'drums' | 'bass' | 'other';
  file: File;
  preview?: string;
}

export function AudioStemsUpload({ onStemsReady, onComplete, className }: AudioStemsUploadProps) {
  const [stemFiles, setStemFiles] = useState<StemFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { toast } = useToast();

  const expectedStems = ['vocals', 'drums', 'bass', 'other'];

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not an audio file`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 50MB`,
          variant: 'destructive',
        });
        return;
      }

      // Try to determine stem type from filename
      const fileName = file.name.toLowerCase();
      let stemType: 'vocals' | 'drums' | 'bass' | 'other' = 'other';
      
      if (fileName.includes('vocal') || fileName.includes('voice') || fileName.includes('sing')) {
        stemType = 'vocals';
      } else if (fileName.includes('drum') || fileName.includes('beat') || fileName.includes('percussion')) {
        stemType = 'drums';
      } else if (fileName.includes('bass') || fileName.includes('low')) {
        stemType = 'bass';
      }

      // Check if we already have this stem type
      const existingIndex = stemFiles.findIndex(s => s.type === stemType);
      
      if (existingIndex >= 0) {
        // Replace existing file
        setStemFiles(prev => prev.map((stem, index) => 
          index === existingIndex ? { ...stem, file } : stem
        ));
      } else {
        // Add new file
        setStemFiles(prev => [...prev, { type: stemType, file }]);
      }
    });
  }, [stemFiles, toast]);

  const removeStem = useCallback((type: string) => {
    setStemFiles(prev => prev.filter(stem => stem.type !== type));
  }, []);

  const handleUpload = useCallback(async () => {
    if (stemFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedFileIds: string[] = [];
      const totalFiles = stemFiles.length;
      
      for (let i = 0; i < stemFiles.length; i++) {
        const stem = stemFiles[i];
        
        // Update progress
        setUploadProgress((i / totalFiles) * 100);
        
        // Upload file
        const formData = new FormData();
        formData.append('file', stem.file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${stem.file.name}`);
        }

        const { fileId } = await response.json();
        uploadedFileIds.push(fileId);
      }
      
      setUploadProgress(100);
      
      toast({
        title: 'Upload complete!',
        description: `Successfully uploaded ${stemFiles.length} stem files.`,
      });

      onComplete?.(uploadedFileIds);

    } catch (error) {
      debugLog.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [stemFiles, toast, onComplete]);

  const getStemIcon = (type: string) => {
    switch (type) {
      case 'vocals':
        return <Music className="h-4 w-4" />;
      case 'drums':
        return <FileAudio className="h-4 w-4" />;
      case 'bass':
        return <FileAudio className="h-4 w-4" />;
      case 'other':
        return <FileAudio className="h-4 w-4" />;
      default:
        return <FileAudio className="h-4 w-4" />;
    }
  };

  const getStemColor = (type: string) => {
    switch (type) {
      case 'vocals':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'drums':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'bass':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5" />
          Audio Stems Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Audio Stems</span>
            <Badge variant="secondary" className="text-xs">
              {stemFiles.length} files selected
            </Badge>
          </div>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById('audio-stems-upload')?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Click to select audio stem files
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports MP3, WAV, M4A (max 50MB each)
            </p>
          </div>
          
          <input
            id="audio-stems-upload"
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Selected Files */}
        {stemFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Selected Stems:</h4>
            <div className="grid gap-2">
              {stemFiles.map((stem) => (
                <div
                  key={stem.type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    getStemColor(stem.type)
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getStemIcon(stem.type)}
                    <div>
                      <p className="font-medium capitalize">{stem.type}</p>
                      <p className="text-sm opacity-75">{stem.file.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeStem(stem.type)}
                    className="p-1 hover:bg-black/10 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Stems */}
        {stemFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Missing Stems:</h4>
            <div className="grid grid-cols-2 gap-2">
              {expectedStems
                .filter(type => !stemFiles.find(stem => stem.type === type))
                .map(type => (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300"
                  >
                    {getStemIcon(type)}
                    <span className="text-sm text-gray-600 capitalize">{type}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading stems...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={stemFiles.length === 0 || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {stemFiles.length} Stem{stemFiles.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        {/* Info Section */}
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-green-900">Why upload stems?</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Faster processing - no AI separation needed</li>
                <li>• Free to use - no credits required</li>
                <li>• Better quality control - you control the separation</li>
                <li>• More precise visualization mapping</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Tips for best results:</h4>
              <ul className="text-sm text-blue-800 space-y-1 mt-2">
                <li>• Ensure all stems are the same length and sample rate</li>
                <li>• Use descriptive filenames (e.g., "vocals.wav", "drums.mp3")</li>
                <li>• Upload at least vocals and drums for good visualization</li>
                <li>• WAV format recommended for best quality</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 