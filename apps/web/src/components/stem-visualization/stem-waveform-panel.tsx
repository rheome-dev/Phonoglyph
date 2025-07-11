'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Music, ChevronDown, ChevronUp } from 'lucide-react';
import { useCachedStemAnalysis } from '@/hooks/use-cached-stem-analysis';
import { StemWaveform } from './stem-waveform';
import { cn } from '@/lib/utils';

interface StemWaveformPanelProps {
  stems: Array<{
    id: string;
    file_name: string;
    // Add any other fields you need from the audio file object
  }>;
  currentTime: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  className?: string;
}

export const StemWaveformPanel: React.FC<StemWaveformPanelProps> = ({
  stems,
  currentTime,
  isPlaying,
  onSeek,
  className
}) => {
  const { cachedAnalysis, isLoading, error, loadAnalysis } = useCachedStemAnalysis();

  useEffect(() => {
    if (stems && stems.length > 0) {
      loadAnalysis(stems.map(s => s.id));
    }
  }, [stems, loadAnalysis]);

  return (
    <Card className={cn("bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="space-y-0">
          {stems.map((stem) => {
            const stemType = stem.file_name.toLowerCase().replace(/\.[^/.]+$/, '');
            const analysisResult = cachedAnalysis.find(a => a.fileMetadataId === stem.id);
            
            return (
              <div key={stem.id} className="flex items-center group bg-black/20">
                <div className="w-32 px-3 py-2 text-right border-r border-gray-700">
                  <span className="text-sm font-semibold text-gray-300 truncate group-hover:text-white">
                    {stemType}
                  </span>
                </div>
                <div className="flex-1">
                  {isLoading && <div className="text-xs text-gray-400 px-4">Loading analysis...</div>}
                  {error && <div className="text-xs text-red-400 px-4">Error: {error}</div>}
                  {analysisResult && (
                    <StemWaveform
                      stemType={stemType}
                      waveformData={analysisResult.waveformData}
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      onSeek={onSeek}
                    />
                  )}
                  {!analysisResult && !isLoading && !error && (
                    <div className="h-[50px] flex items-center justify-center">
                      <span className="text-xs text-gray-500">No analysis data available.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}; 