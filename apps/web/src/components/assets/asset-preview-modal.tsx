'use client';

import React from 'react';
// Simple Dialog components for now
const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => onOpenChange(false)}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
};
const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg shadow-lg ${className}`}>{children}</div>
);
const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 border-b">{children}</div>
);
const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>
);
const DialogFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-t ${className}`}>{children}</div>
);
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Download, ExternalLink, Calendar, FileText, Monitor } from 'lucide-react';

interface AssetPreviewModalProps {
  asset: any;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (asset: any) => void;
}

export function AssetPreviewModal({
  asset,
  isOpen,
  onClose,
  onSelect
}: AssetPreviewModalProps) {
  if (!asset) return null;

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileTypeColor = (fileType: string): string => {
    switch (fileType) {
      case 'video': return 'bg-purple-100 text-purple-800';
      case 'image': return 'bg-green-100 text-green-800';
      case 'audio': return 'bg-blue-100 text-blue-800';
      case 'midi': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderPreview = () => {
    switch (asset.file_type) {
      case 'video':
        if (asset.r2_url || asset.thumbnail_url) {
          return (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {asset.r2_url ? (
                <video
                  src={asset.r2_url}
                  controls
                  className="w-full h-full"
                  poster={asset.thumbnail_url}
                />
              ) : (
                <img
                  src={asset.thumbnail_url}
                  alt={asset.file_name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          );
        }
        break;
      
      case 'image':
        if (asset.r2_url || asset.thumbnail_url) {
          return (
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={asset.r2_url || asset.thumbnail_url}
                alt={asset.file_name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          );
        }
        break;
      
      case 'audio':
        return (
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-xl font-medium">Audio File</h3>
              {asset.r2_url && (
                <audio controls className="mt-4">
                  <source src={asset.r2_url} />
                </audio>
              )}
            </div>
          </div>
        );
      
      case 'midi':
        return (
          <div className="aspect-video bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🎹</div>
              <h3 className="text-xl font-medium">MIDI File</h3>
              <p className="text-sm opacity-90 mt-2">Musical Instrument Digital Interface</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-600">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-medium">Unknown File Type</h3>
            </div>
          </div>
        );
    }
  };

  const renderMetadata = () => {
    const metadata = [];

    // Basic file info
    metadata.push(
      <div key="basic" className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">File Type</div>
          <Badge className={getFileTypeColor(asset.file_type)}>
            {asset.file_type.toUpperCase()}
          </Badge>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">File Size</div>
          <div className="font-medium">{formatFileSize(asset.file_size)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Upload Date</div>
          <div className="font-medium">{new Date(asset.created_at).toLocaleDateString()}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">MIME Type</div>
          <div className="font-medium text-xs">{asset.mime_type}</div>
        </div>
      </div>
    );

    // Video metadata
    if (asset.file_type === 'video' && asset.video_metadata) {
      metadata.push(
        <div key="video" className="border-t pt-4">
          <h4 className="font-medium mb-3 text-gray-700">Video Properties</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Resolution</div>
              <div className="font-medium">
                {asset.video_metadata.width} × {asset.video_metadata.height}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Duration</div>
              <div className="font-medium">{formatDuration(asset.video_metadata.duration)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Frame Rate</div>
              <div className="font-medium">{asset.video_metadata.frameRate} fps</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Codec</div>
              <div className="font-medium">{asset.video_metadata.codec}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Aspect Ratio</div>
              <div className="font-medium">{asset.video_metadata.aspectRatio}</div>
            </div>
          </div>
        </div>
      );
    }

    // Image metadata
    if (asset.file_type === 'image' && asset.image_metadata) {
      metadata.push(
        <div key="image" className="border-t pt-4">
          <h4 className="font-medium mb-3 text-gray-700">Image Properties</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Dimensions</div>
              <div className="font-medium">
                {asset.image_metadata.width} × {asset.image_metadata.height}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Format</div>
              <div className="font-medium">{asset.image_metadata.fileFormat}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Color Profile</div>
              <div className="font-medium">{asset.image_metadata.colorProfile}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Has Alpha</div>
              <div className="font-medium">{asset.image_metadata.hasAlpha ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      );
    }

    return metadata;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-stone-200 border-stone-400">
        <DialogHeader>
          <DialogTitle className="text-stone-700 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {asset.file_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div>
            {renderPreview()}
          </div>

          {/* Metadata */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4 text-gray-700 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                File Information
              </h3>
              <div className="space-y-4">
                {renderMetadata()}
              </div>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {asset.processing_status && asset.processing_status !== 'completed' && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2 text-gray-700">Processing Status</h3>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={asset.processing_status === 'failed' ? 'destructive' : 'secondary'}
                  >
                    {asset.processing_status === 'pending' && '⏳ Pending'}
                    {asset.processing_status === 'processing' && '🔄 Processing'}
                    {asset.processing_status === 'failed' && '❌ Failed'}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {asset.processing_status === 'pending' && 'Waiting to process file...'}
                    {asset.processing_status === 'processing' && 'Extracting metadata and generating thumbnails...'}
                    {asset.processing_status === 'failed' && 'File processing failed. The file may still be usable.'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {asset.r2_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(asset.r2_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onSelect && (
              <Button 
                onClick={() => onSelect(asset)}
                className="bg-stone-600 hover:bg-stone-700"
              >
                Use in Composition
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}