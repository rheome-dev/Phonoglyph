import React from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Settings, 
  PictureInPicture2,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PreviewOverlayProps {
  isFullscreen: boolean;
  isPlaying: boolean;
  isPipMode: boolean;
  quality: 'draft' | 'medium' | 'high';
  syncStatus: 'excellent' | 'good' | 'poor' | 'critical';
  performanceScore: number;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onQualityChange: (quality: 'draft' | 'medium' | 'high') => void;
  onOpenSettings: () => void;
  className?: string;
}

export const PreviewOverlay: React.FC<PreviewOverlayProps> = ({
  isFullscreen,
  isPlaying,
  isPipMode,
  quality,
  syncStatus,
  performanceScore,
  onToggleFullscreen,
  onTogglePip,
  onQualityChange,
  onOpenSettings,
  className
}) => {
  const getSyncColor = (status: typeof syncStatus) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const getSyncIcon = (status: typeof syncStatus) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <Wifi className="h-3 w-3" />;
      case 'poor':
      case 'critical':
        return <WifiOff className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };
  
  const getPerformanceColor = (score: number) => {
    if (score >= 25) return 'text-green-400';
    if (score >= 20) return 'text-yellow-400';
    if (score >= 15) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getQualityBadgeVariant = (currentQuality: string, targetQuality: string) => {
    return currentQuality === targetQuality ? 'default' : 'outline';
  };
  
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Top Controls */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-auto">
        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Performance Indicator */}
          <Badge 
            variant="secondary" 
            className={`bg-black/70 backdrop-blur-sm border-stone-600 ${getPerformanceColor(performanceScore)}`}
          >
            <Activity className="h-3 w-3 mr-1" />
            {Math.round(performanceScore)}fps
          </Badge>
          
          {/* Sync Status */}
          <Badge 
            variant="secondary" 
            className={`bg-black/70 backdrop-blur-sm border-stone-600 ${getSyncColor(syncStatus)}`}
          >
            {getSyncIcon(syncStatus)}
            <span className="ml-1 capitalize">{syncStatus}</span>
          </Badge>
          
          {/* Quality Indicator */}
          <Badge 
            variant="secondary" 
            className="bg-black/70 backdrop-blur-sm border-stone-600 text-blue-400"
          >
            <span className="capitalize">{quality}</span>
          </Badge>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-center gap-1">
          {/* Picture-in-Picture Toggle */}
          <Button
            size="sm"
            variant={isPipMode ? "default" : "secondary"}
            onClick={onTogglePip}
            className="h-8 w-8 p-0 bg-black/70 backdrop-blur-sm border-stone-600 hover:bg-black/80"
          >
            <PictureInPicture2 className="h-4 w-4" />
          </Button>
          
          {/* Settings */}
          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenSettings}
            className="h-8 w-8 p-0 bg-black/70 backdrop-blur-sm border-stone-600 hover:bg-black/80"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {/* Fullscreen Toggle */}
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggleFullscreen}
            className="h-8 w-8 p-0 bg-black/70 backdrop-blur-sm border-stone-600 hover:bg-black/80"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Bottom Controls */}
      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-auto">
        {/* Quality Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
            Quality:
          </span>
          <Select value={quality} onValueChange={onQualityChange}>
            <SelectTrigger className="w-20 h-6 text-xs bg-black/70 backdrop-blur-sm border-stone-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black/90 backdrop-blur-sm border-stone-600">
              <SelectItem value="draft" className="text-white hover:bg-stone-700">
                Draft
              </SelectItem>
              <SelectItem value="medium" className="text-white hover:bg-stone-700">
                Medium
              </SelectItem>
              <SelectItem value="high" className="text-white hover:bg-stone-700">
                High
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Playback Status */}
        <div className="flex items-center gap-2">
          {isPlaying && (
            <Badge 
              variant="secondary" 
              className="bg-black/70 backdrop-blur-sm border-stone-600 text-green-400"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
              LIVE
            </Badge>
          )}
        </div>
      </div>
      
      {/* Center Play/Pause Indicator (only show when transitioning) */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* This would show play/pause animations */}
      </div>
    </div>
  );
};

export default PreviewOverlay;