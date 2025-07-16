declare module 'midi-parser-js' {
  interface MidiEvent {
    deltaTime: number;
    type: number;
    metaType?: number;
    data?: number[];
    channel?: number;
  }

  interface MidiTrack {
    event?: MidiEvent[];
  }

  interface MidiData {
    formatType: number;
    timeDivision: number;
    track: MidiTrack[];
  }

  class MidiParser {
    static parse(buffer: Buffer | Uint8Array): MidiData;
  }

  export default MidiParser;
} 