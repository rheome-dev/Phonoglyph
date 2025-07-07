'use client';

import React, { useRef, useCallback } from 'react';

interface TempoChange {
  tick: number;
  bpm: number;
  microsecondsPerQuarter: number;
}

interface MidiTimelineProps {
  duration: number;
  currentTime: number;
  pixelsPerSecond: number;
  zoom: number;
  tempoChanges: TempoChange[];
  onTimeChange: (time: number) => void;
}

export function MidiTimeline({
  duration,
  currentTime,
  pixelsPerSecond,
  zoom,
  tempoChanges,
  onTimeChange
}: MidiTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const width = Math.max(1200, duration * pixelsPerSecond * zoom);

  // Convert time to X position
  const timeToX = useCallback((time: number) => {
    return time * pixelsPerSecond * zoom;
  }, [pixelsPerSecond, zoom]);

  // Convert X position to time
  const xToTime = useCallback((x: number) => {
    return x / (pixelsPerSecond * zoom);
  }, [pixelsPerSecond, zoom]);

  // Handle timeline click
  const handleTimelineClick = useCallback((event: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = xToTime(x);
    
    onTimeChange(Math.max(0, Math.min(duration, time)));
  }, [xToTime, onTimeChange, duration]);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Generate time markers
  const generateTimeMarkers = useCallback(() => {
    const markers = [];
    const interval = zoom > 2 ? 1 : zoom > 1 ? 5 : 10; // Adjust interval based on zoom
    
    for (let time = 0; time <= duration; time += interval) {
      const x = timeToX(time);
      const isMinute = time % 60 === 0;
      
      markers.push({
        time,
        x,
        label: formatTime(time),
        isMajor: isMinute || interval <= 1
      });
    }
    
    return markers;
  }, [duration, zoom, timeToX, formatTime]);

  const timeMarkers = generateTimeMarkers();

  return (
    <div 
      ref={timelineRef}
      className="midi-timeline relative w-full h-full bg-white/80 backdrop-blur-sm overflow-hidden cursor-pointer"
      style={{ width: `${width}px` }}
      onClick={handleTimelineClick}
    >
      {/* Time markers */}
      <div className="absolute inset-0">
        {timeMarkers.map((marker, index) => (
          <div
            key={index}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${marker.x}px` }}
          >
            {/* Tick mark */}
            <div
              className={`bg-gray-400 ${
                marker.isMajor ? 'w-0.5 h-4' : 'w-px h-2'
              }`}
            />
            
            {/* Time label */}
            {marker.isMajor && (
              <span className="text-xs text-gray-600 font-mono mt-1 select-none">
                {marker.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tempo changes */}
      <div className="absolute top-0 w-full h-full">
        {tempoChanges.map((tempoChange, index) => {
          // Convert tick to time (simplified - would need actual conversion)
          const time = (tempoChange.tick / 480) * (60 / 120); // Assuming 480 PPQ and 120 BPM base
          const x = timeToX(time);
          
          return (
            <div
              key={index}
              className="absolute top-0 flex flex-col items-center group"
              style={{ left: `${x}px` }}
            >
              {/* Tempo marker */}
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-1" />
              
              {/* Tempo tooltip */}
              <div className="absolute top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {tempoChange.bpm} BPM
              </div>
            </div>
          );
        })}
      </div>

      {/* Current time indicator */}
      <div
        className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
        style={{ left: `${timeToX(currentTime)}px` }}
      >
        {/* Playhead triangle */}
        <div className="absolute -top-1 -left-1 w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-red-500" />
        
        {/* Current time label */}
        <div className="absolute top-5 -left-8 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Background grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        {timeMarkers
          .filter(marker => marker.isMajor)
          .map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 w-px h-full bg-gray-200"
              style={{ left: `${marker.x}px` }}
            />
          ))}
      </div>

      {/* Hover time indicator */}
      <div className="absolute inset-0 group">
        <div className="absolute top-0 w-px h-full bg-blue-400 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
      </div>
    </div>
  );
} 