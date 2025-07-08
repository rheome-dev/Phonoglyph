// Preset Browser UI for Story 5.3: Stem-based Visualization Control
// Interface for browsing, managing, and organizing visualization presets

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  VisualizationPreset,
  PRESET_CATEGORIES
} from '@/types/stem-visualization';
import {
  presetManager,
  PresetFilterOptions,
  PresetOperationResult,
  PresetUsageStats
} from '@/lib/preset-manager';

// Props for the preset browser
interface PresetBrowserProps {
  selectedPresetId?: string;
  onPresetSelect?: (preset: VisualizationPreset) => void;
  onPresetDelete?: (presetId: string) => void;
  onPresetDuplicate?: (preset: VisualizationPreset) => void;
  onPresetExport?: (presetIds: string[]) => void;
  showActions?: boolean;
  className?: string;
}

// Individual preset card component
interface PresetCardProps {
  preset: VisualizationPreset;
  isSelected?: boolean;
  isFavorite?: boolean;
  usageStats?: PresetUsageStats;
  onSelect?: () => void;
  onFavorite?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  showActions?: boolean;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isSelected = false,
  isFavorite = false,
  usageStats,
  onSelect,
  onFavorite,
  onDuplicate,
  onDelete,
  onExport,
  showActions = true
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatUsage = (count: number) => {
    if (count === 0) return 'Never used';
    if (count === 1) return '1 use';
    return `${count} uses`;
  };

  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`} onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{preset.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {preset.description}
            </CardDescription>
          </div>
          {showActions && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.();
                }}
                className="p-1 h-8 w-8"
              >
                {isFavorite ? '❤️' : '🤍'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Category and Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {PRESET_CATEGORIES[preset.category as keyof typeof PRESET_CATEGORIES] || preset.category}
            </Badge>
            {preset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {preset.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{preset.tags.length - 3} more
              </Badge>
            )}
          </div>

          {/* Usage and Date Info */}
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{formatUsage(usageStats?.usageCount || preset.usageCount || 0)}</span>
            <span>
              {preset.isDefault ? 'Default' : `Modified ${formatDate(preset.updatedAt || preset.createdAt)}`}
            </span>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.();
                }}
                className="flex-1"
              >
                📋 Duplicate
              </Button>
              {!preset.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  🗑️
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onExport?.();
                }}
              >
                📤
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main preset browser component
export const PresetBrowser: React.FC<PresetBrowserProps> = ({
  selectedPresetId,
  onPresetSelect,
  onPresetDelete,
  onPresetDuplicate,
  onPresetExport,
  showActions = true,
  className
}) => {
  const [presets, setPresets] = useState<VisualizationPreset[]>([]);
  const [filteredPresets, setFilteredPresets] = useState<VisualizationPreset[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [usageStats, setUsageStats] = useState<Map<string, PresetUsageStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'date' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Load presets and usage data
  const loadPresets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filterOptions: PresetFilterOptions = {
        category: selectedCategory === 'all' ? undefined : selectedCategory as any,
        searchTerm: searchTerm || undefined,
        sortBy,
        sortOrder,
        showDefaults: true,
        showCustom: true
      };

      const loadedPresets = await presetManager.getPresets(filterOptions);
      setPresets(loadedPresets);

      // Load usage stats
      const allStats = presetManager.getAllUsageStats();
      const statsMap = new Map();
      allStats.forEach(stat => statsMap.set(stat.presetId, stat));
      setUsageStats(statsMap);

      // Load favorites
      const favoriteSet = new Set<string>();
      loadedPresets.forEach(preset => {
        if (presetManager.isFavorite(preset.id)) {
          favoriteSet.add(preset.id);
        }
      });
      setFavorites(favoriteSet);

    } catch (err) {
      console.error('Error loading presets:', err);
      setError('Failed to load presets');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, sortBy, sortOrder]);

  // Apply client-side filtering (backup for complex filters)
  useEffect(() => {
    setFilteredPresets(presets);
  }, [presets]);

  // Load presets on mount and when filters change
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: VisualizationPreset) => {
    onPresetSelect?.(preset);
    
    // Record usage
    presetManager.recordUsage(preset.id, 0);
  }, [onPresetSelect]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (presetId: string) => {
    try {
      const isFavorited = await presetManager.toggleFavorite(presetId);
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (isFavorited) {
          newFavorites.add(presetId);
        } else {
          newFavorites.delete(presetId);
        }
        return newFavorites;
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, []);

  // Handle preset duplication
  const handleDuplicate = useCallback(async (preset: VisualizationPreset) => {
    try {
      const result = await presetManager.duplicatePreset(preset.id);
      if (result.success && result.preset) {
        await loadPresets(); // Refresh the list
        onPresetDuplicate?.(result.preset);
      } else {
        setError(result.message || 'Failed to duplicate preset');
      }
    } catch (error) {
      console.error('Error duplicating preset:', error);
      setError('Failed to duplicate preset');
    }
  }, [loadPresets, onPresetDuplicate]);

  // Handle preset deletion
  const handleDelete = useCallback(async (presetId: string) => {
    try {
      const result = await presetManager.deletePreset(presetId);
      if (result.success) {
        await loadPresets(); // Refresh the list
        onPresetDelete?.(presetId);
      } else {
        setError(result.message || 'Failed to delete preset');
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
      setError('Failed to delete preset');
    }
  }, [loadPresets, onPresetDelete]);

  // Handle single preset export
  const handleExport = useCallback(async (presetId: string) => {
    try {
      const exportData = await presetManager.exportPresets([presetId]);
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preset-${presetId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onPresetExport?.([presetId]);
    } catch (error) {
      console.error('Error exporting preset:', error);
      setError('Failed to export preset');
    }
  }, [onPresetExport]);

  // Get category options
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'favorites', label: '❤️ Favorites' },
    ...Object.entries(PRESET_CATEGORIES).map(([key, label]) => ({
      value: key,
      label
    })),
    { value: 'custom', label: 'Custom Presets' }
  ];

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading presets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📦 Preset Browser
          </CardTitle>
          <CardDescription>
            Browse and manage visualization presets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search presets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order</Label>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{filteredPresets.length} presets found</span>
              <span>•</span>
              <span>{favorites.size} favorites</span>
              <span>•</span>
              <span>{filteredPresets.filter(p => !p.isDefault).length} custom</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <span>⚠️</span>
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preset Grid */}
      {filteredPresets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🔍</div>
              <h3 className="font-medium text-lg mb-1">No presets found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isSelected={preset.id === selectedPresetId}
              isFavorite={favorites.has(preset.id)}
              usageStats={usageStats.get(preset.id)}
              onSelect={() => handlePresetSelect(preset)}
              onFavorite={() => handleFavoriteToggle(preset.id)}
              onDuplicate={() => handleDuplicate(preset)}
              onDelete={() => handleDelete(preset.id)}
              onExport={() => handleExport(preset.id)}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PresetBrowser;