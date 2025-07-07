'use client';

import React, { useMemo } from 'react';

interface PianoKeysProps {
  minKey: number;
  maxKey: number;
  height: number;
  scrollY: number;
}

interface KeyInfo {
  midiNumber: number;
  name: string;
  octave: number;
  type: 'white' | 'black';
  y: number;
}

export function PianoKeys({ minKey, maxKey, height, scrollY }: PianoKeysProps) {
  // Generate key information
  const keys = useMemo(() => {
    const keyInfos: KeyInfo[] = [];
    
    for (let midiNumber = maxKey; midiNumber >= minKey; midiNumber--) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteIndex = midiNumber % 12;
      const octave = Math.floor(midiNumber / 12) - 1;
      const name = noteNames[noteIndex];
      const type = [1, 3, 6, 8, 10].includes(noteIndex) ? 'black' : 'white';
      const y = (maxKey - midiNumber) * 12;
      
      keyInfos.push({
        midiNumber,
        name,
        octave,
        type,
        y
      });
    }
    
    return keyInfos;
  }, [minKey, maxKey]);

  // Get note name with octave
  const getFullNoteName = (key: KeyInfo) => {
    return `${key.name}${key.octave}`;
  };

  // Check if key is a C note (for labeling)
  const isCNote = (key: KeyInfo) => {
    return key.name === 'C';
  };

  return (
    <div 
      className="piano-keys relative w-full bg-gradient-to-r from-gray-100 to-gray-50 border-r border-gray-200"
      style={{ height: `${height}px` }}
    >
      {/* Piano key visualization */}
      <div className="absolute inset-0">
        {keys.map((key) => (
          <div
            key={key.midiNumber}
            className={`absolute left-0 right-0 h-3 border-b border-gray-300 flex items-center justify-end pr-2 text-xs font-mono select-none ${
              key.type === 'white'
                ? 'bg-white hover:bg-gray-50'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            } ${
              isCNote(key) ? 'border-b-2 border-blue-400' : ''
            }`}
            style={{
              top: `${key.y}px`,
              height: '12px'
            }}
          >
            {/* Note name - only show for white keys or C notes */}
            {(key.type === 'white' || isCNote(key)) && (
              <span className={`text-xs ${
                key.type === 'black' ? 'text-white' : 'text-gray-600'
              }`}>
                {isCNote(key) ? getFullNoteName(key) : key.name}
              </span>
            )}
            
            {/* MIDI number for reference */}
            <span className={`ml-1 text-xs opacity-50 ${
              key.type === 'black' ? 'text-gray-300' : 'text-gray-400'
            }`}>
              {key.midiNumber}
            </span>
          </div>
        ))}
      </div>

      {/* Octave markers on the left */}
      <div className="absolute left-0 top-0 w-6 h-full bg-gray-200 border-r border-gray-300">
        {keys
          .filter(key => isCNote(key))
          .map((key) => (
            <div
              key={`octave-${key.octave}`}
              className="absolute left-0 w-full flex items-center justify-center text-xs font-bold text-gray-700"
              style={{
                top: `${key.y}px`,
                height: '12px'
              }}
            >
              {key.octave}
            </div>
          ))}
      </div>

      {/* Key range indicator */}
      <div className="absolute bottom-0 left-0 right-0 p-1 bg-gray-100 border-t border-gray-300">
        <div className="text-xs text-gray-600 font-mono text-center">
          {minKey}-{maxKey}
        </div>
      </div>

      {/* Hover effects and interactions */}
      <style jsx>{`
        .piano-keys {
          user-select: none;
        }
        
        .piano-keys > div:hover {
          z-index: 10;
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
} 