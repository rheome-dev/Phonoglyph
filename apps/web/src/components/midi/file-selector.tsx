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
    limit: 20,
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
    <div className="bg-stone-800/50 p-4 rounded-lg border border-white/10 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4" />
            {projectName ? `${projectName} - Files` : 'File Library'}
        </h3>
        {/* Hidden demo toggle - keep for debugging but don't show */}
        <div className="hidden items-center gap-2">
            <Switch 
            checked={useDemoData}
            onCheckedChange={onDemoModeChange}
            id="demo-mode"
            />
            <Label htmlFor="demo-mode" className="text-xs font-medium">
            Demo
            </Label>
        </div>
      </div>

      {/* File List with proper scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {filesLoading && (
          <div className="absolute inset-0 bg-stone-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-stone-400 mb-3" />
            <p className="text-stone-300 font-medium">Loading Project Files...</p>
            <p className="text-stone-400 text-xs mt-1">Please wait a moment.</p>
          </div>
        )}
        <div className="h-full overflow-y-auto space-y-2 pr-2">
        {filesError && <p className="text-red-400 text-xs">Error loading files.</p>}
        
        {!useDemoData && userFiles.length === 0 && !filesLoading && (
          <div className="text-center py-8 text-stone-400">
            <FileMusic className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {projectId ? 'No files in this project yet' : 'No files uploaded yet'}
            </p>
            <p className="text-xs mt-1">Upload files to get started</p>
          </div>
        )}
        
        {!useDemoData && userFiles.map((file: FileMetadata) => (
          <div
            key={file.id}
              className={`p-2 rounded-md cursor-pointer transition-colors flex-shrink-0 ${selectedFileId === file.id ? 'bg-stone-600/80' : 'hover:bg-stone-700/50'}`}
            onClick={() => file.file_type === 'midi' && onFileSelected(file.id)}
          >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                {getFileIcon(file.file_type)}
                  <span className="font-bold text-sm text-stone-200 truncate">{file.file_name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge file={file} />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteFileId(file.id); }} 
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-stone-400 mt-1 truncate">
              <span>{formatFileSize(file.file_size)}</span> | <span className="capitalize">{file.file_type}</span> | <span>{file.mime_type}</span>
            </div>
          </div>
        ))}
          
          {/* Demo data - only show when useDemoData is true */}
        {useDemoData && (
              <div className={`p-2 rounded-md flex-shrink-0 ${useDemoData ? 'bg-stone-600/80' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileMusic className="h-4 w-4" />
                  <span className="font-bold text-sm text-stone-200">Creative Demo.mid</span>
                </div>
                <div className="parsing-status completed">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </div>
              </div>
              <div className="text-xs text-stone-400 mt-1">
                <span>1 KB</span> | <span>MIDI</span> | <span>3 Tracks</span> | <span>29 Notes</span>
              </div>
            </div>
        )}
        </div>
      </div>

      {/* Upload Zone */}
      {!useDemoData && (
        <div className="mt-4 flex-shrink-0">
        <div 
            className="p-4 border-2 border-dashed border-stone-600 rounded-lg text-center cursor-pointer hover:border-stone-500 hover:bg-stone-700/30 transition-colors"
          onClick={() => document.getElementById('file-upload-input')?.click()}
        >
          <Upload className="h-6 w-6 mx-auto text-stone-500 mb-2" />
          <h4 className="text-sm font-semibold text-stone-300">Upload Files</h4>
          <p className="text-xs text-stone-500">MIDI, audio, video, or images</p>
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