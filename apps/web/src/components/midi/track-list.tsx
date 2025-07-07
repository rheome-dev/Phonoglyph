'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';

interface MIDINote {
  id: string;
  start: number;
  duration: number;
  pitch: number;
  velocity: number;
  track: string;
  noteName: string;
}

interface MIDITrack {
  id: string;
  name: string;
  instrument: string;
  channel: number;
  notes: MIDINote[];
  color: string;
  visible: boolean;
}

interface VisualizationSettings {
  colorScheme: 'sage' | 'slate' | 'dusty-rose' | 'mixed';
  pixelsPerSecond: number;
  showTrackLabels: boolean;
  showVelocity: boolean;
  minKey: number;
  maxKey: number;
}

interface TrackListProps {
  tracks: MIDITrack[];
  selectedTracks: Set<string>;
  onTrackToggle: (trackId: string) => void;
  settings: VisualizationSettings;
}

export function TrackList({ 
  tracks, 
  selectedTracks, 
  onTrackToggle, 
  settings 
}: TrackListProps) {
  
  // Get track statistics
  const getTrackStats = (track: MIDITrack) => {
    const noteCount = track.notes.length;
    const avgVelocity = track.notes.length > 0 
      ? Math.round(track.notes.reduce((sum, note) => sum + note.velocity, 0) / track.notes.length)
      : 0;
    
    const duration = track.notes.length > 0
      ? Math.max(...track.notes.map(note => note.start + note.duration))
      : 0;

    return { noteCount, avgVelocity, duration };
  };

  // Truncate long track/instrument names
  const truncateName = (name: string, maxLength: number = 20) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
  };

  return (
    <div className="track-list w-full h-full bg-white/70 backdrop-blur-sm overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white/80">
        <h4 className="font-semibold text-gray-900 text-sm">Tracks</h4>
        <div className="text-xs text-gray-500 mt-1">
          {tracks.filter(t => selectedTracks.has(t.id)).length} of {tracks.length} visible
        </div>
      </div>

      {/* Track list */}
      <div className="p-2 space-y-2">
        {tracks.map((track, index) => {
          const isSelected = selectedTracks.has(track.id);
          const stats = getTrackStats(track);
          
          return (
            <div
              key={track.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-blue-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => onTrackToggle(track.id)}
            >
              {/* Track header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  {/* Track name */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {truncateName(track.name || `Track ${index + 1}`)}
                    </span>
                  </div>
                  
                  {/* Instrument */}
                  <div className="text-xs text-gray-600 mt-1 truncate">
                    {truncateName(track.instrument)}
                  </div>
                </div>

                {/* Visibility toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrackToggle(track.id);
                  }}
                >
                  {isSelected ? (
                    <Eye className="h-4 w-4 text-blue-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>

              {/* Track statistics */}
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="secondary" className="text-xs">
                  Ch {track.channel}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats.noteCount} notes
                </Badge>
                {stats.avgVelocity > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Vel {stats.avgVelocity}
                  </Badge>
                )}
              </div>

              {/* Duration bar */}
              {stats.duration > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: track.color,
                        width: `${Math.min(100, (stats.duration / 60) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.duration.toFixed(1)}s
                  </div>
                </div>
              )}

              {/* Additional track info when selected */}
              {isSelected && settings.showTrackLabels && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Channel: {track.channel}</div>
                    <div>Notes: {stats.noteCount}</div>
                    {stats.avgVelocity > 0 && (
                      <div>Avg Velocity: {stats.avgVelocity}</div>
                    )}
                    <div>Duration: {stats.duration.toFixed(2)}s</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t border-gray-200 bg-white/80">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              tracks.forEach(track => {
                if (!selectedTracks.has(track.id)) {
                  onTrackToggle(track.id);
                }
              });
            }}
            className="flex-1 text-xs"
          >
            Show All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              tracks.forEach(track => {
                if (selectedTracks.has(track.id)) {
                  onTrackToggle(track.id);
                }
              });
            }}
            className="flex-1 text-xs"
          >
            Hide All
          </Button>
        </div>
      </div>
    </div>
  );
} 