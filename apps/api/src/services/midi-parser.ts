import MidiParser from 'midi-parser-js';
import { randomUUID } from 'crypto';
import { MIDIData, MIDINote, MIDITrack, TempoEvent, MIDIParsingResult } from 'phonoglyph-types';

// Color palette for track visualization
const TRACK_COLORS = [
  '#84a98c', // sage
  '#6b7c93', // slate  
  '#b08a8a', // dusty rose
  '#a8a29e', // warm gray
  '#8da3b0', // soft blue
];

/**
 * Convert MIDI note number to note name
 */
function midiNoteToName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

/**
 * Convert MIDI ticks to seconds
 */
function ticksToSeconds(ticks: number, ticksPerQuarter: number, microsecondsPerQuarter: number): number {
  return (ticks / ticksPerQuarter) * (microsecondsPerQuarter / 1000000);
}

/**
 * Extract tempo events from MIDI track
 */
function extractTempoEvents(tracks: any[], ticksPerQuarter: number): TempoEvent[] {
  const tempoEvents: TempoEvent[] = [];
  
  tracks.forEach(track => {
    track.event?.forEach((event: any) => {
      if (event.metaType === 81) { // Set Tempo meta event
        const microsecondsPerQuarter = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
        const bpm = Math.round(60000000 / microsecondsPerQuarter);
        
        tempoEvents.push({
          tick: event.deltaTime || 0,
          bpm,
          microsecondsPerQuarter
        });
      }
    });
  });
  
  // Default tempo if none found
  if (tempoEvents.length === 0) {
    tempoEvents.push({
      tick: 0,
      bpm: 120,
      microsecondsPerQuarter: 500000
    });
  }
  
  return tempoEvents.sort((a, b) => a.tick - b.tick);
}

/**
 * Parse MIDI buffer and extract structured data
 */
export async function parseMidiFile(buffer: Buffer, filename: string): Promise<MIDIParsingResult> {
  try {
    // Parse MIDI file
    const midiData = MidiParser.parse(buffer);
    
    if (!midiData || !midiData.track) {
      return {
        success: false,
        error: 'Invalid MIDI file format'
      };
    }

    const ticksPerQuarter = midiData.timeDivision || 480;
    const tempoEvents = extractTempoEvents(midiData.track, ticksPerQuarter);
    const defaultTempo = tempoEvents[0]?.microsecondsPerQuarter || 500000;

    // Process tracks and extract notes
    const tracks: MIDITrack[] = [];
    let totalDuration = 0;
    
    midiData.track.forEach((track: any, trackIndex: number) => {
      const notes: MIDINote[] = [];
      const noteOnEvents: Map<string, any> = new Map(); // key: `${channel}-${note}`
      let currentTick = 0;
      
      // Get track name from meta events
      let trackName = `Track ${trackIndex + 1}`;
      let instrumentName = 'Unknown';
      
      track.event?.forEach((event: any) => {
        currentTick += event.deltaTime || 0;
        
        // Track name meta event
        if (event.metaType === 3 && event.data) {
          const nameChars = String.fromCharCode(...event.data);
          if (nameChars && nameChars.trim()) {
            trackName = nameChars.trim();
          }
        }
        
        // Program change event (instrument)
        if (event.type === 12 && event.data) {
          instrumentName = `Program ${event.data[0] || 0}`;
        }
        
        // Note On event
        if (event.type === 9 && event.data && event.data[1] > 0) {
          const noteKey = `${event.channel}-${event.data[0]}`;
          noteOnEvents.set(noteKey, {
            ...event,
            tick: currentTick
          });
        }
        
        // Note Off event (or Note On with velocity 0)
        if ((event.type === 8) || (event.type === 9 && event.data && event.data[1] === 0)) {
          const noteKey = `${event.channel}-${event.data[0]}`;
          const noteOnEvent = noteOnEvents.get(noteKey);
          
          if (noteOnEvent && noteOnEvent.data) {
            const startTime = ticksToSeconds(noteOnEvent.tick, ticksPerQuarter, defaultTempo);
            const endTime = ticksToSeconds(currentTick, ticksPerQuarter, defaultTempo);
            const duration = endTime - startTime;
            
            notes.push({
              id: randomUUID(),
              track: trackIndex,
              channel: noteOnEvent.channel || 0,
              note: noteOnEvent.data[0],
              pitch: noteOnEvent.data[0], // Same as note for web compatibility
              velocity: noteOnEvent.data[1],
              startTime,
              start: startTime, // Same as startTime for web compatibility
              duration,
              name: midiNoteToName(noteOnEvent.data[0])
            });
            
            noteOnEvents.delete(noteKey);
            totalDuration = Math.max(totalDuration, endTime);
          }
        }
      });
      
      // Only add tracks that have notes
      if (notes.length > 0) {
        tracks.push({
          id: randomUUID(),
          name: trackName,
          instrument: instrumentName,
          channel: trackIndex,
          notes,
          color: TRACK_COLORS[trackIndex % TRACK_COLORS.length] || '#84a98c'
        });
      }
    });

    const result: MIDIData = {
      file: {
        name: filename,
        size: buffer.length,
        duration: totalDuration,
        ticksPerQuarter,
        timeSignature: [4, 4], // Default, could be extracted from meta events
        keySignature: 'C major' // Default, could be extracted from meta events
      },
      tracks,
      tempoChanges: tempoEvents
    };

    return {
      success: true,
      data: result
    };

  } catch (error) {
    console.error('MIDI parsing error:', error);
    return {
      success: false,
      error: `Failed to parse MIDI file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate MIDI file buffer
 */
export function validateMidiBuffer(buffer: Buffer): boolean {
  // Check for MIDI header signature "MThd"
  if (buffer.length < 4) return false;
  
  const header = buffer.subarray(0, 4).toString('ascii');
  return header === 'MThd';
} 