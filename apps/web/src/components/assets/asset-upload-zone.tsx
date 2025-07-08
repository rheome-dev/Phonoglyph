'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
// Simple Alert component for now
const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`border rounded-md p-2 ${className}`}>{children}</div>
);
const AlertDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);
import { Upload, X, FileVideo, FileImage, FileAudio, Music, AlertCircle, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface AssetUploadZoneProps {
  projectId: string;
  allowedTypes?: Array<'video' | 'image' | 'audio' | 'midi'>;
  onUploadComplete?: () => void;
  onCancel?: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

const MIME_TYPE_MAP = {
  video: ['video/mp4', 'video/mov', 'video/quicktime', 'video/webm'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'],
  midi: ['audio/midi', 'audio/x-midi', 'application/x-midi', 'audio/mid']
};

export function AssetUploadZone({
  projectId,
  allowedTypes = ['video', 'image', 'audio', 'midi'],
  onUploadComplete,
  onCancel
}: AssetUploadZoneProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileMutation = trpc.file.uploadFile.useMutation();
  // Note: This endpoint might not exist yet, commenting out for now
  // const processVideoMutation = trpc.file.processVideoAsset.useMutation();

  const getAllowedMimeTypes = () => {
    return allowedTypes.flatMap(type => MIME_TYPE_MAP[type]);
  };

  const getFileTypeFromMime = (mimeType: string): string => {
    for (const [type, mimes] of Object.entries(MIME_TYPE_MAP)) {
      if (mimes.includes(mimeType)) {
        return type;
      }
    }
    return 'unknown';
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedMimes = getAllowedMimeTypes();
    
    if (!allowedMimes.includes(file.type)) {
      return { 
        valid: false, 
        error: `File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}` 
      };
    }

    const maxSizes = {
      video: 500 * 1024 * 1024, // 500MB
      image: 25 * 1024 * 1024,  // 25MB
      audio: 50 * 1024 * 1024,  // 50MB
      midi: 5 * 1024 * 1024     // 5MB
    };

    const fileType = getFileTypeFromMime(file.type);
    const maxSize = maxSizes[fileType as keyof typeof maxSizes] || 10 * 1024 * 1024; // 10MB default

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size exceeds limit. Maximum size for ${fileType} files: ${Math.round(maxSize / (1024 * 1024))}MB` 
      };
    }

    return { valid: true };
  };

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: UploadFile[] = [];
    
    Array.from(files).forEach((file) => {
      const validation = validateFile(file);
      
      if (validation.valid) {
        newFiles.push({
          file,
          id: Math.random().toString(36).substring(2),
          progress: 0,
          status: 'pending'
        });
      } else {
        newFiles.push({
          file,
          id: Math.random().toString(36).substring(2),
          progress: 0,
          status: 'failed',
          error: validation.error
        });
      }
    });

    setUploadFiles(prev => [...prev, ...newFiles]);
    
    // Start uploading valid files
    newFiles.forEach(uploadFile => {
      if (uploadFile.status === 'pending') {
        uploadSingleFile(uploadFile);
      }
    });
  }, []);

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setUploadFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)
      );

      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        };
        reader.readAsDataURL(uploadFile.file);
      });

      // Upload file
      const result = await uploadFileMutation.mutateAsync({
        fileName: uploadFile.file.name,
        fileType: getFileTypeFromMime(uploadFile.file.type) as any,
        mimeType: uploadFile.file.type,
        fileSize: uploadFile.file.size,
        fileData: base64,
        projectId
      });

      // Update progress to 100% for upload complete
      setUploadFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, progress: 100, status: 'processing' } : f)
      );

      // If it's a video file, start processing
      // const fileType = getFileTypeFromMime(uploadFile.file.type);
      // if (fileType === 'video' || fileType === 'image') {
      //   try {
      //     await processVideoMutation.mutateAsync({ fileId: result.fileId });
      //   } catch (processError) {
      //     console.warn('Processing failed, but upload succeeded:', processError);
      //   }
      // }

      // Mark as completed
      setUploadFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed' } : f)
      );

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { 
          ...f, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        } : f)
      );
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const getFileIcon = (mimeType: string) => {
    const type = getFileTypeFromMime(mimeType);
    switch (type) {
      case 'video': return <FileVideo className="h-8 w-8 text-purple-600" />;
      case 'image': return <FileImage className="h-8 w-8 text-green-600" />;
      case 'audio': return <FileAudio className="h-8 w-8 text-blue-600" />;
      case 'midi': return <Music className="h-8 w-8 text-orange-600" />;
      default: return <Upload className="h-8 w-8 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'uploading':
        return <Badge variant="secondary">Uploading...</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing...</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">✓ Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const allCompleted = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'completed' || f.status === 'failed');
  const hasUploads = uploadFiles.length > 0;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-stone-600 bg-stone-300' 
            : 'border-stone-400 bg-stone-100 hover:border-stone-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <Upload className="h-12 w-12 text-stone-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-stone-700">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-stone-600 mt-2">
              Supported formats: {allowedTypes.join(', ').toUpperCase()}
            </p>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-stone-600 hover:bg-stone-700"
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={getAllowedMimeTypes().join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {hasUploads && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-stone-700">Upload Progress</h4>
            {allCompleted && (
              <div className="flex gap-2">
                <Button 
                  onClick={onUploadComplete}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Done
                </Button>
                <Button 
                  onClick={onCancel}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className="bg-white rounded-lg p-3 border border-stone-300">
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadFile.file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-stone-700 truncate">
                        {uploadFile.file.name}
                      </p>
                      {getStatusBadge(uploadFile.status)}
                    </div>
                    <p className="text-xs text-stone-500">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    
                    {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="h-2" />
                      </div>
                    )}
                    
                    {uploadFile.status === 'failed' && uploadFile.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {uploadFile.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!hasUploads && (
        <div className="flex justify-end gap-2">
          <Button 
            onClick={onCancel}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}