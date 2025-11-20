'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  FileMusic, 
  Upload, 
  Clock, 
  Music,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Users,
  Trash2
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useUpload } from '@/hooks/use-upload';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { DraggableFile } from '@/components/video-composition/DraggableFile';

interface FileMetadata {
  id: string;
  file_name: string;
  file_size: number;
  file_type: 'midi' | 'audio' | 'video' | 'image';
  mime_type: string;
  upload_status: 'uploading' | 'completed' | 'failed';
  processing_status?: 'pending' | 'completed' | 'failed';
  created_at: string;
  thumbnail_url?: string | null;
}

interface FileSelectorProps {
  onFileSelected: (fileId: string) => void;
  selectedFileId?: string;
  showUpload?: boolean;
  useDemoData: boolean;
  onDemoModeChange: (useDemoData: boolean) => void;
  projectId?: string;
  projectName?: string;
}

export function FileSelector({ 
  onFileSelected, 
  selectedFileId, 
  showUpload = true,
  useDemoData,
  onDemoModeChange,
  projectId,
  projectName
}: FileSelectorProps) {
  const [uploadExpanded, setUploadExpanded] = useState(false);
  const { toast } = useToast();
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user's files (project-scoped if projectId provided)
  const { 
    data: filesData, 
    isLoading: filesLoading, 
    error: filesError,
    refetch: refetchFiles
  } = trpc.file.getUserFiles.useQuery({
    limit: 100,
    fileType: 'all', // Show all file types, not just MIDI
    projectId: projectId
  });

  // Parse MIDI file mutation
  const parseMidiMutation = trpc.midi.parseMidiFile.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "MIDI File Ready",
          description: "File parsed successfully and ready for visualization",
        });
        onFileSelected(result.midiFileId);
        onDemoModeChange(false);
        refetchFiles();
      }
    },
    onError: (error) => {
      toast({
        title: "Parsing Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload integration
  const { addAndUploadFiles, files: uploadQueue, clearFiles } = useUpload({
    projectId: projectId, // NEW: Associate uploads with project
    onUploadComplete: (uploadFile) => {
      // Refresh the file list to show the newly uploaded file
      refetchFiles();
      
      // Only parse MIDI files
      if (uploadFile.fileId && !uploadFile.fileId.startsWith('mock_')) {
        // Check if it's a MIDI file before parsing
        const extension = uploadFile.file.name.toLowerCase().split('.').pop();
        if (extension && ['mid', 'midi'].includes(extension)) {
          parseMidiMutation.mutate({ fileId: uploadFile.fileId });
        }
      } else {
        toast({
          title: "Upload Demo",
          description: "File uploaded successfully! This is demo mode - parsing not available yet.",
          variant: "default"
        });
      }
    },
    onUploadError: (uploadFile, error) => {
      toast({
        title: "Upload Failed",
        description: `${uploadFile.file.name}: ${error}`,
        variant: "destructive"
      });
    }
  });

  const deleteFileMutation = trpc.file.deleteFile.useMutation({
    onSuccess: () => {
      toast({ title: 'File deleted', description: 'The file was deleted.' });
      setDeleteFileId(null);
      refetchFiles();
    },
    onError: (error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      setDeleteFileId(null);
    },
    onSettled: () => setIsDeleting(false)
  });

  const handleDeleteFile = (fileId: string) => {
    setIsDeleting(true);
    deleteFileMutation.mutate({ fileId });
  };

  const handleFileUpload = async (files: File[]) => {
    const supportedFiles = files.filter((file: File) => {
      const ext = file.name.toLowerCase().split('.').pop();
      const midiExts = ['mid', 'midi'];
      const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
      const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
      
      return [...midiExts, ...audioExts, ...videoExts, ...imageExts].includes(ext || '');
    });

    if (supportedFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please select supported files (MIDI, audio, video, or image files)",
        variant: "destructive"
      });
      return;
    }

    await addAndUploadFiles(supportedFiles);
    setUploadExpanded(false);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const StatusBadge = ({ file }: { file: FileMetadata }) => {
    let text = 'Uploading';
    let statusClass = 'pending';
    
    if (file.upload_status === 'completed') {
      if (file.file_type === 'midi') {
        if (file.processing_status === 'completed') {
          text = 'Ready';
          statusClass = 'completed';
        } else if (file.processing_status === 'failed') {
          text = 'Parse Failed';
          statusClass = 'failed';
        } else {
          text = 'Processing';
          statusClass = 'pending';
        }
      } else {
        text = 'Ready';
        statusClass = 'completed';
      }
    } else if (file.upload_status === 'failed') {
      text = 'Upload Failed';
      statusClass = 'failed';
    }
    
    return (
      <div className={`parsing-status ${statusClass}`}>
        {statusClass === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
        {statusClass === 'completed' && <CheckCircle2 className="h-3 w-3" />}
        {statusClass === 'failed' && <AlertCircle className="h-3 w-3" />}
        {text}
      </div>
    );
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'midi': return <FileMusic className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'video': return <Play className="h-4 w-4" />;
      case 'image': return <Users className="h-4 w-4" />; // Using Users as placeholder for image
      default: return <FileMusic className="h-4 w-4" />;
    }
  };

  const userFiles = filesData?.files || [];

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-none font-mono text-xs flex flex-col min-h-0" style={{ maxHeight: 420, overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-700 bg-stone-900 text-stone-100">
        <h3 className="text-xs font-bold tracking-widest uppercase">{projectName ? `${projectName} - Files` : 'File Library'}</h3>
      </div>
      {/* File List with proper scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 320 }}>
        <div className="space-y-1 p-2">
          {filesError && <p className="text-red-400 text-xs">Error loading files.</p>}
          {!useDemoData && userFiles.length === 0 && !filesLoading && (
            <div className="text-center py-8 text-stone-400">
              <span className="text-2xl">📄</span>
              <p className="text-xs mt-1">No files uploaded yet</p>
            </div>
          )}
          {!useDemoData && userFiles.map((file: FileMetadata) => (
            <DraggableFile
              key={file.id}
              file={{
                id: file.id,
                name: file.file_name,
                file_type: file.file_type,
                file_size: file.file_size,
                uploading: file.upload_status === 'uploading',
              }}
              isSelected={selectedFileId === file.id}
              onClick={() => file.file_type === 'midi' && onFileSelected(file.id)}
              onDelete={() => setDeleteFileId(file.id)}
            />
          ))}
          {/* Demo data - only show when useDemoData is true */}
          {useDemoData && (
            <div className="flex items-center border border-stone-700 bg-stone-900 text-stone-100 font-mono text-xs h-8 px-2 gap-2 select-none" style={{ borderRadius: 2, minHeight: 32, maxHeight: 32 }}>
              <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">🎹</div>
              <div className="truncate flex-1 font-bold" title="Creative Demo.mid" style={{ maxWidth: 120 }}>Creative Demo.mid</div>
              <div className="uppercase tracking-widest px-1 border border-stone-700 bg-transparent" style={{ borderRadius: 1 }}>midi</div>
              <div className="text-[10px] text-stone-400 font-mono px-1">1 KB</div>
            </div>
          )}
        </div>
      </div>
      {/* Upload Zone */}
      {!useDemoData && (
        <div className="border-t border-stone-700 p-2 bg-stone-900">
          <div 
            className="w-full border-2 border-dashed border-stone-700 rounded-none text-center cursor-pointer hover:bg-stone-800 hover:text-stone-100 transition-colors py-2"
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <div className="text-lg">⬆️</div>
            <div className="font-bold">Upload Files</div>
            <div className="text-[10px]">MIDI, audio, video, or images</div>
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept=".mid,.midi,.mp3,.wav,.ogg,.m4a,.aac,.mp4,.mov,.avi,.mkv,.webm,.jpg,.jpeg,.png,.gif,.bmp,.webp"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  handleFileUpload(files);
                }
              }}
            />
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteFileId}
        onClose={() => setDeleteFileId(null)}
        onConfirm={() => deleteFileId && handleDeleteFile(deleteFileId)}
        title="Delete File?"
        description="Are you sure you want to delete this file? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
      />
    </div>
  );
} 