export interface MIDINote {
    id: string;
    track: number;
    channel: number;
    note: number;
    velocity: number;
    startTime: number;
    duration: number;
    name: string;
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
    color: string;
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
//# sourceMappingURL=midi.d.ts.map