/// <reference types="node" />
/// <reference types="node" />
import { MIDIParsingResult } from '../types/midi.js';
/**
 * Parse MIDI buffer and extract structured data
 */
export declare function parseMidiFile(buffer: Buffer, filename: string): Promise<MIDIParsingResult>;
/**
 * Validate MIDI file buffer
 */
export declare function validateMidiBuffer(buffer: Buffer): boolean;
//# sourceMappingURL=midi-parser.d.ts.map