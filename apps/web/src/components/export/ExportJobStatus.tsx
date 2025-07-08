'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, X, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ExportJob {
  id: string;
  userId: string;
  compositionId: string;
  config: {
    name: string;
    format: {
      container: string;
      preset: string;
    };
  };
  status: 'queued' | 'rendering' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  downloadUrl?: string;
  fileSize?: number;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

interface ExportJobStatusProps {
  job: ExportJob;
}

export const ExportJobStatus: React.FC<ExportJobStatusProps> = ({ job }) => {
  const cancelMutation = trpc.export.cancelJob.useMutation({
    onSuccess: () => {
      toast.success('Export cancelled successfully');
    },
    onError: (error) => {
      toast.error(`Failed to cancel export: ${error.message}`);
    }
  });
  
  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-600" />;
      case 'rendering':
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };
  
  const getStatusColor = () => {
    switch (job.status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      case 'rendering': return 'bg-blue-500';
      case 'uploading': return 'bg-purple-500';
      case 'queued': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getStatusText = () => {
    switch (job.status) {
      case 'queued': return 'Queued';
      case 'rendering': return `Rendering ${Math.round(job.progress * 100)}%`;
      case 'uploading': return 'Uploading...';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCancel = () => {
    cancelMutation.mutate({ jobId: job.id });
  };
  
  const handleDownload = () => {
    if (job.downloadUrl) {
      window.open(job.downloadUrl, '_blank');
    }
  };
  
  return (
    <div className="border border-stone-300 rounded-lg p-3 bg-stone-100/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span className="text-sm font-medium text-stone-700 truncate">
            {job.config.name}
          </span>
          <Badge 
            variant="secondary" 
            className={`text-xs text-white ${getStatusColor()}`}
          >
            {getStatusText()}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          {job.status === 'completed' && job.downloadUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="h-7 w-7 p-0 hover:bg-stone-200"
              title="Download"
            >
              <Download className="w-3 h-3" />
            </Button>
          )}
          
          {(job.status === 'queued' || job.status === 'rendering') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="h-7 w-7 p-0 hover:bg-red-100 text-red-600"
              title="Cancel"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      {(job.status === 'rendering' || job.status === 'uploading') && (
        <div className="mb-2">
          <Progress 
            value={job.progress * 100} 
            className="h-2 bg-stone-200"
          />
        </div>
      )}
      
      {/* File Info */}
      {job.status === 'completed' && (
        <div className="flex items-center justify-between text-xs text-stone-600">
          <span>{formatFileSize(job.fileSize)}</span>
          <span>{formatDuration(job.durationSeconds)}</span>
          <span className="text-stone-500">
            {new Date(job.completedAt!).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      )}
      
      {/* Error Message */}
      {job.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <div className="flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{job.error}</span>
          </div>
        </div>
      )}
      
      {/* Queue Position (for queued jobs) */}
      {job.status === 'queued' && (
        <div className="mt-1 text-xs text-stone-500">
          Waiting in queue...
        </div>
      )}
    </div>
  );
};