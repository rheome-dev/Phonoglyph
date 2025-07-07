export interface MIDINote {
  id: string;
  track: number;
  channel: number;
  note: number;        // MIDI note number (0-127)
  velocity: number;    // Note velocity (0-127)
  startTime: number;   // Time in ticks or seconds
  duration: number;    // Note duration
  name: string;        // Note name (e.g., "C4")
}

export interface TempoEvent {
  tick: number;
  bpm: number;
  microsecondsPerQuarter: number;
}

export interface MIDITrack {
  id: string;
  name: string;
  instrument: string;
  channel: number;
  notes: MIDINote[];
  color: string;       // From muted palette
}

export interface MIDIData {
  file: {
    name: string;
    size: number;
    duration: number;
    ticksPerQuarter: number;
    timeSignature: [number, number];
    keySignature: string;
  };
  tracks: MIDITrack[];
  tempoChanges: TempoEvent[];
}

export interface MIDIParsingResult {
  success: boolean;
  data?: MIDIData;
  error?: string;
} 