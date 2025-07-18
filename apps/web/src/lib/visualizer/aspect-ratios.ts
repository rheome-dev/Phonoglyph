import { AspectRatioConfig } from '@/types/visualizer';

export const ASPECT_RATIOS: Record<string, AspectRatioConfig> = {
  mobile: {
    id: 'mobile',
    name: 'Mobile',
    width: 9,
    height: 16,
    maxWidth: '400px',
    maxHeight: '711px',
    className: 'max-w-md'
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    width: 16,
    height: 9,
    maxWidth: '1280px',
    maxHeight: '720px',
    className: 'max-w-4xl'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    width: 1,
    height: 1,
    maxWidth: '600px',
    maxHeight: '600px',
    className: 'max-w-lg'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    width: 9,
    height: 16,
    maxWidth: '360px',
    maxHeight: '640px',
    className: 'max-w-sm'
  },
  landscape: {
    id: 'landscape',
    name: 'Landscape',
    width: 16,
    height: 10,
    maxWidth: '1600px',
    maxHeight: '1000px',
    className: 'max-w-5xl'
  }
};

export function getAspectRatioConfig(id: string): AspectRatioConfig {
  return ASPECT_RATIOS[id] || ASPECT_RATIOS.mobile;
}

export function calculateCanvasSize(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: AspectRatioConfig
): { width: number; height: number } {
  const { width: aspectWidth, height: aspectHeight } = aspectRatio;
  const aspectRatioValue = aspectWidth / aspectHeight;
  
  // Calculate maximum possible size within container
  const maxWidth = containerWidth;
  const maxHeight = containerHeight;
  
  // Calculate size maintaining aspect ratio
  let canvasWidth = maxWidth;
  let canvasHeight = maxWidth / aspectRatioValue;
  
  // If height exceeds container, scale down
  if (canvasHeight > maxHeight) {
    canvasHeight = maxHeight;
    canvasWidth = maxHeight * aspectRatioValue;
  }
  
  // Apply max constraints from aspect ratio config
  if (aspectRatio.maxWidth) {
    const maxWidthPx = parseInt(aspectRatio.maxWidth);
    if (canvasWidth > maxWidthPx) {
      canvasWidth = maxWidthPx;
      canvasHeight = maxWidthPx / aspectRatioValue;
    }
  }
  
  if (aspectRatio.maxHeight) {
    const maxHeightPx = parseInt(aspectRatio.maxHeight);
    if (canvasHeight > maxHeightPx) {
      canvasHeight = maxHeightPx;
      canvasWidth = maxHeightPx * aspectRatioValue;
    }
  }
  
  return {
    width: Math.floor(canvasWidth),
    height: Math.floor(canvasHeight)
  };
} 