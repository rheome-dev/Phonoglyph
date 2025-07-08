import type { MIDIData, MIDINote } from '../types';

export interface MIDITimelineSync {
  frame: number;
  time: number;
  activeNotes: MIDINote[];
  tempo: number;
  timeSignature: [number, number];
}

export function getMIDIDataAtFrame(
  midiData: MIDIData,
  frame: number,
  fps: number
): MIDITimelineSync {
  const time = frame / fps;
  
  // Find active notes at current time
  const activeNotes = midiData.tracks.flatMap(track =>
    track.notes.filter(note => 
      note.time <= time && (note.time + note.duration) > time
    )
  );
  
  // Get tempo and time signature at current time
  const tempoChange = midiData.tempoChanges
    .slice()
    .reverse()
    .find(change => change.time <= time);
    
  const timeSignatureChange = midiData.timeSignatures
    .slice()
    .reverse()
    .find(change => change.time <= time);
  
  return {
    frame,
    time,
    activeNotes,
    tempo: tempoChange?.bpm || 120,
    timeSignature: timeSignatureChange?.timeSignature || [4, 4]
  };
}