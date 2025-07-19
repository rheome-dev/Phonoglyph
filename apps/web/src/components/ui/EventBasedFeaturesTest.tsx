'use client';

import React, { useState } from 'react';
import { MappingSourcesPanel } from './MappingSourcesPanel';
import { useEventBasedMapping } from '@/hooks/use-event-based-mapping';

interface EventBasedFeaturesTestProps {
  projectId: string;
  trackId?: string;
  stemType?: string;
}

export function EventBasedFeaturesTest({ 
  projectId, 
  trackId = 'test-track', 
  stemType = 'drums' 
}: EventBasedFeaturesTestProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { audioEventData, extractAudioEvents, isLoading } = useEventBasedMapping({ 
    projectId, 
    autoSync: false 
  });

  const handleExtractEvents = async () => {
    try {
      await extractAudioEvents('test-file-id', stemType, false);
    } catch (error) {
      console.error('Failed to extract events:', error);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      // Simulate playback time progression
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime > 30) { // 30 seconds max
            setIsPlaying(false);
            clearInterval(interval);
            return 0;
          }
          return newTime;
        });
      }, 100);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-black border border-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Event-Based Features Test</h3>
        
        {/* Controls */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleExtractEvents}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Extracting...' : 'Extract Events'}
          </button>
          
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <div className="flex items-center gap-2 text-white">
            <span>Time: {currentTime.toFixed(1)}s</span>
            <span>|</span>
            <span>Status: {isPlaying ? 'Playing' : 'Stopped'}</span>
          </div>
        </div>

        {/* Event Data Status */}
        <div className="mb-4 p-3 bg-gray-900 rounded">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Event Data Status:</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Has Event Data: {audioEventData ? 'Yes' : 'No'}</div>
            {audioEventData && (
              <>
                <div>Transients: {audioEventData.transients?.length || 0}</div>
                <div>Chroma Events: {audioEventData.chroma?.length || 0}</div>
                <div>Total Events: {audioEventData.eventCount || 0}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Event-Based Features Panel */}
      <div className="w-80">
        <MappingSourcesPanel
          activeTrackId={trackId}
          selectedStemType={stemType}
          currentTime={currentTime}
          isPlaying={isPlaying}
          projectId={projectId}
        />
      </div>
    </div>
  );
} 