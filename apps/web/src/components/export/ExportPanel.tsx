'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, X, Play, Settings, Video, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ExportConfigDialog } from './ExportConfigDialog';
import { ExportJobStatus } from './ExportJobStatus';
import { ExportHistoryItem } from './ExportHistoryItem';
import { formatFileSize, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';

interface ExportPanelProps {
  compositionId: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ compositionId }) => {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  
  const { data: presets, isLoading: presetsLoading } = trpc.export.getPresets.useQuery();
  const { data: exportHistory, refetch: refetchHistory } = trpc.export.getExportHistory.useQuery({
    limit: 10
  });
  const { data: activeExports, refetch: refetchActive } = trpc.export.getActiveExports.useQuery();
  
  const exportMutation = trpc.export.queueExport.useMutation({
    onSuccess: (data) => {
      setActiveJobs(prev => [...prev, data.jobId]);
      refetchHistory();
      refetchActive();
      toast.success('Export job queued successfully! 🎬');
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    }
  });
  
  const batchExportMutation = trpc.export.batchExport.useMutation({
    onSuccess: (data) => {
      setActiveJobs(prev => [...prev, ...data.jobIds]);
      refetchHistory();
      refetchActive();
      toast.success(`${data.successCount} export jobs queued! 🚀`);
    },
    onError: (error) => {
      toast.error(`Batch export failed: ${error.message}`);
    }
  });
  
  const handleQuickExport = (presetId: string) => {
    const preset = presets?.presets.find(p => p.id === presetId);
    if (preset) {
      exportMutation.mutate({
        compositionId,
        config: preset
      });
    }
  };
  
  const handleBatchExport = () => {
    batchExportMutation.mutate({
      compositionId,
      presets: ['youtube_1080p', 'instagram_square', 'tiktok_vertical']
    });
  };
  
  // Auto-refresh active jobs every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeExports?.jobs && activeExports.jobs.length > 0) {
        refetchActive();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [activeExports?.jobs, refetchActive]);
  
  if (presetsLoading) {
    return (
      <Card className="bg-stone-200/90 backdrop-blur-md border-stone-400">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-stone-600">Loading export options...</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="bg-stone-200/90 backdrop-blur-md border-stone-400">
        <CardHeader>
          <CardTitle className="text-stone-700 uppercase tracking-wide text-sm flex items-center gap-2">
            <Video size={16} />
            Export Video
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Quick Export Presets */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-stone-600 uppercase tracking-wide">
              Quick Export
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => handleQuickExport('youtube_1080p')}
                disabled={exportMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play size={12} className="mr-1" />
                )}
                YouTube 1080p
              </Button>
              <Button
                size="sm"
                onClick={() => handleQuickExport('instagram_square')}
                disabled={exportMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700 text-white transition-colors"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play size={12} className="mr-1" />
                )}
                Instagram Square
              </Button>
              <Button
                size="sm"
                onClick={() => handleQuickExport('tiktok_vertical')}
                disabled={exportMutation.isPending}
                className="bg-black hover:bg-gray-800 text-white transition-colors"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Play size={12} className="mr-1" />
                )}
                TikTok Vertical
              </Button>
              <Button
                size="sm"
                onClick={() => setIsConfigDialogOpen(true)}
                variant="outline"
                className="border-stone-400 hover:bg-stone-100 transition-colors"
              >
                <Settings size={12} className="mr-1" />
                Custom
              </Button>
            </div>
            
            <Button
              size="sm"
              onClick={handleBatchExport}
              disabled={batchExportMutation.isPending}
              variant="outline"
              className="w-full border-stone-400 hover:bg-stone-100 transition-colors"
            >
              {batchExportMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Video size={12} className="mr-2" />
              )}
              Export All Formats
            </Button>
          </div>
          
          {/* Active Jobs */}
          {activeExports?.jobs && activeExports.jobs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-stone-600 uppercase tracking-wide flex items-center justify-between">
                Export Progress
                <Badge variant="secondary" className="text-xs">
                  {activeExports.count} active
                </Badge>
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeExports.jobs.map(job => (
                  <ExportJobStatus key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          
          {/* Export History */}
          {exportHistory && exportHistory.jobs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-stone-600 uppercase tracking-wide">
                Recent Exports
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {exportHistory.jobs.slice(0, 5).map(job => (
                  <ExportHistoryItem key={job.id} job={job} />
                ))}
              </div>
              {exportHistory.jobs.length > 5 && (
                <p className="text-xs text-stone-500 text-center">
                  + {exportHistory.jobs.length - 5} more exports
                </p>
              )}
            </div>
          )}
          
          {/* Empty State */}
          {(!activeExports?.jobs || activeExports.jobs.length === 0) &&
           (!exportHistory?.jobs || exportHistory.jobs.length === 0) && (
            <div className="text-center py-6">
              <Video className="w-12 h-12 text-stone-400 mx-auto mb-2" />
              <p className="text-sm text-stone-600 mb-1">No exports yet</p>
              <p className="text-xs text-stone-500">
                Choose a preset above to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ExportConfigDialog
        isOpen={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        onExport={(config) => {
          exportMutation.mutate({ compositionId, config });
          setIsConfigDialogOpen(false);
        }}
        presets={presets}
      />
    </>
  );
};