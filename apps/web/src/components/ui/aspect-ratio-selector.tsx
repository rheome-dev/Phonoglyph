'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Monitor, Smartphone, Youtube, Instagram, Video } from 'lucide-react';
import { ASPECT_RATIOS } from '@/lib/visualizer/aspect-ratios';

interface AspectRatioSelectorProps {
  currentAspectRatio: string;
  onAspectRatioChange: (aspectRatio: string) => void;
  disabled?: boolean;
  className?: string;
}

const aspectRatioIcons: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="h-3 w-3" />,
  youtube: <Youtube className="h-3 w-3" />,
  instagram: <Instagram className="h-3 w-3" />,
  tiktok: <Video className="h-3 w-3" />,
  landscape: <Monitor className="h-3 w-3" />
};

const aspectRatioLabels: Record<string, string> = {
  mobile: 'MOB',
  youtube: 'YT',
  instagram: 'IG',
  tiktok: 'TT',
  landscape: 'LS'
};

export function AspectRatioSelector({
  currentAspectRatio,
  onAspectRatioChange,
  disabled = false,
  className
}: AspectRatioSelectorProps) {
  const currentConfig = ASPECT_RATIOS[currentAspectRatio] || ASPECT_RATIOS.mobile;
  const currentIcon = aspectRatioIcons[currentAspectRatio] || aspectRatioIcons.mobile;
  const currentLabel = aspectRatioLabels[currentAspectRatio] || 'MOB';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className={`bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:border-stone-500 font-mono text-xs uppercase tracking-wider px-2 py-1 ${className}`}
          style={{ borderRadius: '6px' }}
        >
          {currentIcon} {currentLabel}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-stone-800 border-stone-600 text-stone-300"
      >
        {Object.entries(ASPECT_RATIOS).map(([id, config]) => (
          <DropdownMenuItem
            key={id}
            onClick={() => onAspectRatioChange(id)}
            className={`text-xs font-mono uppercase tracking-wider hover:bg-stone-700 ${
              currentAspectRatio === id ? 'bg-stone-700 text-white' : 'text-stone-300'
            }`}
          >
            <span className="flex items-center gap-2">
              {aspectRatioIcons[id]}
              {config.name}
              <span className="text-stone-500 ml-auto">
                {config.width}:{config.height}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 