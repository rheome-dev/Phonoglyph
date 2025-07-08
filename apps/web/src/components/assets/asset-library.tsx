'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { Search, Upload, Grid, List, Filter, Tag, Folder } from 'lucide-react';
import { AssetPreview } from './asset-preview';
import { AssetUploadZone } from './asset-upload-zone';
import { AssetPreviewModal } from './asset-preview-modal';
import { trpc } from '@/lib/trpc';

interface AssetLibraryProps {
  projectId: string;
  onAssetSelected?: (fileId: string) => void;
  selectedAssetId?: string;
  allowedTypes?: Array<'video' | 'image' | 'audio' | 'midi'>;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'video' | 'image' | 'audio' | 'midi';

export function AssetLibrary({
  projectId,
  onAssetSelected,
  selectedAssetId,
  allowedTypes = ['video', 'image', 'audio', 'midi']
}: AssetLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState<FilterType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);

  // Fetch assets with filters
  const { data: assetsData, refetch: refetchAssets, isLoading } = trpc.file.getProjectAssets.useQuery({
    projectId,
    assetType: assetFilter,
    folderId: selectedFolderId,
    tagIds: selectedTagIds,
    search: searchTerm || undefined,
    limit: 50
  });

  // Fetch folders
  const { data: folders } = trpc.file.getAssetFolders.useQuery({ projectId });

  // Fetch tags
  const { data: tags } = trpc.file.getAssetTags.useQuery({ projectId });

  // Fetch storage quota
  const { data: quota } = trpc.file.getStorageQuota.useQuery({ projectId });

  const assets = assetsData?.files || [];
  const filteredAssets = assets.filter(asset => 
    allowedTypes.includes(asset.file_type as any)
  );

  const handleAssetClick = useCallback((asset: any) => {
    setPreviewAsset(asset);
  }, []);

  const handleAssetSelect = useCallback((asset: any) => {
    onAssetSelected?.(asset.id);
    setPreviewAsset(null);
  }, [onAssetSelected]);

  const handleUploadComplete = useCallback(() => {
    refetchAssets();
    setShowUploadZone(false);
  }, [refetchAssets]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const formatStorageSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getStoragePercentage = (): number => {
    if (!quota) return 0;
    return Math.round((quota.usedBytes / quota.totalLimitBytes) * 100);
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="bg-stone-200/90 backdrop-blur-md border-stone-400 flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-stone-700 uppercase tracking-wide text-sm">
              Media Assets
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="h-8 w-8 p-0"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setShowUploadZone(true)}
                size="sm"
                className="bg-stone-600 hover:bg-stone-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          {/* Storage Quota */}
          {quota && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Storage Used</span>
                <span>{formatStorageSize(quota.usedBytes)} / {formatStorageSize(quota.totalLimitBytes)}</span>
              </div>
              <div className="w-full bg-stone-300 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    getStoragePercentage() > 90 ? 'bg-red-500' : 
                    getStoragePercentage() > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${getStoragePercentage()}%` }}
                />
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 h-4 w-4" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-stone-100 border-stone-300"
              />
            </div>

            <div className="flex gap-2">
              <Select value={assetFilter} onValueChange={(value: FilterType) => setAssetFilter(value)}>
                <SelectTrigger className="w-32 bg-stone-100 border-stone-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {allowedTypes.includes('video') && <SelectItem value="video">Videos</SelectItem>}
                  {allowedTypes.includes('image') && <SelectItem value="image">Images</SelectItem>}
                  {allowedTypes.includes('audio') && <SelectItem value="audio">Audio</SelectItem>}
                  {allowedTypes.includes('midi') && <SelectItem value="midi">MIDI</SelectItem>}
                </SelectContent>
              </Select>

              {folders && folders.length > 0 && (
                <Select value={selectedFolderId || 'all'} onValueChange={(value) => setSelectedFolderId(value === 'all' ? undefined : value)}>
                  <SelectTrigger className="w-40 bg-stone-100 border-stone-300">
                    <Folder className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Folders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Folders</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-stone-600">
                  <Tag className="h-3 w-3" />
                  <span>Filter by tags:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      style={{ 
                        backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : undefined,
                        borderColor: tag.color
                      }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {showUploadZone ? (
            <AssetUploadZone
              projectId={projectId}
              allowedTypes={allowedTypes}
              onUploadComplete={handleUploadComplete}
              onCancel={() => setShowUploadZone(false)}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-stone-600">Loading assets...</div>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center text-stone-600 py-8">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-lg mb-2">No assets found</p>
                  <p className="text-sm mb-4">
                    {searchTerm || assetFilter !== 'all' || selectedFolderId || selectedTagIds.length > 0
                      ? 'Try adjusting your filters or search terms'
                      : 'Upload videos, images, or other media to get started'
                    }
                  </p>
                  {!searchTerm && assetFilter === 'all' && !selectedFolderId && selectedTagIds.length === 0 && (
                    <Button 
                      onClick={() => setShowUploadZone(true)}
                      className="bg-stone-600 hover:bg-stone-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First Asset
                    </Button>
                  )}
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                    : "space-y-2"
                }>
                  {filteredAssets.map((asset) => (
                    <AssetPreview
                      key={asset.id}
                      file={asset}
                      onSelect={handleAssetClick}
                      className={
                        selectedAssetId === asset.id 
                          ? 'ring-2 ring-stone-600 bg-stone-300' 
                          : ''
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Preview Modal */}
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          isOpen={!!previewAsset}
          onClose={() => setPreviewAsset(null)}
          onSelect={handleAssetSelect}
        />
      )}
    </div>
  );
}