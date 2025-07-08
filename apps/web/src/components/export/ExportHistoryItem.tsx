'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
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

interface ExportHistoryItemProps {
  job: ExportJob;
}

export const ExportHistoryItem: React.FC<ExportHistoryItemProps> = ({ job }) => {
  const reExportMutation = trpc.export.reExport.useMutation({
    onSuccess: () => {
      toast.success('Re-export queued successfully! 🎬');
    },
    onError: (error) => {
      toast.error(`Re-export failed: ${error.message}`);
    }
  });
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };
  
  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return null;
    }
  };
  
  const handleDownload = () => {
    if (job.downloadUrl) {
      window.open(job.downloadUrl, '_blank');
    }
  };
  
  const handleReExport = () => {
    reExportMutation.mutate({
      originalJobId: job.id
    });
  };
  
  return (
    <div className="flex items-center justify-between p-2 border border-stone-200 rounded bg-stone-50/50 hover:bg-stone-100/50 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-700 truncate">
              {job.config.name}
            </span>
            <span className="text-xs text-stone-500">
              {formatTimeAgo(job.completedAt || job.createdAt)}
            </span>
          </div>
          {job.status === 'completed' && job.fileSize && (
            <div className="text-xs text-stone-500">
              {formatFileSize(job.fileSize)}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 ml-2">
        {job.status === 'completed' && job.downloadUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-6 w-6 p-0 hover:bg-stone-200"
            title="Download"
          >
            <Download className="w-3 h-3" />
          </Button>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReExport}
          disabled={reExportMutation.isPending}
          className="h-6 w-6 p-0 hover:bg-stone-200"
          title="Re-export"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};